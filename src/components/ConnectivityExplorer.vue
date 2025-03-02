<template>
  <div v-if="flatmapKnowledge" class="main">
    <div class="header">
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
    </div>
    <div class="content scrollbar" ref="content">
      <div v-for="result in paginatedResults" :key="result.id" class="step-item">
        <connectivity-card
          class="dataset-card"
          :entry="result"
          @mouseenter="hoverChanged(result)"
          @mouseleave="hoverChanged(undefined)"
        />
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

const flatmapQuery = (flatmapApi, sql) => {
  const data = { sql: sql }
  return fetch(`${flatmapApi}knowledge/query/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .catch((error) => {
      console.error('Error:', error)
  })
}

const filterKnowledge = (knowledge, sckanVersion) => {
  const result = knowledge.filter((item) => {
    if (item?.source && item.source === sckanVersion) {
      if ("connectivity" in item) {
        return true
      }
    }
    return false
  })
  return result
}


/* eslint-disable no-alert, no-console */
import {
  ElButton as Button,
  ElCard as Card,
  ElDrawer as Drawer,
  ElIcon as Icon,
  ElInput as Input,
  ElPagination as Pagination,
} from 'element-plus'
import ConnectivityCard from './ConnectivityCard.vue'

export default {
  components: {
    ConnectivityCard,
    Button,
    Card,
    Drawer,
    Icon,
    Input,
    Pagination
  },
  name: 'ConnectivityExplorer',
  props: {
    sckanVersion: {
      type: String,
      default: "sckan-2024-09-21-npo",
    },
    envVars: {
      type: Object,
      default: () => {},
    },
  },
  data: function () {
    return {
      mapServer: "",
      flatmapKnowledge: [],
      results: [],
      paginatedResults: [],
      searchInput: "",
      lastSearch: "",
      numberOfHits: 0,
      numberPerPage: 10,
      page: 1,
      previousSearch: undefined
    }
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
    search: function(input) {
      this.results = []
      if (input !== this.previousSearch) {
        if (input === "") {
          this.results = this.flatmapKnowledge
        } else {
          for (const value of this.flatmapKnowledge) {
            const lowerCase = input.toLowerCase()
            const myJSON = JSON.stringify(value).toLowerCase()
            if (myJSON.includes(lowerCase)) {
              this.results.push(value)
            }
          }
        }
      }
      console.log(this.flatmapKnowledge, this.results)
      const start = this.numberPerPage * (this.page - 1)
      this.paginatedResults = this.results.slice(start, start + this.numberPerPage)
      this.numberOfHits = this.results.length
      this.searchInput = input
      this.lastSearch = input
      console.log(this.numberOfHits)
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
  mounted: function () {
    this.mapServer = this.envVars.FLATMAPAPI_LOCATION
    console.log(this.mapServer)
    if (this.mapServer) {
      const sql = `select knowledge from knowledge
        where source="${this.sckanVersion}"
        order by source desc`;
      flatmapQuery(this.mapServer, sql).then((response) => {
        const mappedData = response.values.map(x => x[0])
        const parsedData = mappedData.map(x => JSON.parse(x))
        this.flatmapKnowledge = filterKnowledge(parsedData, this.sckanVersion)
        this.search("");
      });
    }
  },
}
</script>

<style lang="scss" scoped>
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
  gap: 1.75rem;
  padding: 1rem;
}

.step-item {
  font-size: 14px;
  margin-bottom: 18px;
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
</style>
