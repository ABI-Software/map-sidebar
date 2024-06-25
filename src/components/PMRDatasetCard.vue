<template>
  <div class="dataset-card-container"  ref="container">
    <div class="dataset-card"  ref="card">
      <div class="seperator-path"></div>
      <div v-loading="loading" class="card" >
        <span class="card-left">
          <a class="card-image-container" :href="entry.exposure" target="_blank">
            <img
              class="card-image"
              :src="thumbnail"
              width="210"
              height="120"
              :alt="entry.title"
              loading="lazy"
            />
          </a>
        </span>
        <div class="card-right">
          <div>
            <h4 class="title">{{ entry.title }}</h4>
            <div class="authors">
              <em>{{ entry.authors }}</em>
            </div>
          </div>
          <p v-if="entry.description">{{ entry.description }}</p>
          <div>
            <a :href="entry.exposure" target="_blank" class="el-button button">
              Exposure
            </a>
            <a v-if="entry.omex" :href="entry.omex" target="_blank" class="el-button">
              OMEX archive
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script>
/* eslint-disable no-alert, no-console */
import {
  ElButton,
  ElIcon
} from 'element-plus'

/**
 * Entry Object - Data types
 * ---------------------------------------
"exposure"
    type: String
    description: The exposure URL

"title"
    type: String
    description: The title

"sha"
    type: String
    description:

"workspace"
    type: String
    description: The workspace URL

"omex"
    type: String
    description:

"image"
    type: String
    description: The image URL

"authors"
    type: String
    description: Comma separated values if more than one

"description"
    type: String
    description: The description
 * ---------------------------------------
 */

const placeholderThumbnail = 'assets/missing-image.svg';

export default {
  name: "PMRDatasetCard",
  components: {
    ElButton,
    ElIcon
  },
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
      thumbnail: this.entry.image || placeholderThumbnail,
      loading: false,
    };
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">

.dataset-card-container {
  padding: 0 1rem;
}

.dataset-card {
  position: relative;
  min-height:17rem;
}

.title {
  font-family: Asap;
  font-size: 14px;
  font-weight: bold;
  font-stretch: normal;
  font-style: normal;
  line-height: 1.5;
  letter-spacing: 1.05px;
  color: #484848;
}
.card {
  font-family: Asap;
  padding-top: 18px;
  position: relative;
  display: flex;
  gap: 1rem;

  h4,
  p {
    margin: 0;
  }
}

.card-left{
  flex: 1;
}

.card-right {
  flex: 1.3;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.el-button {
  font-family: Asap;
  font-size: 14px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  line-height: normal;
  letter-spacing: normal;
  text-decoration: none;
}

.button {
  background-color: $app-primary-color;
  border: $app-primary-color;
  color: white;
  box-shadow: 0 0px 0px 0 rgba(0, 0, 0, 0.25);
  transition: all 0.3s ease;

  &:hover,
  &:focus {
    color: white;
    background-color: $app-primary-color;
    outline: none;
    box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.25);
  }
}

.card-image-container {
  display: block;
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.25);
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.25);
  }
}

.card-image {
  max-width: 100%;
  height: auto;
  object-fit: cover;
}

.authors {
  margin-top: 0.5rem;
  font-size: 12px;
  color: #444;
}

.loading-icon {
  z-index: 20;
  width: 40px;
  height: 40px;
  left: 80px;
}

.loading-icon ::v-deep(.el-loading-mask) {
  background-color: rgba(117, 190, 218, 0.0) !important;
}

.loading-icon ::v-deep(.el-loading-spinner .path) {
  stroke: $app-primary-color;
}
</style>
