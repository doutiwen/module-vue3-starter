const toolBarProps = {
  config: {
    type: Object,
    required: true,
  },
};
const toolBarEmits = ['enterBatchMode', 'exitBatchMode', 'openModal', 'focus', 'blur', 'search'];

const useToolBar = ({ config }, emits, UIAttrsTransform) => {
  const state = {
    toolBarItemlist: ref([]),
    toolBarItemDict: computed(() => {
      const dictInfo = {};
      for (const item of state.toolBarItemlist.value) {
        dictInfo[item.key] = item;
      }
      return dictInfo;
    }),
    formData: ref({}),
    batchInfo: ref({}),
    currentBatchInfo: ref(),
    buttonLoadingInfo: ref({}),
    toolBarFormItemFocus: ref(false),
    watchManager: new WatchManager(),
    currentProcessItem: null,
    oldToolBarItemsInfo: null,
    UIAttrsTransform: UIAttrsTransform,
  };
  const isFormItemType = (type) => {
    return ['input', 'select', 'date', 'date-time', 'radio', 'checkbox'].includes(type);
  };
  const isOwnOptionsType = (type) => {
    return ['select', 'treeSelect', 'radio', 'checkbox'].includes(type);
  };
  const isButtonType = (type) => {
    return ['button', 'searchButton', 'import'].includes(type);
  };
  const toolBarItemConfigFormat = (sourceItem) => {
    Object.assign(state.currentProcessItem, { show: true });
    if (state.UIAttrsTransform) {
      state.currentProcessItem.attrs = state.UIAttrsTransform(sourceItem.attrs);
    } else if (!sourceItem.attrs) {
      if (sourceItem.type === 'input') {
        state.currentProcessItem.attrs = { style: 'width:220px;' };
      } else if (['select'].includes(sourceItem.type)) {
        state.currentProcessItem.attrs = { style: 'width:180px;' };
      } else {
        state.currentProcessItem.attrs = {};
      }
    } else if (sourceItem.attrs && !sourceItem.attrs.style) {
      if (sourceItem.type === 'input') {
        state.currentProcessItem.attrs = { ...sourceItem.attrs, style: 'width:220px;' };
      } else if (['select'].includes(sourceItem.type)) {
        state.currentProcessItem.attrs = { ...sourceItem.attrs, style: 'width:180px;' };
      }
    }
    !sourceItem.events && (state.currentProcessItem.events = {});
    if (isOwnOptionsType(sourceItem.type)) {
      if (sourceItem.options && !Array.isArray(sourceItem.options)) {
        if (getVarType(sourceItem.options) === 'asyncFunction') {
          //option列表靠异步方法获取
          const getOptionsFn = sourceItem.options;
          state.currentProcessItem.options = [];
          const currentProcessItem = state.currentProcessItem;
          getOptionsFn().then((res) => {
            state.toolBarItemDict.value[currentProcessItem.key].options = res;
          });
        } else if (getVarType(sourceItem.options) === 'function') {
          //option列表靠同步方法获取
          const getOptionsFn = sourceItem.options;
          state.currentProcessItem.options = getOptionsFn();
        }
      } else if (!sourceItem.options) {
        state.currentProcessItem.options = [];
      }
    }
  };
  const setToolBarItemWatch = (sourceItem) => {
    if (sourceItem.show) {
      if (typeof sourceItem.show === 'string') {
        if (/[><=]/.test(sourceItem.show)) {
          const keyList = sourceItem.show.match(/(\w+)(?=<=?|>=?|==)/g);
          const codeString = `return ${sourceItem.show.replace(
            /(\w+)(<=?|>=?|==)/g,
            'formData.value.$1$2'
          )}`;
          const watchHandle = new Function('formData', codeString);
          const watchSetting = [
            () => {
              keyList.map((key) => state.formData.value[key]);
              this.editFormItemConfig(sourceItem.key, {
                show: watchHandle(state.formData),
              });
            },
          ];
          state.watchManager.setWatchInfo(sourceItem.key, watchSetting);
        } else {
          const key = sourceItem.show;
          const codeString = `return !!formData.value.${sourceItem.show}`;
          const watchHandle = new Function('formData', codeString);
          const watchSetting = [
            () => {
              state.formData.value[key];
              this.editFormItemConfig(sourceItem.key, {
                show: watchHandle(state.formData),
              });
            },
          ];
          state.watchManager.setWatchInfo(sourceItem.key, watchSetting);
        }
      } else if (getVarType(sourceItem.show) === 'object') {
        const watchSetting = [
          () => {
            const watchValues = sourceItem.show.watchKeys.map((key) => state.formData.value[key]);
            this.editFormItemConfig(sourceItem.key, { show: sourceItem.show.handle(watchValues) });
          },
        ];
        state.watchManager.setWatchInfo(sourceItem.key, watchSetting);
      } else if (typeof sourceItem.show === 'function') {
        const watchSetting = [sourceItem.show];
        state.watchManager.setWatchInfo(sourceItem.key, watchSetting);
      }
    }
    if (sourceItem?.options?.watchKeys) {
      const watchHandle = sourceItem.options.handle;
      let watchSetting;
      if (getVarType(watchHandle) === 'asyncFunction') {
        watchSetting = [
          () => sourceItem.options.watchKeys.map((key) => state.formData.value[key]),
          (n, o) => {
            watchHandle(n, o).then((res) => {
              this.editFormItemConfig(sourceItem.key, { options: res });
            });
          },
          {
            immediate: true,
          },
        ];
      } else if (typeof watchHandle === 'function') {
        watchSetting = [
          () => sourceItem.options.watchKeys.map((key) => state.formData.value[key]),
          (n, o) => {
            this.editFormItemConfig(sourceItem.key, { options: watchHandle(n, o) });
          },
          {
            immediate: true,
          },
        ];
      }
      state.watchManager.setWatchInfo(sourceItem.key, watchSetting);
    }
    if (sourceItem.watch) {
      this.setFormItemWatchInfo(sourceItem.key, sourceItem.watch);
    }
  };
  const toolBarStateDiff = (sourceToolBarItemList) => {
    const newToolBarItemsInfo = {};
    if (sourceToolBarItemList) {
      sourceToolBarItemList.forEach((i) => {
        newToolBarItemsInfo[i.key] = i;
      });
    }
    const diffHandler = (diffType, key) => {
      switch (diffType) {
        case 'add': {
          const targetItem = state.toolBarItemDict.value[key];
          //表单元素
          if (isFormItemType(targetItem.type)) {
            let realDefaultValue;
            if (getVarType(targetItem.getDefaultValue) === 'function') {
              realDefaultValue = targetItem.getDefaultValue();
            } else if (Reflect.has(targetItem, 'defaultValue')) {
              realDefaultValue = targetItem.defaultValue;
            } else {
              realDefaultValue = undefined;
            }
            state.formData.value[key] = realDefaultValue;
          } else if (targetItem.type === 'batch' && !toValue(config).batchFixed) {
            //批量操作按钮(非固定批量勾选模式)
            state.batchInfo.value[key] = {
              key,
              everyPageSelectedListInfo: {},
              config: targetItem,
            };
          } else if (isButtonType(targetItem.type)) {
            //按钮类
            if (targetItem.type === 'searchButton') {
              state.buttonLoadingInfo.value[`${key}-search`] = false;
              state.buttonLoadingInfo.value[`${key}-clear`] = false;
            } else {
              state.buttonLoadingInfo.value[key] = false;
            }
          }
          setToolBarItemWatch(targetItem);
          break;
        }
        case 'delete': {
          Reflect.deleteProperty(state.formData.value, key);
          Reflect.deleteProperty(state.batchInfo.value, key);
          Reflect.deleteProperty(state.buttonLoadingInfo.value, key);
          state.watchManager.deleteWatch(key);
          break;
        }
      }
    };
    objectDiff(state.oldToolBarItemsInfo, newToolBarItemsInfo, diffHandler);
    state.oldToolBarItemsInfo = newToolBarItemsInfo;
  };
  const createToolBar = (sourceToolBarItemList) => {
    state.toolBarItemlist.value = [];
    for (const sourceItem of sourceToolBarItemList) {
      state.currentProcessItem = Object.assign({}, sourceItem);
      toolBarItemConfigFormat(sourceItem);
      state.toolBarItemlist.value.push(state.currentProcessItem);
      state.currentProcessItem = null;
    }
    toolBarStateDiff(sourceToolBarItemList);
    state.watchManager.registerWatch();
  };
  const setBatchFixed = () => {
    if (toValue(config).batchFixed) {
      const key = Symbol.for('fixed');
      state.batchInfo.value[key] = {
        key,
        everyPageSelectedListInfo: {},
        config: {},
      };
      state.currentBatchInfo.value = state.batchInfo.value[key];
      emits('enterBatchMode');
    }
  };
  const getAllPageSelectedRowList = (batchKey) => {
    const allPageSelected = [];
    let targetBatchDesc;
    if (batchKey) {
      targetBatchDesc = state.batchInfo.value[batchKey];
    } else {
      targetBatchDesc = state.currentBatchInfo.value;
    }
    for (const pageNum of Object.keys(targetBatchDesc.everyPageSelectedListInfo)) {
      for (const selectRowItem of targetBatchDesc.everyPageSelectedListInfo[pageNum]) {
        allPageSelected.push(selectRowItem);
      }
    }
    return allPageSelected;
  };
  const clearBatchModeState = () => {
    console.log('清除批量状态', state.currentBatchInfo.value);
    if (!toValue(config).batchFixed && state.currentBatchInfo.value) {
      emits('exitBatchMode');
      state.currentBatchInfo.value.everyPageSelectedListInfo = {};
      state.currentBatchInfo.value = null;
    } else {
      state.currentBatchInfo.value.everyPageSelectedListInfo = {};
    }
  };
  const editBatchSelectList = (selectedRows, pageNum) => {
    state.currentBatchInfo.value.everyPageSelectedListInfo[pageNum] = selectedRows;
  };
  const getBatchSelectList = (pageNum) => {
    if (state.currentBatchInfo.value) {
      return state.currentBatchInfo.value.everyPageSelectedListInfo[pageNum];
    }
  };
  const searchParamsClear = () => {
    for (const key of Object.keys(state.formData.value)) {
      state.formData.value[key] = undefined;
    }
  };
  const toolBarButtonClickEventHandler = (toolBarItem, payload) => {
    switch (toolBarItem.type) {
      case 'openModal': {
        const modalKey = toolBarItem.key;
        const data = payload;
        emits('openModal', {
          key: modalKey,
          data,
        });
        break;
      }
      case 'batch': {
        const actionType = payload;
        switch (actionType) {
          case 'entry': {
            state.currentBatchInfo.value = state.batchInfo.value[toolBarItem.key];
            emits('enterBatchMode');
            break;
          }
          case 'ok': {
            toolBarItem?.ok?.fn?.(getAllPageSelectedRowList());
            clearBatchModeState();
            break;
          }
          case 'cancel': {
            toolBarItem?.cancel?.fn?.();
            clearBatchModeState();
            state.currentBatchInfo.value = null;
            break;
          }
        }
        break;
      }
      case 'button': {
        if (toolBarItem.fn) {
          if (getVarType(toolBarItem.fn) === 'asyncFunction') {
            state.buttonLoadingInfo.value[toolBarItem.key] = true;
            toolBarItem.fn(payload).finally(() => {
              state.buttonLoadingInfo.value[toolBarItem.key] = false;
            });
          } else {
            toolBarItem.fn(payload);
          }
        }
        break;
      }
      case 'searchButton': {
        switch (payload) {
          case 'search': {
            const searchParams = getSearchParams();
            if (searchParams) {
              state.buttonLoadingInfo.value[`${toolBarItem.key}-search`] = true;
              emits('search', {
                callback: () => {
                  state.buttonLoadingInfo.value[`${toolBarItem.key}-search`] = false;
                },
                searchParams,
              });
            }
            break;
          }
          case 'clear': {
            searchParamsClear();
            state.buttonLoadingInfo.value[`${toolBarItem.key}-clear`] = true;
            emits('search', {
              callback: () => {
                state.buttonLoadingInfo.value[`${toolBarItem.key}-clear`] = false;
              },
            });
            break;
          }
        }
        break;
      }
      case 'import': {
        const file = payload;
        state.buttonLoadingInfo.value[toolBarItem.key] = true;
        toolBarItem
          .fn(file)
          .then(() => {
            emits('search', {
              searchParams: getSearchParams(),
            });
          })
          .finally(() => {
            state.buttonLoadingInfo.value[toolBarItem.key] = false;
          });
        //用于阻止UI库上传组件执行它自己的后续上传步骤
        return false;
      }
      case 'download': {
        toolBarItem.fn().then(({ url, name }) => {
          const aEle = document.createElement('a');
          aEle.href = url;
          aEle.download = name;
          aEle.style.display = 'none';
          document.body.appendChild(aEle);
          aEle.click();
          aEle.parentNode.removeChild(aEle);
        });
        break;
      }
    }
  };
  const getRealFormItemBindValue = (toolBarItem, bindValue) => {
    if (toolBarItem.get) {
      return toolBarItem.get(bindValue);
    } else {
      return bindValue;
    }
  };
  const getSearchParams = () => {
    const toolBarSearchParams = cleanObject(state.formData.value, (sourceData, key) => {
      const targetHeadRowConfigItem = toValue(config).list.find((i) => i.key === key);
      return getRealFormItemBindValue(targetHeadRowConfigItem, sourceData);
    });
    if (Object.keys(toolBarSearchParams).length) {
      return toolBarSearchParams;
    } else {
      return null;
    }
  };
  const toolBarFormItemFocusHandler = () => {
    state.toolBarFormItemFocus.value = true;
    emits('focus');
  };
  const toolBarFormItemBlurHandler = () => {
    state.toolBarFormItemFocus.value = false;
    emits('blur');
  };

  if (toValue(config).list) {
    createToolBar(toValue(config).list);
    setBatchFixed();
  }

  onUnmounted(() => {
    state.watchManager.clear();
  });

  const defineExposeConfig = {
    editBatchSelectList,
    getBatchSelectList,
    clearBatchModeState,
    getSearchParams,
    searchParamsClear,
  };

  return {
    toolBarItemlist: state.toolBarItemlist,
    formData: state.formData,
    batchInfo: state.batchInfo,
    buttonLoadingInfo: state.buttonLoadingInfo,
    currentBatchInfo: state.currentBatchInfo,
    toolBarFormItemFocusHandler,
    toolBarFormItemBlurHandler,
    toolBarButtonClickEventHandler,
    defineExposeConfig,
  };
};

export { useToolBar, toolBarProps, toolBarEmits };
