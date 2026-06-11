<template>
  <div
    ref="cardElementRef"
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
          <span class="source-publication-chip" v-if="cellType.sourceNomenclature">
            {{ cellType.sourceNomenclatureLabel }}
          </span>
        </div>
        <el-button
          v-if="isActive && (cellType.alertNotes?.length || cellType.curatorNotes?.length)"
          round
          size="small"
          class="alert-chip"
          @click.stop="showAlertMessage"
        >
          <el-icon class="alert"><el-icon-warn-triangle-filled /></el-icon>
          Notes
        </el-button>
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
          <div class="card-section-title">Entity</div>
          <span>{{ cellType.entity }}</span>
        </div>
        <div v-if="cellType.species" class="card-section">
          <div class="card-section-title">Species</div>
          <span>{{ cellType.species }}</span>
        </div>
        <div v-if="cellType.somaLocations?.length" class="card-section">
          <div class="card-section-title">Soma Location</div>
          <div class="card-list-items">
            <div
              v-for="location in somaLocations"
              class="card-list-item"
              :key="location.id"
              @mouseenter="showSomaLocation(location.name)"
              @mouseleave="showSomaLocation()"
            >
              <span>{{ location.name }}</span>
              <div class="card-list-search">
                <el-popover
                  width="180"
                  trigger="hover"
                  :teleported="true"
                  :append-to="cardElement"
                  popper-class="popover-origin-help popover-search-actions"
                  @show="onSearchPopoverShow(location.id)"
                  @hide="onSearchPopoverHide(location.id)"
                >
                  <template #reference>
                    <el-icon
                      class="status-search-icon"
                      :class="{ 'is-visible': activeSearchPopoverLocationId === location.id }"
                    >
                      <el-icon-search />
                    </el-icon>
                  </template>
                  <div class="search-action-list">
                    <button
                      type="button"
                      class="search-action-button"
                      @click="openDatasetSearch(location.name)"
                    >
                      Search dataset
                    </button>
                    <button
                      type="button"
                      class="search-action-button"
                      @click="openConnectivitySearch(location.name)"
                    >
                      Search connectivity
                    </button>
                  </div>
                </el-popover>
              </div>
            </div>
          </div>
        </div>
        <div v-if="cellType.circuitRole" class="card-section">
          <div class="card-section-title">Circuit Role</div>
          <span>{{ cellType.circuitRole }}</span>
        </div>
        <div v-if="cellType.creLine" class="card-section">
          <div class="card-section-title">Cre Line</div>
          <span>{{ cellType.creLine }}</span>
        </div>
        <div v-if="formattedMarkerGenes.length" class="card-section">
          <div class="card-section-title">Marker Genes</div>
          <div class="marker-genes-list">
            <a
              v-for="markerGene in formattedMarkerGenes"
              :key="markerGene.key"
              class="marker-gene-link"
              :href="markerGene.uri"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>{{ markerGene.name }}</span>
              <sup v-if="markerGene.expression">{{ markerGene.expression }}</sup>
              <IconOpenExternal class="external-link-icon" />
            </a>
          </div>
        </div>
        <div v-if="cellType.fiberTypeString" class="card-section">
          <div class="card-section-title">Axon Phenotype</div>
          <div class="card-section-content">{{ cellType.fiberTypeString }}</div>
        </div>
        <div v-if="cellType.physiologyString" class="card-section">
          <div class="card-section-title">Physiology</div>
          <div class="card-section-content success">{{ cellType.physiologyString }}</div>
        </div>
        <div v-if="cellType.relatedCells?.length" class="card-section">
          <div class="card-section-title">Related Species Variants</div>
          <ul v-for="relatedCell in cellType.relatedCells" :key="relatedCell">
            <li>{{ relatedCell.label }}</li>
          </ul>
        </div>
        <div v-if="cellType.sourceNomenclature" class="card-section source-publication-section">
          <div class="card-section-title">Source Publication</div>
          <p>
            <a
              class="source-publication-link"
              :href="cellType.sourceNomenclature"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ cellType.sourceNomenclatureLabel }}
              <IconOpenExternal class="external-link-icon" />
            </a>
          </p>
        </div>
        <div
          class="card-section"
          v-if="cellType.alertNotes?.length || cellType.curatorNotes?.length"
          ref="alertElement"
        >
          <div class="card-section-title">Notes</div>
          <div class="alert-block">
            <div class="alert-block-section" v-if="cellType.alertNotes?.length">
              <div class="alert-block-title">Alert Notes:</div>
              <div v-for="note in cellType.alertNotes"
                v-html="formatAlertText(note)"
                class="alert-block-note"
              ></div>
            </div>
            <div class="alert-block-section" v-if="cellType.curatorNotes?.length">
              <div class="alert-block-title">Curator Notes:</div>
              <div v-for="note in cellType.curatorNotes"
                v-html="formatAlertText(note)"
                class="alert-block-note"
              ></div>
            </div>
          </div>
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
import { Warning as ElIconWarning } from '@element-plus/icons-vue'
import {
  CopyToClipboard,
} from '@abi-software/map-utilities';
import '@abi-software/map-utilities/dist/style.css';
import EventBus from './EventBus.js'
import { capitalise, formatAlertText as formatAlertTextUtil, scrollToRef } from '../utils/common.js';
import IconOpenExternal from './icons/IconOpenExternal.vue';

const LOCATION_ID_MAP = {
  'soma_tg': 'trigeminal ganglion',
  'soma_drg': 'dorsal root ganglion',
};

export default {
  name: 'CellCard',
  components: {
    Button,
    Icon,
    ElIconWarning,
    CopyToClipboard,
    IconOpenExternal,
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
  emits: ['open', 'close', 'soma-location-hovered', 'dataset-search', 'connectivity-search'],
  data() {
    return {
      cardElement: null,
      activeSearchPopoverLocationId: null,
    };
  },
  mounted: function () {
    this.cardElement = this.$refs.cardElementRef;
  },
  computed: {
    cardStyleVars: function() {
      return {
        '--cell-card-source-color': this.cellType?.sourceColor || this.cellType?.color || '#8300bf',
      };
    },
    formattedMarkerGenes: function() {
      return (this.cellType?.markerGenes || [])
        .map((markerGene, index) => {
          const name = String(markerGene?.name || '').trim();
          const expression = String(markerGene?.expression || '').trim();
          const uri = this.sanitizeMarkerGeneUri(markerGene?.uri, expression);

          if (!name || !uri) {
            return null;
          }

          return {
            key: `${name}-${expression || 'none'}-${index}`,
            name,
            expression,
            uri,
          };
        })
        .filter(Boolean);
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
        alertNotes,
        curatorNotes,
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

      if (alertNotes?.length) {
        const alertContent = alertNotes
          .map((note) => formatAlertTextUtil(note))
          .join('\n');
        contentArray.push(`<div><strong>Alert Notes:</strong></div>\n${alertContent}`);
      }

      if (curatorNotes?.length) {
        const curatorContent = curatorNotes
          .map((note) => formatAlertTextUtil(note))
          .join('\n');
        contentArray.push(`<div><strong>Curator Notes:</strong></div>\n${curatorContent}`);
      }

      return contentArray.join('\n');
    },
    somaLocations: function() {
      const mappedLocations = this.cellType.somaLocations.map((location) => {
        const locationKey = Object.keys(LOCATION_ID_MAP).find((key) => LOCATION_ID_MAP[key] === location) || '';
        const isClustered = this.cellType.clusterAttributes?.[locationKey];
        if (isClustered) {
          return {
            name: capitalise(location),
            id: locationKey,
          }
        }
        return false;
      });
      return mappedLocations;
    },
  },
  methods: {
    sanitizeMarkerGeneUri: function(uri, expression = '') {
      let normalizedUri = String(uri || '').trim();
      const normalizedExpression = String(expression || '').trim();

      if (!normalizedUri) return '';

      if (normalizedExpression) {
        const escapedExpression = normalizedExpression.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        normalizedUri = normalizedUri.replace(new RegExp(`\\s+${escapedExpression}$`, 'i'), '');
      }

      return normalizedUri.trim();
    },
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
    showSomaLocation: function (name) {
      this.$emit('soma-location-hovered', name);
    },
    openDatasetSearch: function (query) {
      this.$emit('dataset-search', {
        species: capitalise(this.cellType?.species),
        location: query,
      });
    },
    openConnectivitySearch: function (query) {
      // Find the UBERON term from query value (label)
      const availableDataRaw = localStorage.getItem('available-name-curie-mapping');
      const availableData = availableDataRaw ? JSON.parse(availableDataRaw) : {};
      const locationCurie = Object.keys(availableData).find(
        (curie) => availableData[curie].toLowerCase() === query.toLowerCase()
      );
      const facets = locationCurie ? [
        {
          "facet": `[\"${locationCurie}\",[]]`,
          "facetPropPath": "flatmap.connectivity.source.all",
          "tagLabel": query,
          "term": "All"
        }
      ] : [];
      this.$emit('connectivity-search', {
        facets: facets,
        query: '',
      });
    },
    onSearchPopoverShow: function (locationId) {
      this.activeSearchPopoverLocationId = locationId;
    },
    onSearchPopoverHide: function (locationId) {
      if (this.activeSearchPopoverLocationId === locationId) {
        this.activeSearchPopoverLocationId = null;
      }
    },
    showAlertMessage: function () {
      scrollToRef(this, 'alertElement');
    },
    formatAlertText: function (text) {
      return formatAlertTextUtil(text);
    },
  }
}
</script>

<style lang="scss" scoped>
.card {
  position: relative;
  font-family: Asap;
  font-size: 14px;
  box-sizing: border-box;

  &::before {
    content: '';
    position: absolute;
    top: 5px;
    left: 5px;
    width: calc(100% - 15px);
    height: calc(100% - 10px);
    border: 3px solid transparent;
    border-radius: 5px;
    box-sizing: border-box;
    z-index: 1;
  }

  &.active::before,
  &:hover::before {
    border-color: $app-primary-color;
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

    &::before {
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }

    .card-header {
      cursor: default;

      &::before {
        opacity: 1;
      }

      .card-title {
        margin: 0;
        line-height: 1.3em !important;
        font-size: 18px;
        font-weight: bold;
        color: $app-primary-color;
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
    bottom: 7px;
    left: 5px;
    width: calc(100% - 10px);
    height: 1px;
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

.title-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
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
  gap: 1.75rem;
  padding-top: 0;
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
  transition: background-color 0.2s ease;

  .card-details & {
    padding: 4px 8px;
    border: 1px solid #dcdcdc;

  }
}

.card-list-items {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  box-sizing: border-box;
  position: relative;
}

.card-list-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem;
  position: relative;
  box-sizing: border-box;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    transition: background-color 0.2s ease, border-color 0.2s ease;
    background-color: rgba($app-primary-color, 0.04);
    border-left: 4px solid rgba($app-primary-color, 0.16);
  }

  &:hover::before {
    background-color: rgba($app-primary-color, 0.07);
    border-left-color: rgba($app-primary-color, 0.24);
  }

  > span {
    line-height: 1.5em;
    font-weight: 500;
  }
}

.card-list-search {
  display: flex;
  gap: 0.25rem;
}

.status-search-icon {
  font-size: 16px;
  color: $app-primary-color;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;

  &.is-visible {
    opacity: 1;
  }

  &:hover {
    color: #ac76c5;
  }
}

.card-list-item:hover .status-search-icon {
  opacity: 1;
}

:deep(.popover-origin-help.el-popover) {
  font-family: 'Asap', sans-serif;
  background: #f3ecf6 !important;
  border: 1px solid $app-primary-color !important;
  border-radius: 4px !important;
  color: #303133 !important;
  text-transform: none !important; // need to overide the tooltip text transform
  font-weight: 400;

  .el-popper__arrow {
    &:before {
      background: #f3ecf6 !important;
      border-color: $app-primary-color;
      background-color: #ffffff;
    }
  }
}

:deep(.popover-search-actions.el-popover) {
  padding: 6px;
}

.search-action-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.search-action-button {
  border: 0;
  width: 100%;
  padding: 6px 8px;
  text-align: left;
  border-radius: 4px;
  font-family: inherit;
  font-size: 12px;
  color: #303133;
  background: transparent;
  cursor: pointer;

  &:hover {
    background-color: rgba($app-primary-color, 0.12);
    color: $app-primary-color;
  }
}

.card-section {
  .card-section-title {
    font-weight: 600;
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

.card-section {
  .card-section-title {
    display: block;
    margin-bottom: 0.75rem;
    font-size: 16px;
    font-weight: 600;
    text-transform: uppercase;
  }
}

.card-section-content {
  padding: 0.5rem;
  background-color: #f0f0f0;
  border-radius: 4px;
  border: 1px solid #dcdcdc;

  &.success {
    border-color: #b3e5b3;
    background-color: #f0f9eb;
  }
}

.marker-genes-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.marker-gene-link {
  display: inline-flex;
  align-items: flex-start;
  gap: 0.1rem;
  padding: 0.25rem 0.5rem;
  font-size: 12px;
  border: 1px solid $app-primary-color;
  border-radius: 4px;
  color: $app-primary-color;
  background-color: #f9f2fc;
  text-decoration: none;
  line-height: 1.2;

  &:hover {
    background-image: linear-gradient(rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.05));
  }

  sup {
    font-size: 0.75em;
    line-height: 1;
  }
}

.external-link-icon {
  display: inline-flex;
  align-items: center;
  width: 16px;
  height: 16px;
  margin-left: 2px;
  color: currentColor;
  opacity: 0.7;
  vertical-align: middle;
}

.source-publication-chip,
.source-publication-link {
  display: inline-block;
  border: 1px solid var(--cell-card-source-color);
  border-radius: 4px;
  color: white !important;
  text-decoration: none;
  background-color: var(--cell-card-source-color);
}

.source-publication-chip {
  padding: 2px 6px;
}

.alert-chip {
  margin-top: 5px;
  background-color: $app-primary-color;
  border-color: $app-primary-color;
  color: #fff;

  &:hover {
    color: #fff !important;
    background-color: #ac76c5 !important;
    border: 1px solid #ac76c5 !important;
  }

  :deep(> span) {
    gap: 2px;
  }

  .alert {
    width: 1rem;
    height: 1rem;
    color: inherit;
    margin: 0;
  }
}

.source-publication-link {
  padding: 4px 8px;

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

.alert-block {
  background-color: var(--el-color-warning-light-9);
  border: 1px dashed var(--el-color-warning);
  padding: 0.75rem;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  :deep(a) {
    color: $app-primary-color;
    word-break: break-all;

    &:hover {
      opacity: 0.8;
    }
  }
}

.alert-block-section {
  .alert-block-title {
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .alert-block-note {
    color: #606266;
    padding-left: 0.5rem;

    + .alert-block-note {
      margin-top: 0.5rem;
    }
  }
}
</style>
