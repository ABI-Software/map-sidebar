<template>
  <div class="dataset-card-container" ref="container">
    <div class="dataset-card" ref="card">
      <div class="seperator-path"></div>
      <div class="card"
        @click="cardClicked(entry)"
        @mouseover="cardHovered(entry)"
        @mouseleave="cardHovered(undefined)"
      >
        <div class="card-right">
          <el-collapse class="collapse-card" v-model="expanded" @change="expandedChanged">
            <el-collapse-item :title="entry.Acupoint" name="1" class="collapse-card">
              <template v-for="field in displayFields" :key="field['name']">
                <div class="details" >
                  <strong>{{ field['name'] }}: </strong>
                  <template v-if="field['name'] === 'Link'">
                    <a :href="entry['Link']" target="_blank">
                      <span>
                        Click here for more information
                      </span>
                    </a>
                  </template>
                  <template v-else>
                    <span
                      v-if="!field['isEditing']"
                      @click="setFieldToEditing(field)"
                    >
                      {{ entry[field['name']] || 'Not Available' }}
                    </span>
                    <el-input
                      v-else
                      v-model="entry[field['name']]"
                      @blur="field['isEditing'] = false"
                      @keyup.enter="field['isEditing'] = false"
                      @vue:mounted="inputMounted"
                      type="textarea"
                    />
                  </template>
                </div>
              </template>
          </el-collapse-item>
          </el-collapse>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import EventBus from './EventBus.js'
/* eslint-disable no-alert, no-console */

export default {
  data() {
    return {
      expanded: [],
      displayFields: [
        {name: "Synonym", isEditing: false},
        {name: "Chinese Name", isEditing: false},
        {name: "English Name", isEditing: false},
        {name: "Reference", isEditing: false},
        {name: "Indications", isEditing: false},
        {name: "Acupuncture Method", isEditing: false},
        {name: "Vasculature", isEditing: false},
        {name: "Innervation", isEditing: false},
        {name: "Link", isEditing: false},
        //{name: "Notes", isEditing: false},
      ]
    }
  },
  name: 'AcupointsCard',
  props: {
    /**
     * Object containing information for
     * the required viewing.
     */
    entry: {
      type: Object,
      default: () => {},
    },
    allowEditing: {
      type: Boolean,
      default: false,
    },
  },
  methods: {
    expandedChanged: function() {
      if (this.expanded.length > 0) {
        EventBus.emit('acupoints-clicked', this.entry);
      }
    },
    cardClicked: function (data) {
      EventBus.emit('acupoints-clicked', data);
    },
    cardHovered: function (data) {
      EventBus.emit('acupoints-hovered', data);
    },
    inputMounted: function(event) {
      event.el?.querySelector('textarea')?.focus();
    },
    setFieldToEditing: function(field) {
      if (this.allowEditing) {
        field['isEditing'] = true;
      }
    }
  }
}
</script>

<style lang="scss" scoped>

:deep(.el-collapse-item__header) {
  font-weight: bold;
}

:deep(.el-collapse-item__content) {
  padding-bottom: 4px;
}

:deep(.el-collapse-item__wrap) {
  border: none;
}

.collapse-card {
  border-top: none;
  :deep(.el-collapse-item__header) {
    border-bottom: none;
  }
}

.dataset-card {
  padding-left: 5px;
  padding-right: 5px;
  position: relative;
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
  padding-top: 12px;
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
