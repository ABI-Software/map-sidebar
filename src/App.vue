<template>
  <div id="app">
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css?family=Asap:400,400i,500,600,700&display=swap"
    />
    <div class="options-container">
      <div>Click arrow to open sidebar</div>
      <el-button @click="openSearch">search Uberon from refs</el-button>
      <el-button @click="singleFacets">Add heart to Filter (facet2 set)</el-button>
      <el-button @click="addStomach">Add stomach to Filter</el-button>
      <el-button @click="addDRG">Add DRG to Filter</el-button>
      <el-button @click="addSubsubPath">Add lumbar dorsal root ganglion to Filter</el-button>
      <el-button @click="addInferiorVagus">Add inferior vagus to Filter (incorrect case)</el-button>
      <el-button @click="addInvalidTerm">Add invalid term to Filter</el-button>
      <el-button @click="multiFacets">multiple facets</el-button>
      <el-button @click="neuronSearch">open neuron search</el-button>
      <el-button @click="keywordSearch">keyword search</el-button>
      <el-button @click="getFacets">Get facets</el-button>
      <el-button @click="toggleCreateData">Create Data/Annotation</el-button>
      <el-button @click="openConnectivitySearch()">Connectivity Search</el-button>
    </div>
    <SideBar
      :envVars="envVars"
      class="side-bar"
      ref="sideBar"
      :visible="sideBarVisibility"
      :annotationEntry="annotationEntry"
      :createData="createData"
      :connectivityEntry="connectivityEntry"
      :connectivityKnowledge="connectivityKnowledge"
      :showVisibilityFilter="true"
      @search-changed="searchChanged($event)"
      @hover-changed="hoverChanged($event)"
      @connectivity-hovered="onConnectivityHovered"
      @actionClick="action"
      @connectivity-collapse-change="onConnectivityCollapseChange"
    />
  </div>
</template>

<script>
/* eslint-disable no-alert, no-console */
// optionally import default styles
import SideBar from './components/SideBar.vue'
import EventBus from './components/EventBus.js'
import exampleConnectivityInput from './exampleConnectivityInput.js'


const capitalise = (str) => str.charAt(0).toUpperCase() + str.slice(1);

const flatmapQuery = (flatmapApi, sql) => {
  const data = { sql: sql };
  return fetch(`${flatmapApi}knowledge/query/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .catch((error) => {
      console.error("Error:", error);
    });
};

// let testContext = {
//   "description": "3D digital tracings of the enteric plexus obtained from seven subjects (M11, M16, M162, M163, M164, M168) are mapped randomly on mouse proximal colon. The data depicts individual neural wiring patterns in enteric microcircuits, and revealed both neuron and fiber units wired in a complex organization.",
//   "heading": "Digital tracings of enteric plexus",
//   "id": "sparc.science.context_data",
//   "samples": [
//     {
//       "annotation": "",
//       "description": "Neuronal soma and fibers in a myenteric ganglion in this subject are annotated into the following groups to highlight their interactions:\n\nNeuron1,2,3 Connex: Connections between 3 neurons and cross-ganglionic fibers\n\nNeuron4_Connex: A small neuron contacts fibers passing the ganglion\n\nNeuron5: Multiple projections of a neuron in an myenteric ganglion\n\nNeuron5,3,7 Connex: Connections between 3 neurons, nerve fibers, IGNEx (complex type of intraganglionic nerve endings) and fibers in the circular muscles.\n\nNeuron8,9,10 Connex: Connections of 3 neurons with each other and with long passing fibers. \n\nIntraganglionic Nerve Ending (IGNE): Digital traces of neurites consist of complex intraganglionic nerve endings. The blue fiber has branched terminals, more likely the afferent nerve endings; the violet and cyan terminals also interweave into the fiber nest; the orange, pink and peach fibers and one process of the neuron cross the IGNE to make 1-2 conjunctions. \n",
//       "doi": "",
//       "heading": "Digital tracing for subject M11",
//       "id": "Sample 1",
//       "path": "files/derivative/sub-M11/sam-pCm11/digital-traces/pC PHPS XFP M11 20XZ 180425_180713_2_NL_20.xml",
//       "view": "View 1"
//     },
//     {
//       "annotation": "",
//       "description": "This digital trace demonstrates some types of wiring. A long process of the green neuron terminates in the intraganglionic nerve endings (IGNE) while in contact with a nerve fiber (cyan),  soma of a neuron (peach) and processes of 3 neurons (magenta, yellow and red). Two neurons and one fiber are traced to an IGNE. ",
//       "doi": "",
//       "heading": "Digital tracing for subject M16",
//       "id": "Sample 2",
//       "path": "files/derivative/sub-M16/sam-pCm16/digital-traces/pC PHPS XFP M16 20XZ 180425_180524.xml",
//       "view": "View 2"
//     }
//   ],
//   "version": "0.1.0",
//   "views": [
//     {
//       "annotation": "--",
//       "description": "Digital tracing of neurons for subject M11.",
//       "id": "View 1",
//       "path": "files/derivative/Scaffolds/M11_view.json",
//       "sample": "Sample 1",
//       "thumbnail": "files/derivative/Scaffolds/M11_thumbnail.jpeg"
//     },
//     {
//       "annotation": "--",
//       "description": "Digital tracing of neurons for subject M16.",
//       "id": "View 2",
//       "path": "files/derivative/Scaffolds/M16_view.json",
//       "sample": "Sample 2",
//       "thumbnail": "files/derivative/Scaffolds/M16_thumbnail.jpeg"
//     }
//   ]
// }
export default {
  name: 'app',
  components: {
    SideBar,
  },
  provide() {
    return {
      $annotator: undefined,
      userApiKey: undefined,
    }
  },
  data: function () {
    return {
      annotationEntry: [{
        featureId: "epicardium",
        resourceId: "https://mapcore-bucket1.s3-us-west-2.amazonaws.com/others/29_Jan_2020/heartICN_metadata.json",
        "resource": "https://mapcore-bucket1.s3-us-west-2.amazonaws.com/others/29_Jan_2020/heartICN_metadata.json"
      }],
      sideBarVisibility: true,
      envVars: {
        API_LOCATION: import.meta.env.VITE_APP_API_LOCATION,
        ALGOLIA_KEY: import.meta.env.VITE_APP_ALGOLIA_KEY,
        ALGOLIA_ID: import.meta.env.VITE_APP_ALGOLIA_ID,
        ALGOLIA_INDEX: import.meta.env.VITE_APP_ALGOLIA_INDEX,
        PENNSIEVE_API_LOCATION: import.meta.env.VITE_APP_PENNSIEVE_API_LOCATION,
        BL_SERVER_URL: import.meta.env.VITE_APP_BL_SERVER_URL,
        ROOT_URL: import.meta.env.VITE_APP_ROOT_URL,
        FLATMAPAPI_LOCATION: import.meta.env.VITE_FLATMAPAPI_LOCATION,
      },
      connectivityEntry: [],
      createData: {
        toBeConfirmed: false,
        points: [],
        shape: "",
        x: 0,
        y: 0,
      },
      createDataSet: false,
      sckanVersion: 'sckan-2024-09-21',
      flatmapKnowledge: [],
      connectivityKnowledge: [],
      query: '',
      filter: [],
      target: [],
    }
  },
  methods: {
    loadConnectivityKnowledge: async function () {
      const sql = `select knowledge from knowledge
        where source="${this.sckanVersion}"
        order by source desc`;
      const response = await flatmapQuery(this.envVars.FLATMAPAPI_LOCATION, sql);
      const mappedData = response.values.map(x => x[0]);
      const knowledge = mappedData.map(x => JSON.parse(x));
      this.flatmapKnowledge = knowledge.filter((item) => {
        if (item.connectivity?.length) return true;
        return false;
      });
      this.connectivityKnowledge = this.flatmapKnowledge;
    },
    connectivityQueryFilter: async function (payload) {
      let results = this.flatmapKnowledge;
      if (payload.type === "query-update") {
        if (this.query !== payload.value) this.target = [];
        this.query = payload.value;
      } else if (payload.type === "filter-update") {
        this.filter = payload.value;
        this.target = [];
      } else if (payload.type === "query-filter-update") {
        this.query = payload.query;
        this.filter = payload.filter;
        this.target = payload.data;
      }
      if (this.query) {
        let flag = "", order = [], paths = [];
        const labels = ['neuron type aacar 11'];
        flag = 'label';
        order = labels;
        if (labels.length === 1) {
          paths =['ilxtr:neuron-type-aacar-11', 'ilxtr:neuron-type-bolew-unbranched-11'];
          flag = 'id';
          order = [this.query, ...paths.filter(item => item !== this.query)];
        }
        results = results.filter(item => paths.includes(item.id) || labels.includes(item.label));
        results.sort((a, b) => order.indexOf(a[flag]) - order.indexOf(b[flag]));
      }
      this.connectivityKnowledge = results;
    },
    hoverChanged: function (data) {
      console.log('hoverChanged', data)
    },
    searchChanged: function (data) {
      if (!this.flatmapKnowledge.length) {
        this.loadConnectivityKnowledge();
      }
      if (data.id === 2) {
        this.connectivityQueryFilter(data)
      }
    },
    // For connectivity input actions
    action: function (action) {
      console.log('action fired: ', action)
      let facets = [];
      if (action.labels) {
        facets.push(
          ...action.labels.map(val => ({
            facet: capitalise(val),
            term: "Anatomical structure",
            facetPropPath: "anatomy.organ.category.name",
          }))
        );
      }
      if (this.$refs.sideBar && facets?.length) {
        console.log('openSearch', facets)
        this.$refs.sideBar.openSearch(facets, "");
      }
    },
    openSearch: function () {
      this.$refs.sideBar.openSearch(
        [],
        'http://purl.obolibrary.org/obo/UBERON_0001103'
      )
    },
    singleFacets: function () {
      this.$refs.sideBar.addFilter({
        facet: 'Cardiovascular system',
        facet2: 'Heart',
        term: 'Anatomical structure',
        facetPropPath: 'anatomy.organ.category.name',
        AND: true,
      })
    },
    addStomach: function () {
      this.$refs.sideBar.addFilter({
        facet: 'Stomach',
        term: 'Anatomical structure',
        facetPropPath: 'anatomy.organ.category.name',
        AND: true,
      })
    },
    addDRG: function () {
      this.$refs.sideBar.addFilter({
        facet: 'Dorsal root ganglion',
        term: 'Anatomical structure',
        facetPropPath: 'anatomy.organ.category.name',
        AND: true,
      })
    },
    addSubsubPath: function () {
      this.$refs.sideBar.addFilter({
        facet: 'lumbar dorsal root ganglion',
        term: 'Anatomical structure',
        facetPropPath: 'anatomy.organ.category.name',
        AND: true,
      })
    },
    addInferiorVagus: function () {
      this.$refs.sideBar.addFilter({
        facet: 'Inferior vagus X ganglion',
        term: 'Anatomical structure',
        facetPropPath: 'anatomy.organ.category.name',
        AND: true,
      })
    },
    addInvalidTerm: function () {
      this.$refs.sideBar.addFilter({
        facet: 'Invalid',
        term: 'Anatomical structure',
        facetPropPath: 'anatomy.organ.name',
        AND: true,
      })
    },
    multiFacets: function () {
      this.$refs.sideBar.openSearch(
        [
          {
            facet: 'Male',
            term: 'Sex',
            facetPropPath: 'attributes.subject.sex.value',
          },
          {
            facet: 'Heart',
            term: 'Anatomical structure',
            facetSubPropPath: "anatomy.organ.name",
            facetPropPath: 'anatomy.organ.category.name',
            label :'Heart',
            AND: true,
          },
          {
            facet: 'Not correct',
            term: 'Anatomical structure',
            facetPropPath: 'anatomy.organ.name',
          },
        ],
        ''
      )
    },
    keywordSearch: function () {
      this.$refs.sideBar.addFilter({
        type: 'Facet',
        label: undefined,
        facet: '3d model',
        facetPropPath: 'item.keywords.keyword',
        term: 'Keywords',
        AND: true,
      })
    },
    markerFromFlatmap: function () {
      this.$refs.sideBar.openSearch([
        {
          facet: 'http://purl.obolibrary.org/obo/UBERON_0001103',
          term: 'Keywords',
          facetPropPath: 'item.keywords.keyword',
        },
      ])
    },
    neuronSearch: function () {
      this.$refs.sideBar.openNeuronSearch('ilxtr:neuron-type-keast-10')
    },
    getFacets: async function () {
      let facets = await this.$refs.sideBar.getAlgoliaFacets()
      console.log('Algolia facets:', facets)
    },
    toggleCreateData : function() {
      if (!this.createDataSet) {
        this.createData = {
          drawingBox: false,
          toBeConfirmed: true,
          points: [[1.0, 1.0, 1.0]],
          shape: "Lines",
          x: 0,
          y: 0,
          editingIndex: -1,
          faceIndex: -1,
          toBeDeleted: false,
        }
        this.createDataSet = true
      } else {
        this.createData = {
          toBeConfirmed: false,
          points: [],
          shape: "",
          x: 0,
          y: 0,
        }
        this.createDataSet = false
      }
    },
    onConnectivityHovered: function(data) {
      console.log("onConnectivityHovered" , data)
    },
    openConnectivitySearch: function (entry) {
      const query = entry ? entry.query : 'ilxtr:neuron-type-aacar-5'
      const filter = entry ? entry.filter : []
      this.$refs.sideBar.openConnectivitySearch(filter, query)
    },
    onConnectivityCollapseChange: function () {
      this.connectivityEntry = [...exampleConnectivityInput]
    }
  },
  mounted: async function () {
    console.log('mounted app')
    EventBus.on('contextUpdate', (payLoad) => {
      console.log('contextUpdate', payLoad)
    });
    EventBus.on('datalink-clicked', (payLoad) => {
      console.log('datalink-clicked', payLoad)
    });
  },
}
</script>

<style lang="scss">
#app {
  height: 100%;
  width: 100%;
  position: absolute;
  font-family: 'Asap', sans-serif;
}
body {
  margin: 0px;
}
.map-icon {
  color: $app-primary-color;
}
.options-container {
  position: absolute;
  top: 0;
  left: 0;
  width: calc(100% - 600px);
  padding: 1rem;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
</style>
