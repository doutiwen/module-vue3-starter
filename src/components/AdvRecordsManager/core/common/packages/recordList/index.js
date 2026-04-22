const recordListProps = {
  getList: {
    type: Function,
    required: true,
  },
  columnsConfig: {
    type: Array,
    required: true,
  },
  selectMode: {
    type: Boolean,
    default: false,
  },
  selectedRows: {
    type: Array,
    default: () => [],
  },
  rowKeyName: {
    type: String,
    default: 'id',
  },
  attrs: {
    type: Object,
    default: () => ({}),
  },
  events: {
    type: Object,
    default: () => ({}),
  },
  paginationConfig: {
    type: Object,
    default: () => ({}),
  },
  formItemActive: {
    type: Boolean,
    default: false,
  },
  showPagination: {
    type: Boolean,
    default: true,
  },
  style: {
    type: String,
  },
  otherParams: {
    type: Object,
  },
};
const recordListEmits = [
  'getBatchList',
  'selectRows',
  'clearBatch',
  'openModal',
  'getSearchParams',
];

const useRecordList = (
  { getList, columnsConfig, selectMode, rowKeyName, formItemActive, otherParams },
  emits,
  setFilterList
) => {
  const state = {
    columns: ref([]),
    list: ref([]),
    listDict: computed(() => {
      const dictInfo = {};
      for (const rowItem of state.list.value) {
        dictInfo[rowItem[toValue(rowKeyName)]] = rowItem;
      }
      return dictInfo;
    }),
    pageNum: ref(1),
    pageSize: ref(20),
    totalNum: ref(0),
    loading: ref(false),
    formData: ref({}),
    filterParams: null,
    sorterParams: null,
    searchParams: null,
    formItemHasOperater: false,
  };

  watchEffect(() => {
    state.columns.value = toValue(columnsConfig).map((sourceCol) => {
      const targetCol = { ...sourceCol };
      if (targetCol.getFilterList) {
        setFilterList(targetCol, state.columns);
      }
      return targetCol;
    });
  });

  const setFilterParams = (filterParams) => {
    state.filterParams = filterParams;
  };
  const clearFilterParams = () => {
    state.filterParams = null;
  };
  const setSorterParams = (sorterParams) => {
    state.sorterParams = sorterParams;
  };
  const clearSorterParams = () => {
    state.sorterParams = null;
  };
  const getRecordListList = () => {
    return state.list.value;
  };
  const addRowToList = (rowData) => {
    if (state.list.value.length < state.pageSize) {
      state.list.value.push(listFormat([rowData]));
    }
  };
  const deleteRow = (data) => {
    if (typeof data === 'object') {
      const index = state.list.value.findIndex(
        (i) => i[toValue(rowKeyName)] === data[toValue(rowKeyName)]
      );
      if (typeof index === 'number') {
        state.list.value.splice(index, 1);
      }
    } else if (typeof data === 'number' && data < state.list.value.length) {
      state.list.value.splice(data, 1);
    }
  };
  const download = ({ url, name }) => {
    const aEle = document.createElement('a');
    aEle.href = url;
    aEle.download = name;
    aEle.style.display = 'none';
    document.body.appendChild(aEle);
    aEle.click();
    aEle.parentNode.removeChild(aEle);
  };
  const setFormData = (key, sourceValue, rowKeyValue, formConfig) => {
    let value = sourceValue;
    if (formConfig.set) {
      value = formConfig.set(sourceValue, key);
    }
    if (!state.formData.value[rowKeyValue]) {
      state.formData.value[rowKeyValue] = { [key]: value };
    } else {
      state.formData.value[rowKeyValue][key] = value;
    }
  };
  const listFormat = (sourceList) => {
    return sourceList.map((sourceRowItem, rowIndex) => {
      const targetItem = { ...sourceRowItem, [Symbol.for('index')]: rowIndex + 1 };
      let operaterCol;
      for (const colItem of state.columns.value) {
        const key = colItem.key;
        const sourceValue = sourceRowItem[key];
        if (colItem.get) {
          if (getVarType(colItem.get) === 'asyncFunction') {
            colItem.get(sourceValue, rowIndex, sourceRowItem).then((res) => {
              targetItem[key] = res;
            });
          } else {
            targetItem[key] = colItem.get(sourceValue, rowIndex, sourceRowItem);
          }
        }
        if (colItem.type === 'formItem') {
          setFormData(key, sourceValue, sourceRowItem[toValue(rowKeyName)], colItem.formItemConfig);
          targetItem[Symbol.for('formItemDisable')] = toValue(toValue(formItemActive))
            ? false
            : true;
          if (!targetItem[Symbol.for('formItemDebounceTimer')]) {
            targetItem[Symbol.for('formItemDebounceTimer')] = { [key]: null };
          } else {
            Object.assign(targetItem[Symbol.for('formItemDebounceTimer')], {
              [key]: null,
            });
          }
        }
        if (colItem.type === 'operater') {
          operaterCol = colItem;
        }
      }
      if (operaterCol?.list) {
        for (const operaterItem of operaterCol.list) {
          if (operaterItem.type !== 'formItemOperater') {
            if (operaterItem.show) {
              let showFn;
              if (typeof operaterItem.show === 'string') {
                if (/[><=]/.test(operaterItem.show)) {
                  const codeString = `return ${operaterItem.show.replace(
                    /(\w+)(<=?|>=?|==)/g,
                    'rowData.$1$2'
                  )}`;
                  showFn = new Function('rowData', codeString);
                } else {
                  const codeString = `return !!rowData.${operaterItem.show}`;
                  const showFn = new Function('rowData', codeString);
                }
              } else if (typeof operaterItem.show === 'function') {
                showFn = operaterItem.show;
              }
              targetItem[Symbol.for(`operater-${operaterItem.key}-show`)] = showFn(
                sourceRowItem,
                rowIndex
              );
            } else {
              targetItem[Symbol.for(`operater-${operaterItem.key}-show`)] = true;
            }
          } else {
            targetItem[Symbol.for(`operater-${operaterItem.key}-show`)] = true;
            state.formItemHasOperater = true;
            targetItem[Symbol.for('operater-formItemOperater-loading')] = false;
          }
        }
      }

      return targetItem;
    });
  };
  const getListData = async (customParams) => {
    state.loading.value = true;
    const getListFnParams = {
      pageParams: { pageNum: state.pageNum.value, pageSize: state.pageSize.value },
    };
    state.searchParams && (getListFnParams.searchParams = state.searchParams);
    state.sorterParams && (getListFnParams.sorterParams = state.sorterParams);
    state.filterParams && (getListFnParams.filterParams = state.filterParams);
    toValue(otherParams) && (getListFnParams.otherParams = toValue(otherParams));
    customParams && (getListFnParams.customParams = customParams);
    for (const paramsType of Object.keys(getListFnParams)) {
      for (const key of Object.keys(getListFnParams[paramsType])) {
        if (!notEmptyValue(getListFnParams[paramsType][key])) {
          Reflect.deleteProperty(getListFnParams[paramsType], key);
        }
      }
      if (!Object.keys(getListFnParams[paramsType]).length) {
        Reflect.deleteProperty(getListFnParams, paramsType);
      }
    }
    if (getVarType(toValue(getList)) === 'asyncFunction') {
      toValue(getList)(getListFnParams)
        .then(({ list, total }) => {
          state.list.value = listFormat(list);
          state.totalNum.value = total;
        })
        .finally(() => {
          state.loading.value = false;
        });
    } else {
      const { list, total } = toValue(getList)(getListFnParams);
      state.list.value = listFormat(list);
      state.totalNum.value = total;
      state.loading.value = false;
    }
  };
  const editRowData = (keyValue, data) => {
    const targetRow = state.list.value.find((i) => i[toValue(rowKeyName)] === keyValue);
    if (targetRow) {
      Object.assign(targetRow, data);
    }
  };
  const exceformItemFn = (columnItem, rowData) => {
    const index = state.list.value.findIndex(
      (i) => i[toValue(rowKeyName)] === rowData[toValue(rowKeyName)]
    );
    if (getVarType(columnItem.fn) === 'asyncFunction') {
      columnItem
        .fn(rowData)
        .then((resetList) => {
          if (columnItem.get) {
            state.list.value[index][columnItem.key] = columnItem.get(
              state.formData.value[rowData[toValue(rowKeyName)]][columnItem.key],
              index,
              rowData
            );
          } else {
            state.list.value[index][columnItem.key] =
              state.formData.value[rowData[toValue(rowKeyName)]][columnItem.key];
          }
          if (resetList) {
            getListData();
          }
        })
        .catch(() => {
          setFormData(
            columnItem.key,
            rowData[columnItem.key],
            rowData[toValue(rowKeyName)],
            columnItem.formItemConfig
          );
        });
    } else {
      const resetList = columnItem.fn(rowData);
      if (resetList) {
        getListData();
      }
    }
  };
  const formItemInputEventHandler = (columnItem, rowData, sourceEvent) => {
    const formItemConfig = columnItem.formItemConfig;
    if (!state.formItemHasOperater && columnItem.fn && !rowData[Symbol.for('formItemDisable')]) {
      if (columnItem.debounce || formItemConfig.type === 'input') {
        const rowkeyValue = rowData[toValue(rowKeyName)];
        const time = columnItem.debounce || 2000;
        if (rowData[Symbol.for('formItemDebounceTimer')][columnItem.key]) {
          clearTimeout(rowData[Symbol.for('formItemDebounceTimer')][columnItem.key]);
        }
        rowData[Symbol.for('formItemDebounceTimer')][columnItem.key] = setTimeout(() => {
          exceformItemFn(columnItem, rowData);
          rowData[Symbol.for('formItemDebounceTimer')][columnItem.key] = null;
        }, time);
      } else {
        exceformItemFn(columnItem, rowData);
      }
    }
  };
  const operaterItemEventHandler = (operaterItem, rowData, payload) => {
    switch (operaterItem.type) {
      case 'openModal': {
        emits('openModal', {
          key: operaterItem.key,
          data: rowData,
        });
        break;
      }
      case 'button': {
        if (operaterItem.fn) {
          operaterItem.fn(rowData);
        }
        break;
      }
      case 'confirm': {
        const confirmType = payload;
        switch (payload) {
          case 'confirm': {
            if (operaterItem?.confirm.fn) {
              if (getVarType(operaterItem.confirm.fn) === 'asyncFunction') {
                operaterItem.confirm.fn(rowData).then((resetList) => {
                  resetList && getListData();
                });
              } else {
                const resetList = operaterItem.confirm.fn(rowData);
                resetList && getListData();
              }
            }
            break;
          }
          case 'cancel': {
            if (operaterItem?.cancel?.fn) {
              operaterItem.cancel.fn(rowData);
            }
            break;
          }
        }
        break;
      }
      case 'download': {
        operaterItem.fn(rowData).then(({ url, name }) => {
          download({ url, name });
        });
        break;
      }
      case 'formItemOperater': {
        const operateType = payload;
        if (operateType === 'entry') {
          editRowData(rowData[toValue(rowKeyName)], {
            [Symbol.for('formItemDisable')]: false,
          });
        } else if (operateType === 'exit') {
          editRowData(rowData[toValue(rowKeyName)], {
            [Symbol.for('formItemDisable')]: true,
          });
          for (const formItemKey of Object.keys(
            state.formData.value[rowData[toValue(rowKeyName)]]
          )) {
            setFormData(
              formItemKey,
              rowData[formItemKey],
              rowData[toValue(rowKeyName)],
              state.columns.value.find((i) => i.key === formItemKey).formItemConfig
            );
          }
        } else if (operateType === 'submit') {
          editRowData(rowData[toValue(rowKeyName)], {
            [Symbol.for('operater-formItemOperater-loading')]: true,
          });
          operaterItem
            .fn(rowData)
            .then((resetList) => {
              const newRowData = {};
              for (const formItemKey of Object.keys(
                state.formData.value[rowData[toValue(rowKeyName)]]
              )) {
                newRowData[formItemKey] =
                  state.formData.value[rowData[toValue(rowKeyName)]][formItemKey];
              }
              resetList ? getListData() : editRowData(rowData[toValue(rowKeyName)], newRowData);
            })
            .catch(() => {
              for (const formItemKey of Object.keys(
                state.formData.value[rowData[toValue(rowKeyName)]]
              )) {
                setFormData(
                  formItemKey,
                  rowData[formItemKey],
                  rowData[toValue(rowKeyName)],
                  state.columns.value.find((i) => i.key === formItemKey).formItemConfig
                );
              }
            })
            .finally(() => {
              rowData[Symbol.for('formItemDisable')] = true;
              rowData[Symbol.for('operater-formItemOperater-loading')] = false;
            });
        }
        break;
      }
    }
  };
  const linkColumnEventHandler = (linkConfig, rowData) => {
    switch (linkConfig.type) {
      case 'viewDetail': {
        if (!linkConfig.openType || linkConfig.openType === 'modal') {
          emits('openModal', {
            key: linkConfig.modalKey,
            data: rowData,
          });
        } else if (linkConfig.openType === 'window') {
          linkConfig.fn(rowData).then(({ url, name, param }) => {
            window.open(url, name, param);
          });
        }
        break;
      }
      case 'download': {
        linkConfig.fn(rowData).then(({ url, name }) => {
          download({ url, name });
        });
        break;
      }
    }
  };
  const search = async ({ customParams } = {}) => {
    toValue(selectMode) && emits('clearBatch');
    state.pageNum.value = 1;
    emits('getSearchParams', (searchParams) => {
      state.searchParams = toValue(searchParams);
    });
    await getListData(customParams);
  };
  watch(state.pageNum, () => {
    if (toValue(selectMode)) {
      console.log('列表切换页面', state.pageNum.value);
      emits('getBatchList', state.pageNum.value);
    }
    getListData();
  });
  watch(state.pageSize, () => {
    state.pageNum.value = 1;
    toValue(selectMode) && emits('clearBatch');
    getListData();
  });

  getListData();

  const defineExposeConfig = {
    search,
    addRowToList,
    getRecordListList,
  };

  return {
    list: state.list,
    columns: state.columns,
    pageNum: state.pageNum,
    pageSize: state.pageSize,
    totalNum: state.totalNum,
    loading: state.loading,
    formData: state.formData,
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
  };
};

export { recordListProps, recordListEmits, useRecordList };
