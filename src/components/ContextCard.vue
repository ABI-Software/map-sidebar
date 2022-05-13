<template>
  <div class="context-card-container"  ref="container">
    <div v-show="showContextCard">
      <div v-show="showDetails" class="hide" @click="showDetails = !showDetails">Hide information<i class="el-icon-arrow-up"></i></div>
      <div v-show="!showDetails" class="hide" @click="showDetails = !showDetails">Show information<i class="el-icon-arrow-down"></i></div>
      <el-card v-if="showDetails && Object.keys(contextData).length !== 0" v-loading="loading" class="context-card card" >
        <div class="card-left">
          <img :src="entry.banner" class="context-image">
        </div>
        <div class="card-right">
          <div class="title">{{contextData.heading}}</div>
          <div>{{contextData.description}}</div>
          <br/>
          <div v-if="contextData.views && contextData.views.length > 0" class="subtitle">Scaffold Views</div>
          <template v-for="(view, i) in contextData.views">
            <span v-bind:key="i+'_1'" @click="openViewFile(view)" class="context-card-item">
              <img class="key-image" :src="getFileFromPath(view.thumbnail)"> 
              {{view.description}}
            </span>
            <br v-bind:key="i"/>
          </template>
          <div style="margin-bottom: 16px;"/>
          <div v-if="contextData.samples && contextData.samples.length > 0" class="subtitle">Samples on Scaffold</div>
          <template v-for="(sample, i) in contextData.samples">
              <span v-bind:key="i+'_3'" class="context-card-item" @click="toggleSampleDetails(i)">
                <div v-bind:key="i+'_6'" style="display: flex">
                  <div v-if="sample.color" class="color-box" :style="'background-color:'+ sample.color"></div>
                  <img class="key-image" v-else-if="sample.thumbnail" :src="getFileFromPath(sample.thumbnail)">
                  {{sample.heading}}
                  <i class="el-icon-warning-outline info"></i>
                </div>
              </span>
              <div v-bind:key="i+'_4'" v-if="sampleDetails[i]">
                {{sample.description}}
                <a v-bind:key="i+'_5'" v-if="sampleDetails[i]" :href="generateFileLink(sample.path)" target="_blank">View Source</a>
              </div>
              <br v-bind:key="i+'_2'"/>
          </template>
        </div>
      </el-card>
    </div>
  </div>
</template>


<script>
/* eslint-disable no-alert, no-console */
import Vue from "vue";
import { Link, Icon, Card, Button, Select, Input } from "element-ui";
import lang from "element-ui/lib/locale/lang/en";
import locale from "element-ui/lib/locale";
import EventBus from "./EventBus"
import hardcoded_info from './hardcoded-context-info'

locale.use(lang);
Vue.use(Link);
Vue.use(Icon);
Vue.use(Card);
Vue.use(Button);
Vue.use(Select);
Vue.use(Input);


export default {
  name: "contextCard",
  props: {
    /**
     * Object containing information for
     * the required viewing.
     */
    entry: Object,
  },
  data: function () {
    return {
      contextData: {},
      showDetails: true,
      showContextCard: true,
      sampleDetails: {},
      loading: false
    };
  },
  watch: {
    'entry.contextCardUrl': {
      handler(val){
        if (val) {
          // used for hardcoding data
          if ( Number.isFinite(val) ){
            this.contextData = hardcoded_info[this.entry.discoverId]
          } else {
            this.getContextFile(val)
            this.showContextCard = true
          }
        } else {
          this.showContextCard = false
        }
      },
      immediate: true
    }
  },
  methods: {
    getContextFile: function (contextFileUrl) {
      this.loading = true
      fetch(contextFileUrl)
        .then((response) =>{
          if (!response.ok){
            throw Error(response.statusText)
          } else {
             return response.json()
          }
        })
        .then((data) => {
          this.contextData = data
          this.loading = false
        })
        .catch(() => {
          //set defaults if we hit an error
          this.thumbnail = require('@/../assets/missing-image.svg')
          this.discoverId = undefined
          this.loading = false
        });
    },
    removeDoubleFilesPath: function(path){
      if (path.includes('files/')){
        return path.replace('files/', '')
      } else {
        return path
      }
    },
    toggleSampleDetails: function(i){
      if (this.sampleDetails[i] === undefined){
        Vue.set(this.sampleDetails, i, true)
      } else {
        Vue.set(this.sampleDetails, i, !this.sampleDetails[i])
      }
    },
    getFileFromPath: function(path){
      // for hardcoded data
      if(this.entry.contextCardUrl && 1 > this.entry.contextCardUrl > 0){
        return path
      }
      path = this.removeDoubleFilesPath(path)
      return  `${this.entry.apiLocation}s3-resource/${this.entry.discoverId}/${this.entry.version}/files/${path}`
    },
    generateFileLink(path){
      return `https://sparc.science/file/${this.entry.discoverId}/${this.entry.version}?path=${encodeURI(path)}`

    },
    openViewFile: function(view){

      // note that we assume that the view file is in the same directory as the scaffold (viewUrls take relative paths)
      this.entry.viewUrl = view.path.split('/')[view.path.split('/').length-1]
      this.entry.type = 'Scaffold View'
      EventBus.$emit("PopoverActionClick", this.entry)
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

.hide{
  color: #e4e7ed;
  cursor: pointer;
}

.context-card{
  background-color: white;
  max-height: 10  50px;
  padding: 8px;
  font-size: 14px;
}

.context-card-item{
  cursor: pointer;
  padding-bottom: 8px;
}

.key-image {
  width: 25px;
  height: auto;
}

.context-card >>> .el-card__body {
  padding: 0px;
  display: flex;
  width: 516px;   
  max-height: 480px;
  overflow-y: scroll !important;
  scrollbar-width: thin;
}

.context-image{
  width: 230px;
  height: auto;
}

.color-box {
  width: 16px;
  height: 16px;
  border: solid 1px #8300bf;
  border-radius: 2px;
  margin-right: 8px;
}

.card {
  margin-bottom: 18px;
  position: relative;
  border: solid 1px #e4e7ed;
  display: flex;
  width: 500px;
}

.card-left{
  flex: 1
}

.card-right {
  flex: 1.3;
  padding-left: 6px;
}

.cursor-pointer {
  cursor: pointer;
  height: 25px;
}

.info{
  transform: rotate(180deg);
  color: #8300bf;
  margin-left: 8px;
}

.title{
  font-weight: bold;
}

.subtitle{
  font-weight: bold;
}

/* Custom scroll bar */
.context-card >>> .el-card__body::-webkit-scrollbar-track {
  border-radius: 10px;
  background-color: #f5f5f5;
}

.context-card >>> .el-card__body::-webkit-scrollbar {
  width: 12px;
  right: -12px;
  background-color: #f5f5f5;
}

.context-card >>> .el-card__body::-webkit-scrollbar-thumb {
  border-radius: 4px;
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.06);
  background-color: #979797;
}
</style>
