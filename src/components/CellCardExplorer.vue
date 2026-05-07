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
                  This will find cell cards that match any of the terms (an "OR" search).
                </li>
                <li>
                  <strong>Exact Phrase:</strong> Terms within a comma block will be matched as an exact phrase.
                </li>
              </ul>
              <br/>
              <strong>Examples:</strong>
              <ul>
                <li>
                  <strong>To find by exact phrase:</strong>
                  Searching for <code>soma location</code> will find any card containing <code>"soma location"</code>.
                </li>
                <li>
                  <strong>To find by multiple terms:</strong>
                  Searching for <code>mouse, vagal</code> will find cards that contain either <code>mouse</code> OR <code>vagal</code>.
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

    <SearchHistory
      ref="searchHistory"
      localStorageKey="sparc.science-cell-card-search-history"
      @search="searchHistorySearch"
    ></SearchHistory>

    <div class="content scrollbar" v-loading="loadingCards" ref="content">
      <CellCard
        v-for="cellType in cellTypes"
        :key="cellType.id"
        :cellType="cellType"
        :isActive="activeCardId === cellType.id"
        @open="openCard(cellType.id)"
        @close="closeCard"
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

let cachedCellCardsData = null
let pendingCellCardsRequest = null

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
    activeSpecies: {
      type: Array,
      default: () => [],
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
      geneBaseToDisplay: {},
      geneDisplayToBase: {},
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
  watch: {
    activeSpecies: {
      deep: true,
      handler: function() {
        this.page = 1;
        this.start = 0;
        const normalizedActiveSpecies = this.activeSpecies.map(
          (species) => this.normalizeActiveSpeciesFilterTerm(species)
        );
        this.applyFilters(this.activeFilters);
      },
    },
  },
  mounted: function() {
    this.fetchCellTypes(this.envVars.CELL_CARDS_API);
  },
  methods: {
    getCellCardsData: async function(url) {
      if (cachedCellCardsData) {
        return cachedCellCardsData;
      }

      if (!pendingCellCardsRequest) {
        pendingCellCardsRequest = fetch(url)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
          })
          .then((data) => {
            cachedCellCardsData = data;
            return data;
          })
          .finally(() => {
            pendingCellCardsRequest = null;
          });
      }

      return pendingCellCardsRequest;
    },
    fetchCellTypes: async function(url) {
      if (url) {
        this.loadingCards = true;
        try {
          const data = await this.getCellCardsData(url);
          if (data.DEFAULT_CELL_TYPES) {
            const loadedCellTypes = data.DEFAULT_CELL_TYPES.map((cellType) => {
              return {
                ...cellType,
                id: generateUUID(),
              }
            });

            this.setGeneMappings(data.DEFAULT_GENES);
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
    openCard: function(cardId) {
      this.activeCardId = cardId;
    },
    closeCard: function() {
      this.activeCardId = null;
    },
    clearSearchClicked: function() {
      this.searchInput = '';
      this.searchAndFilterUpdate();
    },
    searchEvent: function(event = false) {
      if (event.keyCode === 13 || event instanceof MouseEvent) {
        this.searchInput = this.searchInput.trim();
        this.searchAndFilterUpdate();
      }
    },
    onResetClick: function() {
      this.searchInput = '';
      this.activeFilters = [];
      this.page = 1;
      this.start = 0;
      this.$refs.filtersRef?.checkShowAllBoxes();
      if (this.$refs.searchHistory) {
        this.$refs.searchHistory.selectValue = 'Search history';
      }
      this.applyFilters(this.activeFilters);
    },
    searchAndFilterUpdate: function() {
      this.page = 1;
      this.start = 0;
      this.applyFilters(this.activeFilters);
      this.searchHistoryUpdate(this.activeFilters, this.searchInput);
    },
    filterUpdate: function(filters) {
      this.activeFilters = [...filters];
      this.page = 1;
      this.start = 0;
      this.applyFilters(this.activeFilters);
      this.searchHistoryUpdate(this.activeFilters, this.searchInput);
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
    searchHistoryUpdate: function(filters, search) {
      if (this.$refs.searchHistory) {
        this.$refs.searchHistory.selectValue = 'Search history';
        // save history only if there has value
        if (filters.length || search?.trim()) {
          this.$refs.searchHistory.addSearchToHistory(filters, search);
        }
      }
    },
    searchHistorySearch: function(item) {
      this.searchInput = item.search || '';
      this.activeFilters = Array.isArray(item.filters) ? [...item.filters] : [];
      this.page = 1;
      this.start = 0;
      this.applyFilters(this.activeFilters);

      if (this.$refs.filtersRef) {
        if (this.activeFilters.length) {
          this.$refs.filtersRef.setCascader(this.activeFilters);
        } else {
          this.$refs.filtersRef.checkShowAllBoxes();
        }
      }
    },
    cascaderReady: function() {
      this.cascaderIsReady = true;
    },
    normalizeFacetValue: function(value) {
      return String(value || '').trim().toLowerCase();
    },
    // To update the species from the flatmap,
    // mainly from "human male" and "human female" to "human".
    normalizeActiveSpeciesFilterTerm: function(value) {
      const normalized = this.normalizeFacetValue(value);
      if (normalized === 'human male' || normalized === 'human female') {
        return 'human';
      }
      return normalized;
    },
    setGeneMappings: function(genes) {
      const baseToDisplay = {};
      const displayToBase = {};

      (Array.isArray(genes) ? genes : []).forEach((gene) => {
        const base = this.normalizeFacetValue(gene?.base);
        const display = String(gene?.display || '').trim();
        const normalizedDisplay = this.normalizeFacetValue(display);

        if (!base) return;

        if (display) {
          baseToDisplay[base] = display;
          displayToBase[normalizedDisplay] = base;
          return;
        }

        baseToDisplay[base] = base;
      });

      this.geneBaseToDisplay = baseToDisplay;
      this.geneDisplayToBase = displayToBase;
    },
    normalizeSearchTerms: function(query) {
      return String(query || '')
        .split(',')
        .map((term) => term.trim().toLowerCase())
        .filter(Boolean);
    },
    getCellTypeSearchText: function(cellType) {
      const relatedCellLabels = (cellType.relatedCells || [])
        .map((relatedCell) => relatedCell.label)
        .filter(Boolean)
        .join(' ');

      return [
        cellType.preferredLabel,
        cellType.entity,
        cellType.species,
        (cellType.somaLocations || []).join(' '),
        cellType.circuitRole,
        cellType.creLine,
        cellType.geneExpressionString,
        cellType.fiberTypeString,
        cellType.physiologyString,
        cellType.sourceNomenclatureLabel,
        relatedCellLabels,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
    },
    matchSearchQuery: function(cellType, searchTerms) {
      if (!searchTerms.length) {
        return true;
      }

      const searchableText = this.getCellTypeSearchText(cellType);
      return searchTerms.some((term) => searchableText.includes(term));
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
          key: 'geneBaseNames',
          label: 'Gene',
          children: this.buildGeneFacetChildren(cellTypes),
        },
        {
          key: 'sourceNomenclatureLabel',
          label: 'Source',
          children: this.buildFacetChildren(cellTypes, 'sourceNomenclatureLabel'),
        },
      ];

      return options.filter((option) => option.children.length > 0);
    },
    buildGeneFacetChildren: function(cellTypes) {
      const values = new Set();

      cellTypes.forEach((cellType) => {
        (cellType.geneBaseNames || []).forEach((geneBaseName) => {
          const normalizedBase = this.normalizeFacetValue(geneBaseName);
          if (normalizedBase) values.add(normalizedBase);
        });
      });

      return [...values]
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
        .map((base) => ({
          label: this.geneBaseToDisplay[base] || base,
        }));
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

      if (filterTerm === 'gene') {
        const selectedGeneBase = this.geneDisplayToBase[filterFacet] || filterFacet;
        return (cellType.geneBaseNames || []).some((geneBaseName) => {
          return this.normalizeFacetValue(geneBaseName) === selectedGeneBase;
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
      const searchTerms = this.normalizeSearchTerms(this.searchInput);
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
      }).filter((cellType) => this.matchSearchQuery(cellType, searchTerms));

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
