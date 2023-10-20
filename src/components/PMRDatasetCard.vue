<template>
  <div class="dataset-card-container"  ref="container">
    <div class="dataset-card"  ref="card">
      <div class="seperator-path"></div>
      <div v-loading="loading" class="card" >
        <span class="card-left">
          <img class="banner-img" :src="thumbnail" @click="openDataset" />
        </span>
        <div class="card-right" @click="openDataset">
          {{entry.model}}
          <el-button class="button">Download file</el-button>
        </div>

      </div>
    </div>
  </div>
</template>


<script>
/* eslint-disable no-alert, no-console */
import Vue from "vue";
import { Button, Icon } from "element-ui";
import lang from "element-ui/lib/locale/lang/en";
import locale from "element-ui/lib/locale";

locale.use(lang);
Vue.use(Button);
Vue.use(Icon);

export default {
  name: "PMRDatasetCard",
  props: {
    /**
     * Object containing information for
     * the required viewing.
     */
    entry: {
      type: Object,
      default: () => {}
    },
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
      loading: false,
      version: 1,
      lastDoi: undefined,
      biolucidaData: undefined,
      currentCategory: "All"
    };
  },
  methods: {
    openDataset() {
      window.open(this.entry.model, "_blank");
    },
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
@import "~element-ui/packages/theme-chalk/src/col";
@import "~element-ui/packages/theme-chalk/src/loading";

.dataset-card {
  padding-left: 16px;
  position: relative;
  min-height:17rem;
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

.card-left{
  flex: 1
}

.card-right {
  flex: 1.3;
  padding-left: 6px;
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

.badges-container {
  margin-top:0.75rem;
}

.loading-icon {
  z-index: 20;
  width: 40px;
  height: 40px;
  left: 80px;
}

.loading-icon ::v-deep .el-loading-mask {
  background-color: rgba(117, 190, 218, 0.0) !important;
}

.loading-icon ::v-deep .el-loading-spinner .path {
  stroke: $app-primary-color;
}
</style>
