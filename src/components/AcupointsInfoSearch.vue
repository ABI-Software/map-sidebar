<template>
  <div v-if="entry" class="main">
    <div class="header">
      <el-row>
        <el-input
          class="search-input"
          placeholder="Search"
          v-model="searchInput"
          @keyup="search(searchInput)"
          clearable
          @clear="clearSearchClicked"
        ></el-input>
        <el-button
          v-show="false"
          type="primary"
          class="button"
          @click="search(searchInput)"
          size="large"
        >
          Search
        </el-button>
      </el-row>
    </div>
    <SearchFilters
      v-if="filterEntry.options"
      class="filters"
      ref="filtersRef"
      :entry="filterEntry"
      @filterResults="filterUpdate"
      @numberPerPage="numberPerPageUpdate"
      @cascaderReady="cascaderReady"
    ></SearchFilters>
    <div class="content scrollbar" ref="content">
      <div v-if="paginatedResults.length > 0" v-for="result in paginatedResults" :key="result.Acupoint" class="step-item">
        <AcupointsCard
          class="dataset-card"
          :entry="result"
          @mouseenter="hoverChanged(result)"
          @mouseleave="hoverChanged(undefined)"
        />
      </div>
      <div v-else class="error-feedback">
        No results found - Please change your search / filter criteria.
      </div>
      <el-pagination
        class="pagination"
        v-model:current-page="page"
        hide-on-single-page
        large
        layout="prev, pager, next"
        :page-size="numberPerPage"
        :total="numberOfHits"
        @current-change="pageChange"
      ></el-pagination>
    </div>
  </div>
</template>

<script>
/* eslint-disable no-alert, no-console */
import { markRaw } from 'vue';
import {
  ElButton as Button,
  ElCard as Card,
  ElCol as Col,
  ElRadioButton as RadioButton,
  ElRadioGroup as RadioGroup,
  ElDrawer as Drawer,
  ElIcon as Icon,
  ElInput as Input,
  ElPagination as Pagination,
  ElRow as Row,
} from 'element-plus'
import AcupointsCard from './AcupointsCard.vue'
import SearchFilters from "./SearchFilters.vue"

export default {
  components: {
    AcupointsCard,
    Button,
    Card,
    Col,
    RadioButton,
    RadioGroup,
    SearchFilters,
    Drawer,
    Icon,
    Input,
    Pagination,
    Row
  },
  name: 'AcupointsInfoSearch',
  props: {
    entry: {
      type: Object,
      default: () => {},
    },
  },
  created: function() {
    if (this.entry) {
      let entries = Object.values(this.entry)
      const meridians = []
      let others = false
      entries.forEach((acupoint) => {
        let meridian = acupoint.Meridian
        if (!meridian) {
          others = true
        } else if (!(meridians.includes(meridian))) {
          meridians.push(meridian)
        }
      });
      meridians.sort();
      if (others) {
        meridians.push("Others")
      }
      if (meridians.length > 1) {
        const filterOption = {
          "key": "acupoints.meridian",
          "label": "Meridian",
          "children": [
          ],
        }
        meridians.forEach(meridian => {
          const entry = {
            "key": `acupoints.meridian.${meridian}`,
            "label": meridian,
            "value": meridian,
          }
          filterOption.children.push(entry)
        })
        this.filterOptions.unshift(filterOption)
        this.filters.unshift({
          "facetPropPath": "acupoints.meridian",
          "facet": "Show all",
          "term": "Meridian"
        })
      }
    }
  },
  computed: {
    // This computed property populates filter data's entry object with $data from this sidebar
    filterEntry: function () {
      return {
        numberOfHits: this.numberOfHits,
        filterFacets: this.filters,
        options: this.filterOptions,
        showFilters: true,
      };
    },
  },
  data: function () {
    return {
      filters: [
          {
              "facetPropPath": "acupoints.WHO",
              "facet": "WHO",
              "term": "WHO",
              "tagLabel": "WHO"
          },
          {
              "facetPropPath": "acupoints.visualized",
              "facet": "Show all",
              "term": "Visualized"
          },
          {
              "facetPropPath": "acupoints.implied",
              "facet": "Show all",
              "term": "Implied"
          },
          {
              "facetPropPath": "acupoints.userDefined",
              "facet": "Show all",
              "term": "user"
          }
      ],
      filterOptions: [
        {
          "key": "acupoints.visualized",
          "label": "Visualized",
          "children": [
            {
                "key": "acupoints.visualized.yes",
                "label": "Visualized",
                "value": "Visualized>Yes"
            },
            {
              "key": "acupoints.visualized.no",
              "label": "Non visualized",
              "value": "Visualized>No"
            },
          ],
        },
        {
          "key": "acupoints.implied",
          "label": "Implied",
          "children": [
            {
                "key": "acupoints.implied.yes",
                "label": "Implied",
                "value": "Implied>Yes"
            },
            {
              "key": "acupoints.implied.no",
              "label": "Non Implied",
              "value": "Implied>No"
            },
          ],
        },
        {
          "key": "acupoints.WHO",
          "label": "WHO",
          "children": [
            {
                "key": "acupoints.WHO.yes",
                "label": "WHO",
                "value": "WHO>Yes"
            },
            {
              "key": "acupoints.WHO.no",
              "label": "Non WHO",
              "value": "WHO>No"
            },
          ],
        },
        {
          "key": "acupoints.userDefined",
          "label": "User Defined",
          "children": [
            {
                "key": "acupoints.userDefined.yes",
                "label": "User data",
                "value": "userDefined>Yes"
            },
            {
              "key": "acupoints.userDefined.no",
              "label": "Official data",
              "value": "userDefined>No"
            },
          ],
        },
      ],
      currentFilters: markRaw({
        curated: "Both",
        mri: "Both",
        who: "Both",
        userDefined: "Both",
        meridian: {
          showAll: true,
          list: []
        },
      }),
      results: [],
      paginatedResults: [],
      searchInput: "",
      lastSearch: "",
      numberOfHits: 0,
      numberPerPage: 10,
      page: 1,
    }
  },
  watch: {
    entry: {
      handler: function () {
        this.filterUpdate(this.filters)
      },
      immediate: true,
      deep: true,
    },
  },
  methods: {
    cascaderReady: function () {
      this.cascaderIsReady = true;
      this.search(this.searchInput);
    },
    filterUpdate: function (filters) {
      this.filters = [...filters]
      this.currentFilters['meridian']['list'] = []
      this.filters.forEach((filter) => {
        if (filter.facetPropPath === "acupoints.visualized") {
          if (filter.facet === "Visualized") {
            this.currentFilters['curated'] = 'Curated'
          } else if (filter.facet === 'Non visualized') {
            this.currentFilters['curated'] = 'Uncurated'
          } else {
            this.currentFilters['curated'] = 'Both'
          }
        }
        if (filter.facetPropPath === "acupoints.implied") {
          if (filter.facet === "Implied") {
            this.currentFilters['mri'] = 'Off'
          } else if (filter.facet === 'Non Implied') {
            this.currentFilters['mri'] = 'On'
          } else {
            this.currentFilters['mri'] = 'Both'
          }
        }
        if (filter.facetPropPath === "acupoints.WHO") {
          if (filter.facet === "WHO") {
            this.currentFilters['who'] = 'Yes'
          } else if (filter.facet === 'Non who') {
            this.currentFilters['who'] = 'No'
          } else {
            this.currentFilters['who'] = 'Both'
          }
        }
        if (filter.facetPropPath === "acupoints.userDefined") {
          if (filter.facet === "User data") {
            this.currentFilters['userDefined'] = 'Yes'
          } else if (filter.facet === 'Official data') {
            this.currentFilters['userDefined'] = 'No'
          } else {
            this.currentFilters['userDefined'] = 'Both'
          }
        }
        if (filter.facetPropPath === "acupoints.meridian") {
          if (filter.facet === "Show all") {
            this.currentFilters['meridian']['showAll'] = true
          } else {
            this.currentFilters['meridian']['showAll'] = false
            this.currentFilters['meridian']['list'].push(filter.facet.toLowerCase())
          }
        }
      });

      this.search( this.searchInput)

      //this.search();
      // this.$emit("search-changed", {
      //   value: filters,
      //   tabType: "connectivity",
      //   type: "filter-update",
      // });
    },
    numberPerPageUpdate: function (val) {
      this.numberPerPage = val;
      this.pageChange(1);
    },
    hoverChanged: function (data) {
      this.$emit('hover-changed', data)
    },
    resetSearch: function () {
      this.numberOfHits = 0
      this.search(this.searchInput)
    },
    clearSearchClicked: function () {
      this.searchInput = '';
      this.search("");
    },
    getFilteredList: function() {
      let filteredList = Object.values(this.entry)
      if (this.currentFilters['curated'] !== "Both") {
        const curated = this.currentFilters['curated'] === "Curated" ? true : false
        filteredList = filteredList.filter(
          item => (item.Curated ? true : false) === curated)
      }
      if (this.currentFilters['mri'] !== "Both") {
        const mri = this.currentFilters['mri'] === "On" ? true : false
        filteredList = filteredList.filter(
          item => (item.onMRI ? true : false) === mri)
      }
      if (this.currentFilters['who'] !== "Both") {
        const who = this.currentFilters['who'] === "Yes" ? true : false
        filteredList = filteredList.filter(
          item => (item["Meridian Point"] ? true : false) === who)
      }
      if (this.currentFilters['userDefined'] !== "Both") {
        const user = this.currentFilters['userDefined'] === "Yes" ? true : false
        filteredList = filteredList.filter(
          item => (item["userDefined"] ? true : false) === user)
      }
      if (!this.currentFilters['meridian']['showAll']) {
        filteredList = filteredList.filter((item) => {
          let meridian = "others"
          if (item.Meridian) {
            meridian = item.Meridian.toLowerCase()
          }
          return this.currentFilters['meridian']['list'].includes(meridian)
        })
      }
      return filteredList;
    },
    search: function(input) {
      this.results = []
      let filteredList = this.getFilteredList()
      if (input === "") {
        this.results = filteredList
      } else {
        const lowerCase = input.toLowerCase()
        for (const value of filteredList) {
          const searchFields = [
            value["Acupoint"],
            value["Synonym"],
            value["Chinese Name"],
            value["English Name"],
            value["Reference"],
            value["Indications"],
            value["Acupuncture Method"],
            value["Vasculature"],
            value["Innervation"],
            value["Note"],
          ];
          const allstrings = searchFields.join();
          const myJSON = allstrings.toLowerCase();
          if (myJSON.includes(lowerCase)) {
            this.results.push(value)
          }
        }
      }
      this.results.sort((a, b) => {
        if (a["Meridian Point"] == b["Meridian Point"]) {
          return 0
        } else if (a["Meridian Point"]) {
          return -1
        } else {
          return 1
        }
      })

      const start = this.numberPerPage * (this.page - 1)
      this.paginatedResults = this.results.slice(start, start + this.numberPerPage)
      this.numberOfHits = this.results.length
      this.searchInput = input
      this.lastSearch = input
      this.$emit("acupoints-result", {
        list: this.results
      });
    },
    numberPerPageUpdate: function (val) {
      this.numberPerPage = val
      this.pageChange(1)
    },
    pageChange: function (page) {
      this.page = page
      this.search( this.searchInput)
    },
    scrollToTop: function () {
      if (this.$refs.content) {
        this.$refs.content.scroll({ top: 0, behavior: 'smooth' })
      }
    },
    resetPageNavigation: function () {
      this.page = 1
    },
  },
}
</script>

<style lang="scss" scoped>

.acuRadioGroup {
  padding-top: 8px;
}

.dataset-card {
  position: relative;

  &::before {
    content: "";
    display: block;
    width: calc(100% - 15px);
    height: 100%;
    position: absolute;
    top: 7px;
    left: 7px;
    border-style: solid;
    border-radius: 5px;
    border-color: transparent;
  }

  &:hover {
    &::before {
      border-color: var(--el-color-primary);
    }
  }
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
  gap: 1rem;
  padding: 1rem;
}

.step-item {
  font-size: 14px;
  margin-bottom: 8px;
  text-align: left;
}

.search-input {
  width: 298px !important;
  height: 40px;
  padding-right: 14px;

  :deep(.el-input__inner) {
    font-family: inherit;
  }
}

.header {
  .el-button {
    font-family: inherit;

    &:hover,
    &:focus {
      background: $app-primary-color;
      box-shadow: -3px 2px 4px #00000040;
      color: #fff;
    }
  }
}

.pagination {
  padding-bottom: 16px;
  background-color: white;
  padding-left: 95px;
  font-weight: bold;
}

.pagination :deep(button) {
  background-color: white !important;
}
.pagination :deep(li) {
  background-color: white !important;
}
.pagination :deep(li.is-active) {
  color: $app-primary-color;
}

.error-feedback {
  font-family: Asap;
  font-size: 14px;
  font-style: italic;
  padding-top: 15px;
}

.content-card :deep(.el-card__header) {
  background-color: #292b66;
  padding: 1rem;
}

.content-card :deep(.el-card__body) {
  background-color: #f7faff;
  overflow-y: hidden;
  padding: 1rem;
}

.content {
  // width: 515px;
  flex: 1 1 auto;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.06);
  border: solid 1px #e4e7ed;
  background-color: #ffffff;
  overflow-y: scroll;
  scrollbar-width: thin;
  border-radius: var(--el-border-radius-base);
}

.content :deep(.el-loading-spinner .path) {
  stroke: $app-primary-color;
}

.content :deep(.step-item:first-child .seperator-path) {
  display: none;
}

.content :deep(.step-item:not(:first-child) .seperator-path) {
  width: 455px;
  height: 0px;
  border: solid 1px #e4e7ed;
  background-color: #e4e7ed;
}

.filter-text {
  top:4px;
  position:relative;
}

.scrollbar::-webkit-scrollbar-track {
  border-radius: 10px;
  background-color: #f5f5f5;
}

.scrollbar::-webkit-scrollbar {
  width: 12px;
  right: -12px;
  background-color: #f5f5f5;
}

.scrollbar::-webkit-scrollbar-thumb {
  border-radius: 4px;
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.06);
  background-color: #979797;
}

:deep(.el-input__suffix) {
  padding-right: 0px;
}

:deep(.my-drawer) {
  background: rgba(0, 0, 0, 0);
  box-shadow: none;
}

.error-feedback {
  font-family: Asap;
  font-size: 14px;
  font-style: italic;
  padding-top: 15px;
}
</style>
