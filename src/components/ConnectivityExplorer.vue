<template>
  <el-card :body-style="bodyStyle" class="content-card">
    <template #header>
      <div class="header">
        <el-input
          class="search-input"
          placeholder="Search"
          v-model="searchInput"
          @keyup="searchEvent"
          clearable
          @clear="clearSearchClicked"
        ></el-input>
        <el-button
          type="primary"
          class="button"
          @click="searchEvent"
          size="large"
        >
          Search
        </el-button>
        <el-button
          link
          class="el-button-link"
          @click="openSearch([], '')"
          size="large"
        >
          Reset
        </el-button>
      </div>
    </template>
    <SearchFilters
      class="filters"
      ref="filtersRef"
      :entry="filterEntry"
      :envVars="envVars"
      @filterResults="filterUpdate"
      @numberPerPage="numberPerPageUpdate"
      @loading="filtersLoading"
      @cascaderReady="cascaderReady"
    ></SearchFilters>
    <SearchHistory
      ref="searchHistory"
      localStorageKey="sparc.science-connectivity-search-history"
      @search="searchHistorySearch"
    ></SearchHistory>
    <div
      class="content scrollbar"
      v-loading="loadingCards || initLoading"
      ref="content"
      @mouseleave="hoverChanged(undefined)"
    >
      <div class="error-feedback" v-if="results.length === 0 && !loadingCards">
        No results found - Please change your search / filter criteria.
      </div>
      <div
        v-for="result in paginatedResults"
        :key="result.id"
        :ref="'stepItem-'  + result.id"
        class="step-item"
        :class="{
          'is-active': expanded === result.id && result.loaded,
          'is-loading': expanded === result.id && !result.loaded,
        }"
        @mouseenter="hoverChanged(result)"
      >
        <ConnectivityCard
          class="dataset-card"
          :entry="result"
          @connectivity-explorer-clicked="onConnectivityExplorerClicked"
        />
        <ConnectivityInfo
          v-if="expanded === result.id"
          :connectivityEntry="connectivityEntry"
          :entryId="result.id"
          :availableAnatomyFacets="availableAnatomyFacets"
          :envVars="envVars"
          :withCloseButton="true"
          @show-connectivity="$emit('show-connectivity', $event)"
          @show-reference-connectivities="$emit('show-reference-connectivities', $event)"
          @connectivity-clicked="onConnectivityClicked"
          @connectivity-hovered="$emit('connectivity-hovered', $event)"
          @loaded="onConnectivityInfoLoaded(result)"
          @close-connectivity="toggleConnectivityOpen(result)"
        />
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
  </el-card>
</template>

<script>
/* eslint-disable no-alert, no-console */
import {
  ElButton as Button,
  ElCard as Card,
  ElIcon as Icon,
  ElInput as Input,
  ElPagination as Pagination,
} from "element-plus";
import SearchFilters from "./SearchFilters.vue";
import SearchHistory from "./SearchHistory.vue";
import ConnectivityCard from "./ConnectivityCard.vue";
import ConnectivityInfo from "./ConnectivityInfo.vue";

var initial_state = {
  filters: [],
  searchInput: "",
  lastSearch: "",
  results: [],
  numberOfHits: 0,
  filter: [],
  loadingCards: false,
  numberPerPage: 10,
  page: 1,
  start: 0,
};

export default {
  components: {
    SearchFilters,
    SearchHistory,
    ConnectivityCard,
    ConnectivityInfo,
    Button,
    Card,
    Icon,
    Input,
    Pagination,
  },
  name: "ConnectivityExplorer",
  props: {
    connectivityKnowledge: {
      type: Array,
      default: [],
    },
    entry: {
      type: Object,
      default: () => initial_state,
    },
    envVars: {
      type: Object,
      default: () => {},
    },
    connectivityEntry: {
      type: Array,
      default: [],
    },
    availableAnatomyFacets: {
      type: Object,
      default: [],
    },
  },
  data: function () {
    return {
      ...this.entry,
      bodyStyle: {
        flex: "1 1 auto",
        "flex-flow": "column",
        display: "flex",
      },
      filterOptions: [
        {
          id: 3,
          key: "flatmap.connectivity.source",
          label: "Connectivity",
          children: [
            {
              facetPropPath: "flatmap.connectivity.source",
              id: 0,
              label: "Origins",
            },
            {
              facetPropPath: "flatmap.connectivity.source",
              id: 1,
              label: "Components",
            },
            {
              facetPropPath: "flatmap.connectivity.source",
              id: 2,
              label: "Destinations",
            },
          ],
        },
      ],
      cascaderIsReady: false,
      displayConnectivity: false,
      initLoading: true,
      expanded: ""
    };
  },
  computed: {
    // This computed property populates filter data's entry object with $data from this sidebar
    filterEntry: function () {
      return {
        numberOfHits: this.numberOfHits,
        filterFacets: this.filter,
        options: this.filterOptions,
        showFilters: false
      };
    },
    paginatedResults: function () {
      return this.results.slice(this.start, this.start + this.numberPerPage);
    },
  },
  watch: {
    connectivityKnowledge: function (value) {
      this.expanded = "";
      this.results = value.map((item) => {
        return {
          ...item,
          loaded: false,
        };
      });

      this.numberOfHits = this.results.length;
      this.initLoading = false;
      this.loadingCards = false;

      if (this.numberOfHits === 1) {
        this.onConnectivityExplorerClicked(this.results[0]);
      }
    },
    paginatedResults: function () {
      this.loadingCards = false;
    },
  },
  methods: {
    onConnectivityClicked: function (data) {
      this.searchInput = data.query;
      this.filters = data.filter;
      this.searchAndFilterUpdate();
    },
    toggleConnectivityOpen: function (data) {
      if (this.expanded === data.id) {
        this.expanded = "";
      } else {
        this.expanded = data.id;
      }
    },
    onConnectivityExplorerClicked: function (data) {
      data.loaded = false; // reset loading
      this.toggleConnectivityOpen(data);
      const entry = this.connectivityEntry.filter(entry => entry.featureId[0] === data.id);
      if (entry.length === 0) {
        this.$emit("connectivity-explorer-clicked", data);
      }
    },
    hoverChanged: function (data) {
      const payload = data ? { ...data, type: "connectivity" } : data;
      this.$emit("hover-changed", payload);
    },
    resetSearch: function () {
      this.numberOfHits = 0;
      this.results = [];
      this.loadingCards = false;
    },
    openSearch: function (filter, search = "", option = { withSearch: true }) {
      this.searchInput = search;
      this.resetPageNavigation();
      //Proceed normally if cascader is ready
      if (this.cascaderIsReady) {
        this.filter =
          this.$refs.filtersRef.getHierarchicalValidatedFilters(filter);
        //Facets provided but cannot find at least one valid
        //facet. Tell the users the search is invalid and reset
        //facets check boxes.
        if (
          filter &&
          filter.length > 0 &&
          this.filter &&
          this.filter.length === 0
        ) {
          this.$refs.filtersRef.checkShowAllBoxes();
          this.resetSearch();
        } else if (this.filter) {
          if (option.withSearch) {
            this.searchKnowledge(this.filter, search);
          }
          this.$refs.filtersRef.setCascader(this.filter);
        }
      } else {
        //cascader is not ready, perform search if no filter is set,
        //otherwise waith for cascader to be ready
        this.filter = filter;
        if ((!filter || filter.length == 0) && option.withSearch) {
          this.searchKnowledge(this.filter, search);
        }
      }
    },
    addFilter: function (filter) {
      if (this.cascaderIsReady) {
        this.resetPageNavigation();
        if (filter) {
          if (this.$refs.filtersRef.addFilter(filter))
            this.$refs.filtersRef.initiateSearch();
        }
      } else {
        if (Array.isArray(this.filter)) {
          this.filter.push(filter);
        } else {
          this.filter = [filter];
        }
      }
    },
    cascaderReady: function () {
      this.cascaderIsReady = true;
      this.openSearch(this.filter, this.searchInput);
    },
    clearSearchClicked: function () {
      this.searchInput = "";
      this.searchAndFilterUpdate();
      this.$refs.filtersRef.checkShowAllBoxes();
    },
    searchEvent: function (event = false) {
      if (event.keyCode === 13 || event instanceof MouseEvent) {
        this.searchInput = this.searchInput.trim();
        this.searchAndFilterUpdate();
        if (!this.searchInput) {
          this.$refs.filtersRef.checkShowAllBoxes();
        }
      }
    },
    filterUpdate: function (filters) {
      this.filters = [...filters];
      this.searchAndFilterUpdate();
      this.$emit("search-changed", {
        value: filters,
        type: "filter-update",
      });
    },
    /**
     * Transform filters for third level items to perform search
     * because cascader keeps adding it back.
     */
    transformFiltersBeforeSearch: function (filters) {
      return filters.map((filter) => {
        if (filter.facet2) {
          filter.facet = filter.facet2;
          delete filter.facet2;
        }
        return filter;
      });
    },
    searchAndFilterUpdate: function () {
      this.resetPageNavigation();
      const transformedFilters = this.transformFiltersBeforeSearch(
        this.filters
      );
      this.searchKnowledge(transformedFilters, this.searchInput);
    },
    searchKnowledge: function (filters, query = "") {
      this.expanded = "";
      this.$refs.searchHistory.selectValue = "Search history";
      if (this.searchInput.trim()) {
        this.$refs.searchHistory.addSearchToHistory(
          this.filters,
          this.searchInput
        );
      }
      this.loadingCards = true;
      this.scrollToTop();
      this.$emit("search-changed", {
        value: this.searchInput,
        type: "query-update",
      });
      this.lastSearch = query;
    },
    filtersLoading: function (val) {
      this.loadingCards = val;
    },
    numberPerPageUpdate: function (val) {
      this.numberPerPage = val;
      this.pageChange(1);
    },
    pageChange: function (page) {
      this.start = (page - 1) * this.numberPerPage;
      this.page = page;
      this.searchKnowledge(this.filters, this.searchInput);
    },
    scrollToTop: function () {
      if (this.$refs.content) {
        this.$refs.content.scroll({ top: 0, behavior: "smooth" });
      }
    },
    resetPageNavigation: function () {
      this.start = 0;
      this.page = 1;
    },
    searchHistorySearch: function (item) {
      this.searchInput = item.search;
      this.filters = item.filters;
      this.searchAndFilterUpdate();
    },
    onConnectivityInfoLoaded: function (result) {
      result.loaded = true;

      const stepItemRef = this.$refs['stepItem-' + result.id];

      this.$nextTick(() => {
        if (stepItemRef && stepItemRef[0]) {
          stepItemRef[0].scrollIntoViewIfNeeded(false);
        }
      });
    },
  },
  mounted: function () {
    localStorage.removeItem('connectivity-active-view');
    this.openSearch(this.filter, this.searchInput);
  },
};
</script>

<style lang="scss" scoped>
@import '../assets/pagination.scss';

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

    :deep(.connectivity-card .title) {
      color: $app-primary-color;
    }
  }
}

.content-card {
  height: 100%;
  flex-flow: column;
  display: flex;
  border: 0;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.step-item {
  font-size: 14px;
  margin-bottom: 18px;
  text-align: left;
  max-height: 200px;
  transition: all 0.3s ease;

  .dataset-card {
    opacity: 1;
    visibility: visible;
    transition: all 0.3s ease;
  }

  &.is-active {
    max-height: 1800px;
    background-color: #f7faff;
    border: 2px solid $app-primary-color;
    border-radius: var(--el-border-radius-base);

    .dataset-card {
      pointer-events: none;

      &::before {
        display: none;
      }

      + .main {
        border: 0 none;
      }
    }

    &:not(.is-loading) {
      .dataset-card {
        opacity: 0;
        visibility: hidden;
        height: 0;
      }
    }
  }

  &.is-loading {
    opacity: 0.5;
    pointer-events: none;

    :deep(.connectivity-card .title) {
      color: $app-primary-color;
      font-size: 18px;
      letter-spacing: normal;
    }
  }
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

.el-button-link {
  color: white !important;
  text-decoration: underline;
  text-underline-offset: 2px;

  &:hover {
    text-decoration-color: transparent;
  }
}
</style>
