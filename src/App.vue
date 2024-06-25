<template>
  <div id="app">
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css?family=Asap:400,400i,500,600,700&display=swap"
    />
    <div class="options-container">
      <div>Click arrow to open sidebar</div>
      <el-button @click="openSearch">search Uberon from refs</el-button>
      <el-button @click="singleFacets">Add heart to Filter</el-button>
      <el-button @click="addStomach">Add stomach to Filter</el-button>
      <el-button @click="addInvalidTerm">Add invalid term to Filter</el-button>
      <el-button @click="multiFacets">multiple facets</el-button>
      <el-button @click="neuronSearch">open neuron search</el-button>
      <el-button @click="keywordSearch">keyword search</el-button>
      <el-button @click="getFacets">Get facets</el-button>
    </div>
    <SideBar
      :envVars="envVars"
      class="side-bar"
      ref="sideBar"
      :visible="sideBarVisibility"
      :tabs="tabs"
      :activeId="activeId"
      @tabClicked="tabClicked"
      @search-changed="searchChanged($event)"
      @hover-changed="hoverChanged($event)"
      @actionClick="action"
    />
  </div>
</template>

<script>
/* eslint-disable no-alert, no-console */
// optionally import default styles
import SideBar from './components/SideBar.vue'
import EventBus from './components/EventBus.js'

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
  computed: {
    tabs: function () {
      let temp = [...this.tabArray]
      for (let i in this.tabArray) {
        temp[i].contextCard = this.contextArray[i]
      }
      return temp
    },
  },
  data: function () {
    return {
      tabArray: [{ title: 'Flatmap', id: 1 }],
      contextArray: [null, null, null],
      sideBarVisibility: true,
      envVars: {
        API_LOCATION: import.meta.env.VITE_APP_API_LOCATION,
        ALGOLIA_KEY: import.meta.env.VITE_APP_ALGOLIA_KEY,
        ALGOLIA_ID: import.meta.env.VITE_APP_ALGOLIA_ID,
        ALGOLIA_INDEX: import.meta.env.VITE_APP_ALGOLIA_INDEX,
        PENNSIEVE_API_LOCATION: import.meta.env.VITE_APP_PENNSIEVE_API_LOCATION,
        BL_SERVER_URL: import.meta.env.VITE_APP_BL_SERVER_URL,
        NL_LINK_PREFIX: import.meta.env.VITE_APP_NL_LINK_PREFIX,
        ROOT_URL: import.meta.env.VITE_APP_ROOT_URL,
      },
      activeId: 1,
    }
  },
  methods: {
    hoverChanged: function (data) {
      console.log('hoverChanged', data)
    },
    searchChanged: function (data) {
      console.log(data)
    },
    tabClicked: function (id) {
      this.activeId = id
    },
    action: function (val) {
      console.log('action fired: ', val)
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
            facet: 'Cardiovascular system',
            facet2: 'Heart',
            term: 'Anatomical structure',
            facetPropPath: 'anatomy.organ.category.name',
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
  },
  mounted: function () {
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
