<template>
  <div v-if="categories['All'].size > 1" class="container" ref="container">
    <div>View data types:</div>
    <template v-for="(item, key) in categories">
      <el-button
        v-if="item.size > 0"
        :class="[{ active: key == active }, 'tag-button']"
        @click="categoryClicked(key)"
        size="small"
        :key="key"
        >{{ key + ' (' + item.size + ')' }}
      </el-button>
    </template>
  </div>
</template>

<script>
/* eslint-disable no-alert, no-console */
import { ElButton as Button } from 'element-plus'

export default {
  name: 'BadgesGroup',
  components: { Button },
  props: {
    /**
     * Object containing information for
     * the required viewing.
     */
    additionalLinks: {
      type: Array,
      default: () => {
        return []
      },
    },
    datasetBiolucida: {
      type: Object,
      default: () => {
        return {}
      },
    },
    entry: {
      type: Object,
      default: () => {
        return {}
      },
    },
  },
  data: function () {
    return {
      //Always start with 1 image - the dataset thumbnail itself
      categories: { All: { size: 1 }, Dataset: { size: 1 } },
      active: 'All',
    }
  },
  methods: {
    addToCategories: function (array, name) {
      if (array && array.length > 0) {
        this.categories[name] = { size: array.length }
        this.categories['All'].size += array.length
      }
    },
    addSimulationsToCategories: function (array) {
      if (array && array.length > 0) {
        const size = array.length
        this.categories['Simulations'] = { size }
        this.categories['All'].size += size
      }
    },
    categoryClicked: function (name) {
      this.active = name
      this.$emit('categoryChanged', name)
    },
  },
  watch: {
    datasetBiolucida: {
      deep: true,
      immediate: true,
      handler: function (biolucidaData) {
        if ('dataset_images' in biolucidaData) {
          this.addToCategories(biolucidaData['dataset_images'], 'Images')
        }
      },
    },
    entry: {
      deep: true,
      immediate: true,
      handler: function () {
        this.addToCategories(this.entry.flatmaps, 'Flatmaps')
        this.addToCategories(this.entry.plots, 'Plots')
        this.addToCategories(this.entry.scaffolds, 'Scaffolds')
        this.addToCategories(this.entry.segmentation, 'Segmentations')
        this.addSimulationsToCategories(this.entry.simulation)
        /** disable the following
        this.addToCategories(this.entry.images, 'Images');
        this.addToCategories(this.entry.videos, 'Videos');
        **/
      },
    },
  },
}
</script>

<style lang="scss" scoped>
.container {
  .tag-button.el-button {
    border-radius: 4px!important;
    font-size: 0.75rem!important;
    padding: 0.2rem 0.2rem!important;
    margin: 0.5rem 0 0 0!important;
    margin-right: 0.75rem !important;
    background: #f9f2fc!important;
    border: 1px solid $app-primary-color!important;
    color: $app-primary-color!important;
    &.active {
      background: $app-primary-color!important;
      border: 1px solid $app-primary-color!important;
      color: #fff!important;
    }
  }
  
  .tag-button + .tag-button {
    margin-left: 0!important;
  }
}
</style>
