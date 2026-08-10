/**
 * modalItem 弹窗项组件
 *
 * 【组件功能】
 * 单个弹窗的渲染组件，支持 Dialog 和 Drawer 两种类型，集成表单和自定义内容。
 *
 * 【弹窗类型】
 * - dialog: 普通弹窗（a-modal）
 * - drawer: 抽屉式弹窗（a-drawer）
 *
 * 【内容渲染】
 * 1. 表单模式：通过 config.form 配置渲染 AdvForm
 * 2. 自定义模式：通过插槽 modal-{key}-content 自定义内容
 *
 * 【插槽说明】
 * | 插槽名 | 说明 |
 * |--------|------|
 * | modal-{key}-content | 弹窗内容自定义 |
 * | modal-{key}-footer | 弹窗底部区域自定义 |
 */

import { defineComponent } from 'vue';
import { Modal, Drawer, message } from 'ant-design-vue';
import Form from '@/components/AdvForm/core/ant/index.jsx';
import { useAdvModalItem, advModalItemProps } from '../common/index.js';
import classes from './item.module.scss';

/**
 * Ant Design Vue Modal.confirm 适配为 Promise 接口
 * 与 Element Plus ElMessageBox.confirm 保持一致的调用方式
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

export default defineComponent({
  name: 'adv-modal-item',
  props: advModalItemProps,
  emits: ['modalOpen', 'modalClose', 'refreshRecordList'],
  setup(props, { emit, slots, expose }) {
    /**
     * 使用弹窗 Hook
     */
    const { state, setFormRef, modalButtonEventHandler, handleCancel, defineExposeConfig } =
      useAdvModalItem(props, emit, message.success, antMessageBox);

    /**
     * 暴露方法给父组件
     */
    expose(defineExposeConfig);

    /**
     * 渲染弹窗底部按钮区域
     * @returns {JSX.Element} 底部按钮元素
     */
    const renderFooter = () => {
      const footerSlot = slots[`modal-${props.config.key}-footer`];
      if (footerSlot) {
        return footerSlot({
          modalData: state.data.value,
          closeModal: () => modalButtonEventHandler('cancel'),
          okLoading: state.okButtonLoading.value,
          okDisabled: state.okButtonDisable.value,
          cancelLoading: state.cancelButtonLoading.value,
          onOk: () => modalButtonEventHandler('ok'),
          onCancel: () => modalButtonEventHandler('cancel'),
          config: props.config,
        });
      } else {
        /**
         * 确认按钮内容
         */
        const okButtonContent = (
          <a-button
            loading={state.okButtonLoading.value}
            disabled={state.okButtonDisable.value}
            type="primary"
            onClick={() => modalButtonEventHandler('ok')}
          >
            {props.config.okButton?.text || '确定'}
          </a-button>
        );

        /**
         * 取消按钮内容
         */
        const cancelButtonContent = (
          <a-button
            disabled={state.okButtonLoading.value}
            onClick={() => modalButtonEventHandler('cancel')}
          >
            {props.config.cancelButton?.text || '取消'}
          </a-button>
        );

        return (
          <div class="modal_footer">
            {okButtonContent}
            {cancelButtonContent}
          </div>
        );
      }
    };

    const formSlots = Object.fromEntries(
      Object.entries(slots).filter(([key]) => key.startsWith('form-'))
    );

    /**
     * 渲染弹窗主体内容
     * @returns {JSX.Element} 主体内容元素
     */
    const renderDefault = () => {
      const contentSlot = slots[`modal-${props.config.key}-content`];
      return (
        <div style="height: 100%">
          <a-spin spinning={state.loading.value}>
            {props.config?.form ? (
              // 表单模式
              <Form
                config={props.config.form}
                modelValue={state.bindFormData.value}
                onUpdate:modelValue={(val) => {
                  state.bindFormData.value = val;
                }}
                ref={(ref) => setFormRef(ref)}
                {...(props.config.form.events || {})}
              >
                {{ ...formSlots }}
              </Form>
            ) : contentSlot ? (
              // 自定义内容模式
              contentSlot({
                modalData: state.data.value,
                closeModal: () => modalButtonEventHandler('cancel'),
                okLoading: state.okButtonLoading.value,
                okDisabled: state.okButtonDisable.value,
                cancelLoading: state.cancelButtonLoading.value,
                onOk: () => modalButtonEventHandler('ok'),
                onCancel: () => modalButtonEventHandler('cancel'),
                config: props.config,
              })
            ) : null}
          </a-spin>
        </div>
      );
    };

    /**
     * 渲染弹窗组件
     */
    return () => {
      /**
       * 根据类型选择弹窗组件
       */
      const ModalComponent = props.config.type === 'dialog' ? Modal : Drawer;

      /**
       * 弹窗属性配置
       */
      const isFullscreen = !!props.config.fullscreen;

      const modalProps = {
        class: props.config?.modalWrapClass,
        open: state.show.value,
        title: props.config.title,
        destroyOnClose: true,
        // 根据类型设置尺寸
        ...(props.config.type === 'dialog'
          ? {
              width: isFullscreen ? '100%' : props.config.width || '50%',
              ...(isFullscreen ? { wrapClassName: classes['full-modal'] } : {}),
            }
          : {
              width: isFullscreen ? '100%' : props.config.size || props.config.width || '600px',
              placement: props.config.direction === 'ltr' ? 'ltr' : 'rtl',
            }),
        // 拦截关闭：执行 cancel 逻辑后再决定是否关闭
        onCancel: () => {
          if (handleCancel()) {
            state.show.value = false;
          }
        },
        ...props.config.attrs,
      };

      return (
        <ModalComponent {...modalProps}>
          {{
            default: () => renderDefault(),
            footer: () => renderFooter(),
          }}
        </ModalComponent>
      );
    };
  },
});
