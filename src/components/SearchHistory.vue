<template>
  <div class="history-container" v-if="searchHistory.length">
    <div class="saved-search-history" v-if="savedSearchHistory.length">
      <template v-for="(item, i) in savedSearchHistory" :key="item.id">
        <el-tag
          class="search-tag"
          v-if="i < 2"
          v-bind:key="i"
          @click="search(item)"
          size="large"
        >
          <template v-if="item.longLabel">
            <el-popover
              width="auto"
              trigger="hover"
              :show-after="200"
              :persistent="false"
              popper-class="popover-dropdown"
            >
              <template #reference>
                {{ item.label }}
              </template>
              {{ item.longLabel }}
            </el-popover>
          </template>
          <template v-else>
            {{ item.label }}
          </template>
        </el-tag>
      </template>
    </div>
    <div v-else>
      <span class="empty-saved-search">No Saved Searches</span>
    </div>
    <el-dropdown
      trigger="click"
      :hide-on-click="false"
    >
      <span class="el-dropdown-select">
        Search history
        <el-icon class="el-icon--right">
          <el-icon-arrow-down />
        </el-icon>
      </span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item v-for="item in searchHistory" :key="item.id">
            <div>
              <template v-if="item.longLabel">
                <el-popover
                  width="auto"
                  trigger="hover"
                  :show-after="200"
                  :persistent="false"
                  popper-class="popover-dropdown"
                >
                  <template #reference>
                    <span class="dropdown-clickable-item" @click="search(item)">
                      {{ item.label }}
                    </span>
                  </template>
                  {{ item.longLabel }}
                </el-popover>
              </template>
              <template v-else>
                <span class="dropdown-clickable-item" @click="search(item)">
                  {{ item.label }}
                </span>
              </template>
            </div>
            <div>
              <el-popover
                width="auto"
                trigger="hover"
                :show-after="200"
                :persistent="false"
                popper-class="popover-dropdown"
              >
                <template #reference>
                  <el-button circle text size="small"
                    @click="toggleSavedSearch(item)"
                    :disabled="savedSearchHistory.length > 1 && !item.saved"
                  >
                    <el-icon color="#8300BF">
                      <template v-if="item.saved">
                        <svg
                          viewBox="0 0 24 24"
                        >
                          <path d="m12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z"></path>
                        </svg>
                      </template>
                      <template v-else>
                        <svg
                          viewBox="0 0 24 24"
                        >
                          <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3m-4.4 15.55-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05"></path>
                        </svg>
                      </template>
                    </el-icon>
                  </el-button>
                </template>
                <span v-if="savedSearchHistory.length > 1 && !item.saved">
                  Limit 2: Please remove a saved search before adding another.
                </span>
                <span v-else-if="item.saved">
                  Remove from saved searches.
                </span>
                <span v-else>
                  Add up to two saved searches.
                </span>
              </el-popover>
              <el-popover
                width="auto"
                trigger="hover"
                :show-after="200"
                :persistent="false"
                popper-class="popover-dropdown"
              >
                <template #reference>
                  <el-button circle text size="small"
                    @click="removeFromSavedSearch(item)"
                  >
                    <el-icon color="#8300BF">
                      <el-icon-delete />
                    </el-icon>
                  </el-button>
                </template>
                <span>
                  Remove from search history.
                </span>
              </el-popover>
            </div>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script>
/* eslint-disable no-alert, no-console */
import {
  ElTag as Tag,
  ElSelect as Select,
  ElDropdown,
  ElIcon,
} from 'element-plus'

import EventBus from './EventBus.js'

const MAX_SEARCH_HISTORY = 12;

function generateUUID() {
  const arr = new Uint8Array(16);
  window.crypto.getRandomValues(arr);

  arr[6] = (arr[6] & 0x0f) | 0x40;
  arr[8] = (arr[8] & 0x3f) | 0x80;

  const hex = Array.from(arr)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export default {
  name: 'SearchHistory',
  components: {
    Tag,
    Select
  },
  props: {
    localStorageKey: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      searchHistory: [],
      savedSearchHistory: [],
    }
  },
  mounted: function () {
    this.getSearchHistory()
    EventBus.on('search-changed', (data) => {
      this.setSearchHistory(data)
    });
    this.updateSearchHistory();
    this.savedSearchHistory = this.searchHistory.filter((item) => item.saved);
  },
  methods: {
    getSearchHistory() {
      if (localStorage.getItem(this.localStorageKey)) {
        this.searchHistory = JSON.parse(localStorage.getItem(this.localStorageKey))
      } else {
        this.searchHistory = []
      }
    },
    clearSearchHistory() {
      localStorage.removeItem(this.localStorageKey)
      this.searchHistory = []
    },
    sortFilters(a, b) {
      return a.facetPropPath.localeCompare(b.facetPropPath);
    },
    // Sort by saved and updated
    sortSearchHistory(a, b) {
      if (a.saved !== b.saved) {
        return b.saved - a.saved;
      }
      if (a.updated !== b.updated) {
        return b.updated - a.updated;
      }
      return 0;
    },
    addSearchToHistory(filters = [], search = '') {
      search = search.trim() // remove whitespace

      const isExistingItem = this.searchHistory.some((item) => {
        let historyFilters = item.filters;
        let newFilters = filters;

        // sort filters (to check duplicates in string format)
        historyFilters = historyFilters.sort(this.sortFilters);
        newFilters = newFilters.sort(this.sortFilters);

        const historyFiltersString = JSON.stringify(historyFilters);
        const newFiltersString = JSON.stringify(newFilters);

        return (
          item.search === search &&
          historyFiltersString === newFiltersString
        );
      });

      if (!isExistingItem) {
        const {label, longLabel} = this.searchHistoryItemLabel(search, filters);
        if (label || longLabel) {          
          const newItem = {
            filters: filters,
            search: search,
            saved: false,
            label: label,
            longLabel: longLabel,
            id: generateUUID(),
            updated: (new Date()).getTime(),
          };
  
          this.searchHistory.push(newItem);
  
          this.searchHistory = this.searchHistory.sort(this.sortSearchHistory);
  
          // trim search history to 12 items
          this.trimSearchHistory();
  
          // Save new data
          localStorage.setItem(this.localStorageKey, JSON.stringify(this.searchHistory));
        }
      }
    },
    /**
     * Remove the duplicate items in search history.
     */
    removeDuplicateSearchHistory: function () {
      const keys = [];
      const duplicateItemIDs = [];

      this.searchHistory.forEach((item) => {
        const key = `${item.search}-${JSON.stringify(item.filters)}`;
        const existingItem = keys.find(k => k.key === key);
        // duplicate item
        if (existingItem) {
          // if current item is saved item
          // add the other item into duplicates
          if (item.saved) {
            duplicateItemIDs.push(existingItem.id);
          } else {
            duplicateItemIDs.push(item.id);
          }
        } else {
          keys.push({
            id: item.id,
            key: key
          });
        }
      });

      if (duplicateItemIDs.length) {
        this.searchHistory = this.searchHistory.filter((item) => !duplicateItemIDs.includes(item.id));
      }
    },
    /**
     * Function to trim search history to maximum items,
     */
    trimSearchHistory: function () {
      // since saved has max 2
      // remove extra from unsaved
      if (this.searchHistory.length > MAX_SEARCH_HISTORY) {
        const savedItems = this.searchHistory.filter((item) => item.saved);
        const unsavedItems = this.searchHistory.filter((item) => !item.saved);
        const extra = MAX_SEARCH_HISTORY - this.searchHistory.length;

        this.searchHistory = [
          ...savedItems,
          ...unsavedItems.slice(0, extra),
        ];
      }
    },
    updateSearchHistory: function () {
      // Update for missing attributes
      this.searchHistory.forEach((item) => {
        if (!item.id) {
          item['id'] = generateUUID();
        }

        if (!item.label) {
          const {label, longLabel} = this.searchHistoryItemLabel(item.search, item.filters);
          item['label'] = label;
          item['longLabel'] = longLabel;
        }

        // sort filters (to check duplicates in string format)
        item.filters = item.filters.sort(this.sortFilters);

        if (!item.saved) {
          item['saved'] = false;
        }

        if (!item.updated) {
          item['updated'] = (new Date()).getTime();
        }
      });

      this.searchHistory = this.searchHistory.sort(this.sortSearchHistory);

      // check and remove duplicates
      this.removeDuplicateSearchHistory();

      // trim search history to 12 items
      this.trimSearchHistory();

      // Save updated data
      localStorage.setItem(this.localStorageKey, JSON.stringify(this.searchHistory))
    },
    search: function (item) {
      this.$emit('search', item)
    },
    searchHistoryItemLabel: function (search, filters) {
      let label = search ? `"${search.trim()}"` : '';
      let longLabel = '';
      let filterItems = [];
      let filterLabels = [];

      if (filters) {
        filterItems = filters.filter((filterItem) => filterItem.facet !== 'Show all');
        filterLabels = filterItems.map((item) => item.facet);
      }

      if (label && filterItems.length) {
        longLabel += label;
        longLabel += `, ${filterLabels.join(', ')}`;
        label += ` (+${filterItems.length})`;
      }

      if (!label && filterItems.length) {
        label = filterItems[0].facet;

        if (filterItems.length > 1) {
          longLabel += `${filterLabels.join(', ')}`;
          label += ` (+${filterItems.length - 1})`;
        }
      }

      if (!label) {
        label = '';
      } else if (label.length > 15 && !longLabel) {
        longLabel = label;
      }

      return {label, longLabel};
    },
    toggleSavedSearch: function (item) {
      this.searchHistory.forEach((_item) => {
        if (_item.id === item.id) {
          _item.saved = !_item.saved;
        }
      });
      this.savedSearchHistory = this.searchHistory.filter((item) => item.saved);
      this.updateSearchHistory();
    },
    removeFromSavedSearch: function (item) {
      const itemIndex = this.searchHistory.findIndex((_item) => _item.id === item.id);
      this.searchHistory.splice(itemIndex, 1);
      this.savedSearchHistory = this.searchHistory.filter((item) => item.saved);
      this.updateSearchHistory();
    },
  },
}
</script>

<style lang="scss" scoped>
.history-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 6px;
}

.empty-saved-search {
  font-style: italic;
  font-size: 14px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}

.saved-search-history {
  display: flex;
  align-items: center;
  gap: 6px;
}

.search-tag.el-tag {
  margin: 0;
  cursor: pointer !important;
  background: #f9f2fc!important;
  border-color: $app-primary-color!important;
  color:$app-primary-color!important;

  :deep(.el-tag__content) {
    max-width: 15ch;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 24px;
  }
}

.title {
  font-size: 14px;
  font-weight: bold;
  margin-right: 5px;
  // center text vertically
  display: flex;
  align-items: center;
}

.el-dropdown {
  width: 180px;
  position: relative;
  box-sizing: border-box;
  cursor: pointer;
  text-align: left;
  font-size: 14px;
  padding: 4px 12px;
  min-height: 32px;
  line-height: 24px;
  border-radius: var(--el-border-radius-base);
  background-color: var(--el-fill-color-blank);
  transition: var(--el-transition-duration);
  transform: translateZ(0);
  box-shadow: 0 0 0 1px var(--el-border-color) inset;
}

.el-dropdown-select {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;

  .el-icon {
    transform: rotate(0deg);
    transition: transform 0.25s linear;
    color: var(--el-text-color-placeholder);
  }

  &[aria-expanded="true"] {
    .el-icon {
      transform: rotate(180deg);
    }
  }
}

:deep(.el-dropdown-menu__item) {
  justify-content: space-between;
  gap: 0.5rem;
  cursor: default;
  position: relative;

  > div:first-child {
    max-width: 148px;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .dropdown-clickable-item {
    cursor: pointer;

    &:hover {
      color: $app-primary-color;
    }
  }

  + .el-dropdown-menu__item {
    &::before {
      content: "";
      display: block;
      width: calc(100% - 32px);
      border-top: 1px solid var(--el-border-color);
      position: absolute;
      top: 0;
    }
  }

  &:hover,
  &:focus,
  &:active {
    color: inherit !important;
    background-color: var(--el-fill-color-light) !important;
  }

  i {
    margin: 0;
  }
}
</style>

<style lang="scss">
.el-popper.el-dropdown__popper {
  font-family: Asap;
  font-size: 14px;
  font-weight: 400;
  font-stretch: normal;
  font-style: normal;
  line-height: normal;
  letter-spacing: normal;
  color: #292b66;
  min-width: 180px;
  width: fit-content;

  .el-button {
    background-color: transparent !important;
    transition: all .25s ease;

    > span {
      pointer-events: none;
    }

    &:hover,
    &:focus {
      background-color: transparent !important;
      box-shadow: none !important;
      border: 0 none !important;
    }

    &:not([disabled]) {
      &:hover,
      &:focus {
        background-color: #f3e6f9 !important;
      }
    }

    + .el-button {
      margin: 0;
    }
  }

  // element plus's dropdown max-height has problem
  .el-dropdown__list {
    max-height: 350px;
    overflow-y: auto;
    scrollbar-width: thin;
  }
}

.el-popover.el-popper.popover-dropdown {
  padding: 4px 10px;
  width: max-content;
  max-width: 240px;
  font-family: Asap;
  font-size: 12px;
  word-break: break-word;
  text-align: left;
  color: inherit;
  background: #f3ecf6 !important;
  border: 1px solid $app-primary-color;

  & .el-popper__arrow::before {
    border: 1px solid;
    border-color: $app-primary-color;
    background: #f3ecf6;
  }
}
</style>
