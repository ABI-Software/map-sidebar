<template>
  <div class="tabs-container">
    <div
      class="tab"
      v-for="tab in tabs"
      :key="tab.id"
      :class="{ 'active-tab': tab.id == activeId }"
      @click="tabClicked(tab)"
    >
      <span class="tab-title">{{ tab.title }} </span>
      <el-icon
        v-if="tab.closable"
        @click.stop="tabClosed(tab)"
        class="tab-close-icon"
      >
        <el-icon-close />
      </el-icon>
    </div>
  </div>
</template>

<script>
/* eslint-disable no-alert, no-console */
import { Close as ElIconClose } from "@element-plus/icons-vue";

export default {
  name: "Tabs",
  components: {
    ElIconClose,
  },
  props: {
    tabEntries: {
      type: Array,
      default: () => [],
    },
    activeId: {
      type: Number,
      default: 1,
    },
    contextArray: {
      type: Array,
      default: () => [],
    },
  },
  computed: {
    tabs: function () {
      // permanent tabs always show in the front
      const permanent = this.tabEntries.filter((t) => !t.closable);
      const temporary = this.tabEntries.filter((t) => t.closable);
      let entries = permanent.concat(temporary);
      if (this.contextArray.length) {
        for (let i in entries) {
          entries[i].contextCard = this.contextArray[i];
        }
      }
      return entries;
    },
  },
  methods: {
    tabClicked: function (tab) {
      this.$emit("tabClicked", { id: tab.id, type: tab.type });
    },
    tabClosed: function (tab) {
      this.$emit("tabClosed", { id: tab.id, type: tab.type });
    },
  },
};
</script>

<style lang="scss" scoped>
.tabs-container {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
}

.tab {
  height: 30px;
  border: 1px solid var(--el-border-color);
  border-top-color: transparent;
  border-bottom-color: transparent;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.tab:hover,
.active-tab {
  background-color: #f9f2fc;
  border: 1px solid #8300bf;
  color: #8300bf;
  font-weight: 500;
}

.tab-title {
  text-align: center;
  font-size: 14px;
  padding: 0 1rem;
}

.tab-close-icon {
  width: 20px !important;
  height: 20px !important;
  font-size: 20px !important;
  padding-right: 4px !important;
  color: $app-primary-color !important;
}
</style>
