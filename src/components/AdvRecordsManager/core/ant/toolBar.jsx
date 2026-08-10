/**
 * ToolBar - 工具栏组件（Ant Design Vue 版本）
 *
 * 【组件功能】
 * 基于 Ant Design Vue 组件封装的高级工具栏组件，
 * 支持多种工具栏项类型的渲染，包括输入框、选择器、按钮、日期选择等。
 *
 * 【工具栏项类型】
 * | 类型 | 说明 | 渲染组件 |
 * |------|------|----------|
 * | input | 输入框 | a-input |
 * | select | 下拉选择 | a-select |
 * | treeSelect | 树形选择 | a-tree-select |
 * | checkbox | 多选框 | a-checkbox-group |
 * | date | 日期选择 | a-date-picker |
 * | time | 时间选择 | a-time-picker |
 * | batch | 批量操作按钮 | a-button / a-button-group |
 * | openModal | 打开弹窗按钮 | a-button |
 * | openMoreSearch | 更多搜索按钮 | a-button |
 * | button | 普通按钮 | a-button |
 * | searchButton | 搜索按钮 | a-button-group |
 * | import | 导入按钮 | a-upload + a-button |
 * | download | 下载按钮 | a-button |
 *
 * 【核心特性】
 * 1. 左右布局：工具栏项分为左侧和右侧两部分
 * 2. 响应式布局：实现自适应布局
 * 3. 动态渲染：根据配置动态渲染不同类型的工具栏项
 * 4. 插槽支持：支持自定义工具栏项内容
 */

import { defineComponent, withModifiers } from 'vue';
import { useToolBar, toolBarProps, toolBarEmits } from '../common/toolBar.js';
import classes from '../common/toolBar.module.scss';
import { message, Modal } from 'ant-design-vue';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue';

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
  name: 'tool-bar',
  props: toolBarProps,
  emits: toolBarEmits,
  setup(props, { slots, expose, emit }) {
    /**
     * 工具栏两侧类型：左侧和右侧
     */
    const sideType = ['left', 'right'];

    /**
     * 使用工具栏核心 hook，获取状态和方法
     */
    const {
      toolBarItemlist,
      formData,
      batchInfo,
      buttonLoadingInfo,
      buttonDisableInfo,
      formItemShowInfo,
      formItemOptionsInfo,
      currentBatchInfo,
      toolBarFormItemFocusHandler,
      toolBarFormItemBlurHandler,
      toolBarButtonClickEventHandler,
      defineExposeConfig,
      toolBarInputEnterHandler,
    } = useToolBar(props, emit, null, message, antMessageBox);

    /**
     * 暴露方法给父组件
     */
    expose(defineExposeConfig);

    /**
     * 渲染单个工具栏项
     * @param {Object} tooBarItemConfig - 工具栏项配置
     * @returns {VNode|null} 渲染的 Vue 节点
     */
    const renderToolBarItem = (tooBarItemConfig) => {
      const {
        key,
        type,
        show,
        inRight,
        attrs,
        events,
        options: configOptions,
        placeholder,
        text,
        range,
        ok,
        cancel,
        icon,
        iconAttrs = {},
      } = tooBarItemConfig;

      const options = ['select', 'treeSelect', 'radio', 'checkbox'].includes(type)
        ? (formItemOptionsInfo[key]?.value ?? configOptions)
        : configOptions;

      const commonProps = {
        key,
        value: formData.value[key],
        'onUpdate:value': (val) => {
          formData.value[key] = val;
        },
        placeholder,
        ...attrs,
        ...events,
      };

      switch (type) {
        case 'input':
          return (
            <a-input
              {...commonProps}
              onFocus={toolBarFormItemFocusHandler}
              onBlur={toolBarFormItemBlurHandler}
              allowClear={true}
              onKeypress={withModifiers(
                (e) => e.key === 'Enter' && toolBarInputEnterHandler(),
                ['prevent']
              )}
            >
              {slots[`toolBar-input-addonAfter-${key}`] && {
                addonAfter: () => slots[`toolBar-input-addonAfter-${key}`](),
              }}
            </a-input>
          );

        case 'select':
          return (
            <a-select
              {...commonProps}
              onFocus={toolBarFormItemFocusHandler}
              onBlur={toolBarFormItemBlurHandler}
              allowClear={true}
            >
              {options?.map((optionItem) => (
                <a-select-option
                  key={optionItem.value}
                  value={optionItem.value}
                  label={optionItem.label}
                  {...(optionItem.optionAttrs || {})}
                />
              ))}
            </a-select>
          );

        case 'treeSelect':
          return (
            <a-tree-select
              value={formData.value[key]}
              onUpdate:value={(val) => {
                formData.value[key] = val;
              }}
              placeholder={placeholder}
              treeData={options}
              style={{ maxHeight: '400px', overflow: 'auto' }}
              {...attrs}
            />
          );

        case 'checkbox':
          return (
            <a-checkbox-group
              value={formData.value[key]}
              onUpdate:value={(val) => {
                formData.value[key] = val;
              }}
              onFocus={toolBarFormItemFocusHandler}
              onBlur={toolBarFormItemBlurHandler}
              placeholder={placeholder}
              {...attrs}
              {...events}
            >
              {options?.map((checkboxItemConfig) => (
                <a-checkbox
                  key={checkboxItemConfig.value}
                  value={checkboxItemConfig.value}
                  label={checkboxItemConfig.label}
                  {...(checkboxItemConfig.optionAttrs || {})}
                />
              ))}
            </a-checkbox-group>
          );

        case 'date':
          return (
            <a-date-picker
              {...commonProps}
              allowClear={true}
              valueFormat="YYYY-MM-DD"
              onFocus={toolBarFormItemFocusHandler}
              onBlur={toolBarFormItemBlurHandler}
            />
          );

        case 'time':
          return (
            <a-time-picker
              {...commonProps}
              allowClear={true}
              range={range}
              valueFormat="HH:mm:ss"
              onFocus={toolBarFormItemFocusHandler}
              onBlur={toolBarFormItemBlurHandler}
            />
          );

        case 'batch':
          return (
            <>
              {!currentBatchInfo.value && (
                <a-button
                  onClick={() => toolBarButtonClickEventHandler(tooBarItemConfig, 'entry')}
                  {...attrs}
                >
                  {slots[`toolBar-item-${key}`]?.() ?? text}
                </a-button>
              )}
              {currentBatchInfo.value && currentBatchInfo.value.key === key && (
                <a-button-group>
                  <a-button
                    type="primary"
                    onClick={() => toolBarButtonClickEventHandler(tooBarItemConfig, 'ok')}
                    {...(ok?.attrs || {})}
                  >
                    {ok?.text}
                  </a-button>
                  <a-button
                    onClick={() => toolBarButtonClickEventHandler(tooBarItemConfig, 'cancel')}
                    {...(cancel?.attrs || {})}
                  >
                    {cancel?.text}
                  </a-button>
                </a-button-group>
              )}
            </>
          );

        case 'openModal':
          return (
            <a-button
              onClick={() => toolBarButtonClickEventHandler(tooBarItemConfig)}
              disabled={buttonDisableInfo.value[key]}
              {...attrs}
            >
              {icon && <icon {...iconAttrs} />}
              {slots[`toolBar-item-${key}`]?.() ?? text}
            </a-button>
          );

        case 'openMoreSearch':
          return (
            <a-button
              onClick={() => toolBarButtonClickEventHandler(tooBarItemConfig)}
              {...attrs}
            >
              {icon && <icon {...iconAttrs} />}
              {slots[`toolBar-item-${key}`]?.() ?? text}
            </a-button>
          );

        case 'button':
          return (
            <a-button
              loading={buttonLoadingInfo.value[key]}
              onClick={() => toolBarButtonClickEventHandler(tooBarItemConfig)}
              disabled={buttonDisableInfo.value[key]}
              {...attrs}
            >
              {icon && <icon {...iconAttrs} />}
              {slots[`toolBar-item-${key}`]?.() ?? text}
            </a-button>
          );

        case 'searchButton':
          if (tooBarItemConfig.isGroup) {
            return (
              <a-button-group>
                <a-button
                  loading={buttonLoadingInfo.value[`${key}-search`]}
                  disabled={buttonLoadingInfo.value[`${key}-clear`]}
                  onClick={() => toolBarButtonClickEventHandler(tooBarItemConfig, 'search')}
                  type="primary"
                  {...attrs}
                >
                  <SearchOutlined />
                  {slots[`toolBar-item-${key}-search`]?.() ?? text}
                </a-button>
                <a-button
                  loading={buttonLoadingInfo.value[`${key}-clear`]}
                  disabled={buttonLoadingInfo.value[`${key}-search`]}
                  onClick={() => toolBarButtonClickEventHandler(tooBarItemConfig, 'clear')}
                >
                  <ReloadOutlined />
                  {slots[`toolBar-item-${key}-reset`]?.() ?? '清空'}
                </a-button>
              </a-button-group>
            );
          } else {
            return (
              <>
                <a-button
                  loading={buttonLoadingInfo.value[`${key}-search`]}
                  disabled={buttonLoadingInfo.value[`${key}-clear`]}
                  onClick={() => toolBarButtonClickEventHandler(tooBarItemConfig, 'search')}
                  type="primary"
                  {...attrs}
                >
                  <SearchOutlined />
                  {slots[`toolBar-item-${key}-search`]?.() ?? text}
                </a-button>
                <a-button
                  loading={buttonLoadingInfo.value[`${key}-clear`]}
                  disabled={buttonLoadingInfo.value[`${key}-search`]}
                  onClick={() => toolBarButtonClickEventHandler(tooBarItemConfig, 'clear')}
                >
                  <ReloadOutlined />
                  {slots[`toolBar-item-${key}-reset`]?.() ?? '重置'}
                </a-button>
              </>
            );
          }

        case 'import':
          return (
            <a-upload
              customRequest={(file) => toolBarButtonClickEventHandler(tooBarItemConfig, file)}
              accept=".xlsx"
              disabled={buttonLoadingInfo.value[key]}
              showUploadList={false}
              {...attrs}
            >
              <a-button loading={buttonLoadingInfo.value[key]}>
                {icon && <icon {...iconAttrs} />}
                {slots[`toolBar-item-${key}`]?.() ?? text}
              </a-button>
            </a-upload>
          );

        case 'download':
          return (
            <a-button
              onClick={() => toolBarButtonClickEventHandler(tooBarItemConfig)}
              {...attrs}
            >
              {icon && <icon {...iconAttrs} />}
              {slots[`toolBar-item-${key}`]?.() ?? text}
            </a-button>
          );

        case 'confirm':
          return (
            <a-button
              loading={buttonLoadingInfo.value[key]}
              disabled={buttonDisableInfo.value[key]}
              {...tooBarItemConfig.buttonAttrs}
              onClick={() => toolBarButtonClickEventHandler(tooBarItemConfig)}
            >
              {icon && <icon {...iconAttrs} />}
              {slots[`toolBar-item-${key}`]?.() ?? text}
            </a-button>
          );

        default:
          return null;
      }
    };

    /**
     * 组件渲染函数
     * 返回工具栏整体布局，分为左侧和右侧两部分
     * @returns {VNode} 渲染的 Vue 节点
     */
    return () =>
      toValue(toolBarItemlist)?.length ? (
        <div
          class={[classes['tool_bar_wrapper'], props.config?.toolBarWrapClass]
            .filter(Boolean)
            .join(' ')}
        >
          {slots?.[`toolBar-header`] && (
            <div class={classes['toolBar_header']}>{slots[`toolBar-header`]?.()}</div>
          )}

          <div class={classes['tool_bar_main']}>
            {sideType.map((side) => {
              /**
               * 渲染左侧或右侧内容
               * 根据 tooBarItemConfig.inRight 属性区分左右
               */
              const sideContent = (
                <div
                  key={side}
                  class={
                    side === 'left' ? classes['tool_bar_side_left'] : classes['tool_bar_side_right']
                  }
                >
                  {toolBarItemlist.value
                    .filter((tooBarItemConfig) => {
                      const { key, type, show, inRight } = tooBarItemConfig;
                      const isFormType = [
                        'input',
                        'select',
                        'date',
                        'dateTime',
                        'radio',
                        'checkbox',
                      ].includes(type);
                      const shouldShow = isFormType ? formItemShowInfo.value[key] : show;
                      return shouldShow && (side === 'left' ? !inRight : inRight);
                    })
                    .map((tooBarItemConfig) => renderToolBarItem(tooBarItemConfig))}
                </div>
              );
              return sideContent;
            })}
          </div>
        </div>
      ) : null;
  },
});
