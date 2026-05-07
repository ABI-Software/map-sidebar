<template>
  <div class="connectivity-card-container" ref="container">
    <div class="connectivity-card" ref="card">
      <div class="seperator-path"></div>
      <div v-loading="loading" class="card-content" @click="cardClicked(entry)">
        <div class="card-title">
          {{ capitalise(displayTitle) }}
        </div>
        <template v-for="field in displayFields" :key="field">
          <div class="card-details" v-if="entry[field]">
            <strong>{{ field }}: </strong>
            <div v-if="field === 'nerve-label'" class="card-tags">
              <div v-for="nerve in entry[field]" :key="nerve.nerve">
                <el-tag type="primary" size="small">
                  {{ nerve.nerve }}
                </el-tag>
                <el-tag type="primary" size="small" v-for="subNerve in nerve.subNerves">
                  {{ subNerve }}
                </el-tag>
              </div>
            </div>
            <span v-else>{{ entry[field] }}</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import EventBus from './EventBus';
import { capitalise as capitaliseText } from '../utils/common.js';

export default {
  name: "ConnectivityCard",
  data() {
    return {
      displayFields: ["id", "nerve-label"],
    };
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
    connectivityEntry: {
      type: Array,
      default: () => [],
    },
    showLongLabel: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    displayTitle: function () {
      if (this.showLongLabel) {
        return this.entry?.['long-label'] || '';
      }
      return this.entry?.label || '';
    },
    loading: function () {
      // for clicking on the flatmap neuron
      if ("ready" in this.entry) {
        return !this.entry.ready;
      }
      // for clicking on the explorer card
      const cEntry = this.connectivityEntry.find(
        (entry) => entry.id === this.entry.id
      );
      if (cEntry) {
        return !cEntry.ready;
      }
      return false;
    },
  },
  methods: {
    capitalise: function (text) {
      return capitaliseText(text);
    },
    cardClicked: function (data) {
      if (!this.loading) {
        this.$emit("open-connectivity", data);

        EventBus.emit('trackEvent', {
          'event_name': `portal_maps_connectivity_open`,
          'category': data.id || '',
          'location': 'map_sidebar_connectivity',
        });
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.connectivity-card {
  padding-left: 5px;
  position: relative;
  min-height: 5rem;
}

.card-content {
  padding-top: 18px;
  padding-left: 6px;
  cursor: pointer;
}

.card-title {
  margin-bottom: 0.75rem;
  font-weight: bold;
  line-height: 1.5;
  letter-spacing: 1.05px;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-details {
  line-height: 1.5;
  letter-spacing: 1.05px;
}

.el-tag {
  border-radius: 4px!important;
  font-size: 0.75rem!important;
  margin: 2px!important;
  background: #f9f2fc!important;
  border: 1px solid $app-primary-color!important;
  color: $app-primary-color!important;
}

.card-tags {
  overflow-y: scroll;
  max-height: 4.1rem;

  &::-webkit-scrollbar {
    display: none; /* Hide scrollbar for Chrome, Safari and Opera */
  }
  -ms-overflow-style: none; /* Hide scrollbar for IE and Edge */
  scrollbar-width: none; /* Hide scrollbar for Firefox */
}
</style>
