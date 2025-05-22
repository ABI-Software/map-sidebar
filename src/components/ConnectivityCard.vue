<template>
  <div class="connectivity-card-container" ref="container">
    <div class="connectivity-card" ref="card">
      <div class="seperator-path"></div>
      <div v-loading="loading" class="card" @click="cardClicked(entry)">
        <div class="title">{{ capitalise(entry.label) }}</div>
        <template v-for="field in displayFields" :key="field">
          <div class="details" v-if="entry[field]">
            <strong>{{ field }}:</strong> {{ entry[field] }}
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "ConnectivityCard",
  data() {
    return {
      displayFields: ["id"],
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
  },
  computed: {
    loading: function () {
      // Only when click on overlay paths
      if ("detailsReady" in this.entry) {
        return !this.entry.detailsReady;
      }
      return false;
    },
  },
  methods: {
    capitalise: function (text) {
      if (text) return text.charAt(0).toUpperCase() + text.slice(1);
      return "";
    },
    cardClicked: function (data) {
      if (!this.loading) {
        this.$emit("open-connectivity", data);
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

.card {
  padding-top: 18px;
  padding-left: 6px;
  cursor: pointer;
}

.title {
  padding-bottom: 0.75rem;
  font-weight: bold;
  line-height: 1.5;
  letter-spacing: 1.05px;
}

.details {
  line-height: 1.5;
  letter-spacing: 1.05px;
}

.button {
  margin-right: 3.5rem;
  font-family: Asap;
  font-size: 14px;
  font-weight: normal;
  background-color: $app-primary-color;
  border: $app-primary-color;
  color: white;
  margin-top: 8px;
}
</style>
