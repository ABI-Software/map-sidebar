<template>
  <div class="filters">
    <MapSvgSpriteColor />
    <div v-if="showFilters && options.length > 0">
      <div class="cascader-tag" v-if="presentTags.length > 0">
        <el-tag
          class="ml-2"
          type="info"
          closable
          @close="cascadeTagClose(presentTags[0])"
        >
          <span class="tag-text" :class="modifyCascaderTagStyle(presentTags[0])">{{ presentTags[0] }}</span>
        </el-tag>
        <el-popover
          v-if="presentTags.length > 1"
          placement="bottom-start"
          :width="250"
          trigger="hover"
          popper-class="cascade-tags-popover"
        >
          <template #default>
            <div class="el-tags-container">
              <el-tag
                v-for="(tag, i) in presentTags.slice(1)"
                :key="i"
                class="ml-2"
                :class="modifyCascaderTagStyle(tag)"
                type="info"
                closable
                @close="cascadeTagClose(tag)"
              >
                {{ tag }}
              </el-tag>
            </div>
          </template>
          <template #reference>
            <div class="el-tags-container">
              <el-tag
                v-if="presentTags.length > 1"
                class="ml-2"
                type="info"
              >
                +{{ presentTags.length - 1 }}
              </el-tag>
            </div>
          </template>
        </el-popover>
      </div>
      <transition name="el-zoom-in-top">
        <span v-loading="!cascaderIsReady" class="search-filters transition-box">
          <el-cascader
            class="cascader"
            ref="cascader"
            v-model="cascadeSelected"
            size="large"
            placeholder=" "
            :collapse-tags="true"
            collapse-tags-tooltip
            :options="options"
            :props="cascaderProps"
            @change="cascadeEvent($event)"
            @expand-change="cascadeExpandChange"
            :show-all-levels="true"
            popper-class="sidebar-cascader-popper"
          >
            <template #default="{ node, data }">
              <div v-if="isFlatmapConnectionsFilterNode(node)">
                <div class="sidebar-cascader-search el-input">
                  <div class="el-input__wrapper">
                    <input
                      class="el-input__inner"
                      :ref="'searchInput_' + node.pathValues[0]"
                      :value="searchInputs[node.pathValues[0]]"
                      @input="searchInputChange($event, node)"
                      @focus="searchInputFocusToggle($event, true)"
                      @blur="searchInputFocusToggle($event, false)"
                      style="width: 100%"
                      autocomplete="off"
                      placeholder="Search"
                    />
                  </div>
                </div>
              </div>
              <div v-else>
                <el-row>
                  <el-col :span="4" v-if="hasLineStyles(data)">
                    <div class="path-visual" :style="getLineStyles(data)"></div>
                  </el-col>
                  <el-col :span="20">
                    <span v-if="isFlatmapConnectionsNode(node)" class="sr-only">
                      {{ getNodeKey(node.value) }}
                    </span>
                    <div :style="getBackgroundStyles(data)">
                      {{ data.label }}
                    </div>
                  </el-col>
                </el-row>
              </div>
            </template>
          </el-cascader>
          <div v-if="showFiltersText" class="filter-default-value">Filters</div>
          <el-popover
            title="How do filters work?"
            width="250"
            trigger="hover"
            popper-class="filter-help-popover"
          >
            <template #reference>
              <MapSvgIcon icon="help" class="help" />
            </template>
            <div>
              <strong>Within categories:</strong> OR
              <br />
              example: {{ entry.helper.within }}
              <br />
              <br />
              <strong>Between categories:</strong> AND
              <br />
              example: {{ entry.helper.between }}
            </div>
          </el-popover>
        </span>
      </transition>
    </div>
    <div class="dataset-shown">
      <span class="dataset-results-feedback">{{ numberOfResultsText }}</span>
      <el-select
        class="number-shown-select"
        v-model="numberShown"
        placeholder="10"
        @change="numberShownChanged($event)"
      >
        <el-option
          v-for="item in numberDatasetsShown"
          :key="item"
          :label="item"
          :value="item"
        ></el-option>
      </el-select>
    </div>
  </div>
</template>

<script>
/* eslint-disable no-alert, no-console */
import { markRaw } from 'vue'
import {
  ElOption as Option,
  ElSelect as Select,
  ElPopover as Popover,
  ElCascader as Cascader,
} from 'element-plus'
import speciesMap from './species-map.js'
import { MapSvgIcon, MapSvgSpriteColor } from "@abi-software/svg-sprite";
import '@abi-software/svg-sprite/dist/style.css'

import { AlgoliaClient } from '../algolia/algolia.js'
import { facetPropPathMapping } from '../algolia/utils.js'
import EventBus from './EventBus.js'

const capitalise = function (txt) {
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}

const convertReadableLabel = function (original) {
  const name = original.toLowerCase()
  if (speciesMap[name]) {
    return capitalise(speciesMap[name])
  } else {
    if (original === original.toUpperCase()) {
      return original
    }
    return capitalise(name)
  }
}

export default {
  name: 'SearchFilters',
  components: {
    MapSvgIcon,
    MapSvgSpriteColor,
    Option,
    Select,
    Popover,
    Cascader
  },
  props: {
    /**
     * Object containing information for
     * the required viewing.
     */
    entry: Object,
    envVars: {
      type: Object,
      default: () => {},
    },
  },
  data: function () {
    return {
      algoliaClient: undefined,
      cascaderIsReady: false,
      previousShowAllChecked: {
        species: false,
        gender: false,
        organ: false,
        datasets: false,
      },
      showFiltersText: true,
      cascadeSelected: [],
      cascadeSelectedWithBoolean: [],
      filterTimeout: null,
      numberShown: 10,
      filters: [],
      facets: ['Species', 'Gender', 'Organ', 'Datasets'],
      numberDatasetsShown: ['10', '20', '50'],
      cascaderProps: { multiple: true },
      options: [
        {
          value: 'Species',
          label: 'Species',
          children: [{}],
        },
      ],
      presentTags:[],
      searchInputs: {},
    }
  },
  setup() {
    const cascaderTags = markRaw({});
    const correctnessCheck = markRaw({
      term: new Set(),
      facet: new Set(),
      facet2: new Set(),
      facet3: new Set(),
    });
    return { cascaderTags, correctnessCheck }
  },
  computed: {
    numberOfResultsText: function () {
      return `${this.entry.numberOfHits} results | Showing`
    },
    showFilters: function () {
      return this.entry.showFilters
    }
  },
  watch: {
    entry: {
      deep: true,
      immediate: true,
      handler: function (newVal, oldVal) {
        if (JSON.stringify(newVal?.options) !== JSON.stringify(oldVal?.options)) {
          this.options = []
          this.filters = []
          this.cascaderIsReady = false
          // Populate the cascader with new options
          this.populateCascader().then(() => {
            this.cascaderIsReady = true
            if (this.options.length) {
              this.checkShowAllBoxes()
              // this.setCascader(this.entry.filterFacets)
              this.cssMods()
              this.$emit('cascaderReady')
            }
          })
        }
      },
    },
  },
  methods: {
    /**
     * Internal only.
     * Create value of cascader.
     * Takes an array of label to create the value
     */
    createCascaderItemValue: function (labelsArray) {
      let value = undefined
      if (labelsArray?.length) {
        value = labelsArray[0]
        for (let i = 1; labelsArray.length > i; i++) {
          value = `${value}>${labelsArray[i]}`
        }
        if (value.includes("undefined")) {
          console.warn(
            `Warning: One or more of the facets is undefined, this will not be shown in the cascader`
          )
        }
      }
      return value;
    },
    createChildrenCascaderValue: function(children, facet, facets) {
      if (children?.length) {
        children.forEach((facetItem, i) => {
          //copy the facets into 
          if (children[i].facetPropPath !== 'pennsieve.organization.name') {
            children[i].label = convertReadableLabel(
              facetItem.label
            )
          }
          if (facetItem.key && facet.key.includes('flatmap.connectivity.source.')) {
            const childKey = facetItem.key;
            const parentKey = facet.key;
            const key = childKey.replace(`${parentKey}.`, '');
            children[i].value = this.createCascaderItemValue([facet.label, key]);
          } else {
            const newFacets = facets.slice()
            newFacets.push(facetItem.label)
            children[i].value = this.createCascaderItemValue(newFacets)
            this.createChildrenCascaderValue(facetItem.children, facet, newFacets)
          }
        })
      }
    },
    getNodeKey: function (nodeValue) {
      return nodeValue ? nodeValue.split('>')[1] : '';
    },
    isFlatmapConnectionsNode: function (node) {
      return (
        node.pathValues[0].includes('flatmap.connectivity.source') &&
        node.isLeaf
      )
    },
    isFlatmapConnectionsFilterNode: function (node) {
      return (
        node.pathValues[0].includes('flatmap.connectivity.source') &&
        node.pathLabels.includes('Filters') &&
        node.isDisabled &&
        node.isLeaf
      )
    },
    processOptions: function () {
      // create top level of options in cascader
      this.options.forEach((facet, i) => {
        this.options[i].total = this.countTotalFacet(facet)

        this.options[i].label = convertReadableLabel(facet.label)
        this.options[i].value = this.createCascaderItemValue(
          [facet.key]
        )

        if (!this.options[i].children.find((child) => child.label === 'Show all')) {
          // put "Show all" as first option
          this.options[i].children.unshift({
            value: this.createCascaderItemValue(['Show all']),
            label: 'Show all',
          })
        }

        if (facet.key.includes('flatmap.connectivity.source')) {
          this.options[i].children.unshift({
            value: this.createCascaderItemValue(['ConnectivityFilters']),
            label: 'Filters',
            disabled: true,
          });
        }

        // populate second level of options
        this.createChildrenCascaderValue(this.options[i].children, facet, [facet.label])
      })
    },
    populateCascader: function () {
      if (this.entry.options) {
        return new Promise((resolve) => {
          this.facets = this.entry.options
          this.options = this.entry.options
          this.processOptions()
          resolve();
        });
      }
      return new Promise((resolve) => {
        // Algolia facet serach
        this.algoliaClient
          .getAlgoliaFacets(facetPropPathMapping)
          .then((data) => {
            this.facets = data
            EventBus.emit('available-facets', data)
            this.options = data
            this.processOptions()
          })
          .finally(() => {
            resolve()
          })
      })
    },
    isConnectivityTag: function (tag) {
      const regex = /^[A-Za-z]:/; // starts with O: D: V:
      return regex.test(tag);
    },
    getConnectivityTag: function (tag) {
      const index = tag.indexOf(":");
      const result = index !== -1 ? tag.substring(index + 1) : tag;
      return result;
    },
    modifyCascaderTagStyle: function (tag) {
      if (this.isConnectivityTag(tag)) {
        return 'connectivity-tag';
      }
      return '';
    },
    /**
     * Create manual events when cascader tag is closed
     */
    cascadeTagClose: function (_tag) {
      const tag = this.isConnectivityTag(_tag) ? this.getConnectivityTag(_tag) : _tag;
      let manualEvent = []

      Object.entries(this.cascaderTags).map((entry) => {
        const term = entry[0], facet = entry[1] // Either "Array" or "Object", depends on the cascader item level
        const option = this.options.filter((option) => option.label == term)[0]
        const key = option.key

        for (let index = 0; index < option.children.length; index++) {
          const child = option.children[index]
          const label = child.label, value = child.value

          if (Array.isArray(facet)) {
            // push "Show all" if there is no item checked
            if (facet.length === 0 && label.toLowerCase() === "show all") {
              manualEvent.push([key, value])
              break
              // push all checked items
            } else if (label !== tag && facet.includes(label))
              manualEvent.push([key, value])
          } else {
            // loop nested cascader items
            Object.entries(facet).map((entry2) => {
              const term2 = entry2[0], facet2 = entry2[1], facet3 = entry2[2] // object key, object value
              if (facet3) {



              } else {
                if (term2 === label) {
                  child.children.map((child2) => {
                    const label2 = child2.label, value2 = child2.value
                    // push all checked items
                    if (label2 !== tag && facet2.includes(label2))
                      manualEvent.push([key, value2])
                  })
                }
              }
            })
          }
        }
      })
      this.cascadeEvent(manualEvent)
    },
    /**
     * Re-generate 'cascaderTags' and 'presentTags'
     * Not able to avoid wrong facet at the moment
     */
    tagsChangedCallback: function (event) {
      if (this.correctnessCheck.term && this.correctnessCheck.facet &&
      this.correctnessCheck.facet2 && this.correctnessCheck.facet3) {
        this.options.map((option) => {
          this.correctnessCheck.term.add(option.label)
          option.children.map((child) => {
            this.correctnessCheck.facet.add(child.label)
            if (['Anatomical structure', 'Nerves'].includes(option.label) && child.label !== 'Show all') {
              child.children.map((child2) => {
                this.correctnessCheck.facet2.add(child2.label)
                if (child2.children) {
                  child2.children.map((child3) => {
                    this.correctnessCheck.facet3.add(child3.label)
                  })
                }
              })
            }
          })
        })
      }

      this.cascaderTags = {}
      this.cascaderTagsClone = {}
      this.presentTags = []
      event.map((item) => {
        const { facet, facet2, facet3, term, tagLabel, facetPropPath } = item
        let facetLabel = facet;
        let termId = '';
        // Connectivity filter has different value and label,
        // value is used for filter logic
        // label is used for user interface (and this cascader tag is just user interface)
        if (facetPropPath && facetPropPath.includes('flatmap.connectivity.source.') && tagLabel) {
          facetLabel = tagLabel;
          termId = term.charAt(0);
        }

        if (this.correctnessCheck.term.has(term) && this.correctnessCheck.facet.has(facetLabel)) {
          const childFacet = facet3 ? facet3 : facet2
          const facetField = facet3 ? "facet3" : "facet2"
          if (childFacet) {
            if (this.correctnessCheck[facetField].has(childFacet)) {
              if (term in this.cascaderTags) {
                if (facet in this.cascaderTags[term]){
                  this.cascaderTags[term][facet].push(childFacet)
                  this.cascaderTagsClone[term][facet].push(childFacet)
                }
                else {
                  this.cascaderTags[term][facet] = [childFacet]
                  this.cascaderTagsClone[term][facet] = [childFacet]
                }
              } else {
                this.cascaderTags[term] = {}
                this.cascaderTags[term][facet] = [childFacet]
                this.cascaderTagsClone[term] = {}
                this.cascaderTagsClone[term][facet] = [childFacet]
              }
            }
          } else {
            // If 'cascaderTags' has key 'Anatomical structure',
            // it's value type will be Object (because it has nested facets),
            // in this case 'push' action will not available.
            if (term in this.cascaderTags && !['Anatomical structure', 'Nerves'].includes(term)) {
              this.cascaderTags[term].push(facetLabel)
              // connectivity exploration mode tags
              if (termId) {
                this.cascaderTagsClone[term].push(termId + ':' + facetLabel);
              } else {
                this.cascaderTagsClone[term].push(facetLabel);
              }
            } else {
              if (facet.toLowerCase() !== "show all") {
                this.cascaderTags[term] = [facetLabel]
                // connectivity exploration mode tags
                if (termId) {
                  this.cascaderTagsClone[term] = [termId + ':' + facetLabel];
                } else {
                  this.cascaderTagsClone[term] = [facetLabel]
                }
              } else {
                this.cascaderTags[term] = []
                this.cascaderTagsClone[term] = []
              }
            }
          }
        }
      })

      Object.values(this.cascaderTagsClone).map((value) => {
        const extend = Array.isArray(value) ? value : Object.values(value).flat(1)
        this.presentTags = [...this.presentTags, ...extend]
      })
      this.presentTags = [...new Set(this.presentTags)]
      if (this.presentTags.length > 0) this.showFiltersText = false
      else this.showFiltersText = true
    },
    /**
     * Support for function 'showAllEventModifierForAutoCheckAll'
     * Called in function 'populateCascader'
     */
    countTotalFacet: function (facet) {
      if (['anatomy.organ.category.name'].includes(facet.key)) {
        const count = facet.children.reduce((total, num) => {
          // The first 'total' will be an object
          total = typeof total == 'number' ? total : total.children.length
          return total + num.children.length
        })
        return count
      }
      return facet.children.length
    },
    /**
     * When check/uncheck all child items, automatically check "Show all"
     */
    showAllEventModifierForAutoCheckAll: function (event) {
      const currentKeys = {}
      event.map((e) => {
        const eventKey = e[0]
        if (eventKey in currentKeys) currentKeys[eventKey] += 1
        else currentKeys[eventKey] = 1
      })
      this.options.map((option) => {
        const key = option.key
        const value = option.children.filter((child) => child.label === "Show all")[0].value
        const total = option.total
        // Remove events if all child items is checked
        if (currentKeys[key] === total) {
          event = event.filter((e) => e[0] !== option.key)
          delete currentKeys[key]
        }
        // Add 'Show all' if facet type not exist in event
        if (!(key in currentKeys)) event.unshift([key, value])
      })
      return event
    },
    // cascadeEvent: initiate searches based off cascader changes
    cascadeEvent: function (eventIn) {
      let event = [...eventIn]
      if (event) {
        // Check for show all in selected cascade options

        event = this.showAllEventModifier(event)

        event = this.showAllEventModifierForAutoCheckAll(event)

        const cascaderRef = this.$refs.cascader;
        const checkedNodes = cascaderRef?.getCheckedNodes(true);
        const filteredCheckedNodes = checkedNodes.filter((checkedNode) =>
          checkedNode.checked && checkedNode.label !== 'Show all'
        );

        /**
         * Move the new added event to the beginning
         * Otherwise, cascader will show different expand item
         */
        if (this.__expandItem__) {
          let position = 0
          if (this.__expandItem__.length > 1) {
            position = 1
          }
          const current = event.filter((e) => e[position] == this.__expandItem__[position]);
          const rest = event.filter((e) => e[position] !== this.__expandItem__[position]);
          event = [...current, ...rest]
        }
        // Create results for the filter update
        let filterKeys = event
          .filter((selection) => selection !== undefined)
          .map((fs) => {
            let { hString, bString } =
              this.findHierarachyStringAndBooleanString(fs)
            let { facet, facet2, facet3, term } =
              this.getFacetsFromHierarchyString(hString)

            const foundNode = filteredCheckedNodes.find((checkedNode) =>
              fs.join() === checkedNode.pathValues.join()
            );
            const tagLabel = foundNode ? foundNode.label : undefined;
            return {
              facetPropPath: fs[0],
              facet: facet,
              facet2: facet2,
              facet3: facet3,
              term: term,
              AND: bString, // for setting the boolean
              tagLabel: tagLabel // for connectivity filter's cascader tag
            }
          })

        // Move results from arrays to object for use on scicrunch (note that we remove 'duplicate' as that is only needed for filter keys)
        let filters = event
          .filter((selection) => selection !== undefined)
          .map((fs) => {
            let facetSubPropPath = undefined
            let propPath = fs[0].includes('duplicate')
              ? fs[0].split('duplicate')[0]
              : fs[0]
            let { hString, bString } =
              this.findHierarachyStringAndBooleanString(fs)
            let { facet, facet2, facet3, term } =
              this.getFacetsFromHierarchyString(hString)
            //REMOVE THIS:Temporary work around.
            if (facet3) {
              facetSubPropPath = 'anatomy.organ.name'
              if (facet3 === "Non specific") {
                facet = facet2
              } else {
                facet = facet3
              }
            } else if (facet2) {
              facet = facet2
              facetSubPropPath = 'anatomy.organ.name'
            }

            const foundNode = filteredCheckedNodes.find((checkedNode) =>
              fs.join() === checkedNode.pathValues.join()
            );
            const tagLabel = foundNode ? foundNode.label : undefined;

            return {
              facetPropPath: propPath,
              facet: facet,
              term: term,
              AND: bString, // for setting the boolean
              facetSubPropPath: facetSubPropPath, // will be used for filters if we are at the third level of the cascader
              tagLabel: tagLabel // for connectivity filter's cascader tag
            }
          })

        // timeout: add delay for filter checkboxes
        if (this.filterTimeout) {
          clearTimeout(this.filterTimeout);
        }

        this.$emit('loading', true) // let dataset explorer wait for the requests
        this.setCascader(filterKeys) //update our cascader v-model if we modified the event

        this.filterTimeout = setTimeout(() => {
          this.$emit('filterResults', filters) // emit filters for apps above sidebar
          this.cssMods() // update css for the cascader
        }, 600);
      }
    },
    //this fucntion is needed as we previously stored booleans in the array of event that
    //  are stored in the cascader
    findHierarachyStringAndBooleanString(cascadeEventItem) {
      let hString, bString
      const layers = cascadeEventItem.length
      if (layers >= 3) {
        if (cascadeEventItem[layers - 1] &&
          (typeof cascadeEventItem[layers - 1] === 'string' ||
          cascadeEventItem[layers - 1] instanceof String) &&
          cascadeEventItem[layers - 1].split('>').length > 2) {
          hString = cascadeEventItem[layers - 1]
        } else {
          hString = cascadeEventItem[layers - 2]
          bString = cascadeEventItem[layers - 1]
        }
      } else {
        hString = cascadeEventItem[1]
        bString = undefined
      }
      return { hString, bString }
    },
    // Splits the terms and facets from the string stored in the cascader
    getFacetsFromHierarchyString(hierarchyString) {
      let fsSplit = hierarchyString.split('>')
      return {
        term: fsSplit[0],
        facet: fsSplit[1],
        facet2: fsSplit[2],
        facet3: fsSplit[3],
      }
    },
    // showAllEventModifier:  Modifies a cascade event to unclick all selections in category if "show all" is clicked. Also unchecks "Show all" if any secection is clicked
    // *NOTE* Does NOT remove 'Show all' selections from showing in 'cascadeSelected'
    showAllEventModifier: function (event) {
      // check if show all is in the cascader checked option list
      let hasShowAll = event
        .map((ev) => (ev ? ev[1].toLowerCase().includes('show all') : false))
        .includes(true)
      // remove all selected options below the show all if checked
      if (hasShowAll) {
        let modifiedEvent = []
        let facetMaps = {}
        //catagorised different facet items
        for (const i in event) {
          if (facetMaps[event[i][0]] === undefined) facetMaps[event[i][0]] = []
          facetMaps[event[i][0]].push(event[i])
        }
        // go through each facets
        for (const facet in facetMaps) {
          let showAll = undefined
          // Find the show all item if any
          for (let i = facetMaps[facet].length - 1; i >= 0; i--) {
            if (facetMaps[facet][i][1].toLowerCase().includes('show all')) {
              //seperate the showAll item and the rest
              showAll = facetMaps[facet].splice(i, 1)[0]
              break
            }
          }
          if (showAll) {
            if (this.previousShowAllChecked[facet]) {
              //Unset the show all if it was present previously
              //and there are other items
              if (facetMaps[facet].length > 0)
                modifiedEvent.push(...facetMaps[facet])
              else modifiedEvent.push(showAll)
            } else {
              //showAll is turned on
              modifiedEvent.push(showAll)
            }
          } else {
            modifiedEvent.push(...facetMaps[facet])
          }
        }
        //Make sure the expanded item are sorted first.
        return modifiedEvent.sort((a, b) => {
          if (this.__expandItem__) {
            if (a[0] == this.__expandItem__) {
              if (b[0] == this.__expandItem__) {
                return 0
              } else {
                return -1
              }
            } else if (b[0] == this.__expandItem__) {
              if (a[0] == this.__expandItem__) {
                return 0
              } else {
                return 1
              }
            } else {
              return 0
            }
          } else return 0
        })
      }
      return event
    },
    cascadeExpandChange: function (event) {
      //work around as the expand item may change on modifying the cascade props
      this.__expandItem__ = event
      if (this.__expandItem__) {
        this.updateListFilters(this.__expandItem__[0])
      }
      this.updateListStyleOrder()
      this.cssMods()
    },
    updateListStyleOrder: function () {
      this.$nextTick(() => {
        const cascaderRef = this.$refs.cascader;
        const contentRef = cascaderRef?.contentRef;

        if (contentRef) {
          const menuList = contentRef.querySelectorAll('.el-cascader-menu__list');
          if (menuList) {
            menuList.forEach((ul) => {
              const searchInput = ul.querySelector('.sidebar-cascader-search');

              // order the list using CSS
              // active items on top - defined in CSS under .cascader-menu-with-search
              if (searchInput) {
                ul.classList.add('cascader-menu-with-search');
              } else {
                ul.classList.remove('cascader-menu-with-search');
              }
            })
          }
        }
      });
    },
    searchInputChange: function (event, node) {
      event.preventDefault();
      const { target } = event;
      if (target) {
        const value = target.value;
        const expandItem = node.pathValues[0];

        this.searchInputs[expandItem] = value;
        this.updateListFilters(expandItem);
      }
    },
    searchInputFocusToggle: function (event, option) {
      const { target } = event;
      if (!target) return;

      const inputWrapper = target.closest('.el-input__wrapper');
      if (option === true) {
        inputWrapper.classList.add('is-focus');
      } else {
        inputWrapper.classList.remove('is-focus');
      }
    },
    updateListFilters: function (expandItem) {
      const searchValue = this.searchInputs[expandItem] || '';

      this.$nextTick(() => {
        const searchInputEl = this.$refs['searchInput_' + expandItem];
        if (!searchInputEl) return;

        const ul = searchInputEl.closest('.el-cascader-menu__list');
        ul.querySelectorAll('.el-cascader-node').forEach((li, index) => {
          // skip index:0 (search box), and index:1 (Show all)
          if (index > 1) {
            const content = li.querySelector('.el-cascader-node__label').textContent;
            if (content.toLowerCase().includes(searchValue.toLowerCase())) {
              li.classList.remove('hide');
            } else {
              li.classList.add('hide');
            }
          }
        });

        if (searchValue) {
          searchInputEl.focus();
        }
      });
    },
    numberShownChanged: function (event) {
      this.$emit('numberPerPage', parseInt(event))
    },
    updatePreviousShowAllChecked: function (options) {
      //Reset the states
      for (const facet in this.previousShowAllChecked) {
        this.previousShowAllChecked[facet] = false
      }
      options.forEach((element) => {
        if (element[1].toLowerCase().includes('show all'))
          this.previousShowAllChecked[element[0]] = true
      })
    },
    // setCascader: Clears previous selections and takes in an array of facets to select: filterFacets
    // facets are in the form:
    //    {
    //      facetPropPath: 'anatomy.organ.name',
    //      term: 'Sex',
    //      facet: 'Male'
    //      AND: true  // Optional value for setting the boolean within a facet
    //    }
    setCascader: function (filterFacets) {
      //Do not set the value unless it is ready
      if (this.cascaderIsReady && filterFacets && filterFacets.length != 0) {
        //An inner function only used by this function
        const createFilter = (e) => {
          let filters = [
            e.facetPropPath,
            this.createCascaderItemValue([capitalise(e.term), e.facet]),
          ]
          // Add the third level of the cascader if it exists
          if (e.facet2) {
            filters.push(
              this.createCascaderItemValue([capitalise(e.term), e.facet, e.facet2])
            )
            if (e.facet3) {
              filters.push(
                this.createCascaderItemValue([capitalise(e.term), e.facet, e.facet2, e.facet3])
              )
            }
          }
          return filters;
        }

        this.cascadeSelected = filterFacets.map((e) => {
          let filters = createFilter(e)
          return filters
        })

        // Unfortunately the cascader is very particular about it's v-model
        //   to get around this we create a clone of it and use this clone for adding our boolean information
        this.cascadeSelectedWithBoolean = filterFacets.map((e) => {
          let filters = createFilter(e)
          filters.push(e.AND)
          return filters
        })
        this.updatePreviousShowAllChecked(this.cascadeSelected)
      }
      this.tagsChangedCallback(filterFacets);
    },
    addFilter: function (filterToAdd) {
      //Do not set the value unless it is ready
      if (this.cascaderIsReady && filterToAdd) {
        let filters = this.validateAndConvertFilterToHierarchical(filterToAdd)
        if (filters && filters.length) {
          filters.forEach((filter) => {
            this.cascadeSelected.filter((f) => f.term != filter.term)
            const paths = [
              filter.facetPropPath,
              this.createCascaderItemValue([filter.term, filter.facet]),
              this.createCascaderItemValue([filter.term, filter.facet, filter.facet2]),
            ]
            if (filter.facet3) {
              paths.push(this.createCascaderItemValue([filter.term, filter.facet, filter.facet2, filter.facet3]))
            }
            this.cascadeSelected.push([...paths])
            this.cascadeSelectedWithBoolean.push([...paths, filter.AND])
            // The 'AND' her is to set the boolean value when we search on the filters. It can be undefined without breaking anything
          });
          return true
        }
      }
    },
    initiateSearch: function () {
      this.cascadeEvent(this.cascadeSelectedWithBoolean)
    },
    // checkShowAllBoxes: Checks each 'Show all' cascade option by using the setCascader function
    checkShowAllBoxes: function () {
      this.setCascader(
        this.options.map((option) => {
          return {
            facetPropPath: option.value,
            term: option.label,
            facet: 'Show all',
          }
        })
      )
    },
    makeCascadeLabelsClickable: function () {
      // Next tick allows the cascader menu to change
      this.$nextTick(() => {
        document
          .querySelectorAll('.sidebar-cascader-popper .el-cascader-node__label')
          .forEach((el) => {
            // step through each cascade label
            el.onclick = function () {
              const checkbox = this.previousElementSibling
              if (checkbox) {
                if (!checkbox.parentElement.attributes['aria-owns']) {
                  // check if we are at the lowest level of cascader
                  this.previousElementSibling.click() // Click the checkbox
                }
              }
            }
          })
      })
    },

    cssMods: function () {
      this.makeCascadeLabelsClickable()
    },

    /*
     * Given a filter, the function below returns the filter in the format of the cascader, returns false if facet is not found
     */
    validateAndConvertFilterToHierarchical: function (filter) {
      if (filter && filter.facet && filter.term) {
        // Convert terms to lower case.
        // Flatmap gives us Inferior vagus X ganglion but the term in Algolia
        // is Inferior vagus x ganglion (there are other cases as well)
        const lowercase = filter.facet.toLowerCase()
        if (filter.facet2 || filter.facet3) {
          return [filter] // if it has a second term we will assume it is hierarchical and return it as is
        } else {
          for (const firstLayer of this.options) {
            if (firstLayer.value === filter.facetPropPath) {
              for (const secondLayer of firstLayer.children) {
                // connectivity filters
                if (filter.facetPropPath.includes('flatmap.connectivity.source.') && secondLayer.key) {
                  const value = secondLayer.key.replace(`${filter.facetPropPath}.`, '');
                  if (value.toLowerCase() === lowercase) {
                    return [filter]
                  }
                } else if (secondLayer.label?.toLowerCase() === lowercase) {
                  // if we find a match on the second level, the filter will already be correct
                  // Make sure the case matches the one from Algolia
                  filter.facet = secondLayer.label
                  return [filter]
                } else {
                  if (secondLayer.children && secondLayer.children.length > 0) {
                    for (const thirdLayer of secondLayer.children) {
                      if (thirdLayer.children && thirdLayer.children.length > 0) {
                        const filters = []
                        for (const fourthLayer of thirdLayer.children) {
                          if (fourthLayer.label?.toLowerCase() === lowercase ||
                            fourthLayer.label === "Non specific") {
                            // If we find a match on the third level, we need to switch facet1 to facet2
                            //   and populate facet1 with its parents label.
                            filter.facet3 = fourthLayer.label
                            filter.facet2 = thirdLayer.label
                            filter.facet = secondLayer.label
                            return [filter]
                          } else if (thirdLayer.label?.toLowerCase() === lowercase) {
                            //Match facet2 but facet 3 is not specified, include all children of facet2
                            const filterClone = {...filter}
                            filterClone.facet3 = fourthLayer.label
                            filterClone.facet2 = thirdLayer.label
                            filterClone.facet = secondLayer.label
                            filterClone.AND = undefined
                            filters.push(filterClone)
                          }
                        }
                        return filters
                      } else if (thirdLayer.label?.toLowerCase() === lowercase) {
                        // If we find a match on the third level, we need to switch facet1 to facet2
                        //   and populate facet1 with its parents label.
                        filter.facet2 = thirdLayer.label
                        filter.facet = secondLayer.label
                        return [filter]
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      return false
    },
    getHierarchicalValidatedFilters: function (filters) {
      const result = []
      const terms = []
      const notFound = []

      if (filters) {
        if (!this.cascaderIsReady) {
          return {
            result: filters,
            notFound: notFound,
          }
        }

        filters.forEach((filter) => {
          const validatedFilters =
            this.validateAndConvertFilterToHierarchical(filter)
          if (validatedFilters && validatedFilters.length) {
            validatedFilters.forEach(validatedFilter => {
              result.push(validatedFilter)
              terms.push(validatedFilter.term)
            });
          } else {
            const validOption = this.options.find((option) => {
              return option.key === filter.facetPropPath;
            });
            if (validOption) {
              // not found items
              notFound.push(filter)
            }
          }
        })

        // make sure unused filter terms' show all checkbox is always checked
        this.options.forEach((option)=>{
          if (!terms.includes(option.label)) {
            result.push({
              facet: "Show all",
              facetPropPath: option.key,
              label: "Show all",
              term: option.label
            })
          }
        })
      }

      return {
        result: result,
        notFound: notFound,
      }
    },
    hasLineStyles: function(item) {
      return 'colour' in item && item.colourStyle === 'line'
    },
    getLineStyles: function (item) {
      if ('colour' in item && item.colourStyle === 'line') {
        if ('dashed' in item && item.dashed === true) {
          const background = `repeating-linear-gradient(90deg,${item.colour},${item.colour} 6px,transparent 0,transparent 9px)`
          return { background }
        } else {
          return { background: item.colour }
        }
      }
      return { display: 'None' }
    },
    getBackgroundStyles: function (item) {
      if ('colour' in item && item.colourStyle === 'background') {
        return { background: item.colour }
      }
      return {}
    },
  },
  mounted: function () {
    // in populateCascader function,
    // algoliaClient run only when there are no this.entry.options
    if (!this.entry.options) {
      this.algoliaClient = markRaw(new AlgoliaClient(
        this.envVars.ALGOLIA_ID,
        this.envVars.ALGOLIA_KEY,
        this.envVars.PENNSIEVE_API_LOCATION
      ))
      this.algoliaClient.initIndex(this.envVars.ALGOLIA_INDEX)
    }
    this.populateCascader().then(() => {
      this.cascaderIsReady = true
      this.checkShowAllBoxes()
      this.setCascader(this.entry.filterFacets)
      this.cssMods()
      this.$emit('cascaderReady')
    })
  },
}
</script>

<style lang="scss" scoped>

.filters {
  position: relative;
}

.cascader-tag {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 1;
  display: flex;
  gap: 4px;
}

.tag-text {
  display: block;
  max-width: 75px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.connectivity-tag::first-letter,
:deep(.connectivity-tag .el-tag__content::first-letter) {
  display: inline-block;
  padding: 0 2px;
  margin-right: 2px;
  color: white;
  background-color: $app-primary-color;
  font-style: italic;
  font-size: 90%;
  border-radius: 2px;
}

.el-tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

:deep(.connectivity-tag .el-tag__content) {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.el-tag {
  .cascader-tag &,
  .el-tags-container & {
    font-family: 'Asap', sans-serif;
    font-size: 12px;
    color: #303133 !important;
    background-color: #fff;
    border-color: #dcdfe6 !important;
    width: auto;
    max-width: 100%;
    justify-content: flex-start;
  }
}

:deep(.el-cascader__tags) {
  display: none;
}

.filter-default-value {
  pointer-events: none;
  position: absolute;
  top: 0;
  left: 0;
  padding-top: 10px;
  padding-left: 16px;
}

.help {
  width: 24px !important;
  height: 24px;
  transform: scale(1.1);
  cursor: pointer;
}

.popover {
  color: rgb(48, 49, 51);
  font-family: Asap;
  margin: 12px;
}

.filter-icon-inside {
  width: 12px !important;
  height: 12px !important;
  color: #292b66;
  transform: scale(2) !important;
  margin-bottom: 0px !important;
}

.cascader {
  font-family: Asap;
  font-size: 14px;
  font-weight: 500;
  font-stretch: normal;
  font-style: normal;
  line-height: normal;
  letter-spacing: normal;
  color: #292b66;
  text-align: center;
  padding-bottom: 6px;
}

.dataset-shown {
  display: flex;
  flex-direction: row;
  float: right;
  padding-bottom: 6px;
  gap: 8px;
}

.dataset-results-feedback {
  white-space:nowrap;
  text-align: right;
  color: rgb(48, 49, 51);
  font-family: Asap;
  font-size: 18px;
  font-weight: 500;
  padding-top: 8px;
}

.search-filters {
  position: relative;
  float: left;
  padding-right: 15px;
}

.number-shown-select :deep(.el-select__wrapper) {
  width: 68px;
  height: 40px;
  color: rgb(48, 49, 51);
}

.el-select-dropdown__item.is-selected {
  color: #8300BF;
}

.filters :deep(.el-popover) {
  background: #f3ecf6 !important;
  border: 1px solid $app-primary-color;
  border-radius: 4px;
  color: #303133 !important;
  font-size: 12px;
  line-height: 18px;
}

.filters :deep(.el-popover .el-popper__arrow::before) {
  background: #f3ecf6;
  border-color: $app-primary-color;
}
</style>

<style lang="scss">
.sidebar-cascader-popper {
  font-family: Asap;
  font-size: 14px;
  font-weight: 500;
  font-stretch: normal;
  font-style: normal;
  line-height: normal;
  letter-spacing: normal;
  color: #292b66;
  text-align: center;
  padding-bottom: 6px;
  .el-cascader-menu:first-child {
    .el-checkbox__input {
      display: None;
    }
  }
}

.sidebar-cascader-popper .el-cascader-node.is-active {
  color: $app-primary-color;
}

.sidebar-cascader-popper .el-cascader-node.in-active-path {
  color: $app-primary-color;
}

.sidebar-cascader-popper .el-checkbox__input.is-checked > .el-checkbox__inner {
  background-color: $app-primary-color;
  border-color: $app-primary-color;
}

.sidebar-cascader-popper
  .el-cascader-menu:nth-child(2)
  .el-cascader-node:first-child {
  border-bottom: 1px solid #e4e7ed;
}

.sidebar-cascader-popper .el-cascader-node__label {
  text-align: left;
}

.sidebar-cascader-popper .el-cascder-panel {
  max-height: 500px;
}

.sidebar-cascader-popper .el-scrollbar__wrap {
  overflow-x: hidden;
  margin-bottom: 2px !important;
}

.sidebar-cascader-popper .el-checkbox__input.is-checked .el-checkbox__inner,
.el-checkbox__input.is-indeterminate .el-checkbox__inner {
  --el-checkbox-checked-bg-color: #{$app-primary-color};
  --el-checkbox-checked-input-border-color: #{$app-primary-color};
  background-color: $app-primary-color;
  border-color: $app-primary-color;
}

.sidebar-cascader-popper .el-cascader-menu:last-child .el-cascader-node {
  &.is-disabled {
    border-bottom: 1px solid #e4e7ed;
    padding-bottom: 0.5rem;
    position: sticky;
    top: 0.5rem;
    background-color: white;
    z-index: 20;
    box-shadow: 0px -6px 0px 6px white;
    cursor: default;

    .el-checkbox.is-disabled {
      display: none;
    }

    .el-cascader-node__label {
      padding-left: 0;
      padding-right: 0;
    }

    // hide show all for connection filters
    + .el-cascader-node {
      display: none;
    }
  }

  &.hide {
    display: none;
  }
}

.sidebar-cascader-popper .sidebar-cascader-search.el-input {
  --el-input-focus-border-color: #{$app-primary-color};
}

.sidebar-cascader-popper .el-cascader-menu__list.cascader-menu-with-search {
  display: flex;
  flex-direction: column;

  .el-cascader-node:nth-child(1),
  .el-cascader-node:nth-child(2),
  .el-cascader-node.is-active {
    order: 1;
  }

  .el-cascader-node {
    order: 2;
  }
}

.filter-help-popover,
.cascade-tags-popover {
  font-family: 'Asap', sans-serif;
  background: #f3ecf6 !important;
  border: 1px solid $app-primary-color !important;
  border-radius: 4px !important;
  color: #303133 !important;
  font-size: 12px !important;
  line-height: 18px !important;

  .el-popper__arrow::before {
    background: #f3ecf6 !important;
    border-color: $app-primary-color !important;
  }

  &[data-popper-placement^=bottom] .el-popper__arrow:before {
    border-bottom-color: transparent !important;
    border-right-color: transparent !important;
  }
}
.path-visual {
  margin: 3px 0;
  height: 3px;
  width: 25px;
  margin-right: 5px;
  display: inline-block;
}

.sr-only {
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}
</style>
