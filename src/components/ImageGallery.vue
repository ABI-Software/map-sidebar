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
import Gallery from "@abi-software/gallery";
import "@abi-software/gallery/dist/style.css";
//provide the s3Bucket related methods and data.

export default {
  name: 'ImageGallery',
  components: { Gallery },
  props: {
    category: {
      type: String,
      default: 'All',
    },
    items: {
      type: Object,
      defualt: () => {
        return  {
          Dataset: [],
          Flatmaps:[],
          Images: [],
          Scaffolds: [],
          Simulations: [],
          Videos: [],
          Plots: [],
        }
      }
    }
  },
  data() {
    return {
      currentIndex: 0,
      ro: null,
      maxWidth: 3,
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
    onResize: function () {
      this.maxWidth = this.$el.clientWidth
      // this.$emit('resize', this.$el.clientWidth)
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
  watch: {
    category: function () {
      this.resetIndex = true
    },
    galleryItems: function () {
      this.resetIndex = false
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
