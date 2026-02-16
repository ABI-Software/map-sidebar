<template>
  <div class="dataset-card-container" ref="container">
    <div class="dataset-card" ref="card">
      <div class="seperator-path"></div>
      <div v-loading="loading" class="card">
        <span class="card-left">
          <ImageGallery
            v-if="!loading && discoverId"
            :datasetId="discoverId"
            :datasetVersion="version"
            :entry="entry"
            :envVars="envVars"
            :label="label"
            :datasetThumbnail="thumbnail"
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
              :entry="entry"
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
import '@abi-software/map-utilities/dist/style.css';

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
    galleryClicked: function (payload) {
      this.propogateCardAction(payload)
    },
    galleryDatalinkClicked: function (payload) {
      EventBus.emit('datalink-clicked', payload); // Pass to mapintegratedvuer
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
