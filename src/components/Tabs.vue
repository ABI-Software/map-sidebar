<template>
  <div class="tab-container">
    <div
      class="title"
      v-for="title in titles"
      :key="title.id"
      :class="{ 'active-tab': title.id == activeId }"
    >
      <div
        class="title-text-table"
        v-bind:class="{ highlightText: title.id == activeId }"
        v-on:click="titleClicked(title.id, title.type)"
      >
        <div class="title-text">
          {{ title.title }}
        </div>
      </div>
      <el-button
        v-if="title.type === 'connectivity' || title.type === 'images'"
        @click="tabClose(title.id)"
        class="button-tab-close"
        aria-label="Close"
      >
        &times;
        <span class="visually-hidden">Close</span>
      </el-button>
    </div>
  </div>
</template>

<script>
/* eslint-disable no-alert, no-console */

export default {
  name: 'Tabs',
  props: {
    tabTitles: {
      type: Array,
      default: () => [],
    },
    activeId: {
      type: Number,
      default: 1,
    },
    hasConnectivityInfo: {
      type: Boolean,
      default: true,
    },
    hasImageThumbnails: {
      type: Boolean,
      default: true,
    },
  },
  computed: {
    titles: function() {
      if (!this.hasConnectivityInfo) {
        return this.tabTitles.filter((tab) => tab.type !== 'connectivity');
      }
      else if (!this.hasImageThumbnails) {
        return this.tabTitles.filter((tab) => tab.type !== 'images');
      }
      return this.tabTitles;
    },
  },
  methods: {
    titleClicked: function (id, type) {
      this.$emit('titleClicked', {id, type})
    },
    tabClose: function (id) {
      this.$emit('tab-close', id);
    },
  },
}
</script>

<style lang="scss" scoped>
$tab-height: 30px;

.tab-container {
  height: $tab-height;
  display: flex;
  flex-direction: row;
}

.title {
  height: $tab-height;
  border: 1px solid var(--el-border-color);
  border-top-color: transparent;
  background-color: white;
  display: flex;
  width: fit-content;
  align-items: center;
  position: relative;
  cursor: pointer;
  z-index: 2;
}

.title-text {
  text-align: center;
  display: table-cell;
  vertical-align: middle;
  font-size: 14px;
  padding: 0 1rem;
}

.title-text-table {
  display: table;
  height: 100%;
  width: 100%;
}

.parent-dialog:hover .title-text {
  color: $app-primary-color;
}

.title:hover,
.active-tab {
  background-color: #f9f2fc;
  border: solid #8300bf;
  border-width: 1px 1px .125em;
  color: #8300bf;
  font-weight: 500;
}

.highlightText {
  color: $app-primary-color;
}

.button-tab-close {
  width: 20px !important;
  height: 20px !important;
  line-height: 20px !important;
  padding: 0 !important;
  padding-right: 4px !important;
  font-size: 24px !important;
  color: $app-primary-color !important;
  border: 0 none !important;
  box-shadow: none !important;
  outline: none !important;
  background-color: transparent !important;

  :deep(> span) {
    height: $tab-height - 2 !important; // tab height minus border
    font-family: Arial !important; // to fix font alignment on different browsers
  }

  &:hover,
  &:focus {
    border: 0 none !important;
    outline: none !important;
    box-shadow: none !important;
    background-color: transparent !important;
  }
}

.visually-hidden {
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}
</style>
