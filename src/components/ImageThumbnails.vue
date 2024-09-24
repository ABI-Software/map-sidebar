<template>
  <div class="image-thumbnails-container">
    <div class="el-card__header">
      <div class="header">
        <el-input
          class="search-input"
          placeholder="Search"
          v-model="searchInput"
          @keyup="searchEvent"
          clearable
          @clear="clearSearchClicked"
        ></el-input>
        <el-dropdown split-button type="primary" class="button" @click="handleDropdownClick" size="large">
          Search Images
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="switchToDataset">Search Dataset</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <div class="toolbar">
      <div class="filters">
        <el-cascader
          :options="speciesFilterOptions"
          :props="cascaderProps"
          collapse-tags
          collapse-tags-tooltip
          :max-collapse-tags="1"
          class="cascader"
          popper-class="sidebar-cascader-popper"
          ref="cascader"
          v-model="cascadeSelected"
          size="large"
          placeholder="Filters"
          @change="cascadeEvent($event)"
          @expand-change="cascadeExpandChange"
          show-all-levels
        />
        <!-- <el-tag
          v-for="(species, index) in speciesFilterTags"
          :key="index"
          type="info"
          class="tag"
          :class="{ 'active-tag': species.name === activeSpecies.name }"
          :closable="species.name === activeSpecies.name"
          @close="removeSpeciesFilterTag"
          @click="filterBySpecies(species)"
        >
          {{ species.name }} ({{ species.count }})
        </el-tag> -->
      </div>
    </div>

    <div class="dataset-card-container">
      <div class="dataset-card" v-for="imageThumbnail in imageItems">
        <div class="card" :key="imageThumbnail.link">
          <div class="card-left">
            <div>
              <div
                class="card-image"
                @click="cardButtonClick(imageThumbnail)"
              >
                <el-image :src="imageThumbnail.imgSrc" loading="lazy">
                  <template #error>
                    <div class="image-slot">Loading...</div>
                  </template>
                </el-image>
              </div>
            </div>
            <div>
              <p>{{ formattedTitle(imageThumbnail) }}</p>
              <button
                class="button el-button el-button--large"
                @click="cardButtonClick(imageThumbnail)"
              >
                View {{ imageThumbnail.type }}
              </button>
            </div>
          </div>
          <div class="card-right" v-loading="imageThumbnail.loadingData">
            <div class="details">
              <a
                :href="datasetURL(imageThumbnail.id)"
                class="title"
                target="_blank"
              >
                <strong>{{ imageThumbnail.name }}</strong>
              </a>
            </div>
            <div class="details">
              {{ imageThumbnail.contributors }}
              {{ imageThumbnail.publishYear ? `(${imageThumbnail.publishYear})` : '' }}
            </div>
            <div class="details">{{ imageThumbnail.samples }}</div>
            <!-- Copy to clipboard button container -->
            <div class="float-button-container">
              <CopyToClipboard :content="getCopyContent(imageThumbnail)" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  ElImage,
  ElTag as Tag,
  ElOption as Option,
  ElSelect as Select,
  ElCascader as Cascader,
  ElDropdown as Dropdown,
} from 'element-plus';
import { ArrowDown } from '@element-plus/icons-vue'
import { CopyToClipboard } from '@abi-software/map-utilities';
import '@abi-software/map-utilities/dist/style.css';
import EventBus from './EventBus.js'

const BASE64PREFIX = 'data:image/png;base64,';

  export default {
    name: 'ImageThumbnails',
    components: {
      Tag,
      Option,
      Select,
      ElImage,
      Cascader,
      Dropdown,
      ArrowDown,
      CopyToClipboard,
    },
    props: {
      /**
       * The image thumbnails data to show in sidebar.
       */
      imageThumbnails: {
        type: Array,
        default: [],
      },
      envVars: {
        type: Object,
        default: () => {},
      },
    },
    data: function () {
      return {
        searchInput: '',
        cascaderProps: { multiple: true },
        cascadeSelected: [],
        activeSpecies: { name: "" },
        speciesFilterTags: [],
        speciesFilterOptions: [],
        imageItems: [],
      };
    },
    computed: {
      imageStyle() {
        return {
          width: "180px",
          height: "135px",
        };
      },
    },
    mounted: function () {
      this.prepareImages();
    },
    watch: {
      imageThumbnails: {
        handler: function (value) {
          if (value) {
            this.prepareImages();
          }
        },
        deep: true,
      },
    },
    methods: {
      prepareImages: function() {
        this.imageItems = this.imageThumbnails;
        this.injectImgSrc();
        this.populateFilterTags();
        this.populateData();
      },
      injectImgSrc: function() {
        this.imageThumbnails.forEach((imageThumbnail) => {
          return this.mapImage(imageThumbnail);
        });
      },
      formattedTitle: function(imageThumbnail) {
        const type = imageThumbnail.mimetype?.split('/')[1];
        const title = imageThumbnail.title;
        let formattedTitle = '';
        if (type !== 'jpg') {
          formattedTitle = title.replace('.' + type, '');
        }
        // formattedTitle = formattedTitle.replaceAll('_', ' ');
        return formattedTitle;
      },
      datasetURL: function(id) {
        return `https://sparc.science/datasets/${id}?type=dataset`;
      },
      mapImage: async function (image) {
        const imgSrc = await this.transformedImage(image.thumbnail);
        if (imgSrc) {
          image.imgSrc = imgSrc;
        }
      },
      transformedImage: async function(imgUrl) {
        try {
          const response = await fetch(imgUrl);
          if (!response.ok) {
            return null;
          }
          const data = await response.text();
          return BASE64PREFIX + data;
        } catch (error) {
          return null;
        }
      },
      removeSpeciesFilterTag: function () {
        this.activeSpecies = { name: "" };
        this.imageItems = this.imageThumbnails;
      },
      handleDropdownClick: function () {

      },
      switchToDataset: function () {
        this.$emit('update-search-type', '');
      },
      searchEvent: function (event = false) {
        // TODO: to perform search
        // if (event.keyCode === 13 || event instanceof MouseEvent) {
        //   this.resetPageNavigation()
        //   this.searchAlgolia(this.filters, this.searchInput)
        //   this.$refs.searchHistory.selectValue = 'Full search history'
        //   this.$refs.searchHistory.addSearchToHistory(
        //     this.filters,
        //     this.searchInput
        //   )
        // }
      },
      clearSearchClicked: function () {
        // TODO: to clear search
        this.searchInput = '';
        // this.resetPageNavigation()
        // this.searchAlgolia(this.filters, this.searchInput)
      },
      cascadeEvent: function (event) {
        // TODO: to update cascade event
        console.log('cascadeEvent', event)
        this.filterBySpecies();
      },
      cascadeExpandChange: function (event) {
        // TODO: to update cascade event
      },
      filterBySpecies: function (tagInfo) {
        let speciesValue = '';
        if (tagInfo) {
          this.activeSpecies = tagInfo;
          speciesValue = tagInfo.name;
        } else if (this.cascadeSelected.length) {
          speciesValue = this.cascadeSelected[0][1]; // TODO: to update
        } else if (!this.cascadeSelected.length) {
          this.removeSpeciesFilterTag();
        }
        let filteredImageItems = [];
        this.imageThumbnails.forEach((image) => {
          if (image.species && image.species.length) {
            image.species.forEach((species) => {
              if (species === speciesValue) {
                filteredImageItems.push(image);
              }
            });
          }
        });
        this.imageItems = filteredImageItems;
      },
      populateData: function () {
        const requests = [];
        this.imageThumbnails.forEach((imageThumbnail) => {
          const id = imageThumbnail.id;
          const version = imageThumbnail.version;
          const key = `${id}-${version}`;
          imageThumbnail['loadingData'] = true;

          const existingReqest = requests.find((item) => item.key === key);
          if (existingReqest) {
            existingReqest.api.then((response) => this.bindData(response, imageThumbnail));
          } else {
            const newRequest = {
              key: key,
              api: this.fetchData(id, version)
            };
            newRequest.api.then((response) => this.bindData(response, imageThumbnail));
            requests.push(newRequest);
          }
        });
      },
      bindData: function (response, imageThumbnail) {
        const name = response.name;
        const contributors = response.contributors;
        const versionPublishedAt = response.versionPublishedAt;
        const species = imageThumbnail.species;
        const sample = response.modelCount.find((m) => m.modelName === 'sample');
        const subject = response.modelCount.find((m) => m.modelName === 'animal_subject');
        const numberSamples = sample ? sample.count : 0;
        const numberSubjects = subject ? subject.count : 0;
        const formattedContributors = this.getContributors(contributors);
        const publishYear = this.getPublishYear(versionPublishedAt);
        const samples = this.getSamples(species, numberSamples, numberSubjects);
        const s3uri = response.uri;

        imageThumbnail['name'] = name;
        imageThumbnail['contributors'] = formattedContributors;
        imageThumbnail['publishYear'] = publishYear;
        imageThumbnail['samples'] = samples;
        imageThumbnail['loadingData'] = false;
        imageThumbnail['s3uri'] = s3uri;
      },
      fetchData: async function (id, version) {
        const apiLocation = this.envVars.API_LOCATION;
        const url = apiLocation + `sim/dataset/${id}/versions/${version}`;
        try {
          const response = await fetch(url);
          const json = await response.json();
          return json;
        } catch (error) {
          console.log('data fetching error', error)
        }
      },
      fetchBiolucidaData: async function (id) {
        const apiLocation = this.envVars.API_LOCATION;
        const url = apiLocation + 'image_search/' + id;
        try {
          const response = await fetch(url);
          const json = await response.json();
          return json;
        } catch (error) {
          console.warn('Biolucida data fetching error', error)
        }
      },
      // TODO: This function is from DatasetCard
      getContributors: function (contributors) {
        let text = ''
        if (contributors) {
          if (contributors.length === 1) {
            text = contributors[0].lastName;
          } else if (contributors.length === 2) {
            text =
            contributors[0].lastName +
              ' & ' +
              contributors[1].lastName
          } else if (contributors.length > 2) {
            text = contributors[0].lastName + ' et al.'
          }
        }
        return text;
      },
      // TODO: This function is from DatasetCard
      getSamples: function (species, numberSamples, numberSubjects) {
        let text = ''
        if (species) {
          text = `${species}`
        }
        if (numberSamples > 0) {
          text += ' ('
          if (numberSamples === 1) {
            text += `${numberSamples} sample`
          } else if (numberSamples > 1) {
            text += `${numberSamples} samples`
          }
          if (numberSubjects === 1) {
            text += ` from ${numberSubjects} subject`
          } else if (numberSamples > 1) {
            text += ` from ${numberSubjects} subjects`
          }
          text += ')'
        }

        return text
      },
      // TODO: This function is from DatasetCard
      getPublishYear: function (publishDate) {
        return publishDate.split('-')[0]
      },
      populateFilterTags: function () {
        let imageObjects = {};
        this.imageThumbnails.forEach((image) => {
          if (image.species && image.species.length) {
            image.species.forEach((species) => {
              if (!(species in imageObjects)) {
                imageObjects[species] = {
                  name: species,
                  count: 0,
                };
              }
              imageObjects[species].count++;
            });
          }
        });
        this.speciesFilterTags = Object.values(imageObjects);
        const speciesChildren = [];
        this.speciesFilterTags.forEach((filterTag) => {
          speciesChildren.push({
            value: filterTag.name,
            label: filterTag.name,
          });
        });
        this.speciesFilterOptions = [
          {
            value: 'species',
            label: 'Species',
            children: speciesChildren
          }
        ];
      },
      cardButtonClick: function (imageThumbnail) {
        const imageType = imageThumbnail.type.toLowerCase();

        switch (imageType) {
          case 'image':
            this.emitBiolucidaData(imageThumbnail);
            break;
          case 'segmentation':
            this.emitSegmentationData(imageThumbnail);
            break;
          case 'scaffold':
            this.emitScaffoldData(imageThumbnail);
            break;
          case 'plot':
            this.emitPlotData(imageThumbnail);
            break;

          default:
            console.warn('Image type not founnd!', imageType)
            break;
        }
      },
      emitBiolucidaData: function (imageThumbnail) {
        const id = imageThumbnail.id;
        const biolucidaData = this.fetchBiolucidaData(id);

        biolucidaData.then((data) => {
          if (data.status === 'success') {
            const biolucidaImage = data.dataset_images.find((datasetImg) =>
              datasetImg.image_id === imageThumbnail.biolucida_id
            );

            if (biolucidaImage) {
              // TODO: to update label and name
              const dataToEmit = {
                "label": imageThumbnail.name,
                "name": imageThumbnail.name,
                "datasetId": id,
                "title": "View " + imageThumbnail.type,
                "type": "Biolucida",
                "resource": {
                    "share_link": biolucidaImage.share_link,
                    "id": biolucidaImage.image_id,
                    "itemId": biolucidaImage.sourcepkg_id,
                }
              };
              this.propogateCardAction(dataToEmit);
            } else {
              console.warn('Image not found!', data);
            }
          } else {
            console.warn('Image not found!', data);
          }
        });
      },
      emitSegmentationData: function (imageThumbnail) {
        const prefix = this.envVars.NL_LINK_PREFIX;
        const pathQuery = imageThumbnail.link.split('?')[1];
        const resource = {
          share_link: `${prefix}/dataviewer?${pathQuery}`,
        };
        const dataToEmit = {
          label: imageThumbnail.name,
          resource: resource,
          datasetId: Number(imageThumbnail.id),
          s3uri: imageThumbnail.s3uri,
          title: 'View segmentation',
          type: 'Segmentation',
        };
        this.propogateCardAction(dataToEmit);
      },
      emitScaffoldData: function (imageThumbnail) {
        const s3uri = imageThumbnail.s3uri;
        const filePath = imageThumbnail.link.split('files/')[1];
        const resourcePath = `${this.envVars.API_LOCATION}s3-resource/${this.getS3Prefix(s3uri)}files/${filePath}${this.getS3Args(s3uri)}`;
        const dataToEmit = {
          label: imageThumbnail.name,
          resource: resourcePath,
          title: "View 3D scaffold",
          type: "Scaffold",
          discoverId: Number(imageThumbnail.id),
          apiLocation: this.envVars.API_LOCATION,
          version: imageThumbnail.version,
          banner: imageThumbnail.thumbnail,
          s3uri: s3uri,
          contextCardUrl: '', // TODO: to find context card URL
        };
        this.propogateCardAction(dataToEmit);
      },
      emitPlotData: function (imageThumbnail) {
        const s3uri = imageThumbnail.s3uri;
        const filePath = imageThumbnail.link.split('files/')[1];
        const filePathPrefix = `${this.envVars.API_LOCATION}/s3-resource/${this.getS3Prefix(s3uri)}files/`;
        const sourceUrl = filePathPrefix + filePath + this.getS3Args(s3uri);
        let metadata = {};
        // TODO: to find out metadata
        // try {
        //   metadata = JSON.parse(
        //     plotAnnotation.supplemental_json_metadata.description
        //   )
        // } catch (error) {
        //   console.warn(error)
        // }
        let supplementalData = [];
        // TODO: to find out supplementalData
        // if (plotAnnotation.isDescribedBy) {
        //   supplementalData.push({
        //     url: filePathPrefix + plotAnnotation.isDescribedBy.path,
        //   })
        // }
        const resource = {
          dataSource: { url: sourceUrl },
          metadata,
          supplementalData,
        };
        const dataToEmit = {
          label: imageThumbnail.name,
          resource: resource,
          s3uri: s3uri,
          title: 'View plot',
          type: 'Plot',
          discoverId: Number(imageThumbnail.id),
          version: imageThumbnail.version,
        };
        this.propogateCardAction(dataToEmit);
      },
      // TODO: to combine with s3Bucket mixin
      getS3Prefix: function (s3uri) {
        let s3Prefix = '';
        if (s3uri) {
          const substring = s3uri.split("//")[1];
          if (substring) {
            const n = substring.indexOf('/');
            s3Prefix = substring.substring(n + 1);
          }
        }
        return s3Prefix;
      },
      // TODO: to combine with s3Bucket mixin
      getS3Args: function(s3uri) {
        const s3Bucket = this.getS3Bucket(s3uri);
        if (s3Bucket) {
          return `?s3BucketName=${s3Bucket}`;
        }
        return '';
      },
      // TODO: to combine with s3Bucket mixin
      getS3Bucket: function(s3uri) {
        let s3Bucket = '';
        if (s3uri) {
          const substring = s3uri.split("//")[1];
          if (substring) {
            s3Bucket = substring.split("/")[0];
          }
        }
        return s3Bucket;
      },
      // TODO: This function is from DatasetCard
      propogateCardAction: function (action) {
        EventBus.emit('PopoverActionClick', action)
        EventBus.emit('contextUpdate', action) // Pass to mapintegratedvuer
      },
      getCopyContent: function (imageThumbnail) {
        const contentArray = [];

        // Use <div> instead of <h1>..<h6> or <p>
        // to avoid default formatting on font size and margin

        // Title
        if (imageThumbnail.name) {
          contentArray.push(`<div><strong>${imageThumbnail.name}</strong></div>`);
        }

        // Contributors and Publish Date
        if (imageThumbnail.contributors) {
          let details = imageThumbnail.contributors;

          if (imageThumbnail.publishYear) {
            details += ` (${imageThumbnail.publishYear})`;
          }
          contentArray.push(`<div>${details}</div>`);
        }

        // samples
        if (imageThumbnail.samples) {
          contentArray.push(`<div>${imageThumbnail.samples}</div>`);
        }

        // Type
        if (imageThumbnail.type) {
          let imageType = `<div><strong>Type:</strong></div>`;
          imageType += `\n`;
          imageType += `${imageThumbnail.type}`;
          contentArray.push(`<div>${imageType}</div>`);
        }

        // Species
        if (imageThumbnail.species?.length) {
          let species = `<div><strong>Species:</strong></div>`;
          species += `\n`;
          species += imageThumbnail.species.join(', ');
          contentArray.push(`<div>${species}</div>`);
        }

        // Image URL
        if (imageThumbnail.link) {
          let thumbnailLink = `<div><strong>Link:</strong></div>`;
          thumbnailLink += `\n`;
          thumbnailLink += `<a href="${imageThumbnail.link}">${imageThumbnail.link}</a>`;
          contentArray.push(`<div>${thumbnailLink}</div>`);
        }

        // Dataset ID
        if (imageThumbnail.id) {
          let datasetIdContent = `<div><strong>Dataset ID:</strong></div>`;
          datasetIdContent += `\n`;
          datasetIdContent += `${imageThumbnail.id}`;
          contentArray.push(`<div>${datasetIdContent}</div>`);
        }

        // Dataset URL
        if (imageThumbnail.id) {
          const datasetURL = this.datasetURL(imageThumbnail.id);
          let dataLocationContent = `<div><strong>Dataset URL:</strong></div>`;
          dataLocationContent += `\n`;
          dataLocationContent += `<a href="${datasetURL}">${datasetURL}</a>`;
          contentArray.push(`<div>${dataLocationContent}</div>`);
        }

        // Dataset version
        if (imageThumbnail.version) {
          let versionContent = `<div><strong>Dataset version:</strong></div>`;
          versionContent += `\n`;
          versionContent += `${imageThumbnail.version}`;
          contentArray.push(`<div>${versionContent}</div>`);
        }

        const copyContent = contentArray.join('\n\n<br>');
        return copyContent;
      },
    },
  }
</script>

<style lang="scss" scoped>
.image-thumbnails-container {
  font-size: 14px;
  text-align: left;
  line-height: 1.5em;
  font-family: $font-family;
  font-weight: 400;
  background-color: #f7faff;
  box-shadow: var(--el-box-shadow-light);
  display: flex;
  flex-direction: column;
  height: calc(100% - 30px); // minus tabs height
  z-index: 1;
}

// TODO: to combine with sidebarConntent
.header {
  border: solid 1px #292b66;
  background-color: #292b66;
  text-align: left;

  .el-button {
    &:hover,
    &:focus {
      background: $app-primary-color;
      box-shadow: -3px 2px 4px #00000040;
      color: #fff;
    }
  }
}
// TODO: to combine with sidebarConntent
.image-thumbnails-container .el-card__header {
  background-color: #292b66;
  padding: 1rem;
}
// TODO: to combine with sidebarConntent
.search-input {
  width: 298px !important;
  height: 40px;
  padding-right: 14px;
  align-items: left;
}
// TODO: to combine with searchFilters
.cascader {
  font-family: $font-family;
  font-size: 14px;
  font-weight: 500;
  font-stretch: normal;
  font-style: normal;
  line-height: normal;
  letter-spacing: normal;
  color: #292b66;
  text-align: center;
  padding-bottom: 6px;

  .el-cascader__tags .el-tag {
    font-family: $font-family;
    font-size: 12px;
    color: #303133 !important;
    background-color: #fff;
    border-color: #dcdfe6 !important;
  }

  .el-input .el-input__inner::placeholder {
    font-family: $font-family;
    font-size: 14px;
    font-weight: 500;
    font-stretch: normal;
    font-style: normal;
    line-height: normal;
    letter-spacing: normal;
    color: #292b66;
  }
}

.toolbar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  gap: 1rem;
  background-color: #f7faff;
  position: sticky;
  top: 0;
  z-index: 1;
}

.filters {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 5px;

  .tag {
    cursor: pointer;
  }
}

.dataset-card-container {
  margin: 1rem;
  margin-top: 0;
  padding: 1rem;
  flex-grow: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.06);
  border: solid 1px #e4e7ed;
  background-color: #ffffff;
  border-radius: var(--el-border-radius-base);
}

.dataset-card-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.dataset-card {
  position: relative;

  + .dataset-card {
    padding-top: 1.5rem;
    border-top: 1px solid var(--el-border-color);
  }
}

.card {
  position: relative;
  display: flex;
  gap: 1.5rem;
}

.card-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: center;

  > div {
    text-align: center;
  }

  p {
    margin-top: 0;
    margin-bottom: 1em;
  }
}

.card-right {
  flex: 1.3;
  padding-left: 6px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-image {
  display: block;
  text-decoration: none;
  outline: none;
  cursor: pointer;

  .el-image {
    display: block;
    width: 200px;
    height: 150px;

    :deep(img) {
      aspect-ratio: 4/3;
      object-fit: cover;
    }
  }

  .image-slot {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    background: var(--el-fill-color-light);
    color: var(--el-text-color-secondary);
    font-size: 14px;
  }
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

.title {
  font-family: $font-family;
  font-size: 14px;
  font-weight: bold;
  font-stretch: normal;
  font-style: normal;
  line-height: 1.5;
  letter-spacing: 1.05px;
  text-decoration: none;
  color: #484848;
}

.details {
  font-family: $font-family;
  font-size: 14px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  line-height: 1.5;
  letter-spacing: 1.05px;
  color: #484848;
}

.active-tag {
  background-color: $app-primary-color;
  color: #fff;
}

.button {
  margin-left: 0px !important;
  margin-top: 0px !important;
  font-size: 14px !important;
  letter-spacing: initial;
  background-color: $app-primary-color;
  color: #fff;

  & + .button {
    margin-top: 10px !important;
  }
  &:hover {
    color: #fff !important;
    background: #ac76c5 !important;
    border: 1px solid #ac76c5 !important;
  }
}

.float-button-container {
  position: absolute;
  bottom: 0;
  right: 0;
  opacity: 0;
  visibility: hidden;

  .dataset-card:hover & {
    opacity: 1;
    visibility: visible;
  }
}
</style>

<style lang="scss">
.sidebar-cascader-popper .el-checkbox__input.is-indeterminate > .el-checkbox__inner {
  background-color: $app-primary-color;
  border-color: $app-primary-color;
}
</style>
