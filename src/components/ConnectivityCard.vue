<template>
  <div class="connectivity-card-container" ref="container">
    <div class="connectivity-card" ref="card">
      <div class="seperator-path"></div>
      <div v-loading="loading" class="card-content" @click="cardClicked(entry)">
        <div class="card-title">{{ capitalise(entry.label) }}</div>
        <template v-for="field in displayFields" :key="field">
          <div class="card-details" v-if="entry[field]">
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
    connectivityEntry: {
      type: Array,
      default: () => [],
    },
  },
  computed: {
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

.card-content {
  padding-top: 18px;
  padding-left: 6px;
  cursor: pointer;
}

.card-title {
  padding-bottom: 0.75rem;
  font-weight: bold;
  line-height: 1.5;
  letter-spacing: 1.05px;
}

.card-details {
  line-height: 1.5;
  letter-spacing: 1.05px;
}
</style>
