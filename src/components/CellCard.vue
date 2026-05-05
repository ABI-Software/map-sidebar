<template>
  <div
    class="card"
    :class="{ active: isActive }"
    :style="cardStyleVars"
  >
    <div
      class="card-header"
      @click="openCard"
    >
      <div class="title-content">
        <div class="card-title">
          {{ cellType.preferredLabel }}
        </div>
        <div class="card-keywords">
          <span>{{ cellType.species }}</span>
          <div class="card-chips">
            <span
              v-for="somaLocation in cellType.somaLocations"
              class="card-chip"
              :key="somaLocation">
              {{ somaLocation }}
            </span>
          </div>
        </div>
      </div>
      <div class="title-buttons" @click.stop>
        <CopyToClipboard @copied="onCopied" :content="updatedCopyContent" />
        <el-popover
          width="auto"
          trigger="hover"
          :teleported="false"
          popper-class="popover-map-pin"
        >
          <template #reference>
            <el-button class="button-circle" circle @click="closeCard">
              <el-icon color="white">
                <el-icon-close />
              </el-icon>
            </el-button>
          </template>
          <span>Close</span>
        </el-popover>
      </div>
    </div>
    <div class="card-details">
      <div class="card-details-inner">
        <div v-if="cellType.entity" class="card-section">
          <label>Entity</label>
          <p>{{ cellType.entity }}</p>
        </div>
        <div v-if="cellType.species" class="card-section">
          <label>Species</label>
          <p>{{ cellType.species }}</p>
        </div>
        <div v-if="cellType.somaLocations?.length" class="card-section">
          <label>Soma Location</label>
          <div class="card-chips">
            <span
              v-for="somaLocation in cellType.somaLocations"
              class="card-chip"
              :key="somaLocation">
              {{ somaLocation }}
            </span>
          </div>
        </div>
        <div v-if="cellType.circuitRole" class="card-section">
          <label>Circuit Role</label>
          <p>{{ cellType.circuitRole }}</p>
        </div>
        <div v-if="cellType.creLine" class="card-section">
          <label>Cre Line</label>
          <p>{{ cellType.creLine }}</p>
        </div>
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
          <label>Related Species Variants</label>
          <ul v-for="relatedCell in cellType.relatedCells" :key="relatedCell">
            <li>{{ relatedCell.label }}</li>
          </ul>
        </div>
        <div v-if="cellType.sourceNomenclature" class="card-section source-publication-section">
          <label>Source Publication</label>
          <p>
            <a
              class="source-publication-link"
              :href="cellType.sourceNomenclature"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ cellType.sourceNomenclatureLabel }}
            </a>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  ElButton as Button,
  ElIcon as Icon,
} from 'element-plus'
import {
  CopyToClipboard,
} from '@abi-software/map-utilities';
import '@abi-software/map-utilities/dist/style.css';
import EventBus from './EventBus.js'

export default {
  name: 'CellCard',
  components: {
    Button,
    Icon,
    CopyToClipboard,
  },
  props: {
    cellType: {
      type: Object,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['open', 'close'],
  computed: {
    cardStyleVars: function() {
      return {
        '--cell-card-color': this.cellType?.color || '#8300bf',
        '--cell-card-source-color': this.cellType?.sourceColor || this.cellType?.color || '#8300bf',
      };
    },
    updatedCopyContent: function() {
      const {
        preferredLabel,
        entity,
        species,
        somaLocations,
        circuitRole,
        creLine,
        geneExpressionString,
        fiberTypeString,
        physiologyString,
        relatedCells,
        sourceNomenclature,
        sourceNomenclatureLabel
      } = this.cellType;

      const contentArray = [];
      if (preferredLabel) {
        contentArray.push(`<div><strong>Cell Type:</strong> ${preferredLabel}</div>`);
      }
      if (entity) {
        contentArray.push(`<div><strong>Entity:</strong> ${entity}</div>`);
      }
      if (species) {
        contentArray.push(`<div><strong>Species:</strong> ${species}</div>`);
      }
      if (somaLocations?.length) {
        const items = somaLocations.map((location) => `<li>${location}</li>`).join('');
        contentArray.push(`<div><strong>Soma Locations:</strong><ul>${items}</ul></div>`);
      }
      if (circuitRole) {
        contentArray.push(`<div><strong>Circuit Role:</strong> ${circuitRole}</div>`);
      }
      if (creLine) {
        contentArray.push(`<div><strong>Cre Line:</strong> ${creLine}</div>`);
      }
      if (geneExpressionString) {
        contentArray.push(`<div><strong>Marker Genes:</strong> ${geneExpressionString}</div>`);
      }
      if (fiberTypeString) {
        contentArray.push(`<div><strong>Axon Phenotype:</strong> ${fiberTypeString}</div>`);
      }
      if (physiologyString) {
        contentArray.push(`<div><strong>Physiology:</strong> ${physiologyString}</div>`);
      }
      if (relatedCells?.length) {
        const relatedItems = relatedCells
          .map((cell) => cell?.label)
          .filter(Boolean)
          .map((label) => `<li>${label}</li>`)
          .join('');
        if (relatedItems) {
          contentArray.push(`<div><strong>Related Species Variants:</strong><ul>${relatedItems}</ul></div>`);
        }
      }
      if (sourceNomenclatureLabel) {
        const sourceLabel = sourceNomenclature
          ? `${sourceNomenclatureLabel} (<a href="${sourceNomenclature}">${sourceNomenclature}</a>)`
          : sourceNomenclatureLabel;
        contentArray.push(`<div><strong>Source Publication:</strong> ${sourceLabel}</div>`);
      }

      return contentArray.join('\n');
    },
  },
  methods: {
    transformString: function(str) {
      if (!str) return '';
      // replace the string with ^ with <sup> and the next word with </sup>
      return str.replace(/\^(\w+)/g, '<sup>$1</sup>');
    },
    onCopied: function() {
      EventBus.emit('trackEvent', {
        'event_name': `portal_maps_cell_card_copy`,
        'category': this.cellType.preferredLabel || '',
        'location': 'map_sidebar_cell_card',
      });
    },
    openCard: function() {
      this.$emit('open', this.cellType.id);
    },
    closeCard: function() {
      this.$emit('close');
    },
  }
}
</script>

<style lang="scss" scoped>
.card {
  position: relative;
  font-family: Asap;
  font-size: 14px;

  &::before {
    content: '';
    position: absolute;
    top: 5px;
    left: 5px;
    width: calc(100% - 15px);
    height: calc(100% - 10px);
    border: 3px solid transparent;
    border-left-color: var(--cell-card-color);
    border-radius: 0px;
    z-index: 1;
    transition: all 0.25s ease;
  }

  &.active::before,
  &:hover::before {
    border-radius: 5px;
    border-color: var(--cell-card-color);
  }

  &:not(:first-child) {
    margin-top: 5px;

    &::after {
      content: '';
      position: absolute;
      top: 0px;
      left: 10px;
      width: 455px; // Same as other cards in the sidebar
      height: 2px; // Same as other cards in the sidebar
      background-color: #e4e7ed;
      z-index: 0;
    }
  }

  .card-details {
    display: none;
  }

  &.active {
    background-color: #f7faff;

    .card-header {
      cursor: default;

      &::before {
        opacity: 1;
      }

      .card-title {
        margin: 0;
        color: var(--cell-card-color);
      }

      .card-keywords {
        display: none;
      }
    }

    .card-details {
      display: block;
    }
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  cursor: pointer;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    bottom: 5px;
    left: 5px;
    width: calc(100% - 10px);
    height: 1px;
    background-color: var(--cell-card-color);
    opacity: 0;
    transition: opacity 0.25s ease;
  }
}

.card-header,
.card-details {
  position: relative;
  z-index: 2;
}

.card-header,
.card-details-inner {
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

.card-details-inner {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.card-keywords,
.card-chips {
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

.source-publication-section {
  border-top: 1px solid var(--cell-card-source-color);
  padding-top: 0.75rem;

  label {
    color: var(--cell-card-source-color);
  }
}

.source-publication-link {
  display: inline-block;
  margin-top: 0.25rem;
  padding: 4px 8px;
  border: 1px solid var(--cell-card-source-color);
  border-radius: 4px;
  color: white;
  text-decoration: none;
  background-color: var(--cell-card-source-color);

  &:hover {
    background-image: linear-gradient(rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.12));
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

.title-buttons {
  flex: 1 0 0%;
  max-width: 20%;
  flex-direction: row;
  justify-content: end;
  gap: 0.5rem;
  display: none;

  .card.active & {
    display: flex;
  }

  :deep(.copy-clipboard-button) {
    &,
    &:hover,
    &:focus {
      border-color: $app-primary-color !important;
      border-radius: 50%;
    }
    &.is-disabled {
      border-color: #dab3ec !important;
    }
  }

  .el-button + .el-button {
    margin-left: 0 !important;
  }
}

.button-circle {
  margin: 0;
  width: 24px !important;
  height: 24px !important;
  border: 1px solid $app-primary-color !important;

  &,
  &:hover,
  &:focus,
  &:active {
    background-color: $app-primary-color;
    border-color: $app-primary-color !important;
  }

  &.secondary {
    background-color: white !important;
  }
}
</style>
