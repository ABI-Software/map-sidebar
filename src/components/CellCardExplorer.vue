<template>
  <el-card :body-style="bodyStyle" class="content-card">
    <template #header>
      <div class="header">
        <div class="search-input-container" :class="{'is-focus': searchInput}">
          <el-input
            class="search-input"
            placeholder="Search"
            v-model="searchInput"
            @keyup="searchEvent"
            clearable
            @clear="clearSearchClicked"
          ></el-input>
          <el-popover
            width="350"
            trigger="hover"
            popper-class="filter-help-popover"
          >
            <template #reference>
              <MapSvgIcon icon="help" class="help" />
            </template>
            <div>
              <strong>Search rules:</strong>
              <ul>
                <li>
                  <strong>Multiple Terms:</strong> Separate terms with a comma (<code>,</code>).
                </li>
              </ul>
            </div>
          </el-popover>
        </div>
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

    <!--
    <SearchHistory>
    </SearchHistory>
    -->
    <div class="content scrollbar" v-loading="loadingCards" ref="content">
      <CellCard
        v-for="cellType in cellTypes"
        :key="cellType.id"
        :cellType="cellType"
        :isActive="activeCardId === cellType.id"
        @toggle="activateCard(cellType.id)"
      />
      <el-pagination
        class="pagination"
        v-model:current-page="page"
        hide-on-single-page
        large
        layout="prev, pager, next"
        :page-size="numberPerPage"
        :total="totalFilteredCount"
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
  ElInput as Input,
  ElPagination as Pagination,
} from 'element-plus'
import 'element-plus/es/components/message/style/css';
import SearchFilters from './SearchFilters.vue'
import SearchHistory from './SearchHistory.vue'
import EventBus from './EventBus.js'
import CellCard from './CellCard.vue'
import { generateUUID } from '../utils/common.js';
import { MapSvgIcon } from '@abi-software/svg-sprite';

export default {
  components: {
    SearchFilters,
    SearchHistory,
    Button,
    Card,
    CellCard,
    Input,
    MapSvgIcon,
    Pagination,
  },
  name: 'CellCardExplorer',
  props: {
    envVars: {
      type: Object,
      default: () => {},
    },
  },
  data: function () {
    return {
      bodyStyle: {
        flex: '1 1 auto',
        'flex-flow': 'column',
        display: 'flex',
      },
      allCellTypes: [],
      cellTypes: [],
      filterOptions: [],
      activeFilters: [],
      searchInput: '',
      numberPerPage: 10,
      page: 1,
      start: 0,
      totalFilteredCount: 0,
      loadingCards: false,
      activeCardId: null,
      cascaderIsReady: false,
    };
  },
  computed: {
    filterEntry: function () {
      return {
        numberOfHits: this.totalFilteredCount,
        filterFacets: this.activeFilters,
        showFilters: true,
        options: this.filterOptions,
        helper: {
          within: "'mouse' OR 'human'",
          between: "'species' AND 'soma location'",
        },
      }
    },
  },
  mounted: function() {
    this.fetchCellTypes(this.envVars.CELL_CARDS_API);
  },
  methods: {
    fetchCellTypes: async function(url) {
      if (url) {
        this.loadingCards = true;
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          if (data.DEFAULT_CELL_TYPES) {
            const loadedCellTypes = data.DEFAULT_CELL_TYPES.map((cellType) => {
              return {
                ...cellType,
                id: generateUUID(),
              }
            });
            this.allCellTypes = loadedCellTypes;
            this.filterOptions = this.buildFilterOptions(loadedCellTypes);
            this.applyFilters(this.activeFilters);
          }
        } catch (error) {
          console.error('Error fetching cell types:', error);
        } finally {
          this.loadingCards = false;
        }
      }
    },
    activateCard: function(cardId) {
      this.activeCardId = this.activeCardId === cardId ? null : cardId;
    },
    clearSearchClicked: function() {
      this.searchInput = '';
    },
    searchEvent: function(event = false) {
      if (event.keyCode === 13 || event instanceof MouseEvent) {
        this.searchInput = this.searchInput.trim();
      }
    },
    onResetClick: function() {
      this.searchInput = '';
    },
    filterUpdate: function(filters) {
      this.activeFilters = [...filters];
      this.page = 1;
      this.start = 0;
      this.applyFilters(this.activeFilters);
      this.loadingCards = false;
    },
    numberPerPageUpdate: function(value) {
      this.numberPerPage = parseInt(value, 10) || 10;
      this.pageChange(1);
    },
    pageChange: function(page) {
      this.page = page;
      this.start = (page - 1) * this.numberPerPage;
      this.applyFilters(this.activeFilters);
      this.scrollToTop();
    },
    scrollToTop: function() {
      if (this.$refs.content) {
        this.$refs.content.scroll({ top: 0, behavior: 'smooth' });
      }
    },
    filtersLoading: function() {
      // SearchFilters only emits loading:true and never emits false.
      // CellCardExplorer filters synchronously, so loading is reset in filterUpdate.
    },
    cascaderReady: function() {
      this.cascaderIsReady = true;
    },
    normalizeFacetValue: function(value) {
      return String(value || '').trim().toLowerCase();
    },
    buildFacetChildren: function(cellTypes, key) {
      const values = new Set();

      cellTypes.forEach((cellType) => {
        const fieldValue = cellType[key];
        if (Array.isArray(fieldValue)) {
          fieldValue.forEach((item) => {
            const normalized = String(item || '').trim();
            if (normalized) values.add(normalized);
          });
          return;
        }

        const normalized = String(fieldValue || '').trim();
        if (normalized) values.add(normalized);
      });

      return [...values]
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
        .map((value) => ({ label: value }));
    },
    buildFilterOptions: function(cellTypes) {
      const options = [
        {
          key: 'species',
          label: 'Species',
          children: this.buildFacetChildren(cellTypes, 'species'),
        },
        {
          key: 'somaLocations',
          label: 'Soma Location',
          children: this.buildFacetChildren(cellTypes, 'somaLocations'),
        },
        {
          key: 'circuitRole',
          label: 'Circuit Role',
          children: this.buildFacetChildren(cellTypes, 'circuitRole'),
        },
        {
          key: 'sourceNomenclatureLabel',
          label: 'Source',
          children: this.buildFacetChildren(cellTypes, 'sourceNomenclatureLabel'),
        },
      ];

      return options.filter((option) => option.children.length > 0);
    },
    matchFieldFilter: function(cellType, filter) {
      const filterFacet = this.normalizeFacetValue(filter.facet);
      const filterTerm = this.normalizeFacetValue(filter.term);

      if (!filterFacet || filterFacet === 'show all') {
        return true;
      }

      if (filterTerm === 'species') {
        return this.normalizeFacetValue(cellType.species) === filterFacet;
      }

      if (filterTerm === 'soma location') {
        return (cellType.somaLocations || []).some((location) => {
          return this.normalizeFacetValue(location) === filterFacet;
        });
      }

      if (filterTerm === 'circuit role') {
        return this.normalizeFacetValue(cellType.circuitRole) === filterFacet;
      }

      if (filterTerm === 'source') {
        return this.normalizeFacetValue(cellType.sourceNomenclatureLabel) === filterFacet;
      }

      return false;
    },
    applyFilters: function(filters) {
      const activeFilters = (filters || []).filter((filter) => {
        return filter?.term && filter?.facet && this.normalizeFacetValue(filter.facet) !== 'show all';
      });

      const filtersByTerm = activeFilters.reduce((grouped, filter) => {
        const termKey = this.normalizeFacetValue(filter.term);
        if (!grouped[termKey]) {
          grouped[termKey] = [];
        }
        grouped[termKey].push(filter);
        return grouped;
      }, {});

      const filterGroups = Object.values(filtersByTerm);

      const filtered = this.allCellTypes.filter((cellType) => {
        return filterGroups.every((termGroup) => {
          return termGroup.some((filter) => this.matchFieldFilter(cellType, filter));
        });
      });

      this.totalFilteredCount = filtered.length;
      this.cellTypes = filtered.slice(this.start, this.start + this.numberPerPage);

      if (!this.cellTypes.some((cellType) => cellType.id === this.activeCardId)) {
        this.activeCardId = null;
      }
    },
  },
}
</script>

<style lang="scss" scoped>
@import '../assets/searchPopover.scss';
@import '../assets/pagination.scss';

.content-card {
  height: 100%;
  flex-flow: column;
  display: flex;
  border: 0;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
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
  position: relative;
  max-height: 100%;
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

.el-button-link {
  color: white !important;
  text-decoration: underline;
  text-underline-offset: 2px;
  border-color: transparent !important;
  background-color: transparent !important;
  padding: 2px !important;
  height: auto !important;

  &:hover {
    text-decoration-color: transparent;
    box-shadow: none !important;
  }
}
</style>
