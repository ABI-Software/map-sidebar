<template>
  <div class="annotation-tool scrollbar">
    <CreateTooltipContent
      v-show="createData && createData.toBeConfirmed"
      :createData="createData"
      @confirm-create="$emit('confirm-create', $event)"
      @cancel-create="$emit('cancel-create')"
      class="create-tooltip-content"
    />
    <annotation-popup
      v-if="annotationEntry && (!createData || !createData.toBeConfirmed)"
      class="annotation-popup"
      :annotationEntry="annotationEntry"
      @annotation="$emit('annotation', $event)"
    />
    <div v-if="createData && createData.toBeDeleted" class="delete-container">
      <el-row>
        <el-col :offset="1" :span="6">Delete this feature?</el-col>
        <el-col :offset="1" :span="3">
          <el-button
            class="delete-button"
            :icon="ElIconDelete"
            @click="$emit('confirm-delete')"
            >
              Delete
          </el-button>
        </el-col>
        <el-col :offset="1" :span="2">
          <el-button
            class="delete-button"
            @click="$emit('cancel-create')"
            >
              Dismiss
          </el-button>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script>
import { shallowRef } from 'vue';
import { AnnotationPopup, CreateTooltipContent } from '@abi-software/map-utilities';
import '@abi-software/map-utilities/dist/style.css';
import {
  ElButton as Button,
  ElCol as Col,
  ElRow as Row,
  ElIcon as Icon,
} from 'element-plus'
import {
  Delete as ElIconDelete,
} from '@element-plus/icons-vue'

export default {
  name: 'AnnotationTool',
  components: {
    AnnotationPopup,
    Button,
    CreateTooltipContent,
    Col,
    ElIconDelete,
    Icon,
    Row,
  },
  props: {
    annotationEntry: {
      type: Array,
    },
    createData: {
      type: Object,
      default: {},
    }
  },
  data: function () {
    return {
      ElIconDelete: shallowRef(ElIconDelete),
    };
  },
}
</script>

<style scoped lang="scss">
.annotation-tool {
  background-color: #f7faff;
  height: 100%;
  overflow-y: auto;
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

.annotation-popup.main {
  font-size: 14px;
  text-align: left;
  line-height: 1.5em;
  font-family: Asap, sans-serif, Helvetica;
  font-weight: 400;
  /* outline: thin red solid; */
  overflow-y: auto;
  scrollbar-width: thin;
  min-width: 16rem;
  max-height: unset;
  background-color: #f7faff;
  border-left: 1px solid var(--el-border-color);
  border-top: 1px solid var(--el-border-color);
}

.delete-container {
  margin-top: 12px;
  margin-bottom: 12px;
  font-size: 14px;
  .delete-button {
    pointer-events: auto;
    cursor: pointer;
    margin-left:8px;
    padding-left: 8px;
    padding-right: 8px;
    height: 24px !important;
    color: $app-primary-color;
    &:hover {
      background-color: var(--el-color-primary-light-9);
    }
  }
}

.create-container.create-tooltip-content {
  background-color: #f7faff;
}

</style>