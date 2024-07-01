<template>
  <div ref="container">
    <div v-if="!drawerOpen" @click="toggleDrawer" class="open-tab">
      <el-icon><el-icon-arrow-left /></el-icon>
    </div>
    <el-drawer
      class="side-bar my-drawer"
      v-model="drawerOpen"
      :teleported="false"
      :modal-append-to-body="false"
      size="584"
      :with-header="false"
      :wrapperClosable="false"
      :modal="false"
      modal-class="sidebar-body"
      :z-index="10"
      :lock-scroll="false"
    >
      <div class="box-card">
        <div v-if="drawerOpen" @click="close" class="close-tab">
          <el-icon><el-icon-arrow-right /></el-icon>
        </div>
        <div class="sidebar-container">
          <Tabs
            v-if="tabs.length > 1 && connectivityInfo"
            :tabTitles="tabs"
            :activeId="activeId"
            @titleClicked="tabClicked"
            @tab-close="tabClose"
          />
          <template v-for="tab in tabs" key="tab.id">
            <!-- Connectivity Info -->
            <template v-if="tab.id === 2">
              <connectivity-info
                :entry="connectivityInfo"
                v-show="tab.id === activeId"
                :ref="tab.id"
              />
            </template>
            <template v-else>
            <SidebarContent
              class="sidebar-content-container"
              v-show="tab.id === activeId"
              :contextCardEntry="tab.contextCard"
              :envVars="envVars"
              :ref="tab.id"
              @search-changed="searchChanged(tab.id, $event)"
              @hover-changed="hoverChanged($event)"
            />
            </template>
          </template>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script>
import {
  ArrowLeft as ElIconArrowLeft,
  ArrowRight as ElIconArrowRight,
} from '@element-plus/icons-vue'
/* eslint-disable no-alert, no-console */
import { ElDrawer as Drawer, ElIcon as Icon } from 'element-plus'
import SidebarContent from './SidebarContent.vue'
import EventBus from './EventBus.js'
import Tabs from './Tabs.vue'
import ConnectivityInfo from './ConnectivityInfo.vue'

/**
 * Aims to provide a sidebar for searching capability for SPARC portal.
 */
export default {
  components: {
    SidebarContent,
    Tabs,
    ElIconArrowLeft,
    ElIconArrowRight,
    Drawer,
    Icon,
    ConnectivityInfo,
  },
  name: 'SideBar',
  props: {
    /**
     * The option to show side bar.
     */
    visible: {
      type: Boolean,
      default: false,
    },
    /**
     * The environment variables object with
     * `API_LOCATION`, `ALGOLIA_KEY`, `ALGOLIA_ID`,
     * `ALGOLIA_INDEX`, `PENNSIEVE_API_LOCATION`, `BL_SERVER_URL`,
     * `NL_LINK_PREFIX`, `ROOT_URL`
     */
    envVars: {
      type: Object,
      default: () => {},
    },
    /**
     * The array of objects to show multiple sidebar contents.
     */
    tabs: {
      type: Array,
      default: () => [
        { title: 'Search', id: 1 },
        { title: 'Connectivity', id: 2 }
      ],
    },
    /**
     * The active tab id for default tab.
     */
    activeId: {
      type: Number,
      default: 1,
    },
    /**
     * The option to show or hide sidebar on page load.
     */
    openAtStart: {
      type: Boolean,
      default: false,
    },
    /**
     * The connectivity info data to show in sidebar.
     */
    connectivityInfo: {
      type: Object,
      default: null,
    },
  },
  data: function () {
    return {
      drawerOpen: false,
    }
  },
  methods: {
    /**
     * This event is emitted when the mouse hover are changed.
     * @arg data
     */
    hoverChanged: function (data) {
      this.$emit('hover-changed', data)
    },
    /**
     * This event is emitted when the search filters are changed.
     * @arg `obj` {data, id}
     */
    searchChanged: function (id, data) {
      this.$emit('search-changed', { ...data, id: id })
    },
    /**
     * @vuese
     * The function to close sidebar.
     */
    close: function () {
      this.drawerOpen = false
    },
    /**
     * @vuese
     * The function to toggle (open and close) sidebar.
     */
    toggleDrawer: function () {
      this.drawerOpen = !this.drawerOpen
    },
    openSearch: function (facets, query) {
      this.drawerOpen = true
      // Because refs are in v-for, nextTick is needed here
      this.$nextTick(() => {
        // TODO: refs[1] is for `search` which should be renamed
        this.$refs[1][0].openSearch(facets, query)
      })
    },
    /**
     * @vuese
     * The function to add filters to sidebar search.
     * @arg filter `object`
     */
    addFilter: function (filter) {
      this.drawerOpen = true
      filter.AND = true // When we add a filter external, it is currently only with an AND boolean

      // Because refs are in v-for, nextTick is needed here
      this.$nextTick(() => {
        this.$refs[this.activeId][0].addFilter(filter)
      })
    },
    openNeuronSearch: function (neuron) {
      this.drawerOpen = true
      // Because refs are in v-for, nextTick is needed here
      this.$nextTick(() => {
        this.$refs[this.activeId][0].openSearch(
          '',
          undefined,
          'scicrunch-query-string/',
          { field: '*organ.curie', curie: neuron }
        )
      })
    },
    getAlgoliaFacets: async function () {
      return await this.$refs[this.activeId][0].getAlgoliaFacets()
    },
    setDrawerOpen: function (value = true) {
      this.drawerOpen = value
    },
    /**
     * @vuese
     * The function to emit 'tabClicked' event with tab's `id` when user clicks the sidebar tab.
     * @arg id
     */
    tabClicked: function (id) {
      /**
       * This event is emitted when user click sidebar's tab.
       * @arg id
       */
      this.$emit('tabClicked', id)
    },
    tabClose: function (id) {
      this.$emit('connectivity-info-close');
    },
  },
  created: function () {
    this.drawerOpen = this.openAtStart
  },
  mounted: function () {
    EventBus.on('PopoverActionClick', (payLoad) => {
      /**
       * This event is emitted when the image is clicked on or the button below the image is clicked on.
       * @arg payLoad
       */
      this.$emit('actionClick', payLoad)
    })
    EventBus.on('number-of-datasets-for-anatomies', (payLoad) => {
      /**
       * This emits a object with keys as anatomy and values as number of datasets for that anatomy.
       * @arg payload
       */
      this.$emit('number-of-datasets-for-anatomies', payLoad)
    })
    EventBus.on('anatomy-in-datasets', (payLoad) => {
       /**
       * This emits a lis of datasets, with the anatomy for each one. Used by flatmap for markers
       * @arg payload
       */
      this.$emit('anatomy-in-datasets', payLoad)
    })

    EventBus.on('contextUpdate', (payLoad) => {
      /**
       * This event is emitted when the context card is updated.
       * Example, context card update on first load.
       * @arg payload
       */
      this.$emit('contextUpdate', payLoad)
    })
    EventBus.on('datalink-clicked', (payLoad) => {
      /**
       * This event is emitted
       * when the dataset button or dataset image thumbnail
       * from the gallery component is clicked.
       * @arg payload
       */
      this.$emit('datalink-clicked', payLoad);
    })
    EventBus.on('onConnectivityActionClick', (payLoad) => {
      this.tabClicked(1);
      this.$emit('actionClick', payLoad);
    })
  },
}
</script>

<style lang="scss" scoped>
.box-card {
  flex: 3;
  height: 100%;
  overflow: hidden;
  pointer-events: auto;
}

.side-bar {
  position: relative;
  height: 100%;
  pointer-events: none;
  width:600px;
  float: right;
}

:deep(.sidebar-body) {
  position: absolute !important;
}

.side-bar :deep(.el-drawer:focus) {
  outline: none;
}

.sidebar-container {
  height: 100%;
  flex-flow: column;
  display: flex;
  background-color: white;
  box-shadow: var(--el-box-shadow-light);
  border-radius: var(--el-card-border-radius);
}

.open-tab {
  width: 20px;
  height: 40px;
  z-index: 8;
  position: absolute;
  top: calc(50vh - 80px);
  right: 0px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.06);
  border: solid 1px $app-primary-color;
  background-color: #f9f2fc;
  text-align: center;
  vertical-align: middle;
  cursor: pointer;
  pointer-events: auto;
}

.el-icon svg {
  font-weight: 600;
  margin-top: 24px;
  color: $app-primary-color;
  cursor: pointer;
  pointer-events: auto;
  transform: scaleY(2);
  text-align: center;
  vertical-align: middle;
}

.close-tab {
  float: left;
  flex: 1;
  width: 20px;
  height: 40px;
  z-index: 8;
  margin-top: calc(50vh - 80px);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.06);
  border: solid 1px $app-primary-color;
  background-color: #f9f2fc;
  text-align: center;
  vertical-align: middle;
  cursor: pointer;
  pointer-events: auto;
}

:deep(.my-drawer) {
  background: rgba(0, 0, 0, 0);
  box-shadow: none;
}

:deep(.my-drawer .el-drawer__body) {
  height: 100%;
  padding: 0;
}

.sidebar-content-container {
  flex: 1 1 auto;

  .tab-container ~ & {
    border-radius: 0;
    border: 0 none;
    position: relative;
  }
}
</style>

<style lang="scss">
.side-bar {
  --el-color-primary: #8300BF;
  --el-color-primary-light-7: #DAB3EC;
  --el-color-primary-light-8: #e6ccf2;
  --el-color-primary-light-9: #f3e6f9;
  --el-color-primary-light-3: #f3e6f9;
  --el-color-primary-dark-2: #7600AC;
}
.el-button--primary {
  --el-button-hover-text-color: var(--el-color-primary);
  --el-button-hover-link-text-color: var(--el-color-primary-light-5);
  --el-button-hover-bg-color: var(--el-color-primary-light-3);
  --el-button-hover-border-color: var(--el-color-primary-light-3);
}
</style>
