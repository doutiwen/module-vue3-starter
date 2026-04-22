const recordsManagerProps = {
  toolBarConfig: {
    type: Object,
  },
  recordListConfig: {
    type: Object,
    required: true,
  },
  modalConfig: {
    type: Array,
  },
};

const useRecordsManager = (props, attrs) => {
  const toolBarRef = ref();
  const setToolBarRef = (ref) => {
    toolBarRef.value = ref;
  };
  const recordListRef = ref();
  const setRecordListRef = (ref) => {
    recordListRef.value = ref;
  };
  const modalRef = ref();
  const setModalRef = (ref) => {
    modalRef.value = ref;
  };

  const selectMode = ref(false);
  const currentPageSelectedRows = ref([]);

  const customRecordListColumns = computed(() => {
    return toValue(props.recordListConfig.columnsConfig).filter((i) => i.type === 'custom');
  });

  const customToolBarItems = computed(() => {
    return toValue(props.toolBarConfig.list).filter((i) => i.type === 'custom');
  });

  const toolBarEventsHandler = {
    enterBatchMode: () => {
      selectMode.value = true;
    },
    exitBatchMode: () => {
      selectMode.value = false;
      currentPageSelectedRows.value = [];
    },
    search: ({ callback, searchParams }) => {
      recordListRef.value.search({ searchParams }).finally(() => {
        callback && callback();
      });
    },
    openModal: ({ key, data, title }) => {
      modalRef.value.openModal(key, data, title);
    },
  };

  const recordListEventsHandler = {
    getBatchList: (pageNum) => {
      console.log('getBatchList事件', toolBarRef.value.getBatchSelectList(pageNum));
      currentPageSelectedRows.value = toolBarRef.value.getBatchSelectList(pageNum);
    },
    selectRows: ({ rows, pageNum }) => {
      currentPageSelectedRows.value = rows;
      toolBarRef.value.editBatchSelectList(rows, pageNum);
    },
    clearBatch: () => {
      toolBarRef.value.clearBatchModeState();
    },
    openModal: ({ key, data, title }) => {
      modalRef.value.openModal(key, data, title);
    },
    getSearchParams: (setSearchParams) => {
      setSearchParams(toolBarRef.value.getSearchParams());
    },
  };

  const modalEventsHandler = {
    refreshRecordList: () => {
      recordListRef.value.search();
    },
    modalOpen: ({ key, data }) => {},
    modalClose: ({ key, data }) => {},
  };

  const defineExposeConfig = {
    getBatchSelectList: () => {
      return toolBarRef.value.getBatchSelectList();
    },
    getToolBarParams: () => {
      return toolBarRef.value.getSearchParams();
    },
    getRecordListList: () => {
      return recordListRef.value.getRecordListList();
    },
    searchParamsClear: () => {
      toolBarRef.value.searchParamsClear();
    },
    search: ({ callback, otherParams, customParams }) => {
      recordListRef.value.search({ otherParams, customParams }).finally(() => {
        callback && callback();
      });
    },
    getModalData: (key) => {
      return modalRef.value.getModalData(key);
    },
  };

  return {
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
  };
};

export { recordsManagerProps, useRecordsManager };
