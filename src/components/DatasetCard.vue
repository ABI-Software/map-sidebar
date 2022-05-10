<template>
  <div class="dataset-card-container"  ref="container">
    <div v-bind:class=" expanded ? 'dataset-card-expanded' : 'dataset-card'"  ref="card">
      <div v-if="entry.id !== 0" class="seperator-path"></div>
      <div class="card" >
        <span class="card-left">
          <img svg-inline class="banner-img" :src="thumbnail" @click="openDataset"/>
        </span>
        <div class="card-right" >
          <div class="title" @click="cardClicked">{{entry.name}}</div>
          <div class="details">{{contributors}} {{entry.publishDate ? `(${publishYear})` : ''}}</div>
          <div class="details">{{samples}}</div>
          <div class="details">id: {{discoverId}}</div>
          <div>
            <el-button v-if="!entry.simulation" @click="openDataset" size="mini" class="button" icon="el-icon-coin">View dataset</el-button>
          </div>
          <div>
            <el-button v-if="entry.scaffolds" @click="openScaffold" size="mini" class="button" icon="el-icon-view">View scaffold</el-button>
          </div>
          <div>
            <el-button v-if="hasCSVFile"  @click="openPlot" size="mini" class="button" icon="el-icon-view">View plot</el-button>
          </div>
          <div>
            <el-button v-if="entry.simulation"  @click="openRepository" size="mini" class="button" icon="el-icon-view">View repository</el-button>
          </div>
          <div>
            <el-button v-if="entry.simulation"  @click="openSimulation" size="mini" class="button" icon="el-icon-view">View simulation</el-button>
          </div>
        </div>

      </div>
        <p v-if="(cardOverflow && !expanded)" class="read-more"><el-button @click="expand" class="read-more-button">Read more...</el-button></p>
    </div>
  </div>
</template>


<script>
/* eslint-disable no-alert, no-console */
import Vue from "vue";
import { Button, Icon } from "element-ui";
import lang from "element-ui/lib/locale/lang/en";
import locale from "element-ui/lib/locale";
import EventBus from "./EventBus"
import speciesMap from "./species-map";
import hardcoded_info from './hardcoded-context-info'

locale.use(lang);
Vue.use(Button);
Vue.use(Icon);


const capitalise = function(string){
  return string.replace(/\b\w/g, v => v.toUpperCase());
}

export default {
  name: "DatasetCard",
  props: {
    /**
     * Object containing information for
     * the required viewing.
     */
    entry: Object,
    envVars: {
      type: Object,
      default: () => {}
    },
  },
  data: function () {
    return {
      thumbnail: require('@/../assets/missing-image.svg'),
      dataLocation: this.entry.doi,
      discoverId: undefined,
      cardOverflow: false,
      expanded: false
    };
  },
  computed: {
    hasCSVFile: function(){
      return ( this.entry.csvFiles && this.entry.csvFiles.length !== 0 )
    },
    contributors: function() {
      let text = "";
      if (this.entry.contributors) {
        if (this.entry.contributors.length === 1) {
          text = this.lastName(this.entry.contributors[0].name);
        } else if (this.entry.contributors.length === 2) {
          text = this.lastName(this.entry.contributors[0].name) + " & " + this.lastName(this.entry.contributors[1].name);
        } else if (this.entry.contributors.length > 2) {
          text = this.lastName(this.entry.contributors[0].name) + " et al.";
        }
      }
      return text;
    },
    samples: function() {
      let text = "";
      if (this.entry.species) {
        if (speciesMap[this.entry.species[0].toLowerCase()]){
          text = `${speciesMap[this.entry.species[0].toLowerCase()]}`;
        } else {
          text = `${this.entry.species}`;
        }
      }
      if (this.entry.numberSamples > 0) {
        text += " (";
        if (this.entry.numberSamples === 1) {
          text += `${this.entry.numberSamples} sample`;
        } else if (this.entry.numberSamples > 1) {
          text += `${this.entry.numberSamples} samples`;
        }
        if (this.entry.numberSubjects === 1) {
          text += ` from ${this.entry.numberSubjects} subject`;
        } else if (this.entry.numberSamples > 1) {
          text += ` from ${this.entry.numberSubjects} subjects`;
        }
        text += ")";
      }

      return text;
    },
    label: function(){
      return this.entry.organs ? this.entry.organs[0] : this.entry.name
    },
    publishYear: function() {
      return this.entry.publishDate.split('-')[0]
    }
  },
  methods: {
    cardClicked: function(){
      if(this.entry.scaffolds){
        this.openScaffold()
      }else{
        this.openDataset()
      }
    },
    openScaffold: function(){
      let action = {
          label: capitalise(this.label),
          resource: this.getScaffoldPath(this.discoverId, this.version, this.entry.scaffolds[0].dataset.path),
          title: "View 3D scaffold",
          type: "Scaffold",
          discoverId: this.discoverId,
          apiLocation: this.envVars.API_LOCATION,
          version: this.version,
          contextCardUrl: this.entry.contextualInformation ? this.getFileFromPath(this.discoverId, this.version,this.entry.contextualInformation) : undefined,
          banner: this.thumbnail
        }
        if (hardcoded_info[this.discoverId]){
          action.contextCardUrl = true
        }
        this.propogateCardAction(action)
    },
    openPlot: function(){
      let action = {
          label: capitalise(this.label),
          resource: this.getFileFromPath(this.discoverId, this.version, this.entry.csvFiles[0].dataset.path),
          title: "View plot",
          type: "Plot",
          discoverId: this.discoverId,
          apiLocation: this.envVars.API_LOCATION,
          version: this.version,
          contextCardUrl: this.entry.contextualInformation ? this.getFileFromPath(this.discoverId, this.version,this.entry.contextualInformation) : undefined,
          banner: this.thumbnail
        }
        this.propogateCardAction(action)
    },
    openDataset: function(){
      window.open(this.dataLocation,'_blank');
    },
    openRepository: function() {
      let apiLocation = this.envVars.API_LOCATION;
      this.entry.additionalLinks.forEach(function(el) {
        if (el.description == "Repository") {
          let xmlhttp = new XMLHttpRequest();
          xmlhttp.open("POST", apiLocation + "/pmr_latest_exposure", true);
          xmlhttp.setRequestHeader("Content-type", "application/json");
          xmlhttp.onreadystatechange = () => {
            if (xmlhttp.readyState === 4) {
              let url = "";
              if (xmlhttp.status === 200) {
                url = JSON.parse(xmlhttp.responseText)["url"];
              }
              if (url === "") {
                url = el.uri;
              }
              window.open(url,'_blank');
            }
          };
          xmlhttp.send(JSON.stringify({workspace_url: el.uri}));
        }
      });
    },
    openSimulation: function() {
      let isSedmlResource = false;
      let resource = undefined;
      this.entry.additionalLinks.forEach(function(el) {
        if (el.description == "SED-ML file") {
          isSedmlResource = true;
          resource = el.uri;
        } else if (!isSedmlResource && (el.description == "CellML file")) {
          resource = el.uri;
        }
      });
      let action = {
          label: undefined,
          resource: resource,
          dataset: this.dataLocation,
          apiLocation: this.envVars.API_LOCATION,
          version: this.version,
          discoverId: this.discoverId,
          contextCardUrl: this.entry.contextualInformation ? this.getFileFromPath(this.discoverId, this.version,this.entry.contextualInformation) : undefined,
          banner: this.thumbnail,
          title: "View simulation",
          name: this.entry.name,
          description: this.entry.description,
          type: "Simulation"
        }
        this.propogateCardAction(action)
    },
    propogateCardAction: function(action){
      EventBus.$emit("PopoverActionClick", action)
      this.$emit('contextUpdate', action)
    },
    getScaffoldPath: function(discoverId, version, scaffoldPath){
      let id = discoverId
      let path = `${this.envVars.API_LOCATION}s3-resource/${id}/${version}/files/${scaffoldPath}`
      return path
    },
    getFileFromPath: function(discoverId, version, path){
      return  `${this.envVars.API_LOCATION}s3-resource/${discoverId}/${version}/files/${path}`
    },
    isOverflown: function(el){
      return el.clientHeight < el.scrollHeight
    },
    expand: function() {
      this.expanded = true
    },
    splitDOI: function(doi){
      return [doi.split('/')[doi.split('/').length-2], doi.split('/')[doi.split('/').length-1]]
    },
    getBanner: function () {
      let doi = this.splitDOI(this.entry.doi)
      fetch(`https://api.pennsieve.io/discover/datasets/doi/${doi[0]}/${doi[1]}`)
        .then((response) =>{
          if (!response.ok){
            throw Error(response.statusText)
          } else {
             return response.json()
          }
        })
        .then((data) => {
          this.thumbnail = data.banner
          this.discoverId = data.id
          this.version = data.version
          this.dataLocation = `https://sparc.science/datasets/${data.id}?type=dataset`
        })
        .catch(() => {
          //set defaults if we hit an error
          this.thumbnail = require('@/../assets/missing-image.svg')
          this.discoverId = undefined
        });
    },
    lastName: function(fullName){
      return fullName.split(',')[0]
    },
  },
  mounted: function(){
    this.getBanner()
    this.cardOverflow = this.isOverflown(this.$refs.card)
  },
  updated: function () {
  },
  watch: {
    'entry.description': function() { // watch it
      this.cardOverflow = false
      this.expanded = false
      this.cardOverflow = this.isOverflown(this.$refs.card)
      this.getBanner()
    }
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.dataset-card {
  padding-left: 16px;
  position: relative;
}
.seperator-path {
  width: 486px;
  height: 0px;
  border: solid 1px #e4e7ed;
  background-color: #e4e7ed;
}
.title {
  padding-bottom: 5px;
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

.card-left{
  flex: 1
}

.card-right {
  flex: 1.3;
  padding-left: 6px;
}

.dataset-card .read-more {
  position: absolute;
  z-index: 9;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 20px;
  margin: 0; padding: 20px 66px;
  /* "transparent" only works here because == rgba(0,0,0,0) */
  background-image: linear-gradient(to bottom, transparent, white);
  pointer-events: none;
}

.read-more-button{
  width: 85px;
  height: 20px;
  font-family: Asap;
  font-size: 14px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  line-height: normal;
  letter-spacing: normal;
  color: #8300bf;
  padding: 0px;
  pointer-events: all;
  cursor: pointer;
}

.button{
  z-index: 10;
  font-family: Asap;
  font-size: 14px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  line-height: normal;
  letter-spacing: normal;
  background-color: #8300bf;
  border: #8300bf;
  color: white;
  cursor: pointer;
  margin-top: 8px;
}

.button:hover {
  background-color: #8300bf;
  color: white;
}

.banner-img {
  width: 128px;
  height: 128px;
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.25);
  background-color: #ffffff;
  cursor: pointer;
}
.details{
  font-family: Asap;
  font-size: 14px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  line-height: 1.5;
  letter-spacing: 1.05px;
  color: #484848;
}
</style>
