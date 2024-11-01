<template>
  <div v-if="entry" class="main" v-loading="loading">
    <!-- Connectivity Info Title -->
    <div class="connectivity-info-title">
      <div>
        <div class="block" v-if="entry.title">
          <div class="title">
            {{ capitalise(entry.title) }}
            <template v-if="entry.featuresAlert">
              <el-popover
                width="250"
                trigger="hover"
                :teleported="false"
                popper-class="popover-origin-help"
              >
                <template #reference>
                  <el-icon class="alert"><el-icon-warn-triangle-filled /></el-icon>
                </template>
                <span style="word-break: keep-all">
                  {{ entry.featuresAlert }}
                </span>
              </el-popover>
            </template>
          </div>
          <div
            v-if="
              entry.provenanceTaxonomyLabel &&
              entry.provenanceTaxonomyLabel.length > 0
            "
            class="subtitle"
          >
            {{ provSpeciesDescription }}
          </div>
        </div>
        <div class="block" v-else>
          <div class="title">{{ entry.featureId }}</div>
        </div>
        <div class="block" v-if="resources.length">
          <external-resource-card :resources="resources"></external-resource-card>
        </div>
        <div class="block">
          <el-button
            class="button"
            @click="goToConnectivityGraph()"
          >
            Show connectivity graph
          </el-button>
        </div>
      </div>
      <div class="title-buttons">
        <el-popover
          width="auto"
          trigger="hover"
          :teleported="false"
          popper-class="popover-map-pin"
        >
          <template #reference>
            <el-button class="button-circle" circle @click="showConnectivity(entry)">
              <el-icon color="white">
                <el-icon-location />
              </el-icon>
            </el-button>
          </template>
          <span>
            Show connectivity on map
          </span>
        </el-popover>
        <CopyToClipboard :content="updatedCopyContent" />
      </div>
    </div>
    <div class="content-container">
      {{ entry.paths }}
      <div v-if="entry.origins && entry.origins.length > 0" class="block">
        <div class="attribute-title-container">
          <span class="attribute-title">Origin</span>
          <el-popover
            width="250"
            trigger="hover"
            :teleported="false"
            popper-class="popover-origin-help"
          >
            <template #reference>
              <el-icon class="info"><el-icon-warning /></el-icon>
            </template>
            <span style="word-break: keep-all">
              <i>Origin</i> {{ originDescription }}
            </span>

          </el-popover>
        </div>
        <div
          v-for="(origin, i) in entry.origins"
          class="attribute-content"
          :origin-item-label="origin"
          :key="origin"
        >
          {{ capitalise(origin) }}
          <div v-if="i != entry.origins.length - 1" class="seperator"></div>
        </div>
        <el-button
          v-show="
            entry.originsWithDatasets && entry.originsWithDatasets.length > 0 &&
            shouldShowExploreButton(entry.originsWithDatasets)
          "
          class="button"
          id="open-dendrites-button"
          @click="openDendrites"
        >
          Explore origin data
        </el-button>
      </div>
      <div
        v-if="entry.components && entry.components.length > 0"
        class="block"
      >
        <div class="attribute-title-container">
          <div class="attribute-title">Components</div>
        </div>
        <div
          v-for="(component, i) in entry.components"
          class="attribute-content"
          :component-item-label="component"
          :key="component"
        >
          {{ capitalise(component) }}
          <div
            v-if="i != entry.components.length - 1"
            class="seperator"
          ></div>
        </div>
      </div>
      <div
        v-if="entry.destinations && entry.destinations.length > 0"
        class="block"
      >
        <div class="attribute-title-container">
          <span class="attribute-title">Destination</span>
          <el-popover
            width="250"
            trigger="hover"
            :teleported="false"
            popper-class="popover-origin-help"
          >
            <template #reference>
              <el-icon class="info"><el-icon-warning /></el-icon>
            </template>
            <span style="word-break: keep-all">
              <i>Destination</i> is where the axons terminate
            </span>
          </el-popover>
        </div>
        <div
          v-for="(destination, i) in entry.destinations"
          class="attribute-content"
          :destination-item-label="destination"
          :key="destination"
        >
          {{ capitalise(destination) }}
          <div
            v-if="i != entry.destinations.length - 1"
            class="seperator"
          ></div>
        </div>
        <el-button
          v-show="
            entry.destinationsWithDatasets &&
            entry.destinationsWithDatasets.length > 0 &&
            shouldShowExploreButton(entry.destinationsWithDatasets)
          "
          class="button"
          @click="openAxons"
        >
          Explore destination data
        </el-button>
      </div>
      <div
        v-show="
          entry.componentsWithDatasets &&
          entry.componentsWithDatasets.length > 0 &&
          shouldShowExploreButton(entry.componentsWithDatasets)
        "
        class="block"
      >
        <el-button
          class="button"
          @click="openAll"
        >
          Search for data on components
        </el-button>
      </div>
    </div>
    <div class="content-container">
      <div class="attribute-title-container">
        <span class="attribute-title">Connectivity Graph</span>
      </div>
      <connectivity-graph
        :entry="entry.featureId[0]"
        :mapServer="envVars.FLATMAPAPI_LOCATION"
        @tap-node="onTapNode"
        ref="connectivityGraphRef"
      />
    </div>
  </div>
</template>

<script>
import {
  ArrowUp as ElIconArrowUp,
  ArrowDown as ElIconArrowDown,
  Warning as ElIconWarning,
} from '@element-plus/icons-vue'
/* eslint-disable no-alert, no-console */
import {
  ElButton as Button,
  ElContainer as Container,
  ElIcon as Icon,
} from 'element-plus'
import ExternalResourceCard from './ExternalResourceCard.vue'
import EventBus from './EventBus.js'
import { CopyToClipboard, ConnectivityGraph } from '@abi-software/map-utilities';
import '@abi-software/map-utilities/dist/style.css';

const titleCase = (str) => {
  return str.replace(/\w\S*/g, (t) => {
    return t.charAt(0).toUpperCase() + t.substr(1).toLowerCase()
  })
}

const capitalise = function (str) {
  if (str) return str.charAt(0).toUpperCase() + str.slice(1)
  return ''
}

export default {
  name: 'ConnectivityInfo',
  components: {
    Button,
    Container,
    Icon,
    ElIconArrowUp,
    ElIconArrowDown,
    ElIconWarning,
    ExternalResourceCard,
    CopyToClipboard,
    ConnectivityGraph,
  },
  props: {
    entry: {
      type: Object,
      default: () => ({
        destinations: [],
        origins: [],
        components: [],
        destinationsWithDatasets: [],
        originsWithDatasets: [],
        componentsWithDatasets: [],
        resource: undefined,
        featuresAlert: undefined,
      }),
    },
    envVars: {
      type: Object,
      default: () => {},
    },
    availableAnatomyFacets: {
      type: Array,
      default: () => [],
    },
  },
  data: function () {
    return {
      controller: undefined,
      activeSpecies: undefined,
      pubmedSearchUrl: '',
      loading: false,
      facetList: [],
      showToolip: false,
      showDetails: false,
      originDescriptions: {
        motor: 'is the location of the initial cell body of the circuit',
        sensory: 'is the location of the initial cell body in the PNS circuit',
      },
      componentsWithDatasets: [],
      uberons: [{ id: undefined, name: undefined }],
    }
  },
  watch: {
    availableAnatomyFacets: {
      handler: function (val) {
        this.convertFacetsToList(val)
      },
      immediate: true,
      deep: true,
    },
  },
  computed: {
    updatedCopyContent: function () {
      return this.getUpdateCopyContent();
    },
    resources: function () {
      let resources = [];
      if (this.entry && this.entry.hyperlinks) {
        resources = this.entry.hyperlinks;
      }
      return resources;
    },
    originDescription: function () {
      if (
        this.entry &&
        this.entry.title &&
        this.entry.title.toLowerCase().includes('motor')
      ) {
        return this.originDescriptions.motor
      } else {
        return this.originDescriptions.sensory
      }
    },
    provSpeciesDescription: function () {
      let text = 'Studied in'
      this.entry.provenanceTaxonomyLabel.forEach((label) => {
        text += ` ${label},`
      })
      text = text.slice(0, -1) // remove last comma
      text += ' species'
      return text
    },
  },
  methods: {
    titleCase: function (title) {
      return titleCase(title)
    },
    capitalise: function (text) {
      return capitalise(text)
    },
    openUrl: function (url) {
      window.open(url, '_blank')
    },
    openAll: function () {
      EventBus.emit('onConnectivityActionClick', {
        type: 'Facets',
        labels: this.entry.componentsWithDatasets.map((a) => a.name.toLowerCase()),
      })
    },
    openAxons: function () {
      EventBus.emit('onConnectivityActionClick', {
        type: 'Facets',
        labels: this.entry.destinationsWithDatasets.map((a) => a.name.toLowerCase()),
      })
    },
    // shouldShowExploreButton: Checks if the feature is in the list of available anatomy facets
    shouldShowExploreButton: function (features) {
      for (let i = 0; i < features.length; i++) {
        if (this.facetList.includes(features[i].name.toLowerCase())) {
          return true
        }
      }
      return false
    },
    // convertFacetsToList: Converts the available anatomy facets to a list for easy searching
    convertFacetsToList: function (facets) {
      facets.forEach((facet) => {
        if(facet.children) {
          this.convertFacetsToList(facet.children)
        } else {
          this.facetList.push(facet.label.toLowerCase())
        }
      })
    },
    openDendrites: function () {
      EventBus.emit('onConnectivityActionClick', {
        type: 'Facets',
        labels: this.entry.originsWithDatasets.map((a) => a.name.toLowerCase()),
      })
    },
    pubmedSearchUrlUpdate: function (val) {
      this.pubmedSearchUrl = val
    },
    showConnectivity: function (entry) {
      // move the map center to highlighted area
      const featureIds = entry.featureId || [];
      // connected to flatmapvuer > moveMap(featureIds) function
      this.$emit('show-connectivity', featureIds);
    },
    goToConnectivityGraph: function () {
      const connectivityGraphRef = this.$refs.connectivityGraphRef;
      if (connectivityGraphRef && connectivityGraphRef.$el) {
        connectivityGraphRef.$el.scrollIntoView({
          behavior: 'smooth',
        });
      }
    },
    onTapNode: function (data) {
      /**
       * This event is triggered by connectivity-graph's `tap-node` event.
       */
      this.$emit('connectivity-component-click', data);
    },
    getUpdateCopyContent: function () {
      if (!this.entry) {
        return '';
      }

      const contentArray = [];

      // Use <div> instead of <h1>..<h6> or <p>
      // to avoid default formatting on font size and margin

      // Title
      if (this.entry.title) {
        contentArray.push(`<div><strong>${capitalise(this.entry.title)}</strong></div>`);
      } else {
        contentArray.push(`<div><strong>${this.entry.featureId}</strong></div>`);
      }

      // Description
      if (this.entry.provenanceTaxonomyLabel?.length) {
        contentArray.push(`<div>${this.provSpeciesDescription}</div>`);
      }

      // PubMed URL
      if (this.resources?.length) {
        const pubmedContents = [];
        this.resources.forEach((resource) => {
          let pubmedContent = '';
          if (resource.id === 'pubmed') {
            pubmedContent += `<div><strong>PubMed URL:</strong></div>`;
            pubmedContent += '\n';
            pubmedContent += `<div><a href="${resource.url}">${resource.url}</a></div>`;
          }
          pubmedContents.push(pubmedContent);
        });
        contentArray.push(pubmedContents.join('\n\n<br>'));
      }

      // entry.paths
      if (this.entry.paths) {
        contentArray.push(`<div>${this.entry.paths}</div>`);
      }

      function transformData(title, items, itemsWithDatasets = []) {
        let contentString = `<div><strong>${title}</strong></div>`;
        const transformedItems = [];
        items.forEach((item) => {
          let itemNames = [];
          item.split(',').forEach((name) => {
            const match = itemsWithDatasets.find((a) => a.name === name.trim());
            if (match) {
              itemNames.push(`${capitalise(name)} (${match.id})`);
            } else {
              itemNames.push(`${capitalise(name)}`);
            }
          });
          transformedItems.push(itemNames.join(','));
        });
        const contentList = transformedItems
          .map((item) => `<li>${item}</li>`)
          .join('\n');
        contentString += '\n';
        contentString += `<ul>${contentList}</ul>`;
        return contentString;
      }

      // Origins
      if (this.entry.origins?.length) {
        const title = 'Origin';
        const origins = this.entry.origins;
        const originsWithDatasets = this.entry.originsWithDatasets;
        const transformedOrigins = transformData(title, origins, originsWithDatasets);
        contentArray.push(transformedOrigins);
      }

      // Components
      if (this.entry.components?.length) {
        const title = 'Components';
        const components = this.entry.components;
        const componentsWithDatasets = this.entry.componentsWithDatasets;
        const transformedComponents = transformData(title, components, componentsWithDatasets);
        contentArray.push(transformedComponents);
      }

      // Destination
      if (this.entry.destinations?.length) {
        const title = 'Destination';
        const destinations = this.entry.destinations;
        const destinationsWithDatasets = this.entry.destinationsWithDatasets;
        const transformedDestinations = transformData(title, destinations, destinationsWithDatasets);
        contentArray.push(transformedDestinations);
      }

      return contentArray.join('\n\n<br>');
    },
  },
  mounted: function () {
    EventBus.on('connectivity-graph-error', (errorMessage) => {
      const connectivityGraphRef = this.$refs.connectivityGraphRef;

      if (connectivityGraphRef) {
        connectivityGraphRef.showErrorMessage(errorMessage);
      }
    });
  },
}
</script>

<style lang="scss" scoped>

.display {
  width: 44px;
  word-break: normal;
}

.connectivity-info-title {
  padding: 0;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 1rem;
}

.title {
  text-align: left;
  // width: 16em;
  line-height: 1.3em !important;
  font-size: 18px;
  font-family: Helvetica;
  font-weight: bold;
  padding-bottom: 8px;
  color: $app-primary-color;
}

.block + .block {
  margin-top: 0.5em;
}

.button-circle {
  margin: 0;
  width: 24px !important;
  height: 24px !important;

  &,
  &:hover,
  &:focus,
  &:active {
    background-color: $app-primary-color;
    border-color: $app-primary-color;
  }
}

.icon {
  right: 0px;
  position: absolute;
  top: 10px;
}

.icon:hover {
  cursor: pointer;
}

:deep(.popover-origin-help.el-popover) {
  text-transform: none !important; // need to overide the tooltip text transform
  border: 1px solid $app-primary-color;
  font-weight: 400;
  font-family: Asap, sans-serif, Helvetica;

  .el-popper__arrow {
    &:before {
      border-color: $app-primary-color;
      background-color: #ffffff;
    }
  }
}

.info,
.alert {
  color: #8300bf;
}

.info {
  transform: rotate(180deg);
  margin-left: 8px;
}

.alert {
  margin-left: 5px;
  vertical-align: text-bottom;

  &,
  > svg {
    width: 1.25rem;
    height: 1.25rem;
  }
}

.seperator {
  width: 90%;
  height: 1px;
  background-color: #bfbec2;
}

.hide {
  color: $app-primary-color;
  cursor: pointer;
  margin-right: 6px;
  margin-top: 3px;
}

.slide-fade-enter-active {
  transition: opacity 0.5s, transform 0.5s;
}
.slide-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.slide-fade-enter, .slide-fade-leave-to /* .slide-fade-leave-active in <2.1.8 */ {
  opacity: 0;
  transform: translateY(-8px);
}

.main {
  font-size: 14px;
  text-align: left;
  line-height: 1.5em;
  font-family: Asap, sans-serif, Helvetica;
  font-weight: 400;
  /* outline: thin red solid; */
  overflow-y: auto;
  scrollbar-width: thin;
  min-width: 16rem;
  background-color: #f7faff;
  height: 100%;
  border-left: 1px solid var(--el-border-color);
  border-top: 1px solid var(--el-border-color);
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  padding: 1rem;
}

.attribute-title-container {
  margin-bottom: 0.5em;
}

.attribute-title {
  font-size: 16px;
  font-weight: 600;
  /* font-weight: bold; */
  text-transform: uppercase;
}

.attribute-content {
  font-size: 14px;
  font-weight: 500;

  &:last-of-type {
    margin-bottom: 0.5em;
  }
}

.popover-container {
  height: 100%;
  width: 100%;
}

.main {
  .el-button.is-round {
    border-radius: 4px;
    padding: 9px 20px 10px 20px;
    display: flex;
    height: 36px;
  }
}

.button {
  margin-left: 0px !important;
  margin-top: 0px !important;
  font-size: 14px !important;
  background-color: $app-primary-color;
  color: #fff;
  & + .button {
    margin-top: 10px !important;
  }
  &:hover {
    color: #fff !important;
    background: #ac76c5 !important;
    border: 1px solid #ac76c5 !important;
  }
}

.tooltip-container {
  &::after,
  &::before {
    content: '';
    display: block;
    position: absolute;
    width: 0;
    height: 0;
    border-style: solid;
    flex-shrink: 0;
  }
  .tooltip {
    &::after {
      display: none;
    }
    &::before {
      display: none;
    }
  }
}

.maplibregl-popup-anchor-bottom {
  .tooltip-container {
    &::after,
    &::before {
      top: 100%;
      border-width: 12px;
    }
    &::after {
      margin-top: -1px;
      border-color: rgb(255, 255, 255) transparent transparent transparent;
    }
    &::before {
      margin: 0 auto;
      border-color: $app-primary-color transparent transparent transparent;
    }
  }
}

.maplibregl-popup-anchor-top {
  .tooltip-container {
    &::after,
    &::before {
      top: -24px;
      border-width: 12px;
    }
    &::after {
      margin-top: 1px;
      border-color: transparent transparent rgb(255, 255, 255) transparent;
    }
    &::before {
      margin: 0 auto;
      border-color: transparent transparent $app-primary-color transparent;
    }
  }
}

.content-container {
  flex: 1 1 100%;
  padding: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  > div,
  > .block + .block {
    margin: 0;
  }
}

/* Fix for chrome bug where under triangle pops up above one on top of it  */
.selector:not(*:root),
.tooltip-container::after {
  top: 99.4%;
}

.title-buttons {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;

  :deep(.copy-clipboard-button) {
    &,
    &:hover,
    &:focus {
      border-color: $app-primary-color !important;
      border-radius: 50%;
    }
  }
}

:deep(.el-popper.popover-map-pin) {
  padding: 4px 10px;
  min-width: max-content;
  font-family: Asap;
  font-size: 12px;
  line-height: inherit;
  color: inherit;
  background: #f3ecf6 !important;
  border: 1px solid $app-primary-color;

  & .el-popper__arrow::before {
    border: 1px solid;
    border-color: $app-primary-color;
    background: #f3ecf6;
  }
}
</style>
