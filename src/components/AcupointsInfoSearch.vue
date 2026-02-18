<template>
  <div v-if="entry" class="main">
    <div class="header">
      <el-row>
        <el-input
          class="search-input"
          placeholder="Search"
          v-model="searchInput"
          @keyup="search(searchInput)"
          clearable
          @clear="clearSearchClicked"
        ></el-input>
        <el-button
          v-show="false"
          type="primary"
          class="button"
          @click="search(searchInput)"
          size="large"
        >
          Search
        </el-button>
      </el-row>
      <el-row>
        <el-col :span="12">
          <span class="filter-text">
            Curated:&nbsp;&nbsp;
          </span>
          <el-radio-group v-model="currentFilters['curated']" size="small" class="acuRadioGroup">
            <el-radio-button
              v-for="(value, key) in curatedFilters"
              :key="key"
              :label="key"
              :value="value"
            />
          </el-radio-group>
        </el-col>
        <el-col :span="12">
          <span class="filter-text">
            On MRI:&nbsp;&nbsp;
          </span>
          <el-radio-group v-model="currentFilters['mri']" size="small" class="acuRadioGroup">
            <el-radio-button
              v-for="(value, key) in mriFilters"
              :key="key"
              :label="key"
              :value="value"
            />
          </el-radio-group>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="12">
          <span class="filter-text">
            WHO approved:&nbsp;&nbsp;
          </span>
          <el-radio-group v-model="currentFilters['who']" size="small" class="acuRadioGroup">
            <el-radio-button
              v-for="(value, key) in whoFilters"
              :key="key"
              :label="key"
              :value="value"
            />
          </el-radio-group>
        </el-col>
      </el-row>
    </div>
    <div class="content scrollbar" ref="content">
      <div v-if="paginatedResults.length > 0" v-for="result in paginatedResults" :key="result.Acupoint" class="step-item">
        <AcupointsCard
          class="dataset-card"
          :entry="result"
          @mouseenter="hoverChanged(result)"
          @mouseleave="hoverChanged(undefined)"
        />
      </div>
      <div v-else class="error-feedback">
        No results found - Please change your search / filter criteria.
      </div>
      <el-pagination
        class="pagination"
        v-model:current-page="page"
        hide-on-single-page
        large
        layout="prev, pager, next"
        :page-size="numberPerPage"
        :total="numberOfHits"
        @current-change="pageChange"
      ></el-pagination>
    </div>
  </div>
</template>

<script>
/* eslint-disable no-alert, no-console */
import {
  ElButton as Button,
  ElCard as Card,
  ElCol as Col,
  ElRadioButton as RadioButton,
  ElRadioGroup as RadioGroup,
  ElDrawer as Drawer,
  ElIcon as Icon,
  ElInput as Input,
  ElPagination as Pagination,
  ElRow as Row,
} from 'element-plus'
import AcupointsCard from './AcupointsCard.vue'

export default {
  components: {
    AcupointsCard,
    Button,
    Card,
    Col,
    RadioButton,
    RadioGroup,
    Drawer,
    Icon,
    Input,
    Pagination,
    Row
  },
  name: 'AcupointsInfoSearch',
  props: {
    entry: {
      type: Object,
      default: () => {},
    },
  },
  data: function () {
    return {
      curatedFilters: {
        "Yes": "Curated",
        "No": "Uncurated",
        "Both": "Both"
      },
      mriFilters: {
        "Yes": "On",
        "No": "Off",
        "Both": "Both"
      },
      whoFilters: {
        "Yes": "Yes",
        "No": "No",
        "Both": "Both"
      },
      currentFilters: {
        curated: "Both",
        mri: "Both",
        who: "Yes",
      },
      previousFilters: {
        curated: "Both",
        mri: "Both",
        who: "Both",
      },
      previousInput: undefined,
      results: [],
      paginatedResults: [],
      searchInput: "",
      lastSearch: "",
      numberOfHits: 0,
      numberPerPage: 10,
      page: 1,
    }
  },
  watch: {
    currentFilters: {
      handler: function () {
        this.search(
          this.searchInput,
          this.numberPerPage,
          this.page
        )
      },
      immediate: true,
      deep: true,
    },
    entry: {
      handler: function () {
        this.search(
          this.searchInput,
          this.numberPerPage,
          this.page
        )
      },
      immediate: true,
      deep: true,
    },
  },
  methods: {
    hoverChanged: function (data) {
      this.$emit('hover-changed', data)
    },
    resetSearch: function () {
      this.numberOfHits = 0
      this.search(this.searchInput)
    },
    clearSearchClicked: function () {
      this.searchInput = '';
      this.search("");
    },
    searchUpdatedRequired: function(input) {
      if (input !== this.previousInput) {
        return true
      }
      for (const [key, value] of Object.entries(this.currentFilters)) {
        if (value !== this.previousFilters[key]) {
          return true
        }
      }
      return false
    },
    getFilteredList: function() {
      this.previousFilters['curated'] = this.currentFilters['curated']
      this.previousFilters['mri'] = this.currentFilters['mri']
      this.previousFilters['who'] = this.currentFilters['who']
      let filteredList = Object.values(this.entry)
      if (this.currentFilters['curated'] !== "Both") {
        const curated = this.currentFilters['curated'] === "Curated" ? true : false
        filteredList = filteredList.filter(
          item => (item.Curated ? true : false) === curated)
      }
      if (this.currentFilters['mri'] !== "Both") {
        const curated = this.currentFilters['mri'] === "On" ? true : false
        filteredList = filteredList.filter(
          item => (item.onMRI ? true : false) === curated)
      }
      if (this.currentFilters['who'] !== "Both") {
        const who = this.currentFilters['who'] === "Yes" ? true : false
        filteredList = filteredList.filter(
          item => (item["Meridian Point"] ? true : false) === who)
      }
      return filteredList;
    },
    search: function(input) {
      this.results = []
      if (this.searchUpdatedRequired(input)) {
        let filteredList = this.getFilteredList()
        this.previousInput = this.input
        if (input === "") {
          this.results = filteredList
        } else {
          const lowerCase = input.toLowerCase()
          for (const value of filteredList) {
            const searchFields = [
              value["Acupoint"],
              value["Synonym"],
              value["Chinese Name"],
              value["English Name"],
              value["Reference"],
              value["Indications"],
              value["Acupuncture Method"],
              value["Vasculature"],
              value["Innervation"],
              value["Note"],
            ];
            const allstrings = searchFields.join();
            const myJSON = allstrings.toLowerCase();
            if (myJSON.includes(lowerCase)) {
              this.results.push(value)
            }
          }
        }
      }
      const start = this.numberPerPage * (this.page - 1)
      this.paginatedResults = this.results.slice(start, start + this.numberPerPage)
      this.numberOfHits = this.results.length
      this.searchInput = input
      this.lastSearch = input
    },
    numberPerPageUpdate: function (val) {
      this.numberPerPage = val
      this.pageChange(1)
    },
    pageChange: function (page) {
      this.page = page
      this.search( this.searchInput)
    },
    scrollToTop: function () {
      if (this.$refs.content) {
        this.$refs.content.scroll({ top: 0, behavior: 'smooth' })
      }
    },
    resetPageNavigation: function () {
      this.page = 1
    },
  },
}
</script>

<style lang="scss" scoped>

.acuRadioGroup {
  padding-top: 8px;
}

.dataset-card {
  position: relative;

  &::before {
    content: "";
    display: block;
    width: calc(100% - 15px);
    height: 100%;
    position: absolute;
    top: 7px;
    left: 7px;
    border-style: solid;
    border-radius: 5px;
    border-color: transparent;
  }

  &:hover {
    &::before {
      border-color: var(--el-color-primary);
    }
  }
}

.main {
  font-size: 14px;
  text-align: left;
  line-height: 1.5em;
  font-family: Asap, sans-serif, Helvetica;
  font-weight: 400;
  /* outline: thin red solid; */
  overflow-y: auto;
  scrollbar-width: thin;
  min-width: 16rem;
  background-color: #f7faff;
  height: 100%;
  border-left: 1px solid var(--el-border-color);
  border-top: 1px solid var(--el-border-color);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

.step-item {
  font-size: 14px;
  margin-bottom: 8px;
  text-align: left;
}

.search-input {
  width: 298px !important;
  height: 40px;
  padding-right: 14px;

  :deep(.el-input__inner) {
    font-family: inherit;
  }
}

.header {
  .el-button {
    font-family: inherit;

    &:hover,
    &:focus {
      background: $app-primary-color;
      box-shadow: -3px 2px 4px #00000040;
      color: #fff;
    }
  }
}

.pagination {
  padding-bottom: 16px;
  background-color: white;
  padding-left: 95px;
  font-weight: bold;
}

.pagination :deep(button) {
  background-color: white !important;
}
.pagination :deep(li) {
  background-color: white !important;
}
.pagination :deep(li.is-active) {
  color: $app-primary-color;
}

.error-feedback {
  font-family: Asap;
  font-size: 14px;
  font-style: italic;
  padding-top: 15px;
}

.content-card :deep(.el-card__header) {
  background-color: #292b66;
  padding: 1rem;
}

.content-card :deep(.el-card__body) {
  background-color: #f7faff;
  overflow-y: hidden;
  padding: 1rem;
}

.content {
  // width: 515px;
  flex: 1 1 auto;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.06);
  border: solid 1px #e4e7ed;
  background-color: #ffffff;
  overflow-y: scroll;
  scrollbar-width: thin;
  border-radius: var(--el-border-radius-base);
}

.content :deep(.el-loading-spinner .path) {
  stroke: $app-primary-color;
}

.content :deep(.step-item:first-child .seperator-path) {
  display: none;
}

.content :deep(.step-item:not(:first-child) .seperator-path) {
  width: 455px;
  height: 0px;
  border: solid 1px #e4e7ed;
  background-color: #e4e7ed;
}

.filter-text {
  top:4px;
  position:relative;
}

.scrollbar::-webkit-scrollbar-track {
  border-radius: 10px;
  background-color: #f5f5f5;
}

.scrollbar::-webkit-scrollbar {
  width: 12px;
  right: -12px;
  background-color: #f5f5f5;
}

.scrollbar::-webkit-scrollbar-thumb {
  border-radius: 4px;
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.06);
  background-color: #979797;
}

:deep(.el-input__suffix) {
  padding-right: 0px;
}

:deep(.my-drawer) {
  background: rgba(0, 0, 0, 0);
  box-shadow: none;
}

.error-feedback {
  font-family: Asap;
  font-size: 14px;
  font-style: italic;
  padding-top: 15px;
}
</style>
