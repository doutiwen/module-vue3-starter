<template>
  <!-- 表格列表容器 -->
  <div
    :class="['record-list-wrapper', props.recordListWrapClass]"
    ref="tableBodyRef"
  >
    <!-- 虚拟滚动表格：Ant Design Vue a-table 原生支持大数据量虚拟滚动 -->
    <a-table
      :columns="antColumns"
      :data-source="list"
      :row-key="props.rowKeyName"
      :style="props.style"
      :scroll="{ y: wrapHeight, x: scrollWidth }"
      :loading="loading"
      :pagination="false"
      :row-selection="rowSelection"
      :row-expandable="rowExpandable"
      v-bind="props.attrs"
      ref="antTableRef"
      @change="tableChangeEvent"
    >
      <!-- 列自定义渲染插槽 -->
      <template #bodyCell="{ column, record, index }">
        <!-- 序号列 -->
        <span
          v-if="column.type === 'index'"
          :style="{
            paddingLeft: isTreeList
              ? `${((record[ctxSymbol.for('level')] || 1) - 1) * 12}px`
              : undefined,
          }"
        >
          {{ record[ctxSymbol.for('index')] }}
        </span>

        <!-- 自定义渲染列 -->
        <slot
          v-if="column.type === 'custom'"
          :name="`recordList-column-${column.key}`"
          :row-data="record"
          :col-data="record[column.key]"
        ></slot>

        <!-- 链接列 -->
        <a
          v-if="column.type === 'link'"
          @click="columnEventHandler(column, record)"
          style="color: #1890ff; cursor: pointer"
        >
          {{ record[column.key] }}
        </a>

        <!-- 弹窗列 -->
        <a
          v-if="column.type === 'openModal'"
          @click="columnEventHandler(column, record)"
          style="color: #1890ff; cursor: pointer"
          v-bind="column.attrs"
        >
          {{
            typeof column.text === 'function'
              ? column.text(record)
              : (column.text ?? record[column.key])
          }}
        </a>

        <!-- 可编辑表单项列 -->
        <template v-if="column.type === 'formItem'">
          <!-- 开关 -->
          <a-switch
            v-if="column.formItemConfig.type === 'switch'"
            :disabled="record[ctxSymbol.for('formItemDisable')]"
            :checked="formData[record[props.rowKeyName]][column.key]"
            @change="(e) => formItemInputEventHandler(column, record, e)"
            v-bind="column.formItemConfig.attrs"
          />
          <!-- 复选框 -->
          <a-checkbox
            v-if="column.formItemConfig.type === 'checkbox'"
            :disabled="record[ctxSymbol.for('formItemDisable')]"
            :checked="formData[record[props.rowKeyName]][column.key]"
            @change="(e) => formItemInputEventHandler(column, record, e)"
            v-bind="column.formItemConfig.attrs"
          >
            {{ column.attrs.label }}
          </a-checkbox>
          <!-- 输入框 -->
          <a-input
            v-else-if="column.formItemConfig.type === 'input'"
            :disabled="record[ctxSymbol.for('formItemDisable')]"
            :value="formData[record[props.rowKeyName]][column.key]"
            @change="(e) => formItemInputEventHandler(column, record, e)"
            v-bind="column.formItemConfig.attrs"
            allowClear
          />
          <!-- 数字输入框 -->
          <a-input-number
            v-else-if="column.formItemConfig.type === 'number'"
            :disabled="record[ctxSymbol.for('formItemDisable')]"
            :value="formData[record[props.rowKeyName]][column.key]"
            @change="(e) => formItemInputEventHandler(column, record, e)"
            v-bind="column.formItemConfig.attrs"
          />
          <!-- 下拉选择 -->
          <a-select
            v-else-if="column.formItemConfig.type === 'select'"
            :disabled="record[ctxSymbol.for('formItemDisable')]"
            :value="formData[record[props.rowKeyName]][column.key]"
            @change="(e) => formItemInputEventHandler(column, record, e)"
            v-bind="column.formItemConfig.attrs"
            allowClear
          >
            <a-select-option
              v-for="optionItem in column.options"
              :key="optionItem.value"
              :value="optionItem.value"
              :label="optionItem.label"
              v-bind="optionItem.optionAttrs"
            />
          </a-select>
          <!-- 树形选择 -->
          <a-tree-select
            v-else-if="column.formItemConfig.type === 'treeSelect'"
            :disabled="record[ctxSymbol.for('formItemDisable')]"
            :value="formData[record[props.rowKeyName]][column.key]"
            :tree-data="column.options"
            :dropdown-style="{ maxHeight: '400px', overflow: 'auto' }"
            @change="(e) => formItemInputEventHandler(column, record, e)"
            v-bind="column.formItemConfig.attrs"
          />
        </template>

        <!-- 操作列 -->
        <div class="operater_wrapper" v-if="column.type === 'operater'">
          <template v-for="operaterItem in column.list" :key="operaterItem.key">
            <template v-if="record[ctxSymbol.for(`operater-${operaterItem.key}-show`)]">
              <!-- 普通按钮操作 -->
              <a
                v-if="!['confirm', 'formItemOperater'].includes(operaterItem.type)"
                style="color: #1890ff; cursor: pointer; margin-right: 8px"
                v-bind="operaterItem.attrs"
                @click="() => operaterItemEventHandler(operaterItem, record)"
              >
                {{ operaterItem.text }}
              </a>

              <!-- 表单操作器 -->
              <template v-else-if="operaterItem.type === 'formItemOperater'">
                <a
                  v-if="record[ctxSymbol.for('formItemDisable')]"
                  style="color: #1890ff; cursor: pointer; margin-right: 8px"
                  @click="() => operaterItemEventHandler(operaterItem, record, 'entry')"
                >
                  {{ operaterItem.text }}
                </a>
                <template v-else>
                  <a
                    style="color: #1890ff; cursor: pointer; margin-right: 8px"
                    @click="() => operaterItemEventHandler(operaterItem, record, 'submit')"
                    :loading="record[ctxSymbol.for('operater-formItemOperater-loading')]"
                  >
                    保存
                  </a>
                  <a
                    style="color: #1890ff; cursor: pointer; margin-right: 8px"
                    @click="() => operaterItemEventHandler(operaterItem, record, 'exit')"
                  >
                    取消
                  </a>
                </template>
              </template>

              <!-- 确认操作 -->
              <a-popconfirm
                v-else-if="operaterItem.type === 'confirm'"
                :title="`是否确认${operaterItem.text}？`"
                :ok-text="operaterItem?.confirm?.text || '确认'"
                :cancel-text="operaterItem?.cancel?.text || '取消'"
                v-bind="operaterItem.attrs"
                @confirm="() => operaterItemEventHandler(operaterItem, record, 'confirm')"
                @cancel="() => operaterItemEventHandler(operaterItem, record, 'cancel')"
              >
                <a
                  style="color: #1890ff; cursor: pointer; margin-right: 8px"
                  v-bind="operaterItem.buttonAttrs"
                >
                  {{ operaterItem.text }}
                </a>
              </a-popconfirm>
            </template>
          </template>
        </div>

        <!-- 文件列表列 -->
        <template v-if="column.type === 'fileList'">
          <a-tooltip
            v-for="fileItem in record[column.key]"
            :key="fileItem.id"
            :title="fileItem.content?.text || ''"
          >
            <img
              v-if="fileItem.content?.pic"
              class="fileList_popover_pic"
              :src="fileItem.content.pic"
            />
            <span v-else>{{ fileItem.content?.text }}</span>
          </a-tooltip>
        </template>
      </template>
    </a-table>

    <!-- 分页组件 -->
    <a-pagination
      v-if="props.showPagination"
      class="pagination"
      v-model:current="pageNum"
      v-model:pageSize="pageSize"
      :total="totalNum"
      :page-size-options="[10, 20, 50, 100]"
      v-bind="props.paginationConfig"
      show-size-picker
      show-quick-jumper
      show-total="total, ranges"
    ></a-pagination>
  </div>
</template>

<script setup>
  /**
   * RecordListV2 - 虚拟滚动表格列表组件（Ant Design Vue 版本）
   *
   * 【组件功能】
   * 基于 Ant Design Vue a-table（内置虚拟滚动支持）封装的高级表格列表组件，
   * 适用于大数据量场景，支持多种列类型渲染、批量选择、树形展开、分页等功能。
   *
   * 【核心特性】
   * 1. 虚拟滚动：Ant Design Vue a-table 原生支持大数据量虚拟滚动
   * 2. 自适应高度：通过 ResizeObserver 自动适应容器大小
   * 3. 动态列渲染：根据 columnsConfig 配置动态生成表格列
   * 4. 批量选择：支持跨页批量选择
   * 5. 树形数据：支持树形数据展开（通过 children 字段自动检测）
   * 6. 插槽支持：支持通过插槽自定义列渲染
   *
   * 【与 RecordList 的区别】
   * - 自动启用虚拟滚动模式，适合 1000+ 行大数据量
   * - 自动支持树形数据展开（rowExpandable）
   * - 更精确的列宽度控制
   */

  import {
    nextTick,
    toRefs,
    toValue,
    watch,
    onMounted,
    onBeforeUnmount,
    shallowRef,
    ref,
    computed,
  } from 'vue';
  import { message, Modal } from 'ant-design-vue';
  import { useRecordList, recordListProps, recordListEmits } from '../common/recordList.js';

  /**
   * 组件属性定义
   */
  const props = defineProps(recordListProps);

  /**
   * 组件事件定义
   */
  const emits = defineEmits(recordListEmits);

  /**
   * Ant Design Vue 表格引用
   */
  const antTableRef = shallowRef();

  /**
   * 上下文符号，用于存储行级状态
   */
  const ctxSymbol = Symbol;

  /**
   * 非 props 属性
   */
  const attrs = useAttrs();

  /**
   * Ant Design Vue Modal.confirm 适配为 Promise 接口
   */
  const antMessageBox = {
    confirm: (content, title, options = {}) => {
      return new Promise((resolve, reject) => {
        Modal.confirm({
          title: title || '提示',
          content: content || '是否确认执行此操作？',
          okText: options.confirmButtonText || options.okText || '确认',
          cancelText: options.cancelButtonText || '取消',
          type: options.type || 'warning',
          ...(options.attrs || {}),
          onOk: () => resolve(),
          onCancel: () => reject('cancel'),
        });
      });
    },
  };

  /**
   * 设置列筛选列表
   */
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

  /**
   * 渲染已选中行回调（用于分页切换时恢复选中状态）
   */
  const renderSelectedRowCallback = (rows) => {
    const selectedKeys = rows.map((row) => row[props.rowKeyName]);
    selectedRowKeys.value = selectedKeys;
  };

  /**
   * 使用表格列表核心 hook
   */
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
    columnEventHandler,
    setFilterParams,
    clearFilterParams,
    setSorterParams,
    clearSorterParams,
    getListData,
    search,
    getRecordList,
    defineExposeConfig,
  } = useRecordList(
    { ...toRefs(props), ...attrs },
    emits,
    setFilterList,
    message.success,
    antMessageBox,
    renderSelectedRowCallback
  );

  /**
   * 已选中的行 keys
   */
  const selectedRowKeys = ref([]);

  /**
   * 当前数据是否为树形结构
   */
  const isTreeList = computed(() =>
    list.value.some((item) => Array.isArray(item.children) && item.children.length > 0)
  );

  /**
   * 行展开配置（仅在树形数据时启用）
   */
  const rowExpandable = computed(() => {
    if (!isTreeList.value) return undefined;
    return {
      expandedRowKeys: [],
      expandIcon: () => null, // 使用默认展开图标
    };
  });

  /**
   * Ant Design Vue 列配置转换
   */
  const antColumns = computed(() => {
    const result = [];
    for (const column of columns.value) {
      const antColumn = {
        title: column.title,
        dataIndex: column.key,
        key: column.key,
        width: column.width,
        type: column.type,
        align: column.align,
        fixed: column.fixed,
        // 保留原始列配置供 bodyCell 插槽使用
        ...column,
      };
      result.push(antColumn);
    }
    return result;
  });

  /**
   * 行选择配置
   */
  const rowSelection = computed(() => {
    if (!props.selectMode) return null;
    return {
      selectedRowKeys: selectedRowKeys.value,
      onChange: (keys, rows) => {
        selectedRowKeys.value = keys;
        emits('selectRows', { rows, pageNum: pageNum.value });
      },
      getCheckboxProps: (record) => ({
        disabled: props.selectable ? !props.selectable(record) : false,
      }),
    };
  });

  /**
   * 滚动宽度（用于横向滚动）
   */
  const scrollWidth = computed(() => {
    const totalWidth = columns.value.reduce((sum, col) => {
      const w = col.width;
      if (typeof w === 'number') return sum + w;
      if (typeof w === 'string' && !isNaN(Number(w))) return sum + Number(w);
      return sum + 150; // 默认列宽
    }, 0);
    // 最小宽度保证可横向滚动
    return Math.max(totalWidth, 800);
  });

  /**
   * 表格变化事件（排序、筛选）
   */
  const tableChangeEvent = (pagination, filters, sorter) => {
    // 排序处理
    if (sorter.order) {
      const sorterParams = {
        [sorter.field]: sorter.order === 'ascend' ? 'asc' : 'desc',
      };
      setSorterParams(sorterParams);
    } else {
      clearSorterParams();
    }

    // 筛选处理
    const filterParams = {};
    for (const key of Object.keys(filters)) {
      if (filters[key] && filters[key].length) {
        filterParams[key] = filters[key];
      }
    }
    if (Object.keys(filterParams).length) {
      setFilterParams(filterParams);
    } else {
      clearFilterParams();
    }
    search();
  };

  /**
   * 监听选择模式变化
   */
  watch(
    () => props.selectMode,
    (n) => {
      if (!n) {
        selectedRowKeys.value = [];
      }
    }
  );

  /**
   * 暴露方法给父组件
   */
  defineExpose({
    ...defineExposeConfig,
    /**
     * 获取已选中的行 keys
     */
    getSelectedRowKeys: () => selectedRowKeys.value,
  });

  /**
   * 表格容器尺寸自适应
   */
  const tableBodyRef = shallowRef();
  const wrapHeight = ref();
  const setWrapHeight = () => {
    if (tableBodyRef.value) {
      // 减去分页组件高度 (56px) 和可能的边距
      const totalHeight = tableBodyRef.value.clientHeight;
      wrapHeight.value = props.showPagination ? totalHeight - 56 : totalHeight;
    }
  };

  let setWrapHeightThrottleTimer;
  const setWrapHeightThrottle = () => {
    if (!setWrapHeightThrottleTimer) {
      setWrapHeightThrottleTimer = setTimeout(() => {
        setWrapHeight();
        setWrapHeightThrottleTimer = null;
      }, 300);
    }
  };

  let wrapResizeObserver;
  onMounted(() => {
    nextTick(() => {
      setWrapHeight();
    });
    // 监听容器尺寸变化
    if (tableBodyRef.value) {
      wrapResizeObserver = new ResizeObserver(() => {
        setWrapHeightThrottle();
      });
      wrapResizeObserver.observe(tableBodyRef.value);
    }
    window.addEventListener('resize', setWrapHeightThrottle);
  });

  onBeforeUnmount(() => {
    wrapResizeObserver?.disconnect();
    window.removeEventListener('resize', setWrapHeightThrottle);
  });
</script>

<style lang="scss" scoped>
  /**
   * 分页组件样式
   */
  .pagination {
    margin-top: 15px;
    justify-content: flex-end;
    text-align: right;
  }

  /**
   * 文件列表弹出框图片样式
   */
  .fileList_popover_pic {
    width: 100%;
    display: block;
  }

  /**
   * 操作列按钮样式
   */
  .operater_wrapper {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
  }
</style>
