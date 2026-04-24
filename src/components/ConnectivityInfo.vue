<template>
  <div v-if="entry" class="main">
    <!-- Connectivity Info Title -->
    <div class="connectivity-info-title">
      <div class="title-content">
        <div class="block" v-if="entry.title">
          <div class="title-group">
            <div
              ref="titleElement"
              class="title"
              :class="{ 'title--clamped': !isTitleExpanded }"
              @click="toggleTitleExpansion"
            >
              <span>{{ capitalise(displayTitle) }}</span>
            </div>
            <button
              v-if="showTitleToggle"
              class="title-toggle"
              type="button"
              @click="toggleTitleExpansion"
            >
              {{ isTitleExpanded ? 'Collapse' : 'Expand title' }}
              <el-icon class="title-toggle-icon">
                <el-icon-arrow-up v-if="isTitleExpanded" />
                <el-icon-arrow-down v-else />
              </el-icon>
            </button>
          </div>
          <div class="subtitle">
            <strong>Id: </strong>{{ entry.featureId[0] }}
            <el-button
              round
              size="small"
              class="alert-chip"
              @click="showAlertMessage"
              v-if="entry.featuresAlert"
            >
              <el-icon class="alert"><el-icon-warn-triangle-filled /></el-icon>
              Notes
            </el-button>
          </div>
          <div v-if="hasProvenanceTaxonomyLabel" class="subtitle">
            {{ provSpeciesDescription }}
          </div>
        </div>
        <div class="block" v-else>
          <div class="title">{{ entry.featureId }}</div>
        </div>
      </div>
      <div class="title-buttons">
        <el-popover
          width="auto"
          trigger="hover"
          :teleported="false"
          popper-class="popover-map-pin"
        >
          <template #reference>
            <el-button class="button-circle secondary" circle @click="showConnectivity">
              <el-icon color="#8300bf">
                <el-icon-location />
              </el-icon>
            </el-button>
          </template>
          <span>
            Show connectivity on map
          </span>
        </el-popover>
        <CopyToClipboard @copied="onCopied" :content="updatedCopyContent" />
        <template v-if="withCloseButton">
          <el-popover
            width="auto"
            trigger="hover"
            :teleported="false"
            popper-class="popover-map-pin"
          >
            <template #reference>
              <el-button class="button-circle" circle @click="closeConnectivity">
                <el-icon color="white">
                  <el-icon-close />
                </el-icon>
              </el-button>
            </template>
            <span>Close</span>
          </el-popover>
        </template>
      </div>
    </div>

    <div class="content-container population-details" :class="{'flex-row': hasSingleConnectivityList}">
      <div class="block attribute-title-container">
        <span class="attribute-title">Population Details</span>
        <el-popover
          v-if="activeView === 'listView'"
          width="250"
          trigger="hover"
          :teleported="false"
          popper-class="popover-origin-help"
        >
          <template #reference>
            <el-icon class="info"><el-icon-warning /></el-icon>
          </template>
          <span v-if="hasSingleConnectivityList" style="word-break: keep-all">
            This list is ordered alphabetically. Switch to graph view for path details,
            and use the legend below for reconciliation status.
          </span>
          <span v-else style="word-break: keep-all">
            This list is ordered alphabetically,
            switch to graph view for path details.
          </span>
          <div v-if="hasSingleConnectivityList" class="connectivity-legends">
            <div class="legend-title">Legend</div>
            <span class="legend-item">
              <span class="legend-color differ"></span>
              SCKAN feature alias to Map feature
            </span>
            <span class="legend-item">
              <span class="legend-color unavailable"></span>
              SCKAN feature unavailable on Map
            </span>
            <span class="legend-item">
              <span class="legend-color mapped"></span>
              SCKAN feature available on Map
            </span>
          </div>
        </el-popover>
      </div>
      <div class="block buttons-row">
        <div class="population-details-source" v-if="!hasSingleConnectivityList">
          <span>
            Connectivity from:
            <el-popover
              width="320"
              trigger="hover"
              :teleported="false"
              popper-class="popover-origin-help"
            >
              <template #reference>
                <el-icon class="info"><el-icon-warning /></el-icon>
              </template>
              <span style="word-break: keep-all">
                <strong>Map</strong> - connectivity as defined in active map.
                <br>
                <strong>SCKAN</strong> - connectivity as defined in SCKAN.
              </span>
            </el-popover>
          </span>
          <el-radio-group v-model="connectivitySource" @change="onConnectivitySourceChange">
            <el-radio value="map" :disabled="noMapConnectivity">Map</el-radio>
            <el-radio value="sckan">SCKAN</el-radio>
          </el-radio-group>
        </div>
        <div class="population-details-view" :class="{'align-right': hasSingleConnectivityList}">
          <el-button
            :class="activeView === 'listView' ? 'button' : 'el-button-secondary'"
            @click="switchConnectivityView('listView')"
          >
            List view
          </el-button>
          <el-button
            :class="activeView === 'graphView' ? 'button' : 'el-button-secondary'"
            @click="switchConnectivityView('graphView')"
          >
            Graph view
          </el-button>
        </div>
      </div>
    </div>

    <div v-if="entry['nerve-label']" class="block">
      <div class="attribute-title-container">
        <span class="attribute-title">Nerves</span>
      </div>
      <div v-for="(nerve, i) in entry['nerve-label']">
        <div
          class="attribute-content"
          :origin-item-label="nerve.nerve"
          :key="nerve.nerve"
        >
          <span>{{ capitalise(nerve.nerve) }}</span>
        </div>
        <div
          v-for="(subNerve, i) in nerve.subNerves"
          class="attribute-content"
          style="margin-left: 1rem"
          :origin-item-label="subNerve"
          :key="subNerve"
          @mouseenter="onConnectivityHovered(subNerve)"
          @mouseleave="onConnectivityHovered()"
        >
          <el-popover
            width="150"
            trigger="hover"
            :teleported="false"
            popper-class="popover-origin-help"
          >
            <template #reference>
              <el-icon class="magnify-glass" @click="onConnectivityClicked(subNerve)">
                <el-icon-search />
              </el-icon>
            </template>
            <span>Search sub nerve</span>
          </el-popover>
          <span>{{ capitalise(subNerve) }}</span>
        </div>
      </div>
    </div>

    <div class="content-container content-container-connectivity" v-show="activeView === 'listView'">
      <!-- TODO: To use only one component when the data is ready -->
      <template v-if="hasSingleConnectivityList">
        <connectivity-reconciliation-list
          v-loading="connectivityLoading"
          :key="`${connectivityKey}list`"
          :entry="entry"
          :origins="origins"
          :components="components"
          :destinations="destinations"
          :originsWithDatasets="originsWithDatasets"
          :componentsWithDatasets="componentsWithDatasets"
          :destinationsWithDatasets="destinationsWithDatasets"
          :destinationsCombinations="destinationsCombinations"
          :originsCombinations="originsCombinations"
          :componentsCombinations="componentsCombinations"
          :availableAnatomyFacets="availableAnatomyFacets"
          :connectivityError="connectivityError"
          @connectivity-hovered="onConnectivityHovered"
          @connectivity-clicked="onConnectivityClicked"
          @connectivity-action-click="onConnectivityActionClick"
        />
      </template>
      <template v-else>
        <connectivity-list
          v-loading="connectivityLoading"
          :key="`${connectivityKey}list`"
          :entry="entry"
          :origins="origins"
          :components="components"
          :destinations="destinations"
          :originsWithDatasets="originsWithDatasets"
          :componentsWithDatasets="componentsWithDatasets"
          :destinationsWithDatasets="destinationsWithDatasets"
          :availableAnatomyFacets="availableAnatomyFacets"
          :connectivityError="connectivityError"
          @connectivity-hovered="onConnectivityHovered"
          @connectivity-clicked="onConnectivityClicked"
          @connectivity-action-click="onConnectivityActionClick"
        />
      </template>
    </div>

    <div class="content-container content-container-connectivity" v-show="activeView === 'graphView'">
      <template v-if="graphViewLoaded">
        <el-button
          class="button"
          @click="openGraphInViewer"
        >
          Open in viewer
        </el-button>
        <connectivity-graph
          v-loading="connectivityLoading"
          :key="`${connectivityKey}graph`"
          :entry="entry.featureId[0]"
          :mapServer="flatmapApi"
          :sckanVersion="sckanVersion"
          :connectivityFromMap="connectivityFromMap"
          :connectivityError="connectivityError"
          :origins="origins"
          :components="components"
          :destinations="destinations"
          :originsWithDatasets="originsWithDatasets"
          :componentsWithDatasets="componentsWithDatasets"
          :destinationsWithDatasets="destinationsWithDatasets"
          :originsCombinations="originsCombinations"
          :componentsCombinations="componentsCombinations"
          :destinationsCombinations="destinationsCombinations"
          :hasSingleConnectivityList="hasSingleConnectivityList"
          @tap-node="onTapNode"
        />
      </template>
    </div>

    <div class="content-container content-container-references" v-if="resources.length">
      <ExternalResourceCard
        :resources="resources"
        @references-loaded="onReferencesLoaded"
        @show-reference-connectivities="onShowReferenceConnectivities"
        @trackEvent="onTrackEvent"
      />
    </div>

    <div
      ref="alertElement"
      class="content-container content-container-alert"
      v-if="entry.featuresAlert"
    >
      <div class="block attribute-title-container">
        <span class="attribute-title">Alert</span>
      </div>
      <div class="block">
        <div class="alert-block"
          v-for="alert in entry.featuresAlert"
          v-html="formatAlertText(alert)"
        ></div>
      </div>
    </div>
  </div>
</template>

<script>
  /* eslint-disable no-alert, no-console */
import {
  Warning as ElIconWarning,
  Location as ElIconLocation,
  Search as ElIconSearch,
  ArrowDown as ElIconArrowDown,
  ArrowUp as ElIconArrowUp,
} from '@element-plus/icons-vue'
import {
  ElButton as Button,
  ElContainer as Container,
  ElIcon as Icon,
} from 'element-plus'

import EventBus from './EventBus.js'
import {
  CopyToClipboard,
  ConnectivityGraph,
  ConnectivityList,
  ConnectivityReconciliationList,
  ExternalResourceCard,
} from '@abi-software/map-utilities';
import '@abi-software/map-utilities/dist/style.css';

const titleCase = (str) => {
  return str.replace(/\w\S*/g, (t) => {
    return t.charAt(0).toUpperCase() + t.substr(1).toLowerCase()
  })
}

const capitalise = function (str) {
  if (str) return str.charAt(0).toUpperCase() + str.slice(1)
  return ''
}

export default {
  name: 'ConnectivityInfo',
  components: {
    Button,
    Container,
    Icon,
    ElIconWarning,
    ElIconLocation,
    ElIconSearch,
    ElIconArrowDown,
    ElIconArrowUp,
    ExternalResourceCard,
    CopyToClipboard,
    ConnectivityGraph,
    ConnectivityList,
    ConnectivityReconciliationList,
  },
  props: {
    connectivityEntry: {
      type: Array,
      default: [],
    },
    entryData: {
      type: Object,
      default: () => ({}),
    },
    entryId: {
      type: String,
      default: "",
    },
    envVars: {
      type: Object,
      default: () => {},
    },
    availableAnatomyFacets: {
      type: Array,
      default: () => [],
    },
    withCloseButton: {
      type: Boolean,
      default: false,
    },
    showLongLabel: {
      type: Boolean,
      default: false,
    },
  },
  data: function () {
    return {
      updatedCopyContent: '',
      activeView: 'listView',
      connectivityLoading: false,
      connectivitySource: 'map', // sckan
      noMapConnectivity: false,
      connectivityError: {},
      graphViewLoaded: false,
      connectivityFromMap: null,
      isTitleExpanded: false,
      showTitleToggle: false,
    };
  },
  computed: {
    entry: function () {
      return this.connectivityEntry.find((entry) => {
        return entry.featureId[0] === this.entryId;
      });
    },
    displayTitle: function () {
      if (this.showLongLabel) {
        return this.entryData?.['long-label'] || this.entry?.['long-label'] || '';
      }
      return this.entry?.title || '';
    },
    hasProvenanceTaxonomyLabel: function () {
      return (
        this.entry.provenanceTaxonomyLabel &&
        this.entry.provenanceTaxonomyLabel.length > 0
      );
    },
    provSpeciesDescription: function () {
      let text = "Studied in";
      this.entry.provenanceTaxonomyLabel.forEach((label) => {
        text += ` ${label},`;
      });
      text = text.slice(0, -1); // remove last comma
      text += " species";
      return text;
    },
    connectivityKey: function () {
      return this.entry.featureId[0] + this.entry.connectivitySource;
    },
    origins: function () {
      return this.entry.origins;
    },
    components: function () {
      return this.entry.components;
    },
    destinations: function () {
      return this.entry.destinations;
    },
    originsWithDatasets: function () {
      return this.entry.originsWithDatasets;
    },
    componentsWithDatasets: function () {
      return this.entry.componentsWithDatasets;
    },
    destinationsWithDatasets: function () {
      return this.entry.destinationsWithDatasets;
    },
    hasSingleConnectivityList: function () {
      return this.entry.hasSingleConnectivityList;
    },
    destinationsCombinations: function () {
      return this.entry.destinationsCombinations || [];
    },
    originsCombinations: function () {
      return this.entry.originsCombinations || [];
    },
    componentsCombinations: function () {
      return this.entry.componentsCombinations || [];
    },
    resources: function () {
      return this.entry.hyperlinks || [];
    },
    sckanVersion: function () {
      return this.entry.knowledgeSource;
    },
    flatmapApi: function () {
      return this.envVars.FLATMAPAPI_LOCATION;
    },
  },
  watch: {
    entry: {
      deep: true,
      immediate: true,
      handler: function (newVal, oldVal) {
        if (newVal && newVal !== oldVal) {
          this.connectivityLoading = true;
          this.activeView =
            localStorage.getItem('connectivity-active-view') ||
            this.activeView;
          if (this.activeView === 'graphView') {
            this.graphViewLoaded = true;
          }
          this.connectivitySource = this.entry.connectivitySource;
          this.noMapConnectivity = this.entry.noMapConnectivity;
          this.updateGraphConnectivity();
          this.connectivityLoading = false;
          // only emit to scroll when entire entry content changes
          if (!oldVal || newVal?.featureId[0] !== oldVal?.featureId[0]) {
            this.$emit('loaded');
          }

          this.isTitleExpanded = false;
          this.updateTitleToggleVisibility();
        }
      },
    },
    displayTitle: function () {
      this.isTitleExpanded = false;
      this.updateTitleToggleVisibility();
    },
  },
  methods: {
    titleCase: function (title) {
      return titleCase(title)
    },
    capitalise: function (text) {
      return capitalise(text)
    },
    toggleTitleExpansion: function () {
      this.isTitleExpanded = !this.isTitleExpanded;
      if (!this.isTitleExpanded) {
        this.$nextTick(() => {
          this.updateTitleToggleVisibility();
        });
      }
    },
    updateTitleToggleVisibility: function () {
      this.$nextTick(() => {
        const titleElement = this.$refs.titleElement;
        if (!titleElement) {
          this.showTitleToggle = false;
          return;
        }

        const wasExpanded = this.isTitleExpanded;
        if (wasExpanded) {
          titleElement.classList.add('title--clamped');
        }

        const hasOverflow = titleElement.scrollHeight > titleElement.clientHeight + 1;
        this.showTitleToggle = hasOverflow;

        if (wasExpanded) {
          titleElement.classList.remove('title--clamped');
        }

        if (!hasOverflow) {
          this.isTitleExpanded = false;
        }
      });
    },
    showConnectivity: function () {
      // move the map center to highlighted area
      const featureIds = this.entry.featureId || [];
      // connected to flatmapvuer > moveMap(featureIds) function
      this.$emit('show-connectivity', featureIds);

      EventBus.emit('trackEvent', {
        'event_name': `portal_maps_show_connectivity_on_map`,
        'category': this.entry.id || '',
        'location': 'map_sidebar_connectivity',
      });
    },
    onCopied: function () {
      EventBus.emit('trackEvent', {
        'event_name': `portal_maps_connectivity_copy`,
        'category': this.entry.id || '',
        'location': 'map_sidebar_connectivity',
      });
    },
    switchConnectivityView: function (val) {
      this.activeView = val;
      localStorage.setItem('connectivity-active-view', this.activeView);

      if (val === 'graphView' && !this.graphViewLoaded) {
        // to load the connectivity graph only after the container is in view
        this.$nextTick(() => {
          this.graphViewLoaded = true;
        });
      }

      EventBus.emit('trackEvent', {
        'event_name': `portal_maps_connectivity_switch_view`,
        'category': val,
        'location': 'map_sidebar_connectivity',
      });
    },
    openGraphInViewer: function () {
      // Open graph view in viewer
      const payload = {
        entry: this.entry.featureId[0],
        mapServer: this.flatmapApi,
        sckanVersion: this.sckanVersion,
        connectivityFromMap: this.connectivityFromMap,
        connectivityError: this.connectivityError,
        origins: this.origins,
        components: this.components,
        destinations: this.destinations,
        originsWithDatasets: this.originsWithDatasets,
        componentsWithDatasets: this.componentsWithDatasets,
        destinationsWithDatasets: this.destinationsWithDatasets,
        hasSingleConnectivityList: this.hasSingleConnectivityList,
        originsCombinations: this.originsCombinations,
        componentsCombinations: this.componentsCombinations,
        destinationsCombinations: this.destinationsCombinations,
        allWithDatasets: [
          ...this.componentsWithDatasets,
          ...this.destinationsWithDatasets,
          ...this.originsWithDatasets,
        ],
      };
      EventBus.emit('show-connectivity-graph', payload);
    },
    onTapNode: function (data) {
      // save selected state for list view
      const name = data.map(t => t.label).join(', ');
      this.onConnectivityHovered(name);
    },
    onShowReferenceConnectivities: function (refSource) {
      this.$emit('show-reference-connectivities', refSource);
    },
    onReferencesLoaded: function (references) {
      this.updatedCopyContent = this.getUpdateCopyContent(references);
    },
    getUpdateCopyContent: function (references) {
      if (!this.entry) {
        return '';
      }

      const contentArray = [];

      // Use <div> instead of <h1>..<h6> or <p>
      // to avoid default formatting on font size and margin

      // Title
      const title = this.entry?.title || '';
      const longLabel = this.entryData?.['long-label'] || this.entry?.['long-label'] || '';
      let featureId = this.entry.featureId;
      const titleContent = [];

      const displayLabel = capitalise(longLabel || title);
      if (displayLabel) {
        titleContent.push(`<div><strong>${displayLabel}</strong></div>`);
      }

      if (featureId?.length) {
        if (typeof featureId === 'object') {
          titleContent.push(`<div><strong>Id:</strong> ${featureId[0]}</div>`);
        } else {
          titleContent.push(`<div><strong>Id:</strong> ${featureId}</div>`);
        }
      }

      contentArray.push(`<div>${titleContent.join('\n')}</div>`);

      // Description
      if (this.entry.provenanceTaxonomyLabel?.length) {
        contentArray.push(`<div>${this.provSpeciesDescription}</div>`);
      }

      // entry.paths
      if (this.entry.paths) {
        contentArray.push(`<div>${this.entry.paths}</div>`);
      }

      let hasUnavailableReference = false;
      let hasDifferReference = false;

      function transformData(title, items, itemsWithDatasets = []) {
        let contentString = `<div><strong>${title}</strong></div>`;
        const transformedItems = [];
        items.forEach((item) => {
          let itemNames = [];
          item.split(',').forEach((name) => {
            const match = itemsWithDatasets.find((a) => a.name === name.trim());
            if (match) {
              itemNames.push(`${capitalise(name)} (${match.id})`);
            } else {
              itemNames.push(`${capitalise(name)}`);
            }
          });
          transformedItems.push(itemNames.join(','));
        });
        const contentList = transformedItems
          .map((item) => `<li>${item}</li>`)
          .join('\n');
        contentString += '\n';
        contentString += `<ul>${contentList}</ul>`;
        return contentString;
      }

      function transformReconciliationData(title, combinations = []) {
        let contentString = `<div><strong>${title}</strong></div>`;
        const sortedCombinations = [...combinations].sort((a, b) => {
          const labelA = (a?.sckanLabel || a?.mapLabel || '').toLowerCase();
          const labelB = (b?.sckanLabel || b?.mapLabel || '').toLowerCase();
          return labelA.localeCompare(labelB);
        });
        const getFirstId = (idArr) => {
          if (!idArr?.length) return null;
          const first = idArr[0];
          return typeof first === 'string' ? first : (first?.[0] || null);
        };
        const transformedItems = sortedCombinations.map((item) => {
          const isDirectMatch =
            item?.sckanId &&
            item?.mapId &&
            JSON.stringify(item.sckanId) === JSON.stringify(item.mapId);

          if (isDirectMatch) {
            const id = getFirstId(item.mapId);
            const label = capitalise(item.sckanLabel || item.mapLabel || '-');
            return id ? `${label} (${id})` : label;
          }

          const sckanLabel = item?.sckanLabel ? capitalise(item.sckanLabel) : '-';
          const sckanId = getFirstId(item.sckanId);
          const sckanLabelWithId = sckanId ? `${sckanLabel} (${sckanId})` : sckanLabel;
          const isUnavailableOnMap = !item?.mapId?.length || !item?.mapLabel;

          if (isUnavailableOnMap) {
            hasUnavailableReference = true;
            return `<s>${sckanLabelWithId}</s> (unavailable on <strong>Map</strong>) *`;
          }

          const mapLabel = capitalise(item.mapLabel);
          const mapId = getFirstId(item.mapId);
          const mapLabelWithId = mapId ? `${mapLabel} (${mapId})` : mapLabel;
          hasDifferReference = true;
          return `<s>${sckanLabelWithId}</s> (<strong>Map:</strong> ${mapLabelWithId}) **`;
        });
        const contentList = transformedItems
          .map((item) => `<li>${item}</li>`)
          .join('\n');
        contentString += '\n';
        contentString += `<ul>${contentList}</ul>`;
        return contentString;
      }

      // Nerves
      if (this.entry['nerve-label']?.length) {
        const title = 'Nerves';
        const nerves = this.entry['nerve-label'];
        const nerveLabels = nerves.map(nerve => Object.values(nerve)).flat(Infinity);
        const transformedNerves = transformData(title, nerveLabels);
        contentArray.push(transformedNerves);
      }

      // Origins / Components / Destination
      if (this.hasSingleConnectivityList) {
        if (this.originsCombinations?.length) {
          const transformedOrigins = transformReconciliationData('Origin', this.originsCombinations);
          contentArray.push(transformedOrigins);
        }

        if (this.componentsCombinations?.length) {
          const transformedComponents = transformReconciliationData('Components', this.componentsCombinations);
          contentArray.push(transformedComponents);
        }

        if (this.destinationsCombinations?.length) {
          const transformedDestinations = transformReconciliationData('Destination', this.destinationsCombinations);
          contentArray.push(transformedDestinations);
        }

        if (hasUnavailableReference || hasDifferReference) {
          const legendNotes = [];
          if (hasUnavailableReference) {
            legendNotes.push('<div>* SCKAN feature unavailable on Map</div>');
          }
          if (hasDifferReference) {
            legendNotes.push('<div>** SCKAN feature alias to Map feature</div>');
          }
          contentArray.push(`<div>${legendNotes.join('\n')}</div>`);
        }
      } else {
        if (this.origins?.length) {
          const transformedOrigins = transformData('Origin', this.origins, this.originsWithDatasets);
          contentArray.push(transformedOrigins);
        }

        if (this.components?.length) {
          const transformedComponents = transformData('Components', this.components, this.componentsWithDatasets);
          contentArray.push(transformedComponents);
        }

        if (this.destinations?.length) {
          const transformedDestinations = transformData('Destination', this.destinations, this.destinationsWithDatasets);
          contentArray.push(transformedDestinations);
        }
      }

      // References
      if (references) {
        let contentString = `<div><strong>References</strong></div>`;
        contentString += '\n';
        const contentList = references.list
          .map((item) => `<li>${item}</li>`)
          .join('\n');
        contentString += `<ul>${contentList}</ul>`;
        contentArray.push(contentString);
      }

      // Alert
      if (this.entry.featuresAlert) {
        const alertContent = this.entry.featuresAlert
          .map((alert) => this.formatAlertText(alert))
          .join('\n');
        contentArray.push(`<div><strong>Alert</strong></div>\n${alertContent}`);
      }

      return contentArray.join('\n\n<br>');
    },
    getConnectivityDatasets: function (label) {
      const allWithDatasets = [
        ...this.componentsWithDatasets,
        ...this.destinationsWithDatasets,
        ...this.originsWithDatasets,
      ];
      const names = label.split(','); // some features have more than one value
      let data = [];
      names.forEach((n) => {
        const foundData = allWithDatasets.find((a) =>
          a.name.toLowerCase().trim() === n.toLowerCase().trim()
        );
        if (foundData) {
          data.push({
            id: foundData.id,
            label: foundData.name
          });
        }
      });
      return data
    },
    onConnectivityHovered: function (label) {
      const payload = {
        connectivityInfo: this.entry,
        label: label,
        data: label ? this.getConnectivityDatasets(label) : [],
      };
      // type: to show error only for click event
      this.$emit('connectivity-hovered', payload);
    },
    onConnectivityClicked: function (label) {
      const payload = { query: label, filter: [] };
      this.$emit('connectivity-clicked', payload);
    },
    /**
     * Function to show error message.
     * `errorInfo` includes `errorData` array (optional) for error connectivities
     * and `errorMessage` for error message.
     * @arg `errorInfo`
     */
    getConnectivityError: function (errorInfo) {
      const { errorData, errorMessage } = errorInfo;
      const errorConnectivities = errorData
        .map((connectivity) => capitalise(connectivity.label))
        .join(', ')
        .replace(/, ([^,]*)$/, ' and $1');

      return {
        errorConnectivities,
        errorMessage,
      };
    },
    onConnectivitySourceChange: function (connectivitySource) {
      this.connectivityLoading = true;

      if (this.activeView !== 'graphView') {
        this.graphViewLoaded = false;
      }

      this.updateGraphConnectivity();

      EventBus.emit('connectivity-source-change', {
        entry: this.entry,
        connectivitySource: connectivitySource,
      });

      EventBus.emit('trackEvent', {
        'event_name': `portal_maps_connectivity_source_change`,
        'category': connectivitySource,
        'location': 'map_sidebar_connectivity',
      });
    },
    updateGraphConnectivity: function () {
      if (this.connectivitySource === "map") {
        this.getConnectionsFromMap().then((response) => {
          // show sckan source graph if map source not exist
          this.connectivityFromMap = null;
          if (response?.connectivity?.length) {
            this.connectivityFromMap = response;
          }
          this.connectivityLoading = false;
        });
      } else {
        this.connectivityFromMap = null;
        this.connectivityLoading = false;
      }
    },
    getConnectionsFromMap: async function () {
      if (this.entry.mapuuid) {
        const url =
          this.flatmapApi +
          `flatmap/${this.entry.mapuuid}/connectivity/${this.entry.featureId[0]}`;

        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
          }

          return await response.json();
        } catch (error) {
          EventBus.emit('connectivity-source-change', {
            entry: this.entry,
            connectivitySource: "sckan",
          });
          throw new Error(error);
        }
      }
    },
    onConnectivityActionClick: function (data) {
      EventBus.emit('onConnectivityActionClick', data);
    },
    closeConnectivity: function () {
      this.$emit('close-connectivity');

      EventBus.emit('trackEvent', {
        'event_name': `portal_maps_connectivity_close`,
        'category': this.entry.id || '',
        'location': 'map_sidebar_connectivity',
      });
    },
    onTrackEvent: function (data) {
      EventBus.emit('trackEvent', data);
    },
    showAlertMessage: function () {
      // scroll to alert message
      this.$nextTick(() => {
        const alertElement = this.$refs.alertElement;
        if (alertElement) {
          alertElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest',
          });
        }
      });
    },
    formatAlertText: function (text) {
      if (!text) return '';
      const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const linkified = escaped.replace(
        /(https?:\/\/[^\s"<>\[]+)/g,
        (url) => {
          const parts = url.match(/^(.*?)([\].,;:!?]*)$/);
          const cleanUrl = parts ? parts[1] : url;
          const suffix = parts ? parts[2] : '';
          return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanUrl}</a>${suffix}`;
        }
      );

      const normalised = linkified
        .replace(/\\n/g, '\n')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');

      return normalised
        .split('\n')
        .map((line) => {
          const withBoldLabel = line.replace(
            /^\s*([A-Za-z][^:<]{0,120}:)/,
            '<strong>$1</strong>'
          );
          return `<div class="alert-line">${withBoldLabel}</div>`;
        })
        .join('\n');
    },
  },
  mounted: function () {
    this.updatedCopyContent = this.getUpdateCopyContent();
    this.updateTitleToggleVisibility();

    EventBus.on('connectivity-error', (errorInfo) => {
      const connectivityError = this.getConnectivityError(errorInfo);
      this.connectivityError = { ...connectivityError };
    });
  },
}
</script>

<style lang="scss" scoped>
.connectivity-info-title {
  padding: 0;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 1rem;

  .title-content {
    flex: 1 0 0%;
    max-width: 85%;
  }
}

.toggle-button {
  display: flex;
  justify-content: space-between;

  .is-disabled {
    color: #fff !important;
    background-color: #ac76c5 !important;
    border: 1px solid #ac76c5 !important;
  }
}

.title-group {
  margin-bottom: 8px;
}

.title {
  flex: 1;
  min-width: 0;
  text-align: left;
  line-height: 1.3em !important;
  font-size: 18px;
  font-weight: bold;
  color: $app-primary-color;
}

.title--clamped {
  display: -webkit-box;
  -webkit-line-clamp: 5;
  line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.title-toggle {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border: 0;
  background: transparent;
  padding: 0;
  margin-top: 2px;
  color: $app-primary-color;
  text-decoration: underline;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  cursor: pointer;
  white-space: nowrap;
  opacity: 0.65;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1;
  }

  .title-toggle-icon {
    font-size: 10px;
  }
}

.block + .block {
  margin-top: 0.5em;
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

.alert {
  color: #8300bf;
  margin-left: 5px;
  vertical-align: text-bottom;

  &,
  > svg {
    width: 1.25rem;
    height: 1.25rem;
  }
}

.hide {
  color: $app-primary-color;
  cursor: pointer;
  margin-right: 6px;
  margin-top: 3px;
}

.slide-fade-enter-active {
  transition: opacity 0.5s, transform 0.5s;
}
.slide-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.slide-fade-enter, .slide-fade-leave-to /* .slide-fade-leave-active in <2.1.8 */ {
  opacity: 0;
  transform: translateY(-8px);
}

.main {
  font-size: 14px;
  text-align: left;
  line-height: 1.5em;
  font-family: Asap, sans-serif, Helvetica;
  font-weight: 400;
  /* outline: thin red solid; */
  overflow-y: auto;
  scrollbar-width: thin;
  min-width: 16rem;
  background-color: #f7faff;
  height: 100%;
  border-left: 1px solid var(--el-border-color);
  border-top: 1px solid var(--el-border-color);
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  padding: 1rem;
}

.info {
  color: #8300bf;
  transform: rotate(180deg);
  margin-left: 8px;
}

.attribute-title-container {
  margin-bottom: 0.5em;
}

.attribute-title {
  font-size: 16px;
  font-weight: 600;
  /* font-weight: bold; */
  text-transform: uppercase;
}

.button {
  margin-left: 0px !important;
  margin-top: 0px !important;
  font-size: 14px !important;
  background-color: $app-primary-color;
  color: #fff;

  &:hover {
    color: #fff !important;
    background-color: #ac76c5 !important;
    border: 1px solid #ac76c5 !important;
  }

  & + .button {
    margin-top: 10px !important;
  }
}

.el-button-secondary {
  border-color: transparent !important;
  background-color: transparent !important;
  color: inherit !important;

  &:hover {
    color: $app-primary-color !important;
    border-color: $app-primary-color !important;
    background-color: #f9f2fc !important;
  }
}

.buttons-row {
  text-align: right;

  .button {
    cursor: default;
    border-color: transparent;

    &:hover {
      background-color: $app-primary-color !important;
      border-color: transparent !important;
    }
  }

  .el-button + .el-button {
    margin-top: 0 !important;
    margin-left: 10px !important;
  }

  > div:first-child {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
}

.neuron-connection-button {
  display: flex;
  flex: 1 1 auto !important;
  flex-direction: row !important;
  align-items: center;
  justify-content: space-between;

  .el-button + .el-button {
    margin-top: 0 !important;
    margin-left: 10px !important;
  }
}

.population-details {
  display: flex;
  flex: 1 1 auto !important;
  flex-direction: row !important;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid $app-primary-color;
  padding-bottom: 0.5rem !important;
  flex-direction: column !important;
  align-items: start;

  &.flex-row {
    flex-direction: row !important;
    align-items: center;
  }

  .buttons-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  &:not(.flex-row) .buttons-row {
    width: 100%;
  }
}

.population-details-source {
  text-align: left;

  .el-radio,
  .info {
    margin: 0;
  }

  .info {
    display: inline-block;
    vertical-align: middle;
    margin-top: -1rem;
  }

  .el-radio-group {
    gap: 0.5rem;
  }

  :deep(.el-radio__label) {
    padding-left: 4px;
  }
}

.population-details-view {
  .el-button + .el-button {
    margin-left: 0.5rem !important;
  }

  &.align-right {
    margin-left: auto;
  }
}

.connectivity-legends {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.75rem;

  .legend-title {
    font-size: 12px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--el-text-color-primary);
  }

  .legend-item {
    display: flex;
    align-items: flex-start;
    gap: 0.375rem;
    font-size: 12px;
    line-height: 1.2;
    color: var(--el-text-color-regular);
  }

  .legend-color {
    display: inline-block;
    width: 12px;
    height: 12px;
    flex: 0 0 12px;
    border-left: 2px solid;

    &.mapped {
      background-color: rgba($app-primary-color, 0.04);
      border-left-color: rgba($app-primary-color, 0.16);
    }

    &.unavailable {
      background-color: #ffe5e3;
      border-left-color: #ffb7b4;
    }

    &.differ {
      background: linear-gradient(
        90deg,
        #ffe5e3 0%,
        #ffe5e3 calc(50% - 1px),
        #7fe09c calc(50% - 1px),
        #7fe09c calc(50% + 1px),
        #d9ffe0 calc(50% + 1px),
        #d9ffe0 100%
      );
      border-left-color: #ffb7b4;
    }
  }
}

.tooltip-container {
  &::after,
  &::before {
    content: '';
    display: block;
    position: absolute;
    width: 0;
    height: 0;
    border-style: solid;
    flex-shrink: 0;
  }
  .tooltip {
    &::after {
      display: none;
    }
    &::before {
      display: none;
    }
  }
}

.maplibregl-popup-anchor-bottom {
  .tooltip-container {
    &::after,
    &::before {
      top: 100%;
      border-width: 12px;
    }
    &::after {
      margin-top: -1px;
      border-color: rgb(255, 255, 255) transparent transparent transparent;
    }
    &::before {
      margin: 0 auto;
      border-color: $app-primary-color transparent transparent transparent;
    }
  }
}

.maplibregl-popup-anchor-top {
  .tooltip-container {
    &::after,
    &::before {
      top: -24px;
      border-width: 12px;
    }
    &::after {
      margin-top: 1px;
      border-color: transparent transparent rgb(255, 255, 255) transparent;
    }
    &::before {
      margin: 0 auto;
      border-color: transparent transparent $app-primary-color transparent;
    }
  }
}

.content-container {
  flex: 1 1 100%;
  padding: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  > div,
  > .block + .block {
    margin: 0;
  }
}

/* Fix for chrome bug where under triangle pops up above one on top of it  */
.selector:not(*:root),
.tooltip-container::after {
  top: 99.4%;
}

.title-buttons {
  display: flex;
  flex: 1 0 0%;
  max-width: 20%;
  flex-direction: row;
  justify-content: end;
  gap: 0.5rem;

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

.content-container-connectivity {
  position: relative;
}

.attribute-content {
  font-size: 14px;
  font-weight: 500;
  transition: color 0.25s ease;
  position: relative;
  cursor: default;
  padding-left: 16px;

  .magnify-glass {
    display: none;
    position: absolute;
    top: 0;
    left: 0;
  }

  &:hover {
    color: $app-primary-color;

    .magnify-glass {
      display: block;
      padding-top: 4px;
      cursor: pointer;
    }
  }

  + .attribute-content {
    &::before {
      content: "";
      width: 90%;
      height: 1px;
      background-color: var(--el-border-color);
      position: absolute;
      top: 0;
      left: 0;
    }
  }

  &:last-of-type {
    margin-bottom: 0.5em;
  }
}

.alert-block {
  background-color: var(--el-color-warning-light-9);
  border: 1px dashed var(--el-color-warning);
  padding: 0.75rem;
  border-radius: 4px;

  :deep(.alert-line + .alert-line) {
    margin-top: 0.5rem;
  }

  :deep(a) {
    color: $app-primary-color;
    word-break: break-all;

    &:hover {
      opacity: 0.8;
    }
  }
}

.alert-chip {
  margin-left: 5px;
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
</style>
