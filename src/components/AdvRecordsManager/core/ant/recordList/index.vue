<template>
  <div class="body">
    <a-table
      :dataSource="list"
      :columns="props.columnsConfig"
      :loading="loading"
      :rowKey="props.rowKeyName"
      :pagination="false"
      :rowSelection="props.selectMode ? recordListSelectModeProps : null"
      :style="props.style"
      v-bind="props.attrs"
      v-on="props.events"
      @change="recordListChangeEvent"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.type === 'index'">
          {{ record[ctxSymbol.for('index')] }}
        </template>
        <template v-else-if="!column.type || column.type === 'normal'">
          {{ record[column.key] }}
        </template>
        <template v-else-if="column.type === 'custom'">
          <slot
            :name="`recordListColumn-${column.key}`"
            :rowData="record"
            :colData="record[column.key]"
          ></slot>
        </template>
        <template v-else-if="column.type === 'link'">
          <div
            :title="record[column.key]"
            class="link"
            @click="linkColumnEventHandler(column, record)"
          >
            {{ record[column.key] }}
          </div>
        </template>
        <template v-else-if="column.type === 'fileList'">
          <div class="fileList">
            <a-popover v-for="fileItem in record[column.key]" :key="fileItem.id">
              <template v-if="fileItem.content" #content>
                <p v-if="fileItem.content.text">
                  {{ fileItem.content.text }}
                </p>
                <img
                  class="fileList_popover_pic"
                  v-else-if="fileItem.content.pic"
                  :src="fileItem.content.pic"
                />
              </template>
              <div class="fileList_download_btn" @click="linkColumnEventHandler(column, record)">
                {{ fileItem.name }}
              </div>
            </a-popover>
          </div>
        </template>
        <template v-else-if="column.type === 'formItem'">
          <a-switch
            v-if="column.formItemConfig.type === 'switch'"
            :disabled="record[ctxSymbol.for('formItemDisable')]"
            v-model:checked="formData[record[props.rowKeyName]][column.key]"
            @change="(e) => formItemInputEventHandler(column, record, e)"
            v-bind="column.formItemConfig.attrs"
          />
          <a-checkbox
            v-if="column.formItemConfig.type === 'checkbox'"
            :disabled="record[ctxSymbol.for('formItemDisable')]"
            v-model:checked="formData[record[props.rowKeyName]][column.key]"
            @change="(e) => formItemInputEventHandler(column, record, e)"
            v-bind="column.formItemConfig.attrs"
          >
            {{ column.attrs.label }}
          </a-checkbox>
          <a-input
            v-else-if="column.formItemConfig.type === 'input'"
            :disabled="record[ctxSymbol.for('formItemDisable')]"
            v-model:value="formData[record[props.rowKeyName]][column.key]"
            @change="(e) => formItemInputEventHandler(column, record, e)"
            v-bind="column.formItemConfig.attrs"
          />
          <a-input-number
            v-else-if="column.formItemConfig.type === 'number'"
            :disabled="record[ctxSymbol.for('formItemDisable')]"
            v-model:value="formData[record[props.rowKeyName]][column.key]"
            @change="(e) => formItemInputEventHandler(column, record, e)"
            v-bind="column.formItemConfig.attrs"
          />
          <a-select
            v-else-if="column.formItemConfig.type === 'select'"
            :disabled="record[ctxSymbol.for('formItemDisable')]"
            v-model:value="formData[record[props.rowKeyName]][column.key]"
            :options="column.options"
            @change="(e) => formItemInputEventHandler(column, record, e)"
            v-bind="column.formItemConfig.attrs"
          />
          <a-tree-select
            v-else-if="column.formItemConfig.type === 'treeSelect'"
            :disabled="record[ctxSymbol.for('formItemDisable')]"
            v-model:value="formData[record[props.rowKeyName]][column.key]"
            :tree-data="column.options"
            :dropdown-style="{ maxHeight: '400px', overflow: 'auto' }"
            @change="(e) => formItemInputEventHandler(column, record, e)"
            v-bind="column.formItemConfig.attrs"
          />
        </template>
        <template v-else-if="column.type === 'operater' && column.list">
          <template v-for="operaterItem in column.list" :key="operaterItem.key">
            <template v-if="record[ctxSymbol.for(`operater-${operaterItem.key}-show`)]">
              <a-button
                v-if="!['confirm', 'formItemOperater'].includes(operaterItem.type)"
                type="link"
                size="small"
                v-bind="operaterItem.attrs"
                @click="operaterItemEventHandler(operaterItem, record)"
              >
                {{ operaterItem.text }}
              </a-button>
              <template v-else-if="operaterItem.type === 'formItemOperater'">
                <a-button
                  v-if="record[ctxSymbol.for('formItemDisable')]"
                  type="link"
                  size="small"
                  @click="operaterItemEventHandler(operaterItem, record, 'entry')"
                >
                  {{ operaterItem.text }}
                </a-button>
                <template v-else>
                  <a-button
                    type="link"
                    size="small"
                    @click="operaterItemEventHandler(operaterItem, record, 'submit')"
                    :loading="record[ctxSymbol.for('operater-formItemOperater-loading')]"
                  >
                    保存
                  </a-button>
                  <a-button
                    type="link"
                    size="small"
                    @click="operaterItemEventHandler(operaterItem, record, 'exit')"
                  >
                    取消
                  </a-button>
                </template>
              </template>
              <a-popconfirm
                v-else-if="operaterItem.type === 'confirm'"
                :title="`是否确认${operaterItem.text}`"
                :ok-text="operaterItem?.confirm.text || '确认'"
                :cancel-text="operaterItem?.cancel?.text || '取消'"
                v-bind="operaterItem.attrs"
                @confirm="operaterItemEventHandler(operaterItem, record, 'confirm')"
                @cancel="operaterItemEventHandler(operaterItem, record, 'cancel')"
              >
                <a-button v-bind="operaterItem.buttonAttrs">
                  {{ operaterItem.text }}
                </a-button>
              </a-popconfirm>
            </template>
          </template>
        </template>
      </template>
    </a-table>
    <a-pagination
      v-if="props.showPagination"
      class="pagination"
      v-model:current="pageNum"
      v-model:pageSize="pageSize"
      :total="totalNum"
      :pageSizeOptions="['10', '20', '50', '100']"
      :showSizeChanger="true"
      :showQuickJumper="true"
      :showTotal="(total, range) => `共${total}条，当前第${range[0]}-${range[1]}条`"
      v-bind="props.paginationConfig"
    />
  </div>
</template>
<script setup>
  import { computed, useAttrs } from 'vue';
  import { useRecordList, recordListProps, recordListEmits } from '../../common/index.js';

  const props = defineProps(recordListProps);
  const attrs = useAttrs();
  const emits = defineEmits(recordListEmits);
  const ctxSymbol = Symbol;
  const setFilterList = (columnItem, columnList) => {
    if (getVarType(columnItem.getFilterList) === 'asyncFunction') {
      columnItem.getFilterList().then((filtersList) => {
        columnItem.filters = filtersList;
      });
    } else if (getVarType(columnItem.getFilterList) === 'function') {
      const filtersList = columnItem.getFilterList();
      columnItem.filters = filtersList;
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
  } = useRecordList({ ...toRefs(props), ...attrs }, emits, setFilterList);
  const recordListSelectModeProps = {
    columnTitle: '选择',
    columnWidth: 50,
    fixed: true,
    selectedRowKeys: computed(() => props.selectedRows.map((row) => row[props.rowKeyName])),
    onChange: (rowKeys, rows) => {
      emits('selectRows', { rows, pageNum: pageNum.value });
    },
  };
  const recordListFiltersInfo = {};
  //const recordListSortInfo = {};
  let recordListSortInfo = {};
  const recordListChangeEvent = (pagination, filters, sorter, { currentDataSource }) => {
    console.log('列表排序', sorter);
    console.log('列表筛查', filters);
    if (filters) {
      for (const columnKey of Object.keys(filters)) {
        if (filters[columnKey]) {
          recordListFiltersInfo[columnKey] = filters[columnKey];
        } else if (Reflect.has(recordListFiltersInfo, columnKey)) {
          Reflect.deleteProperty(recordListFiltersInfo, columnKey);
        }
      }
    }
    if (Object.keys(recordListFiltersInfo).length) {
      setFilterParams(recordListFiltersInfo);
    } else {
      clearFilterParams();
    }
    if (filters) {
      setFilterParams(filters);
    } else {
      clearFilterParams();
    }

    if (sorter.order) {
      recordListSortInfo[sorter.columnKey] = sorter.order === 'ascend' ? 'asc' : 'desc';
    } else {
      recordListSortInfo = {};
    } /* else if (Reflect.has(recordListSortInfo, sorter.columnKey)) {
      Reflect.deleteProperty(recordListSortInfo, sorter.columnKey);
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
    display: flex;
    justify-content: flex-end;
    margin-top: 15px;
  }
  .link {
    cursor: pointer;
    color: #1890ff;
    font-size: 14px;
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
