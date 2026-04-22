<template>
  <div class="body">
    <el-table
      :data="list"
      :rowKey="props.rowKeyName"
      :style="props.style"
      v-loading="loading"
      v-bind="props.attrs"
      v-on="props.events"
      ref="elTableRef"
      @select="recordListSelectEvent"
      @filter-change="recordListFiltersEvent"
      @sort-change="recordListSortEvent"
    >
      <el-table-column v-if="props.selectMode" type="selection" width="55"></el-table-column>
      <el-table-column
        v-for="column in columns"
        v-bind="column.attrs"
        :key="column.key"
        :prop="column.key"
        :label="column.title"
        :min-width="column.width"
        :type="column.type === 'index' ? 'index' : 'default'"
      >
        <template #default="scope" v-if="column.type && column.type !== 'index'">
          <slot
            v-if="column.type === 'custom'"
            :name="`recordListColumn-${column.key}`"
            :rowData="scope.row"
            :colData="scope.row[column.key]"
          ></slot>
          <el-button
            v-if="column.type === 'link'"
            @click="linkColumnEventHandler(column, scope.row)"
            type="primary"
            text
            size="small"
          >
            {{ scope.row[column.key] }}
          </el-button>
          <template v-if="column.type === 'formItem'">
            <el-switch
              v-if="column.formItemConfig.type === 'switch'"
              :disabled="scope.row[ctxSymbol.for('formItemDisable')]"
              v-model="formData[scope.row[props.rowKeyName]][column.key]"
              @change="(e) => formItemInputEventHandler(column, scope.row, e)"
              v-bind="column.formItemConfig.attrs"
            />
            <el-checkbox
              v-if="column.formItemConfig.type === 'checkbox'"
              :disabled="scope.row[ctxSymbol.for('formItemDisable')]"
              v-model="formData[scope.row[props.rowKeyName]][column.key]"
              @change="(e) => formItemInputEventHandler(column, scope.row, e)"
              v-bind="column.formItemConfig.attrs"
            >
              {{ column.attrs.label }}
            </el-checkbox>
            <el-input
              v-else-if="column.formItemConfig.type === 'input'"
              :disabled="scope.row[ctxSymbol.for('formItemDisable')]"
              v-model="formData[scope.row[props.rowKeyName]][column.key]"
              @change="(e) => formItemInputEventHandler(column, scope.row, e)"
              v-bind="column.formItemConfig.attrs"
            />
            <el-input-number
              v-else-if="column.formItemConfig.type === 'number'"
              :disabled="scope.row[ctxSymbol.for('formItemDisable')]"
              v-model.number="formData[scope.row[props.rowKeyName]][column.key]"
              @change="(e) => formItemInputEventHandler(column, scope.row, e)"
              v-bind="column.formItemConfig.attrs"
            />
            <el-select
              v-else-if="column.formItemConfig.type === 'select'"
              :disabled="scope.row[ctxSymbol.for('formItemDisable')]"
              v-model="formData[scope.row[props.rowKeyName]][column.key]"
              @change="(e) => formItemInputEventHandler(column, scope.row, e)"
              v-bind="column.formItemConfig.attrs"
            >
              <el-option
                v-for="optionItem in column.options"
                :key="optionItem.value"
                :label="optionItem.label"
                :value="optionItem.value"
                v-bind="optionItem.optionAttrs"
              />
            </el-select>
            <el-tree-select
              v-else-if="column.formItemConfig.type === 'treeSelect'"
              :disabled="scope.row[ctxSymbol.for('formItemDisable')]"
              v-model="formData[scope.row[props.rowKeyName]][column.key]"
              :tree-data="column.options"
              :dropdown-style="{ maxHeight: '400px', overflow: 'auto' }"
              @change="(e) => formItemInputEventHandler(column, scope.row, e)"
              v-bind="column.formItemConfig.attrs"
            />
          </template>
          <template
            v-if="column.type === 'operater'"
            v-for="operaterItem in column.list"
            :key="operaterItem.key"
          >
            <template v-if="scope.row[ctxSymbol.for(`operater-${operaterItem.key}-show`)]">
              <el-button
                v-if="!['confirm', 'formItemOperater'].includes(operaterItem.type)"
                size="small"
                type="primary"
                v-bind="operaterItem.attrs"
                @click="operaterItemEventHandler(operaterItem, scope.row)"
              >
                {{ operaterItem.text }}
              </el-button>
              <template v-else-if="operaterItem.type === 'formItemOperater'">
                <el-button
                  v-if="scope.row[ctxSymbol.for('formItemDisable')]"
                  size="small"
                  type="primary"
                  @click="operaterItemEventHandler(operaterItem, scope.row, 'entry')"
                >
                  {{ operaterItem.text }}
                </el-button>
                <template v-else>
                  <el-button-group>
                    <el-button
                      size="small"
                      type="primary"
                      @click="operaterItemEventHandler(operaterItem, scope.row, 'submit')"
                      :loading="scope.row[ctxSymbol.for('operater-formItemOperater-loading')]"
                    >
                      保存
                    </el-button>
                    <el-button
                      size="small"
                      type="primary"
                      @click="operaterItemEventHandler(operaterItem, scope.row, 'exit')"
                    >
                      取消
                    </el-button>
                  </el-button-group>
                </template>
              </template>
              <el-popconfirm
                v-else-if="operaterItem.type === 'confirm'"
                :title="`是否确认${operaterItem.text}`"
                :confirm-button-text="operaterItem?.confirm?.text || '确认'"
                :cancel-button-text="operaterItem?.cancel?.text || '取消'"
                v-bind="operaterItem.attrs"
                @confirm="operaterItemEventHandler(operaterItem, scope.row, 'confirm')"
                @cancel="operaterItemEventHandler(operaterItem, scope.row, 'cancel')"
              >
                <template #reference>
                  <el-button size="small" type="primary" v-bind="operaterItem.buttonAttrs">
                    {{ operaterItem.text }}
                  </el-button>
                </template>
              </el-popconfirm>
            </template>
          </template>
          <el-popover
            v-if="column.type === 'fileList'"
            v-for="fileItem in scope.row[column.key]"
            :key="fileItem.id"
            :title="column.title"
            trigger="hover"
          >
            <template v-if="fileItem.content" #default>
              <p v-if="fileItem.content.text">
                {{ fileItem.content.text }}
              </p>
              <img
                class="fileList_popover_pic"
                v-else-if="fileItem.content.pic"
                :src="fileItem.content.pic"
              />
            </template>
            <div class="fileList_download_btn" @click="linkColumnEventHandler(column, scope.row)">
              {{ fileItem.name }}
            </div>
          </el-popover>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      v-if="props.showPagination"
      class="pagination"
      v-model:current-page="pageNum"
      v-model:page-size="pageSize"
      :total="totalNum"
      :page-sizes="['10', '20', '50', '100']"
      v-bind="props.paginationConfig"
      layout="total, sizes, prev, pager, next, jumper"
    ></el-pagination>
  </div>
</template>
<script setup>
  import { nextTick, toRefs, toValue, watchEffect, useAttrs } from 'vue';
  import { useRecordList, recordListProps, recordListEmits } from '../../common/index.js';

  const props = defineProps(recordListProps);
  const emits = defineEmits(recordListEmits);
  const elTableRef = ref();
  const ctxSymbol = Symbol;

  const attrs = useAttrs();

  const setFilterList = (columnItem, columnList) => {
    if (!columnItem.attrs) {
      columnItem.attrs = {
        filters: [],
      };
    } else {
      columnItem.attrs.filters = [];
    }
    if (getVarType(columnItem.getFilterList) === 'asyncFunction') {
      columnItem.getFilterList().then((filtersList) => {
        toRef(columnItem.attrs, 'filters').value = filtersList;
      });
    } else if (getVarType(columnItem.getFilterList) === 'function') {
      const filtersList = columnItem.getFilterList();
      toRef(columnItem.attrs, 'filters').value = filtersList;
    }
  };

  const {
    list,
    columns,
    pageNum,
    pageSize,
    totalNum,
    loading,
    formData,
    formItemInputEventHandler,
    operaterItemEventHandler,
    linkColumnEventHandler,
    setFilterParams,
    clearFilterParams,
    setSorterParams,
    clearSorterParams,
    getListData,
    search,
    addRowToList,
    getRecordListList,
    defineExposeConfig,
    show,
  } = useRecordList({ ...toRefs(props), ...attrs }, emits, setFilterList);

  const recordListSelectEvent = (rows) => {
    emits('selectRows', { rows: [...rows], pageNum: pageNum.value });
  };
  watchEffect(() => {
    if (props.selectedRows.length && list.value.length) {
      for (const row of props.selectedRows) {
        elTableRef.value.toggleRowSelection(row, true);
      }
    }
  });
  watch(
    () => props.selectMode,
    (n) => {
      if (!n) {
        elTableRef.value.clearSelection();
      }
    }
  );
  const recordListFiltersInfo = {};
  const recordListFiltersEvent = (sourceFilters) => {
    console.log('列表筛查', sourceFilters);
    if (sourceFilters) {
      for (const elRecordListColKey of Object.keys(sourceFilters)) {
        const columnIndex = Number(elRecordListColKey.replace(/^.+_(\d+)$/g, '$1')) - 1;
        const columnKey = props.columnsConfig[columnIndex].key;
        recordListFiltersInfo[columnKey] = [...sourceFilters[elRecordListColKey]];
        if (!recordListFiltersInfo[columnKey].length) {
          Reflect.deleteProperty(recordListFiltersInfo, columnKey);
        }
      }
    }
    if (Object.keys(recordListFiltersInfo).length) {
      setFilterParams(recordListFiltersInfo);
    } else {
      clearFilterParams();
    }
    search();
  };
  //const recordListSortInfo = {};
  let recordListSortInfo = {};
  const recordListSortEvent = (sorter) => {
    console.log('列表排序', sorter);
    if (sorter.order) {
      recordListSortInfo[sorter.prop] = sorter.order === 'ascending' ? 'asc' : 'desc';
    } else {
      recordListSortInfo = {};
    } /* else if (Reflect.has(recordListSortInfo, sorter.prop)) {
      Reflect.deleteProperty(recordListSortInfo, sorter.prop);
    } */
    if (Object.keys(recordListSortInfo).length) {
      setSorterParams(recordListSortInfo);
    } else {
      clearSorterParams();
    }
    search();
  };

  defineExpose(defineExposeConfig);
</script>
<style lang="scss" scoped>
  .pagination {
    margin-top: 15px;
    justify-content: flex-end;
  }
  .fileList_popover_pic {
    width: 100%;
    display: block;
  }
  .fileList_download_btn {
    cursor: pointer;
    color: #1890ff;
    font-size: 14px;
  }
</style>
