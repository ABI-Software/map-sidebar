<template>
  <div
    class="card"
    :class="{ active: isActive }"
  >
    <div
      class="card-header"
      @click="$emit('toggle')"
    >
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
        <div v-if="cellType.sourceNomenclature" class="card-section">
          <label>Source Publication</label>
          <p>
            <a :href="cellType.sourceNomenclature" target="_blank" rel="noopener noreferrer">
              {{ cellType.sourceNomenclatureLabel }}
            </a>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CellCard',
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
  emits: ['toggle'],
  methods: {
    transformString: function(str) {
      if (!str) return '';
      // replace the string with ^ with <sup> and the next word with </sup>
      return str.replace(/\^(\w+)/g, '<sup>$1</sup>');
    },
  },
}
</script>

<style lang="scss" scoped>
.card {
  position: relative;
  font-family: Asap;
  font-size: 14px;
  max-height: 215px; // Same as other cards in the sidebar

  &:not(:first-child)::before {
    content: '';
    position: absolute;
    top: 0;
    left: 10px;
    width: 455px; // Same as other cards in the sidebar
    height: 2px; // Same as other cards in the sidebar
    background-color: #e4e7ed;
  }

  .card-details {
    display: none;
  }

  &.active {
    .card-details {
      display: block;
    }
  }
}

.card-header {
  cursor: pointer;
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
</style>
