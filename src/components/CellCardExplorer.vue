<template>
  <el-card :body-style="bodyStyle" class="content-card">
    <template #header>
      <!-- Placeholder -->
      <div class="header">
        <span class="header-title">Cell Card Explorer</span>
      </div>
    </template>
    <!--
    <SearchFilters>
    </SearchFilters>
    <SearchHistory>
    </SearchHistory>
    -->
    <div class="content scrollbar" v-loading="loadingCards" refs="content">
      <div
        v-for="(cellType, index) in cellTypes"
        :key="index"
        class="card"
      >
        <div class="card-title">
          {{ cellType.preferredLabel }}
        </div>
        <div class="card-details">
          <span>{{ cellType.species }}</span>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script>
/* eslint-disable no-alert, no-console */
import {
  ElCard as Card,
} from 'element-plus'
import 'element-plus/es/components/message/style/css';
import SearchFilters from './SearchFilters.vue'
import SearchHistory from './SearchHistory.vue'
import DatasetCard from './DatasetCard.vue'
import EventBus from './EventBus.js'

export default {
  components: {
    SearchFilters,
    SearchHistory,
    DatasetCard,
    Card,
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
      cellTypes: [],
      families: [],
      genes: [],
      sources: {},
      loadingCards: false,
    };
  },
  computed: {},
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
            this.cellTypes = data.DEFAULT_CELL_TYPES;
          }
        } catch (error) {
          console.error('Error fetching cell types:', error);
        } finally {
          this.loadingCards = false;
        }
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

.card {
  padding: 16px;
  position: relative;

  + .card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 1px;
    background-color: #e4e7ed;
  }
}

.card-title {
  margin-bottom: 0.75rem;
  font-size: 14px;
  font-weight: bold;
  line-height: 1.5;
  letter-spacing: 1.05px;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-details {
  font-size: 14px;
}
</style>
