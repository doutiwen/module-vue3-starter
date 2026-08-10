<template>
  <!-- 记录管理器容器 -->
  <div class="adv_records_manager_wrapper">
    <!-- 工具栏组件 -->
    <ToolBar
      v-if="props.toolBarConfig"
      :config="props.toolBarConfig"
      v-on="toolBarEventsHandler"
      :ref="setToolBarRef"
    >
      <!-- 工具栏插槽：toolBar-item-* 前缀 -->
      <template v-for="(_, name) in toolBarSlots" :key="name" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps || {}"></slot>
      </template>
    </ToolBar>

    <!-- 表格列表组件：根据 virtualScroll 属性切换 -->
    <RecordListV2
      v-if="props.virtualScroll"
      :selectMode="selectMode"
      :columnsConfig="props.recordListConfig.columnsConfig"
      v-on="recordListEventsHandler"
      :ref="setRecordListRef"
      v-bind="{ ...props.recordListConfig, ...attrs }"
    >
      <!-- 表格列表插槽：recordList-* 前缀 -->
      <template v-for="(_, name) in recordListSlots" :key="name" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps || {}"></slot>
      </template>
    </RecordListV2>
    <RecordList
      v-else
      :selectMode="selectMode"
      :columnsConfig="props.recordListConfig.columnsConfig"
      v-on="recordListEventsHandler"
      :ref="setRecordListRef"
      v-bind="{ ...props.recordListConfig, ...attrs }"
    >
      <!-- 表格列表插槽：recordList-* 前缀 -->
      <template v-for="(_, name) in recordListSlots" :key="name" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps || {}"></slot>
      </template>
    </RecordList>
  </div>

  <!-- 弹窗组件 -->
  <Modal
    :config="mergedModalConfig"
    v-if="mergedModalConfig"
    v-on="modalEventsHandler"
    :ref="setModalRef"
  >
    <template v-for="(_, name) in modalSlots" :key="name" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps"></slot>
    </template>
  </Modal>
</template>

<script setup>
  /**
   * RecordsManager 核心记录管理器组件（Ant Design Vue 版本）
   *
   * 【组件功能】
   * 集成工具栏、表格列表、弹窗三大模块的核心记录管理组件，
   * 负责协调各模块之间的通信和状态管理。
   *
   * 【组件架构】
   * RecordsManager (当前组件)
   *   ├── ToolBar (Ant Design Vue 工具栏组件)
   *   ├── RecordList / RecordListV2 (Ant Design Vue 表格列表组件)
   *   └── Modal (Ant Design Vue 弹窗组件)
   *
   * 【核心特性】
   * 1. 模块解耦：工具栏、表格、弹窗各自独立，通过事件通信
   * 2. 插槽分发：根据插槽名称前缀自动分发到对应模块
   * 3. 状态共享：通过 useRecordsManager hook 共享状态和方法
   * 4. 批量选择：支持跨页批量选择功能
   *
   * 【插槽说明】
   * | 插槽名前缀 | 说明 | 示例 |
   * |-----------|------|------|
   * | toolBar-item-* | 工具栏按钮自定义内容 | toolBar-item-searchBtn-search |
   * | recordList-column-* | 表格列自定义渲染 | recordList-column-status |
   * | modal-* | 弹窗内容自定义渲染 | modal-info-content |
   */

  import { useSlots, computed, useAttrs } from 'vue';
  import ToolBar from './toolBar.jsx';
  import RecordList from './recordList.vue';
  import RecordListV2 from './recordListV2.vue';
  import Modal from '@/components/AdvModals/core/ant/index.jsx';
  import {
    useRecordsManager,
    recordsManagerProps,
    recordsManagerEmits,
  } from '../common/recordsManager.js';

  /**
   * 组件属性定义
   */
  const props = defineProps(recordsManagerProps);

  /**
   * 非 props 属性
   */
  const attrs = useAttrs();

  /**
   * 插槽对象
   */
  const slots = useSlots();

  /**
   * 组件事件定义
   */
  const emits = defineEmits(recordsManagerEmits);

  /**
   * 工具栏插槽集合（toolBar-* 前缀）
   */
  const toolBarSlots = computed(() => {
    const result = {};
    for (const [name, fn] of Object.entries(slots)) {
      if (name.startsWith('toolBar-')) {
        result[name] = fn;
      }
    }
    return result;
  });

  /**
   * 表格列表插槽集合（recordList-* 前缀）
   */
  const recordListSlots = computed(() => {
    const result = {};
    for (const [name, fn] of Object.entries(slots)) {
      if (name.startsWith('recordList-')) {
        result[name] = fn;
      }
    }
    return result;
  });

  /**
   * 弹窗插槽集合（modal-* 或 form-* 前缀）
   */
  const modalSlots = computed(() => {
    const result = {};
    for (const [name, fn] of Object.entries(slots)) {
      if (name.startsWith('modal-') || name.startsWith('form-')) {
        result[name] = fn;
      }
    }
    return result;
  });

  /**
   * 使用记录管理器 hook，获取状态和事件处理器
   */
  const {
    selectMode,
    mergedModalConfig,
    setToolBarRef,
    setRecordListRef,
    setModalRef,
    toolBarEventsHandler,
    recordListEventsHandler,
    modalEventsHandler,
    defineExposeConfig,
  } = useRecordsManager(props, attrs, emits);

  /**
   * 暴露方法给父组件
   */
  defineExpose(defineExposeConfig);
</script>

<style scoped lang="scss">
  /**
   * 记录管理器容器样式
   */
  .adv_records_manager_wrapper {
    height: 100%;
    flex-direction: column;
    display: flex;
    /* 第二个子元素（表格）占满剩余空间 */
    > *:nth-child(2) {
      height: 1px;
      flex: 1;
    }
  }
</style>
