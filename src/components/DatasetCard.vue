<template>
  <div class="dataset-card-container" ref="container">
    <div class="dataset-card" ref="card">
      <div class="seperator-path"></div>
      <div v-loading="loading" class="card">
        <span class="card-left">
          <ImageGallery
            v-if="!loading && discoverId"
            :items="items"
            :category="currentCategory"
            @card-clicked="galleryClicked"
            @datalink-clicked="galleryDatalinkClicked"
          />
        </span>
        <div class="card-right">
          <div class="title" @click="cardClicked">{{ entry.name }}</div>
          <div class="details">
            {{ contributors }} {{ entry.publishDate ? `(${publishYear})` : '' }}
          </div>
          <div class="details">{{ samples }}</div>
          <div
            v-if="!entry.detailsReady"
            class="details loading-icon"
            v-loading="!entry.detailsReady"
          ></div>
          <div>
            <el-button
              v-if="entry.simulation"
              @click="openRepository"
              size="small"
              class="button"
              :icon="ElIconView"
              >View repository</el-button
            >
          </div>
          <div class="badges-container">
            <BadgesGroup
              :items="items"
              @categoryChanged="categoryChanged"
            />
          </div>

          <!-- Copy to clipboard button container -->
          <div class="float-button-container">
            <CopyToClipboard :content="copyContent" />
          </div>
        </div>
      </div>
    </div>
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

/* eslint-disable no-alert, no-console */
import { View as ElIconView } from '@element-plus/icons-vue'
import BadgesGroup from './BadgesGroup.vue'
import {
  ElButton as Button,
  ElIcon as Icon
} from 'element-plus'
import EventBus from './EventBus.js'
import speciesMap from './species-map.js'
import ImageGallery from './ImageGallery.vue'
import MissingImage from '@/../assets/missing-image.svg'
import { CopyToClipboard } from '@abi-software/map-utilities';
import S3Bucket from '../mixins/S3Bucket.vue';
import '@abi-software/map-utilities/dist/style.css';
import GalleryHelper from '@abi-software/gallery/src/mixins/GalleryHelpers.js'

export default {
  data() {
    return {
      ElIconView,
    }
  },
  name: 'DatasetCard',
  components: {
    BadgesGroup,
    ImageGallery,
    Button,
    Icon,
    CopyToClipboard,
  },
  mixins: [GalleryHelper, S3Bucket],
  props: {
    /**
     * Object containing information for
     * the required viewing.
     */
    entry: {
      type: Object,
      default: () => {},
    },
    envVars: {
      type: Object,
      default: () => {},
    },
  },
  data: function () {
    return {
      thumbnail: MissingImage,
      dataLocation: this.entry.doi,
      discoverId: undefined,
      items: {
        Dataset: [],
        Flatmaps:[],
        Images: [],
        Scaffolds: [],
        Simulations: [],
        Videos: [],
        Plots: [],
      },
      loading: true,
      version: 1,
      lastDoi: undefined,
      currentCategory: 'All',
      copyContent: '',
    }
  },
  computed: {
    contributors: function () {
      let text = ''
      if (this.entry.contributors) {
        if (this.entry.contributors.length === 1) {
          text = this.lastName(this.entry.contributors[0].name)
        } else if (this.entry.contributors.length === 2) {
          text =
            this.lastName(this.entry.contributors[0].name) +
            ' & ' +
            this.lastName(this.entry.contributors[1].name)
        } else if (this.entry.contributors.length > 2) {
          text = this.lastName(this.entry.contributors[0].name) + ' et al.'
        }
      }
      return text
    },
    samples: function () {
      let text = ''
      if (this.entry.species) {
        if (speciesMap[this.entry.species[0].toLowerCase()]) {
          text = `${speciesMap[this.entry.species[0].toLowerCase()]}`
        } else {
          text = `${this.entry.species}`
        }
      }
      if (this.entry.numberSamples > 0) {
        text += ' ('
        if (this.entry.numberSamples === 1) {
          text += `${this.entry.numberSamples} sample`
        } else if (this.entry.numberSamples > 1) {
          text += `${this.entry.numberSamples} samples`
        }
        if (this.entry.numberSubjects === 1) {
          text += ` from ${this.entry.numberSubjects} subject`
        } else if (this.entry.numberSamples > 1) {
          text += ` from ${this.entry.numberSubjects} subjects`
        }
        text += ')'
      }

      return text
    },
    label: function () {
      return this.entry.organs ? this.entry.organs[0] : this.entry.name
    },
    publishYear: function () {
      return this.entry.publishDate.split('-')[0]
    },
  },
  mounted: function () {
    this.updateCopyContent();
  },
  methods: {
    cardClicked: function () {
      this.openDataset()
    },
    categoryChanged: function (name) {
      this.currentCategory = name
    },
    createSciCurnchItems: function () {
      if (this.entry.detailsReady) {
        this.updateS3Bucket(this.entry.s3uri)
        this.createDatasetItem()
        this.createFlatmapItems()
        this.createScaffoldItems()
        this.createSimulationItems()
        this.createPlotItems()
      }
      /* Disable these two
      this.createImageItems();
      this.createVideoItems();
      */
    },
    createDatasetItem: function () {
      const link = `${this.envVars.ROOT_URL}/datasets/${this.discoverId}?type=dataset`
      if (this.thumbnail) {
        this.items['Dataset'].push({
          id: -1,
          //Work around gallery requires a truthy string
          title: ' ',
          type: `Dataset ${this.discoverId}`,
          thumbnail: this.thumbnail,
          link,
          hideType: true,
          hideTitle: true,
        })
      }
    },
    createFlatmapItems: function () {
      if (this.entry.flatmaps) {
        this.entry.flatmaps.forEach((flatmap) => {
          if (flatmap.associated_flatmap?.identifier) {
            const filePath = flatmap.dataset.path
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
              resource: flatmap.associated_flatmap.identifier,
              title: 'View Flatmap',
              type: 'Flatmap',
              discoverId: this.discoverId,
              version: this.version,
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
          }
        })
      }
    },
    createImageItems: function () {
      if (this.entry.images) {
        this.entry.images.forEach((image) => {
          const filePath = image.dataset.path
          const id = image.identifier
          const linkUrl = `${this.envVars.ROOT_URL}/datasets/imageviewer?dataset_id=${this.discoverId}&dataset_version=${this.version}&file_path=${filePath}&mimetype=${image.mimetype.name}`
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
            version: this.version,
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
            discoverId: this.discoverId,
            apiLocation: this.envVars.API_LOCATION,
            version: this.version,
            banner: this.thumbnail,
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
    createSimulationItems: function () {
      if (this.entry.simulation) {
        this.entry.simulation.forEach((simulation) => {
          if (simulation.additional_mimetype.name === "application/x.vnd.abi.simulation+json") {
            let action = {
              label: undefined,
              apiLocation: this.envVars.API_LOCATION,
              s3uri: this.entry.s3uri,
              version: this.version,
              title: 'View simulation',
              type: 'Simulation',
              name: this.entry.name,
              description: this.entry.description,
              discoverId: this.discoverId,
              dataset: `${this.envVars.ROOT_URL}/datasets/${this.discoverId}?type=dataset`,
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
              version: this.version,
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
            this.discoverId,
            this.version,
            video.dataset.path
          )
          const linkUrl = `${this.envVars.ROOT_URL}/datasets/videoviewer?dataset_version=${this.version}&dataset_id=${this.discoverId}&file_path=${filePath}&mimetype=${video.mimetype.name}`
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
    galleryClicked: function (payload) {
      this.propogateCardAction(payload)
    },
    galleryDatalinkClicked: function (payload) {
      EventBus.emit('datalink-clicked', payload); // Pass to mapintegratedvuer
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
    openDataset: function () {
      window.open(this.dataLocation, '_blank')
    },
    openRepository: function () {
      let apiLocation = this.envVars.API_LOCATION
      this.entry.additionalLinks.forEach(function (el) {
        if (el.description == 'Repository') {
          let xmlhttp = new XMLHttpRequest()
          xmlhttp.open('POST', apiLocation + '/pmr_latest_exposure', true)
          xmlhttp.setRequestHeader('Content-type', 'application/json')
          xmlhttp.onreadystatechange = () => {
            if (xmlhttp.readyState === 4) {
              let url = ''
              if (xmlhttp.status === 200) {
                url = JSON.parse(xmlhttp.responseText)['url']
              }
              if (url === '') {
                url = el.uri
              }
              window.open(url, '_blank')
            }
          }
          xmlhttp.send(JSON.stringify({ workspace_url: el.uri }))
        }
      })
    },
    propogateCardAction: function (action) {
      EventBus.emit('PopoverActionClick', action)
      EventBus.emit('contextUpdate', action) // Pass to mapintegratedvuer
    },
    splitDOI: function (doi) {
      return [
        doi.split('/')[doi.split('/').length - 2],
        doi.split('/')[doi.split('/').length - 1],
      ]
    },
    getBanner: function () {
      // Only load banner if card has changed
      if (this.lastDoi !== this.entry.doi) {
        this.lastDoi = this.entry.doi
        this.loading = true
        let doi = this.splitDOI(this.entry.doi)
        fetch(
          `${this.envVars.PENNSIEVE_API_LOCATION}/discover/datasets/doi/${doi[0]}/${doi[1]}`
        )
          .then((response) => {
            if (!response.ok) {
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
            this.loading = false
            this.updateCopyContent();
          })
          .catch(() => {
            //set defaults if we hit an error
            this.thumbnail = MissingImage
            this.discoverId = Number(this.entry.datasetId)
            this.loading = false
          })
          .finally(() => {
            this.createSciCurnchItems()
          })
      }
    },
    lastName: function (fullName) {
      return fullName.split(',')[0]
    },
    updateCopyContent: function () {
      const contentArray = [];

      // Use <div> instead of <h1>..<h6> or <p>
      // to avoid default formatting on font size and margin

      // Title
      if (this.entry.name) {
        contentArray.push(`<div><strong>${this.entry.name}</strong></div>`);
      }

      // Contributors and Publish Date
      if (this.contributors) {
        let details = this.contributors;

        if (this.entry.publishDate) {
          details += ` (${this.publishYear})`;
        }
        contentArray.push(`<div>${details}</div>`);
      }

      // samples
      if (this.samples) {
        contentArray.push(`<div>${this.samples}</div>`);
      }

      // DOI
      if (this.entry.doi) {
        let doiContent = `<div><strong>DOI:</strong></div>`;
        doiContent += `\n`;
        doiContent += `<a href="${this.entry.doi}">${this.entry.doi}</a>`;
        contentArray.push(`<div>${doiContent}</div>`);
      }

      // Dataset ID
      if (this.entry.datasetId) {
        let datasetIdContent = `<div><strong>Dataset ID:</strong></div>`;
        datasetIdContent += `\n`;
        datasetIdContent += `${this.entry.datasetId}`;
        contentArray.push(`<div>${datasetIdContent}</div>`);
      }

      // Dataset URL
      if (this.dataLocation) {
        let dataLocationContent = `<div><strong>Dataset URL:</strong></div>`;
        dataLocationContent += `\n`;
        dataLocationContent += `<a href="${this.dataLocation}">${this.dataLocation}</a>`;
        contentArray.push(`<div>${dataLocationContent}</div>`);
      }

      // Dataset version
      if (this.version) {
        let versionContent = `<div><strong>Dataset version:</strong></div>`;
        versionContent += `\n`;
        versionContent += `${this.version}`;
        contentArray.push(`<div>${versionContent}</div>`);
      }

      this.copyContent = contentArray.join('\n\n<br>');
    },
  },
  created: function () {
    this.getBanner()
  },
  watch: {
    // currently not using card overflow
    'entry.description': function () {
      // watch it
      this.getBanner()
    },
  },
}
</script>

<style lang="scss" scoped>
.dataset-card {
  padding-left: 5px;
  padding-right: 5px;
  position: relative;
  min-height: 17rem;
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

.card-left {
  flex: 1;
}

.card-right {
  flex: 1.3;
  padding-left: 6px;
}

.button {
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
.details {
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
  margin-top: 0.75rem;
}

.loading-icon {
  z-index: 20;
  width: 40px;
  height: 40px;
  left: 80px;
}

.loading-icon :deep(.el-loading-mask) {
  background-color: rgba(117, 190, 218, 0) !important;
}

.loading-icon :deep(.el-loading-spinner .path) {
  stroke: $app-primary-color;
}

.float-button-container {
  position: absolute;
  bottom: 8px;
  right: 16px;
  opacity: 0;
  visibility: hidden;

  .card:hover & {
    opacity: 1;
    visibility: visible;
  }
}
</style>
