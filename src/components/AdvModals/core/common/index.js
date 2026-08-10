/**
 * AdvModalItem 弹窗项逻辑 Hook
 *
 * 【功能说明】
 * 管理单个弹窗的状态、数据获取、表单处理和按钮事件。
 *
 * 【状态管理】
 * | 状态名 | 类型 | 说明 |
 * |--------|------|------|
 * | show | Boolean | 弹窗显示状态 |
 * | data | Any | 弹窗数据 |
 * | loading | Boolean | 数据加载状态 |
 * | okButtonLoading | Boolean | 确认按钮加载状态 |
 * | cancelButtonLoading | Boolean | 取消按钮加载状态 |
 * | formRef | Object | 表单引用 |
 * | formData | Any | 表单数据 |
 *
 * 【核心方法】
 * | 方法名 | 说明 | 参数 |
 * |--------|------|------|
 * | openModal | 打开弹窗 | payload (数据), validateFn (验证方法) |
 * | closeModal | 关闭弹窗 | refreshRecordList, resetFormData |
 * | modalButtonEventHandler | 按钮事件处理 | type ('ok' | 'cancel') |
 * | handleCancel | 取消处理（取消按钮/关闭图标共用） | 无 |
 * | getModalData | 获取弹窗数据 | 无 |
 */

import { ref } from 'vue';

/**
 * AdvModalItem 属性定义
 */
const advModalItemProps = {
  /**
   * 弹窗配置对象
   */
  config: {
    type: Object,
    required: true,
  },
};

/**
 * AdvModalItem 事件定义
 */
const advModalItemEmits = ['modalOpen', 'modalClose', 'refreshRecordList', 'modalOpenFail'];

/**
 * 使用 AdvModalItem Hook
 * @param {Object} props - 组件属性
 * @param {Object} emits - 事件发射器
 * @param {Function} message - 消息提示方法
 * @param {Object} messageBox - ElMessageBox 对象，用于确认弹窗
 * @returns {Object} 状态和方法
 */
const useAdvModalItem = (props, emits, message, messageBox) => {
  /**
   * 状态对象
   */
  const state = {
    show: ref(false),
    data: ref(null),
    loading: ref(false),
    okButtonLoading: ref(false),
    okButtonDisable: ref(false),
    cancelButtonLoading: ref(false),
    formRef: null,
    bindFormData: ref(null),
    watchManager: new WatchManager(),
  };

  /**
   * 设置表单引用
   * @param {Object} ref - 表单组件引用
   */
  const setFormRef = (ref) => {
    state.formRef = ref;
  };

  const init = () => {
    if (
      props.config?.okButton?.disabled?.watch?.keys &&
      props.config?.okButton?.disabled?.watch?.handle
    ) {
      const watchHandle = props.config.okButton.disabled.watch.handle;
      let watchSetting;
      if (getVarType(watchHandle) === 'asyncFunction') {
        watchSetting = [
          () =>
            props.config.okButton.disabled.watch.keys.map((key) => state.bindFormData.value?.[key]),
          (n, o) => {
            watchHandle(n, o).then((res) => {
              state.okButtonDisable.value = res;
            });
          },
          { immediate: true },
        ];
      } else if (typeof watchHandle === 'function') {
        watchSetting = [
          () =>
            props.config.okButton.disabled.watch.keys.map((key) => state.bindFormData.value?.[key]),
          (n, o) => {
            state.okButtonDisable.value = watchHandle(n, o);
          },
          { immediate: true },
        ];
      }
      state.watchManager.setWatchInfo('okButtonDisable', watchSetting);
      state.watchManager.registerWatch('okButtonDisable');
    } else if (props.config?.okButton?.disabled?.watch) {
      const [watchSource, watchHandle, watchOptions] = props.config.okButton.disabled.watch;
      state.watchManager.setWatchInfo('okButtonDisable', [
        watchSource,
        (n, o) => {
          state.okButtonDisable.value = watchHandle(n, o);
        },
        watchOptions,
      ]);
      state.watchManager.registerWatch('okButtonDisable');
    }
  };

  /**
   * 打开弹窗
   * @param {Any} payload - 传入的数据
   */
  const openModal = (payload) => {
    console.log('openModal payload:', payload);
    console.log('props.config:', props.config);
    const validateFn = props.config.openModalValidate;
    if (typeof validateFn === 'function' && !validateFn(payload)) {
      emits('modalOpenFail', { key: props.config.key, data: payload });
    } else {
      if (props.config?.form) {
        if (getVarType(props.config.getData) === 'asyncFunction') {
          state.loading.value = true;
          const getDataFnParams = payload;
          props.config
            .getData(getDataFnParams)
            .then((res) => {
              state.data.value = res;
              state.bindFormData.value = { ...res };
            })
            .finally(() => {
              state.loading.value = false;
            });
        } else {
          if (typeof props.config.getData === 'function') {
            const getDataFnParams = payload;
            const data = props.config.getData(getDataFnParams);
            state.data.value = data;
            state.bindFormData.value = { ...data };
          } else if (payload) {
            state.bindFormData.value = JSON.parse(JSON.stringify(payload));
            state.data.value = payload;
          }
        }
      } else {
        if (getVarType(props.config.getData) === 'asyncFunction') {
          state.loading.value = true;
          const getDataFnParams = payload;
          props.config
            .getData(getDataFnParams)
            .then((res) => {
              state.data.value = res;
            })
            .finally(() => {
              state.loading.value = false;
            });
        } else {
          if (typeof props.config.getData === 'function') {
            const getDataFnParams = payload;
            state.data.value = props.config.getData(getDataFnParams);
            console.log('state.data.value:', state.data.value);
          } else if (payload) {
            state.data.value = JSON.parse(JSON.stringify(payload));
          }
        }
      }
      // 重新打开时恢复 okButtonDisable 监听，确保确认按钮禁用状态随最新数据重新计算
      state.watchManager.resumeWatch('okButtonDisable');
      state.show.value = true;

      emits('modalOpen', { key: props.config.key, data: state.data.value });
    }
  };

  /**
   * 关闭弹窗
   * @param {Boolean} refreshRecordList - 是否刷新列表
   * @param {Boolean} resetFormData - 是否重置表单数据
   */
  const closeModal = (refreshRecordList = false, resetFormData = true) => {
    state.show.value = false;
    // 关闭时不销毁 okButtonDisable 监听，仅暂停；重新打开时恢复，避免监听失效后确认按钮状态无法重新计算
    state.watchManager.pauseWatch('okButtonDisable');
    // 注意：此处不再重置 okButtonDisable，暂停期间若 watch 源发生变化，恢复时会用最新值重新计算；
    // 若源未变化，保留上次计算结果即为正确状态
    if (props.config.form && state.bindFormData?.value && resetFormData) {
      Object.keys(state.bindFormData.value).forEach((key) => {
        state.bindFormData.value[key] = undefined;
      });
    }
    if (refreshRecordList) {
      emits('refreshRecordList');
    }
    emits('modalClose', { key: props.config.key, data: state.data.value });
  };

  /**
   * 取消处理（底部取消按钮 / 右上角关闭图标共用）
   * cancelButton.fn 未返回任何值时，直接关闭弹窗
   * @returns {Boolean} 是否已关闭弹窗
   */
  const handleCancel = () => {
    if (props.config?.cancelButton?.fn) {
      const result = props.config.cancelButton.fn(state.data.value, state.bindFormData.value);
      if (result == null) {
        // cancelButton.fn 未返回任何值，视为允许关闭
        closeModal();
        return true;
      }
      const { close, refreshRecordList, resetFormData, message: msg } = result;
      if (msg && typeof message === 'function') {
        message(msg);
      }
      if (close) {
        closeModal(refreshRecordList, resetFormData);
        return true;
      }
      return false;
    }
    closeModal();
    return true;
  };

  /**
   * 弹窗按钮事件处理
   * @param {String} type - 按钮类型 'ok' | 'cancel'
   */
  const modalButtonEventHandler = async (type) => {
    switch (type) {
      case 'ok': {
        // 检查是否需要二次确认
        const confirmConfig = props.config?.okButton?.confirm;
        if (confirmConfig && messageBox) {
          // 支持 confirm: true 或 confirm: { text, okText, ... }
          const confirmOptions = typeof confirmConfig === 'boolean' ? {} : confirmConfig;
          try {
            await messageBox.confirm(confirmOptions.text || '是否确认执行此操作？', '提示', {
              confirmButtonText: confirmOptions.okText || props.config.okButton?.text || '确认',
              cancelButtonText: confirmOptions.cancelText || '取消',
              type: 'warning',
              ...(confirmOptions.attrs || {}),
            });
          } catch (err) {
            if (err !== 'cancel') {
              throw err;
            }
            return;
          }
        }

        if (state.formRef) {
          state.formRef
            .submit()
            .then((res) => {
              if (getVarType(props.config?.okButton?.fn) === 'asyncFunction') {
                state.okButtonLoading.value = true;
                props.config.okButton
                  .fn(state.data.value, res)
                  .then((result) => {
                    const { refreshRecordList, resetFormData, message: msg } = result || {};
                    if (msg && typeof message === 'function') {
                      message(msg);
                    }
                    closeModal(refreshRecordList, resetFormData);
                  })
                  .finally(() => {
                    state.okButtonLoading.value = false;
                  });
              } else if (typeof props.config?.okButton?.fn === 'function') {
                const result = props.config.okButton.fn(state.data.value, res);
                if (result == null) {
                  // okButton.fn 未返回任何值，视为允许关闭
                  closeModal();
                } else {
                  const { close, refreshRecordList, resetFormData, message: msg } = result;
                  if (msg && typeof message === 'function') {
                    message(msg);
                  }
                  if (close) {
                    closeModal(refreshRecordList, resetFormData);
                  }
                }
              } else {
                closeModal();
              }
            })
            .catch(() => {});
        } else {
          if (getVarType(props.config?.okButton?.fn) === 'asyncFunction') {
            state.okButtonLoading.value = true;
            props.config.okButton
              .fn(state.data.value)
              .then((result) => {
                if (result == null) {
                  // okButton.fn 未返回任何值，视为允许关闭
                  closeModal();
                  return;
                }
                const { close, refreshRecordList, message: msg } = result;
                if (msg && typeof message === 'function') {
                  message(msg);
                }
                if (close) {
                  closeModal(refreshRecordList);
                }
              })
              .finally(() => {
                state.okButtonLoading.value = false;
              });
          } else if (typeof props.config?.okButton?.fn === 'function') {
            const result = props.config.okButton.fn(state.data.value);
            if (result == null) {
              // okButton.fn 未返回任何值，视为允许关闭
              closeModal();
            } else {
              const { close, refreshRecordList, message: msg } = result;
              if (msg && typeof message === 'function') {
                message(msg);
              }
              if (close) {
                closeModal(refreshRecordList);
              }
            }
          } else {
            closeModal();
          }
        }
        break;
      }
      case 'cancel': {
        handleCancel();
        break;
      }
    }
  };

  /**
   * 获取弹窗数据
   * @returns {Any} 弹窗数据
   */
  const getModalData = () => {
    return state.data.value;
  };

  /**
   * 暴露给父组件的方法配置
   */
  const defineExposeConfig = {
    openModal,
    closeModal,
    getModalData,
  };

  init();

  return {
    state,
    setFormRef,
    modalButtonEventHandler,
    handleCancel,
    defineExposeConfig,
  };
};

export { useAdvModalItem, advModalItemProps, advModalItemEmits };
