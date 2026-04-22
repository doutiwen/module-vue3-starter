<template>
  <ToolBar
    v-if="props.toolBarConfig"
    :config="props.toolBarConfig"
    v-on="toolBarEventsHandler"
    :ref="setToolBarRef"
  >
    <template v-for="item in customToolBarItems" :key="item.key" #[item.key]>
      <slot :name="`toolBar-${item.key}`"></slot>
    </template>
  </ToolBar>
  <RecordList
    :selectMode="selectMode"
    :selectedRows="currentPageSelectedRows"
    :columnsConfig="props.recordListConfig.columnsConfig"
    v-on="recordListEventsHandler"
    :ref="setRecordListRef"
    v-bind="{ ...props.recordListConfig, ...attrs }"
  >
    <template
      v-for="customColumn in customRecordListColumns"
      :key="customColumn.key"
      #[`recordListColumn-${customColumn.key}`]="{ rowData, colData }"
    >
      <slot
        :name="`recordListColumn-${customColumn.key}`"
        :rowData="rowData"
        :colData="colData"
      ></slot>
    </template>
  </RecordList>
  <Modal
    :config="props.modalConfig"
    v-if="props.modalConfig"
    v-on="modalEventsHandler"
    :ref="setModalRef"
  >
    <template
      v-for="modalItem in props.modalConfig"
      :key="modalItem.key"
      #[`modal-${modalItem.key}`]="{ data, modalClose, setFormRef }"
    >
      <slot
        :name="`modal-${modalItem.key}`"
        :data="data"
        :modalClose="modalClose"
        :setFormRef="setFormRef"
        :setRecordListRef="setRecordListRef"
      ></slot>
    </template>
  </Modal>
</template>
<script setup>
  import ToolBar from './toolBar/index.vue';
  import RecordList from './recordList/index.vue';
  import Modal from '@/components/AdvModals/core/ele/index.vue';
  import { useRecordsManager, recordsManagerProps } from '../common/index.js';

  const props = defineProps(recordsManagerProps);
  const attrs = useAttrs();

  const {
    selectMode,
    currentPageSelectedRows,
    customRecordListColumns,
    customToolBarItems,
    setToolBarRef,
    setRecordListRef,
    setModalRef,
    toolBarEventsHandler,
    recordListEventsHandler,
    modalEventsHandler,
    defineExposeConfig,
  } = useRecordsManager(props, attrs);

  defineExpose(defineExposeConfig);
</script>
