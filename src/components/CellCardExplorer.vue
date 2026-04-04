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
      <CellCard
        v-for="cellType in cellTypes"
        :key="cellType.id"
        :cellType="cellType"
        :isActive="activeCardId === cellType.id"
        @toggle="activateCard(cellType.id)"
      />
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
import CellCard from './CellCard.vue'
import { generateUUID } from '../utils/common.js';

export default {
  components: {
    SearchFilters,
    SearchHistory,
    DatasetCard,
    Card,
    CellCard,
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
      activeCardId: null,
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
            this.cellTypes = data.DEFAULT_CELL_TYPES.map((cellType) => {
              return {
                ...cellType,
                id: generateUUID(),
              }
            });
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


</style>
