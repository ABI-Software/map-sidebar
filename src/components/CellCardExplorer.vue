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
        <div class="card-header">
          <div class="card-title">
            {{ cellType.preferredLabel }}
          </div>
          <div class="card-keywords">
            <span>{{ cellType.species }}</span>
            <span
              v-for="somaLocation in cellType.somaLocations"
              class="card-chip"
              :key="somaLocation">
              {{ somaLocation }}
            </span>
          </div>
        </div>
        <div class="card-details">
          <div v-if="cellType.geneExpressionString" class="card-section">
            <label>Marker Genes</label>
            <p v-html="transformString(cellType.geneExpressionString)"></p>
          </div>
          <div v-if="cellType.fiberTypeString" class="card-section">
            <label>Axon Phenotype</label>
            <p>{{ cellType.fiberTypeString }}</p>
          </div>
          <div v-if="cellType.physiologyString" class="card-section">
            <label>Physiology</label>
            <p>{{ cellType.physiologyString }}</p>
          </div>
          <div v-if="cellType.relatedCells?.length" class="card-section">
            <label>Related Variants</label>
            <ul v-for="relatedCell in cellType.relatedCells" :key="relatedCell">
              <li>{{ relatedCell.label }}</li>
            </ul>
          </div>
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
    transformString: function(str) {
      if (!str) return '';
      // replace the string with ^ with <sup> and the next word with </sup>
      return str.replace(/\^(\w+)/g, '<sup>$1</sup>');
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
  position: relative;
  font-family: Asap;
  font-size: 14px;

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

.card-header,
.card-details {
  padding: 1rem;
}

.card-title {
  margin-bottom: 0.75rem;
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
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.card-keywords {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  span {
    color: #606266;
  }
}

.card-chip {
  display: inline-block;
  padding: 2px 8px;
  background-color: #f0f0f0;
  border-radius: 12px;
}

.card-section {
  label {
    font-weight: 600;
    display: block;
    margin-bottom: 0.25rem;
  }

  p {
    margin: 0;
    color: #606266;
  }

  ul {
    margin: 0;
    padding-left: 1rem;

    li {
      color: #606266;
    }
  }
}
</style>
