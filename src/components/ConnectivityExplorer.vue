<template>
  <el-card :body-style="bodyStyle" class="content-card">
    <MapSvgSpriteColor />
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
          @click="onResetClick"
          size="large"
        >
          Reset
        </el-button>
        <div v-if="showVisibilityFilter" class="visibility-filter">
          <el-checkbox
            v-model="filterVisibility"
          >
          Focused
          </el-checkbox>
          <el-popover
            title="How does focused checkbox work?"
            width="250"
            trigger="hover"
            popper-class="filter-help-popover"
          >
            <template #reference>
              <MapSvgIcon icon="help" class="help" />
            </template>
            <div>
              <strong>Checked:</strong>
              <br />
              Display listed or highlighted items only.
              <br />
              <br />
              <strong>Unchecked:</strong>
              <br />
              Display listed or highlighted items in full colour and non-listed items in greyscale.
            </div>
          </el-popover>
        </div>
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
      @mouseleave="onHoverChanged($event, undefined)"
    >
      <div class="error-feedback" v-if="results.length === 0 && !loadingCards">
        No results found - Please change your search / filter criteria.
      </div>
      <div
        v-for="result in paginatedResults"
        :key="result.id"
        :ref="'stepItem-'  + result.id"
        class="step-item"
        @mouseenter="onHoverChanged($event, result)"
      >
        <ConnectivityCard
          v-show="expanded !== result.id"
          class="connectivity-card"
          :entry="result"
          :connectivityEntry="connectivityEntry"
          @open-connectivity="onConnectivityCollapseChange"
        />
        <ConnectivityInfo
          v-if="expanded === result.id"
          class="connectivity-info"
          :entryId="result.id"
          :connectivityEntry="connectivityEntry"
          :availableAnatomyFacets="availableAnatomyFacets"
          :envVars="envVars"
          :withCloseButton="true"
          @show-connectivity="onShowConnectivity"
          @show-reference-connectivities="onShowReferenceConnectivities"
          @connectivity-clicked="onConnectivityClicked"
          @connectivity-hovered="$emit('connectivity-hovered', $event)"
          @loaded="onConnectivityInfoLoaded(result)"
          @close-connectivity="onConnectivityCollapseChange(result)"
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
  ElCheckbox as Checkbox,
  ElIcon as Icon,
  ElInput as Input,
  ElPagination as Pagination,
  ElMessage as Message,
} from "element-plus";
import 'element-plus/es/components/message/style/css';
import EventBus from './EventBus.js'
import SearchFilters from "./SearchFilters.vue";
import SearchHistory from "./SearchHistory.vue";
import ConnectivityCard from "./ConnectivityCard.vue";
import ConnectivityInfo from "./ConnectivityInfo.vue";
import { MapSvgIcon, MapSvgSpriteColor } from "@abi-software/svg-sprite";

var initial_state = {
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
    Checkbox,
    Icon,
    Input,
    Pagination,
    MapSvgIcon,
    MapSvgSpriteColor
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
    connectivityFilterOptions: {
      type: Array,
      default: [],
    },
    showVisibilityFilter: {
      type: Boolean,
      default: false,
    }
  },
  data: function () {
    return {
      ...this.entry,
      bodyStyle: {
        flex: "1 1 auto",
        "flex-flow": "column",
        display: "flex",
      },
      cascaderIsReady: false,
      freezeTimeout: undefined,
      freezed: false,
      initLoading: true,
      expanded: "",
      filterVisibility: true,
      expandedData: null,
    };
  },
  computed: {
    // This computed property populates filter data's entry object with $data from this sidebar
    filterEntry: function () {
      return {
        numberOfHits: this.numberOfHits,
        filterFacets: this.filter,
        options: this.connectivityFilterOptions,
        showFilters: true,
        helper: {
          within: "'CNS' OR 'Local circuit neuron'",
          between: "'Somatic lower motor' AND 'Human'"
        }
      };
    },
    paginatedResults: function () {
      return this.results.slice(this.start, this.start + this.numberPerPage);
    },
  },
  watch: {
    connectivityKnowledge: function (newVal, oldVal) {
      this.expanded = ""; // reset expanded state
      this.expandedData = null;
      this.loadingCards = false;
      if (JSON.stringify(newVal) !== JSON.stringify(oldVal)) {
        this.results = newVal;
        this.initLoading = false;
        this.numberOfHits = this.results.length;
        // knowledge is from the neuron click if there is 'ready' property
        if (this.numberOfHits === 1 && !('ready' in this.results[0])) {
          this.onConnectivityCollapseChange(this.results[0]);
        }
        if (this.numberOfHits > 0 && ('ready' in this.results[0])) {
          this.$refs.filtersRef.checkShowAllBoxes();
          this.searchInput = '';
          this.filter = [];
        }
      }
    },
    // watch for connectivityEntry changes
    // card should be expanded if there is only one entry and it is ready
    connectivityEntry: function (newVal, oldVal) {
      if (
        JSON.stringify(newVal) !== JSON.stringify(oldVal) &&
        newVal.length === 1 && newVal[0].ready
      ) {
        // if the changed property is connectivity source,
        // or two different maps in split view, do not collapse
        if (
          (
            newVal[0].connectivitySource !== oldVal[0].connectivitySource ||
            newVal[0].mapId !== oldVal[0].mapId
          ) &&
          oldVal[0].ready
        ) {
          return;
        }
        this.collapseChange(newVal[0]);
      }
    },
    paginatedResults: function () {
      this.loadingCards = false;
    },
    filterVisibility: function (state) {
      this.filterVisibility = state;
      this.$emit('filter-visibility', this.filterVisibility);
    },
  },
  methods: {
    freezeHoverChange: function () {
      this.freezed = true;
      if (this.freezeTimeout) {
        clearTimeout(this.freezeTimeout);
      }
      this.freezeTimeout = setTimeout(() => {
        this.freezed = false;
      }, 3000)
    },
    onShowConnectivity: function (data) {
      this.freezeHoverChange();
      this.$emit('show-connectivity', data);
    },
    onShowReferenceConnectivities: function (data) {
      this.freezeHoverChange();
      this.$emit('show-reference-connectivities', data);
    },
    onConnectivityClicked: function (data) {
      this.searchInput = data.query;
      this.filter = data.filter;
      this.searchAndFilterUpdate();
    },
    collapseChange:function (data) {
      this.expanded = this.expanded === data.id ? "" : data.id;
      this.expandedData = this.expanded ? data : null;
    },
    closeConnectivity: function () {
      if (!this.expanded) {
        this.$emit('connectivity-item-close');
      }
    },
    onConnectivityCollapseChange: function (data) {
      // close connectivity event will not trigger emit
      if (this.connectivityEntry.find(entry => entry.featureId[0] === data.id)) {
        this.collapseChange(data);
        this.closeConnectivity();
      } else {
        this.expanded = "";
        this.expandedData = null;
        // Make sure to emit the change after the next DOM update
        this.$nextTick(() => {
          this.$emit("connectivity-collapse-change", data);
        });
      }
    },
    onHoverChanged: function (event, data) {
      const { target } = event;

      // mouseleave event won't trigger if the connectivity explorer tab is not in view
      // e.g., switching to annotation tab on item click
      if (data || (target && target.checkVisibility())) {
        this.hoverChanged(data)
      }
    },
    hoverChanged: function (data) {
      // disable hover changes when show connectivity is clicked
      if (!this.freezed) {
        let payload = { tabType: "connectivity" };

        if (data) {
          payload = {...payload, ...data};
        } else if (this.expandedData) {
          payload = {...payload, ...this.expandedData};
        }

        this.$emit("hover-changed", payload);
      }
    },
    resetSearch: function () {
      this.numberOfHits = 0;
      this.results = [];
      this.loadingCards = false;
    },
    resetSearchIfNoActiveSearch: function() {
      const hasValidFacet = this.filter.some(f => f.facet !== "Show all");
      if ((!this.searchInput && !hasValidFacet) || this.numberOfHits === 0) {
        this.openSearch([], '');
      }
    },
    onResetClick: function () {
      this.openSearch([], '');
      this.$emit('connectivity-explorer-reset', []);
    },
    openSearch: function (filter, search = "") {
      this.searchInput = search;
      this.resetPageNavigation();
      //Proceed normally if cascader is ready
      if (this.cascaderIsReady) {
        const validatedFilters = this.$refs.filtersRef.getHierarchicalValidatedFilters(filter);
        const notFoundItems = validatedFilters.notFound || [];
        this.filter = validatedFilters.result;

        // Show not found filter items warning message
        notFoundItems.forEach((notFoundItem) => {
          const itemLabel = notFoundItem.tagLabel || notFoundItem.facet;
          Message({
            message: `${itemLabel} cannot be found in ${notFoundItem.term}!`,
            appendTo: this.$el,
            showClose: true,
            offset: 113,
          });
        });

        if (notFoundItems.length) {
          this.$emit('connectivity-explorer-reset', notFoundItems);
        }

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
          this.searchKnowledge(this.filter, search);
          this.$refs.filtersRef.setCascader(this.filter);
          this.searchHistoryUpdate(this.filter, search);
        }
      } else {
        //cascader is not ready, perform search if no filter is set,
        //otherwise waith for cascader to be ready
        this.filter = filter;
        if (!filter || filter.length == 0) {
          this.searchKnowledge(this.filter, search);
          this.searchHistoryUpdate(this.filter, search);
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
    },
    searchEvent: function (event = false) {
      if (event.keyCode === 13 || event instanceof MouseEvent) {
        this.searchInput = this.searchInput.trim();
        this.searchAndFilterUpdate();
      }
    },
    filterUpdate: function (filters) {
      this.filter = [...filters];
      this.searchAndFilterUpdate();
      // this.$emit("search-changed", {
      //   value: filters,
      //   tabType: "connectivity",
      //   type: "filter-update",
      // });
    },
    searchAndFilterUpdate: function () {
      this.resetPageNavigation();
      this.searchKnowledge(this.filter, this.searchInput);
      this.searchHistoryUpdate(this.filter, this.searchInput);
    },
    searchHistoryUpdate: function (filters, search) {
      this.$refs.searchHistory.selectValue = 'Search history';
      // save history only if there has value
      if (filters.length || search?.trim()) {
        this.$refs.searchHistory.addSearchToHistory(this.filter, search);
      }
    },
    searchKnowledge: function (filters, query = "") {
      this.expanded = "";
      this.expandedData = null;
      this.loadingCards = true;
      this.scrollToTop();
      this.$emit("search-changed", {
        // value: this.searchInput,
        // type: "query-update",
        query: query,
        filter: filters,
        tabType: "connectivity",
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
      this.searchKnowledge(this.filter, this.searchInput);
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
      this.filter = item.filters;
      this.openSearch([...item.filters], item.search);
    },
    onConnectivityInfoLoaded: function (result) {
      const stepItemRef = this.$refs['stepItem-' + result.id];
      const contentRef = this.$refs['content'];
      this.$nextTick(() => {
        if (contentRef && stepItemRef && stepItemRef[0]) {
          contentRef.scrollTop = stepItemRef[0].offsetTop;
        }
      });
    },
  },
  mounted: function () {
    localStorage.removeItem('connectivity-active-view');
    this.openSearch(this.filter, this.searchInput);

    EventBus.on('close-connectivity', () => {
      this.expanded = '';
      this.expandedData = null;
    });
  },
};
</script>

<style lang="scss" scoped>
@import '../assets/pagination.scss';

.connectivity-card {
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
  transition: all 0.3s ease;

  .connectivity-card {
    max-height: 200px;
  }
  .connectivity-info {
    background-color: #f7faff;
    border: 2px solid $app-primary-color;
    border-radius: var(--el-border-radius-base);
  }
}

.search-input {
  width: 298px !important;
  height: 40px;
  padding-right: 14px;
  font-family: inherit;

  :deep(.el-input__inner) {
    font-family: inherit;
  }
}

.header {
  display: flex;
  align-items: center;

  .el-button {
    font-family: inherit;

    &:hover,
    &:focus {
      background: $app-primary-color;
      box-shadow: -3px 2px 4px #00000040;
      color: #ffffff;
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

.content-card :deep(.el-message) {
  position: absolute !important;
  width: 80%;
  font-size: 12px;
  border-radius: var(--el-border-radius-base);
  --el-message-bg-color: var(--el-color-error-light-9);
  --el-message-border-color: var(--el-color-error);
  --el-message-text-color: var(--el-text-color-primary);

  .el-icon.el-message__icon {
    display: none;
  }

  .el-message__closeBtn {
    margin-left: auto;
  }
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
  position: relative;
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
  border-color: transparent !important;
  background-color: transparent !important;
  padding: 2px !important;
  height: auto !important;
  margin-left: 4px!important;

  &:hover {
    text-decoration-color: transparent;
    box-shadow: none !important;
  }
}

.visibility-filter {
  display: flex;
  align-items: center;
  padding-left: 16px;

  :deep(.el-checkbox__label) {
    padding-left: 4px !important;
    color: #fff !important;
  }

  :deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
    color: #f9f2fc !important;
  }
}

.help {
  width: 24px !important;
  height: 24px;
  transform: scale(1.1);
  cursor: pointer;
  color: #ffffff !important;
}

.filter-help-popover {
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
</style>
