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
            v-if="tabEntries.length > 1"
            :tabEntries="tabEntries"
            :activeId="activeTabId"
            @tabClicked="tabClicked"
            @tabClosed="tabClosed"
          />
          <template v-for="tab in tabs" key="tab.id">
            <template v-if="tab.type === 'annotation'">
              <AnnotationTool
                :ref="'annotationTab_' + tab.id"
                v-show="tab.id === activeTabId"
                :annotationEntry="annotationEntry"
                :createData="createData"
                @annotation="$emit('annotation-submitted', $event)"
                @confirm-create="$emit('confirm-create', $event)"
                @cancel-create="$emit('cancel-create')"
                @confirm-delete="$emit('confirm-delete', $event)"
                @hover-changed="hoverChanged(tab.id, $event)"
              />
            </template>
            <template v-else-if="tab.type === 'connectivityExplorer'">
              <ConnectivityExplorer
                :ref="'connectivityExplorerTab_' + tab.id"
                v-show="tab.id === activeTabId"
                :connectivityKnowledge="connectivityKnowledge"
                :envVars="envVars"
                :connectivityEntry="connectivityEntry"
                :availableAnatomyFacets="availableAnatomyFacets"
                @filter-visibility="$emit('filter-visibility', $event)"
                :connectivityFilterOptions="filterOptions"
                :showVisibilityFilter="showVisibilityFilter"
                @search-changed="searchChanged(tab.id, $event)"
                @hover-changed="hoverChanged(tab.id, $event)"
                @show-connectivity="showConnectivity"
                @show-reference-connectivities="onShowReferenceConnectivities"
                @connectivity-hovered="onConnectivityHovered"
                @connectivity-collapse-change="onConnectivityCollapseChange"
                @connectivity-item-close="onConnectivityItemClose"
              />
            </template>
            <template v-else>
              <SidebarContent
                class="sidebar-content-container"
                v-show="tab.id === activeTabId"
                :contextCardEntry="tab.contextCard"
                :envVars="envVars"
                :ref="'datasetExplorerTab_' + tab.id"
                @search-changed="searchChanged(tab.id, $event)"
                @hover-changed="hoverChanged(tab.id, $event)"
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
import AnnotationTool from './AnnotationTool.vue'
import ConnectivityExplorer from './ConnectivityExplorer.vue'

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
    AnnotationTool,
    ConnectivityExplorer,
  },
  name: 'SideBar',
  props: {
    tabs: {
      type: Array,
      default: [
        { title: 'Dataset Explorer', id: 1, type: 'datasetExplorer', closable: false },
        { title: 'Connectivity Explorer', id: 2, type: 'connectivityExplorer', closable: false },
        { title: 'Annotation', id: 3, type: 'annotation', closable: true },
      ],
    },
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
     * The option to show or hide sidebar on page load.
     */
    openAtStart: {
      type: Boolean,
      default: false,
    },
    /**
     * The connectivity info data to show in sidebar.
     */
    connectivityEntry: {
      type: Array,
      default: [],
    },
    /**
     * The annotation data to show in sidebar.
     */
    annotationEntry: {
      type: Array,
      default: [],
    },
    createData: {
      type: Object,
      default: {
        toBeConfirmed: false,
        points: [],
        shape: "",
        x: 0,
        y: 0,
      },
    },
    connectivityKnowledge: {
      type: Array,
      default: [],
    },
    filterOptions: {
      type: Array,
      default: [],
    },
    showVisibilityFilter: {
      type: Boolean,
      default: false,
    }
  },
  data: function () {
    return {
      drawerOpen: false,
      availableAnatomyFacets: [],
      activeTabId: 1,
      activeAnnotationData: { tabType: "annotation" },
      activeConnectivityData: { tabType: "connectivity" },
    }
  },
  methods: {
    onConnectivityCollapseChange: function (data) {
      this.$emit('connectivity-collapse-change', data)
    },
    /**
     * This event is emitted when
     * the close button of the opened connectivity card
     * in connectivity explorer is clicked.
     */
    onConnectivityItemClose: function () {
      this.$emit('connectivity-item-close');
    },
    /**
     * This event is emitted when the mouse hover are changed.
     * @arg data
     */
    hoverChanged: function (id, data) {
      this.$emit('hover-changed', {...data,  tabId: id })

      const activeTabType = this.getActiveTabTypeById(id);
      // save the last highlighted data for connectivity and annotation tabs
      if (activeTabType === 'connectivityExplorer') {
        this.activeConnectivityData = data;
      }
      if (activeTabType === 'annotation') {
        this.activeAnnotationData = data;
      }
    },
    /**
     * This event is emitted when the show connectivity button is clicked.
     * @arg featureIds
     */
    showConnectivity: function (featureIds) {
      this.$emit('show-connectivity', featureIds);
    },
    /**
     * This event is emitted when the show related connectivities button in reference is clicked.
     * @param refSource
     */
    onShowReferenceConnectivities: function (refSource) {
      this.$emit('show-reference-connectivities', refSource);
    },
    /**
     * This function is triggered after connectivity term is hovered.
     * @arg data
     */
    onConnectivityHovered: function (data) {
      this.$emit('connectivity-hovered', data);
    },
    /**
     * This event is emitted when the search filters are changed.
     * @arg `obj` {data, id}
     */
    searchChanged: function (id, data) {
      this.$emit('search-changed', { ...data, tabId: id })
    },
    /**
     * The function to close sidebar.
     * @public
     */
    close: function () {
      this.drawerOpen = false
    },
    /**
     * The function to toggle (open and close) sidebar.
     * @public
     */
    toggleDrawer: function () {
      this.drawerOpen = !this.drawerOpen
    },
    openConnectivitySearch: function (facets, query) {
      this.drawerOpen = true;
      // Because refs are in v-for, nextTick is needed here
      this.$nextTick(() => {
        const connectivityExplorerTabRef = this.getTabRef(undefined, 'connectivityExplorer', true);
        connectivityExplorerTabRef.openSearch(facets, query);
      })
    },
    resetConnectivitySearch: function () {
      this.$nextTick(() => {
        const connectivityExplorerTabRef = this.getTabRef(undefined, 'connectivityExplorer', false);
        connectivityExplorerTabRef.resetSearchIfNoActiveSearch();
      })
    },
    openSearch: function (facets, query) {
      this.drawerOpen = true
      // Because refs are in v-for, nextTick is needed here
      this.$nextTick(() => {
        const datasetExplorerTabRef = this.getTabRef(undefined, 'datasetExplorer', true);
        datasetExplorerTabRef.openSearch(facets, query);
      })
    },
    /**
     * Get the ref id of the tab by id and type.
     */
    getTabRef: function (id, type, switchTab = false) {
      const matchedTab = this.tabEntries.filter((tabEntry) => {
        return (id === undefined || tabEntry.id === id) &&
          (type === undefined || tabEntry.type === type);
      });
      const tabInfo = matchedTab.length ? matchedTab : this.tabEntries;
      const tabRef = tabInfo[0].type + 'Tab_' + tabInfo[0].id;
      if (switchTab) this.setActiveTab({ id: tabInfo[0].id, type: tabInfo[0].type });
      return this.$refs[tabRef][0];
    },
    /**
     * The function to add filters to sidebar search.
     *
     * @param {Object} filter
     * @public
     */
    addFilter: function (filter) {
      this.drawerOpen = true
      filter.AND = true // When we add a filter external, it is currently only with an AND boolean

      // Because refs are in v-for, nextTick is needed here
      this.$nextTick(() => {
        const datasetExplorerTabRef = this.getTabRef(undefined, 'datasetExplorer', true);
        datasetExplorerTabRef.addFilter(filter)
      })
    },
    openNeuronSearch: function (neuron) {
      this.drawerOpen = true
      // Because refs are in v-for, nextTick is needed here
      this.$nextTick(() => {
        const datasetExplorerTabRef = this.getTabRef(undefined, 'datasetExplorer', true);
        datasetExplorerTabRef.openSearch(
          '',
          undefined,
          'scicrunch-query-string/',
          { field: '*organ.curie', curie: neuron }
        )
      })
    },
    getAlgoliaFacets: async function () {
      const datasetExplorerTabRef = this.getTabRef(undefined, 'datasetExplorer');
      return await datasetExplorerTabRef.getAlgoliaFacets()
    },
    setDrawerOpen: function (value = true) {
      this.drawerOpen = value
    },
    setActiveTab: function (tab) {
      const matchedTab = this.tabs.filter((tabEntry) => {
        return tabEntry.id === tab.id && tabEntry.type === tab.type;
      });
      const tabInfo = matchedTab.length ? matchedTab : this.tabEntries;
      this.activeTabId = tabInfo[0].id;
    },
    getActiveTabTypeById: function (id) {
      const foundTab = this.tabs.find((tab) => tab.id === id);
      if (foundTab) {
        return foundTab.type;
      }
      return '';
    },
    highlightActiveTabData: function (tab) {
      let data = null;

      if (tab.type === 'connectivityExplorer') {
        const connectivityExplorerTabRef = this.getTabRef(undefined, 'connectivityExplorer', true);
        // check if any opened item
        // if no opened item, highlight items will be based on the results in explorer
        if (connectivityExplorerTabRef && !connectivityExplorerTabRef.expanded) {
          data = { tabType: 'connectivity' };
        } else {
          data = {...this.activeConnectivityData};
        }
      } else if (tab.type === 'annotation') {
        data = {...this.activeAnnotationData};
      } else {
        // switching to dataset explorer tab will not highlight
        // the highlight is from the last tab
        // if needed, to update it here
      }

      if (data) {
        this.$emit('hover-changed', {...data,  tabId: tab.id })
      }
    },
    tabClicked: function (tab) {
      this.setActiveTab(tab);
      this.$emit('tabClicked', tab);
      this.highlightActiveTabData(tab);
    },
    tabClosed: function (tab) {
      this.$emit('tabClosed', tab);
    },
    /**
     * To receive error message for connectivity graph
     * @param {String} errorMessage
     */
    updateConnectivityError: function (errorInfo) {
      EventBus.emit('connectivity-error', errorInfo);
    },
    /**
     * Store available anatomy facets data for connectivity list component
     */
    storeAvailableAnatomyFacets: function (availableAnatomyFacets) {
      localStorage.setItem('available-anatomy-facets', JSON.stringify(availableAnatomyFacets))
    },
    closeConnectivity: function () {
      EventBus.emit('close-connectivity');
    },
  },
  computed: {
    // This should respect the information provided by the property
    tabEntries: function () {
      return this.tabs.filter((tab) =>
        tab.type === "datasetExplorer" ||
        tab.type === "connectivityExplorer" ||
        (
          tab.type === "annotation" &&
          this.annotationEntry &&
          this.annotationEntry.length > 0
        )
      );
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
      // switch to search tab with tab id: 1
      this.tabClicked({id: 1, type: 'datasetExplorer'});
      this.$emit('actionClick', payLoad);
    })
    EventBus.on('connectivity-source-change', (payLoad) => {
      this.$emit('connectivity-source-change', payLoad);
    })

    // Get available anatomy facets for the connectivity info
    EventBus.on('available-facets', (payLoad) => {
        this.availableAnatomyFacets = payLoad.find((facet) => facet.label === 'Anatomical Structure').children
        this.storeAvailableAnatomyFacets(this.availableAnatomyFacets);
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
