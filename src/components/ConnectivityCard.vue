<template>
  <div class="dataset-card-container" ref="container">
    <div class="dataset-card" ref="card">
      <div class="seperator-path"></div>
      <div class="card"
        @click="cardClicked(entry)"
        @mouseover="cardHovered(entry)"
        @mouseleave="cardHovered(undefined)"
      >
        <div class="card-right">
          <div class="title">{{ entry.label }}</div>
          <template v-for="field in displayFields" :key="field">
            <div class="details" v-if="entry[field]">
              <strong>{{ field }}:</strong> {{ entry[field] }}
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import EventBus from './EventBus.js'
/* eslint-disable no-alert, no-console */

export default {
  data() {
    return {
      displayFields: [
        "label",
        "id",
      ]
    }
  },
  name: 'ConnectivityCard',
  props: {
    /**
     * Object containing information for
     * the required viewing.
     */
    entry: {
      type: Object,
      default: () => {},
    },
  },
  methods: {
    cardClicked: function (data) {
      EventBus.emit('connectivity-clicked', data);
    },
    cardHovered: function (data) {
      EventBus.emit('connectivity-hovered', data);
    },
  }
}
</script>

<style lang="scss" scoped>
.dataset-card {
  padding-left: 5px;
  padding-right: 5px;
  position: relative;
  min-height: 17rem;
}

.title {
  padding-bottom: 0.75rem;
  font-family: Asap;
  font-size: 14px;
  font-weight: bold;
  font-stretch: normal;
  font-style: normal;
  line-height: 1.5;
  letter-spacing: 1.05px;
  color: #484848;
  cursor: pointer;
}
.card {
  padding-top: 18px;
  position: relative;
  display: flex;
}

.card-left {
  flex: 1;
}

.card-right {
  flex: 1.3;
  padding-left: 6px;
}

.button {
  z-index: 10;
  font-family: Asap;
  font-size: 14px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  line-height: normal;
  letter-spacing: normal;
  background-color: $app-primary-color;
  border: $app-primary-color;
  color: white;
  cursor: pointer;
  margin-top: 8px;
}

.button:hover {
  background-color: $app-primary-color;
  color: white;
}

.banner-img {
  width: 128px;
  height: 128px;
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.25);
  background-color: #ffffff;
  cursor: pointer;
}
.details {
  font-family: Asap;
  font-size: 14px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  line-height: 1.5;
  letter-spacing: 1.05px;
  color: #484848;
}

.badges-container {
  margin-top: 0.75rem;
}

.loading-icon {
  z-index: 20;
  width: 40px;
  height: 40px;
  left: 80px;
}

.loading-icon :deep(.el-loading-mask) {
  background-color: rgba(117, 190, 218, 0) !important;
}

.loading-icon :deep(.el-loading-spinner .path) {
  stroke: $app-primary-color;
}

.float-button-container {
  position: absolute;
  bottom: 8px;
  right: 16px;
  opacity: 0;
  visibility: hidden;

  .card:hover & {
    opacity: 1;
    visibility: visible;
  }
}
</style>
