<template>
  <div class="full-size">
    <Gallery
        :bottomSpacer="bottomSpacer"
        :cardWidth="10"
        :items="galleryItems"
        :max-width="maxWidth"
        :show-indicator-bar="false"
        :show-card-details="true"
        :highlight-active="false"
        :image-style="imageStyle"
        :image-container-style="imageContainerStyle"
        :body-style="bodyStyle"
        :shadow="shadow"
        @card-clicked="cardClicked"
        @datalink-clicked="datalinkClicked"
        ref="gallery"
      />
  </div>
</template>

<script>
/* eslint-disable no-alert, no-console */
const baseName = (str) => {
  return str.split('\\').pop().split('/').pop()
}

const capitalise = function (string) {
  return string.replace(/\b\w/g, (v) => v.toUpperCase())
}

import GalleryHelper from '@abi-software/gallery/src/mixins/GalleryHelpers.js'
import Gallery from "@abi-software/gallery";
import "@abi-software/gallery/dist/style.css";
//provide the s3Bucket related methods and data.
import S3Bucket from '../mixins/S3Bucket.vue';

export default {
  name: 'ImageGallery',
  components: { Gallery },
  mixins: [GalleryHelper, S3Bucket],
  props: {
    datasetBiolucida: {
      type: Object,
      default: () => {
        return {}
      },
    },
    envVars: {
      type: Object,
      default: () => {},
    },
    label: {
      type: String,
      default: '',
    },
    plots: {
      type: Array,
      default: () => {
        return []
      },
    },
    datasetId: {
      type: Number,
      default: -1,
    },
    datasetVersion: {
      type: Number,
      default: -1,
    },
    datasetThumbnail: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      default: 'All',
    },
    entry: {
      type: Object,
      default: () => {
        return {}
      },
    },
  },
  data() {
    return {
      currentIndex: 0,
      ro: null,
      maxWidth: 3,
      items: {
        //Use the Images instead for Biolucida Images
        //"Biolucida Images": [],
        Dataset: [],
        Images: [],
        Scaffolds: [],
        Segmentations: [],
        Simulations: [],
        Videos: [],
        Plots: [],
      },
      bodyStyle: { padding: '0px', background: '#ffffff' },
      imageContainerStyle: {
        width: '160px',
        height: '160px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      imageStyle: { maxWidth: '160px', maxHeight: '160px' },
      shadow: 'never',
      bottomSpacer: { minHeight: '0rem' },
      resetIndex: false,
    }
  },
  methods: {
    cardClicked: function (payload) {
      this.$emit('card-clicked', payload)
    },
    datalinkClicked: function (payload) {
      this.$emit('datalink-clicked', payload);
    },
    createSciCurnchItems: function () {
      this.updateS3Bucket(this.entry.s3uri)
      this.createDatasetItem()
      this.createFlatmapItems()
      this.createScaffoldItems()
      this.createSimulationItems()
      this.createPlotItems()
      this.createSegmentationItems()
      /* Disable these two
      this.createImageItems();
      this.createVideoItems();
      */
    },
    createDatasetItem: function () {
      const link = `${this.envVars.ROOT_URL}/datasets/${this.datasetId}?type=dataset`
      if (this.datasetThumbnail) {
        this.items['Dataset'].push({
          id: -1,
          //Work around gallery requires a truthy string
          title: ' ',
          type: `Dataset ${this.datasetId}`,
          thumbnail: this.datasetThumbnail,
          link,
          hideType: true,
          hideTitle: true,
        })
      }
    },
    createFlatmapItems: function () {
      if (this.entry.flatmaps) {
        this.entry.flatmaps.forEach((flatmap) => {
          const id = flatmap.identifier
          const thumbnail = this.getThumbnailForPlot(
            flatmap,
            this.entry.thumbnails
          )
          let thumbnailURL = undefined
          let mimetype = ''
          if (thumbnail) {
            thumbnailURL = this.getImageURL(this.envVars.API_LOCATION, {
              id,
              prefix: this.getS3Prefix(),
              file_path: thumbnail.dataset.path,
              s3Bucket: this.s3Bucket,
            })
            mimetype = thumbnail.mimetype.name
          }
          let action = {
            label: capitalise(this.label),
            resource: flatmap.flatmap_uuid,
            title: 'View Flatmap',
            type: 'Flatmap',
            discoverId: this.discoverId,
            version: this.datasetVersion,
          }
          this.items['Flatmaps'].push({
            id,
            title: baseName(filePath),
            type: 'Flatmap',
            thumbnail: thumbnailURL,
            userData: action,
            hideType: true,
            mimetype,
          })
        })
      }
    },
    createImageItems: function () {
      if (this.entry.images) {
        this.entry.images.forEach((image) => {
          const filePath = image.dataset.path
          const id = image.identifier
          const linkUrl = `${this.envVars.ROOT_URL}/datasets/imageviewer?dataset_id=${this.datasetId}&dataset_version=${this.datasetVersion}&file_path=${filePath}&mimetype=${image.mimetype.name}`
          this.items['Images'].push({
            id,
            title: baseName(filePath),
            type: 'Image',
            link: linkUrl,
            hideType: true,
          })
        })
      }
    },
    createPlotItems: function () {
      if (this.entry.plots) {
        this.entry.plots.forEach((plot) => {
          const filePath = plot.dataset.path
          const id = plot.identifier
          const thumbnail = this.getThumbnailForPlot(
            plot,
            this.entry.thumbnails
          )
          let thumbnailURL = undefined
          let mimetype = ''
          if (thumbnail) {

            thumbnailURL = this.getImageURL(this.envVars.API_LOCATION, {
              id,
              prefix: this.getS3Prefix(),
              file_path: thumbnail.dataset.path,
              s3Bucket: this.s3Bucket,
            })
            mimetype = thumbnail.mimetype.name
          }
          const plotAnnotation = plot.datacite;
          const filePathPrefix = `${this.envVars.API_LOCATION}/s3-resource/${this.getS3Prefix()}files/`;
          const sourceUrl = filePathPrefix + plot.dataset.path + this.getS3Args();

          //plotAnnotation.supplemental_json_metadata.description can be undefined or
          //contain an empty string causing an error with JSON.parse
          let metadata = {}
          try {
            metadata = JSON.parse(
              plotAnnotation.supplemental_json_metadata.description
            )
          } catch (error) {
            console.warn(error)
          }

          let supplementalData = []
          if (plotAnnotation.isDescribedBy) {
            supplementalData.push({
              url: filePathPrefix + plotAnnotation.isDescribedBy.path,
            })
          }

          const resource = {
            dataSource: { url: sourceUrl },
            metadata,
            supplementalData,
          }

          let action = {
            label: capitalise(this.label),
            resource: resource,
            s3uri: this.entry.s3uri,
            title: 'View plot',
            type: 'Plot',
            discoverId: this.discoverId,
            version: this.datasetVersion,
          }
          this.items['Plots'].push({
            id,
            title: baseName(filePath),
            type: 'Plot',
            thumbnail: thumbnailURL,
            userData: action,
            hideType: true,
            mimetype,
          })
        })
      }
    },
    createScaffoldItems: function () {
      if (this.entry.scaffolds) {
        let index = 0
        this.entry.scaffolds.forEach((scaffold, i) => {
          const filePath = scaffold.dataset.path
          const id = scaffold.identifier
          const thumbnail = this.getThumbnailForScaffold(
            scaffold,
            this.entry.scaffoldViews,
            this.entry.thumbnails,
            index
          )
          let mimetype = ''
          let thumbnailURL = undefined
          if (thumbnail) {
            thumbnailURL = this.getImageURL(this.envVars.API_LOCATION, {
              id,
              prefix: this.getS3Prefix(),
              file_path: thumbnail.dataset.path,
              s3Bucket: this.s3Bucket,
            })
            mimetype = thumbnail.mimetype.name
          }
          let action = {
            label: capitalise(this.label),
            resource: `${this.envVars.API_LOCATION}s3-resource/${this.getS3Prefix()}files/${filePath}${this.getS3Args()}`,
            title: "View 3D scaffold",
            type: "Scaffold",
            discoverId: this.datasetId,
            apiLocation: this.envVars.API_LOCATION,
            version: this.datasetVersion,
            banner: this.datasetThumbnail,
            s3uri: this.entry.s3uri,
            contextCardUrl: this.getContextCardUrl(i),
          }
          this.items['Scaffolds'].push({
            id,
            title: baseName(filePath),
            type: 'Scaffold',
            thumbnail: thumbnailURL,
            userData: action,
            hideType: true,
            mimetype,
          })
        })
      }
    },
    createSegmentationItems: function () {
      if (this.entry.segmentation) {
        this.entry.segmentation.forEach((segmentation) => {
          const id = segmentation.id
          let filePath = segmentation.dataset.path
          filePath = filePath.replaceAll(' ', '_')
          filePath = filePath.replaceAll(',', '_')
          const prefix = this.envVars.NL_LINK_PREFIX
          const resource = {
            share_link: `${prefix}/dataviewer?datasetId=${this.datasetId}&version=${this.datasetVersion}&path=files/${filePath}`,
          }
          let action = {
            label: capitalise(this.label),
            resource: resource,
            datasetId: this.datasetId,
            s3uri: this.entry.s3uri,
            title: 'View segmentation',
            type: 'Segmentation',
          }
          const thumbnailURL = this.getSegmentationThumbnailURL(
            this.envVars.API_LOCATION,
            {
              id,
              datasetId: this.datasetId,
              datasetVersion: this.datasetVersion,
              segmentationFilePath: filePath,
              s3Bucket: this.s3Bucket,
            }
          )
          this.items['Segmentations'].push({
            id,
            title: baseName(filePath),
            type: 'Segmentation',
            thumbnail: thumbnailURL,
            userData: action,
            hideType: true,
            mimetype: 'image/png',
          })
        })
      }
    },
    createSimulationItems: function () {
      if (this.entry.simulation) {
        this.entry.simulation.forEach((simulation) => {
          if (simulation.additional_mimetype.name === "application/x.vnd.abi.simulation+json") {
            let action = {
              label: undefined,
              apiLocation: this.envVars.API_LOCATION,
              s3uri: this.entry.s3uri,
              version: this.datasetVersion,
              title: 'View simulation',
              type: 'Simulation',
              name: this.entry.name,
              description: this.entry.description,
              discoverId: this.datasetId,
              dataset: `${this.envVars.ROOT_URL}/datasets/${this.datasetId}?type=dataset`,
            }
            this.items['Simulations'].push({
              id: 'simulation',
              title: ' ',
              type: 'Simulation',
              hideType: true,
              hideTitle: true,
              userData: action,
            })
          } else {
            const filePath = simulation.dataset.path
            const id = simulation.identifier
            //Despite of the name, this method can be used to retreive
            //the thumbnail information for any none scaffold type thumbnail
            const thumbnail = this.getThumbnailForPlot(
              simulation,
              this.entry.thumbnails
            )
            let thumbnailURL = undefined
            let mimetype = ''
            if (thumbnail) {
              thumbnailURL = this.getImageURL(this.envVars.API_LOCATION, {
                id,
                prefix: this.getS3Prefix(),
                file_path: thumbnail.dataset.path,
                s3Bucket: this.s3Bucket,
              })
              mimetype = thumbnail.mimetype.name
            }
            const resource = `${this.envVars.API_LOCATION}s3-resource/${this.getS3Prefix()}files/${filePath}${this.getS3Args()}`
            let action = {
              label: capitalise(this.label),
              resource: resource,
              s3uri: this.entry.s3uri,
              title: 'View simulation',
              type: 'Simulation',
              discoverId: this.discoverId,
              version: this.datasetVersion,
            }
            this.items['Simulations'].push({
              id,
              title: baseName(filePath),
              type: 'Simulation',
              thumbnail: thumbnailURL,
              userData: action,
              hideType: true,
              mimetype,
            })
          }
        })
      }
    },
    createVideoItems: function () {
      if (this.entry.videos) {
        this.entry.videos.forEach((video) => {
          const filePath = this.getS3FilePath(
            this.datasetId,
            this.datasetVersion,
            video.dataset.path
          )
          const linkUrl = `${this.envVars.ROOT_URL}/datasets/videoviewer?dataset_version=${this.datasetVersion}&dataset_id=${this.datasetId}&file_path=${filePath}&mimetype=${video.mimetype.name}`
          this.items['Videos'].push({
            title: video.name,
            type: 'Video',
            thumbnail: this.defaultVideoImg,
            hideType: true,
            link: linkUrl,
          })
        })
      }
    },
    onResize: function () {
      this.maxWidth = this.$el.clientWidth
      // this.$emit('resize', this.$el.clientWidth)
    },
    getContextCardUrl: function(scaffoldIndex){
      if(!this.entry.contextualInformation || this.entry.contextualInformation.length == 0){
        return undefined
      } else {
        // The line below checks if there is a context file for each scaffold. If there is not, we use the first context card for each scaffold.
        let contextIndex = this.entry['abi-contextual-information'].length == this.entry.scaffolds.length ? scaffoldIndex : 0
        return `${this.envVars.API_LOCATION}s3-resource/${this.getS3Prefix()}files/${this.entry.contextualInformation[contextIndex]}${this.getS3Args()}`
      }
    },
    getImageURL: function(apiEndpoint, info) {
      let url = `${apiEndpoint}/s3-resource/${info.prefix}files/${info.file_path}?encodeBase64=true`
      if (info.s3Bucket) {
        url = url + `&s3BucketName=${info.s3Bucket}`
      }
      return url
    },
  },
  computed: {
    galleryItems() {
      if (this.resetIndex) {
        this.$refs.gallery.indicatorClicked(0)
      }
      let items = [...this.items['Dataset']]
      if (this.category === 'All') {
        for (const [key, value] of Object.entries(this.items)) {
          if (key !== 'Dataset') items = items.concat(value)
        }
        return items
      } else return [...this.items[this.category]]
    },
  },
  created: function () {
    this.createSciCurnchItems()
  },
  watch: {
    category: function () {
      this.resetIndex = true
    },
    galleryItems: function () {
      this.resetIndex = false
    },
    datasetBiolucida: {
      deep: true,
      immediate: true,
      handler: function (biolucidaData) {
        let items = []
        if ('dataset_images' in biolucidaData) {
          items.push(
            ...Array.from(biolucidaData.dataset_images, (dataset_image) => {
              const thumbnailURL = this.getThumbnailURLFromBiolucida(
                this.envVars.API_LOCATION,
                {
                  id: dataset_image.image_id,
                }
              )
              const resource = {
                share_link: dataset_image.share_link,
                id: dataset_image.image_id,
                itemId: dataset_image.sourcepkg_id,
              }
              let action = {
                label: capitalise(this.label),
                resource: resource,
                datasetId: this.datasetId,
                title: 'View image',
                name: capitalise(this.label),
                type: 'Biolucida',
              }
              return {
                id: dataset_image.image_id,
                title: `Image`,
                type: 'Image',
                thumbnail: thumbnailURL,
                userData: action,
                mimetype: 'image/png',
                hideType: true,
              }
            })
          )
        }
        this.items['Images'] = items
      },
    },
  },
  mounted() {
    this.ro = new ResizeObserver(this.onResize).observe(this.$el)
  },
  unmounted() {
    delete this.ro
  },
}
</script>

<style lang="scss" scoped>
.full-size {
  height: 100%;
  width: 244px;
}

.key-image-span.active {
  transform: scale(1.16);
  border: 4px $app-primary-color solid;
}

.key-image-span {
  display: flex;
  position: relative;
}

.overlay {
  position: absolute;
  right: 5px;
  top: 5px;
  width: 1.61em;
  height: 1em;
  border-radius: 3px;
  opacity: 0.8;
}

img {
  vertical-align: bottom;
}

a.prev,
a.next {
  display: flex;
  font-size: 3em;
}

a.prev:not(.underline),
a.next:not(.underline) {
  text-decoration: none;
}

a.prev {
  justify-content: flex-start;
}

a.next {
  justify-content: flex-end;
}

.standard-gallery {
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-around;
  align-items: center;
}

.image-line {
  display: flex;
  margin-top: 1%;
  margin-bottom: 1%;
  flex-grow: 1;
  justify-content: space-between;
}
.disabled {
  opacity: 0.2;
  cursor: default;
}

.rectangle {
  height: 1em;
  width: 2em;
  border-radius: 3px;
  background-color: #555;
}

.full-size :deep(.el-card) {
  border: 0px;
}
</style>
