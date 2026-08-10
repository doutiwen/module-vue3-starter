/**
 * AdvForm 高级表单渲染组件
 *
 * 【组件功能】
 * 基于 Ant Design Vue a-form 封装的表单渲染组件，根据配置自动渲染各种表单控件。
 *
 * 【表单项类型与组件映射】
 * | 类型 | Ant Design Vue 组件 |
 * |------|------------------|
 * | input | a-input |
 * | phone | a-input (数字限制，长度11) |
 * | textarea | a-textarea |
 * | number | a-inputNumber |
 * | select | a-select |
 * | treeSelect | a-tree-select |
 * | radio | a-radio-group |
 * | checkbox | a-checkbox-group |
 * | switch | a-switch |
 * | date | a-date-picker |
 * | dateTime | a-date-picker |
 * | time | a-time-picker |
 * | upload | Upload (自定义) |
 * | custom | 插槽 |
 *
 * 【插槽说明】
 * | 插槽名 | 说明 |
 * |--------|------|
 * | input-addonAfter-{key} | 输入框后缀内容 |
 * | form-item-custom-{key} | 自定义表单项组件 |
 * | form-item-after-{key} | 表单项元素后插槽 |
 * | upload-{key}-fileList | 上传文件列表自定义 |
 * | upload-{key}-previewContent | 上传预览内容自定义 |
 * | button | 按钮区域自定义 |
 */

import classes from './index.module.scss';
import {
  useAdvForm,
  advFormProps,
  advFormEmits,
  createNumberInputFilter,
} from '../common/index.js';
import { defineComponent, toRefs } from 'vue';
import Upload from './packages/upload/index.vue';

export default defineComponent({
  name: 'adv-form',
  props: advFormProps,
  emits: advFormEmits,
  setup(props, { attrs, slots, emit, expose }) {
    /**
     * 表单引用
     */
    const antFormRef = ref();

    /**
     * 使用表单 Hook
     */
    const {
      formItemRowList,
      formItemDict,
      formDataState,
      validateRules,
      getFormEleComponentProps,
      formEleComponentShowInfo,
      formEleComponentOptionsInfo,
      setFormItemRef,
      getFormItemRef,
      submit,
      submitButtonClickHandler,
      clearFormData,
      defineExposeConfig,
      computedGridConfig,
    } = useAdvForm(toRefs(props), emit, antFormRef, null, 'value');

    /**
     * 验证规则转换（适配 Ant Design Vue 格式）
     */
    const validateRulesAnt = computed(() => {
      const targetRulesInfo = {};
      for (const key of Object.keys(validateRules.value)) {
        if (formEleComponentShowInfo.value[key]) {
          const sourceValidateItem = validateRules.value[key];
          const targetValidateRules = [];
          for (const sourceRule of sourceValidateItem) {
            const targetValidateRuleItem = { trigger: 'blur', message: sourceRule.notice };
            switch (sourceRule.type) {
              case 'required': {
                targetValidateRules.push(
                  Object.assign(targetValidateRuleItem, {
                    required: true,
                  })
                );
                break;
              }
              case 'email':
              case 'phone':
              case 'number':
              case 'intNumber': {
                targetValidateRules.push(
                  Object.assign(targetValidateRuleItem, {
                    pattern: sourceRule.pattern,
                  })
                );
                targetValidateRules.push({});
                break;
              }
              case 'peopleIdNum':
              case 'sameWith':
              case 'custom': {
                targetValidateRules.push(
                  Object.assign(targetValidateRuleItem, {
                    validator: (rule, value, callback) => {
                      if (sourceRule.validateFn(rule, value, formDataState)) {
                        return Promise.resolve();
                      } else {
                        return Promise.reject();
                      }
                    },
                  })
                );
                break;
              }
            }
          }
          targetRulesInfo[key] = targetValidateRules;
        }
      }
      return targetRulesInfo;
    });

    /**
     * 暴露方法给父组件
     */
    expose(defineExposeConfig);

    /**
     * 渲染表单组件
     */
    return () => (
      <div class={props.config?.formWrapClass}>
        <a-form
          model={formDataState}
          rules={validateRulesAnt.value}
          {...props.config.attrs}
          ref={antFormRef}
        >
          {/* 表单项容器 */}
          <div
            class={classes['form_item_wrap']}
            style={
              computedGridConfig.value
                ? {
                    '--form-grid-cols': computedGridConfig.value.cols,
                    '--form-grid-rows': computedGridConfig.value.rows,
                    '--form-grid-gap': computedGridConfig.value.gap,
                  }
                : undefined
            }
          >
            {formItemRowList.value.map((formItemConfig) => {
              if (formEleComponentShowInfo.value[formItemConfig.key]) {
                let formEleComponent;
                const formEleComponentProps = getFormEleComponentProps(formItemConfig);
                formEleComponentProps.value = formDataState[formItemConfig.key];
                const formItemComponentProps = {
                  style: {
                    ...(formItemConfig?.style ?? {}),
                    ...(formItemConfig?.grid?.col
                      ? { 'grid-column': formItemConfig.grid.col }
                      : {}),
                    ...(formItemConfig?.grid?.row ? { 'grid-row': formItemConfig.grid.row } : {}),
                  },
                  label: formItemConfig.label,
                  name: formItemConfig.key,
                  labelCol: !formItemConfig.label ? { span: 0 } : undefined,
                  wrapperCol: !formItemConfig.label ? { span: 24 } : undefined,
                  ...(formItemConfig.formItemAttrs ?? props.config.formItemAttrs ?? {}),
                };

                /**
                 * 根据类型渲染不同的表单组件
                 */
                switch (formItemConfig.type) {
                  case 'input': {
                    formEleComponent = (
                      <a-input
                        {...formEleComponentProps}
                        allowClear={true}
                      >
                        {slots[`input-addonAfter-${formItemConfig.key}`] && {
                          addonAfter: () => slots[`input-addonAfter-${formItemConfig.key}`],
                        }}
                      </a-input>
                    );
                    break;
                  }
                  case 'phone': {
                    const { filterFn, maxlength } = createNumberInputFilter('phone');
                    const originalOnUpdateValue = formEleComponentProps['onUpdate:value'];
                    formEleComponent = (
                      <a-input
                        {...formEleComponentProps}
                        allowClear={true}
                        maxlength={maxlength}
                        formatter={filterFn}
                        onUpdate:value={(value) => {
                          originalOnUpdateValue(filterFn(value));
                        }}
                      ></a-input>
                    );
                    break;
                  }
                  case 'number':
                  case 'intNumber': {
                    const { filterFn } = createNumberInputFilter(formItemConfig.type);
                    const originalOnUpdateValue = formEleComponentProps['onUpdate:value'];
                    formEleComponent = (
                      <a-input-number
                        {...formEleComponentProps}
                        allowClear={true}
                        formatter={filterFn}
                        onUpdate:value={(value) => {
                          // filterFn 返回字符串，而 a-input-number 的 value 要求 Number，
                          // 过滤后转回数字，避免 prop 类型校验警告；清空（空字符串）时存 undefined
                          const filtered = filterFn(value);
                          originalOnUpdateValue(filtered === '' ? undefined : Number(filtered));
                        }}
                      ></a-input-number>
                    );
                    break;
                  }
                  case 'textarea': {
                    formEleComponent = (
                      <a-textarea
                        showCount={true}
                        rows={5}
                        autoSize={false}
                        allowClear={true}
                        {...formEleComponentProps}
                      ></a-textarea>
                    );
                    break;
                  }
                  case 'select': {
                    formEleComponent = (
                      <a-select
                        {...formEleComponentProps}
                        allowClear={true}
                      >
                        {formEleComponentOptionsInfo[formItemConfig.key].value.map((optionItem) => (
                          <a-select-option
                            {...(optionItem.optionAttrs ?? {})}
                            key={optionItem.value}
                            value={optionItem.value}
                          >
                            {optionItem.label}
                          </a-select-option>
                        ))}
                      </a-select>
                    );
                    break;
                  }
                  case 'radio': {
                    formEleComponent = (
                      <a-radio-group {...formEleComponentProps}>
                        {formEleComponentOptionsInfo[formItemConfig.key].value.map(
                          (radioItemConfig) => (
                            <a-radio
                              key={radioItemConfig.value}
                              value={radioItemConfig.value}
                              {...(radioItemConfig.optionAttrs ?? {})}
                            >
                              {radioItemConfig.label}
                            </a-radio>
                          )
                        )}
                      </a-radio-group>
                    );
                    break;
                  }
                  case 'checkbox': {
                    formEleComponent = (
                      <a-checkbox-group {...formEleComponentProps}>
                        {formEleComponentOptionsInfo[formItemConfig.key].value.map(
                          (radioItemConfig) => (
                            <a-checkbox
                              {...(radioItemConfig.optionAttrs ?? {})}
                              key={radioItemConfig.value}
                              value={radioItemConfig.value}
                            >
                              {radioItemConfig.label}
                            </a-checkbox>
                          )
                        )}
                      </a-checkbox-group>
                    );
                    break;
                  }
                  case 'treeSelect': {
                    formEleComponent = (
                      <a-tree-select
                        treeStyle={{ maxHeight: '400px', overflow: 'auto' }}
                        {...formEleComponentProps}
                        tree-data={formItemConfig.options}
                      ></a-tree-select>
                    );
                    break;
                  }
                  case 'switch': {
                    formEleComponent = <a-switch {...formEleComponentProps}></a-switch>;
                    break;
                  }
                  case 'time': {
                    formEleComponent = (
                      <a-time-picker
                        allowClear={true}
                        format="HH:mm:ss"
                        {...formEleComponentProps}
                      ></a-time-picker>
                    );
                    break;
                  }
                  case 'date': {
                    formEleComponent = (
                      <a-date-picker
                        allowClear={true}
                        format="YYYY-MM-DD"
                        {...formEleComponentProps}
                      ></a-date-picker>
                    );
                    break;
                  }
                  case 'dateTime': {
                    formEleComponent = (
                      <a-date-picker
                        allowClear={true}
                        showTime={{ format: 'HH:mm:ss' }}
                        format="YYYY-MM-DD HH:mm:ss"
                        {...formEleComponentProps}
                      ></a-date-picker>
                    );
                    break;
                  }
                  case 'numberRange': {
                    formEleComponent = (
                      <a-slider
                        {...formEleComponentProps}
                        range
                      ></a-slider>
                    );
                    break;
                  }
                  case 'upload': {
                    formEleComponent = (
                      <Upload {...formEleComponentProps}>
                        {{
                          ...(slots[`upload-${formItemConfig.key}-fileList`] && {
                            fileList: ({ fileList }) =>
                              slots[`upload-${formItemConfig.key}-fileList`](fileList),
                          }),
                          ...(slots[`upload-${formItemConfig.key}-previewContent`] && {
                            previewContent: ({ data }) =>
                              slots[`upload-${formItemConfig.key}-previewContent`](data),
                          }),
                        }}
                      </Upload>
                    );
                    break;
                  }
                  case 'custom': {
                    formEleComponent = slots[`form-item-custom-${formItemConfig.key}`]({
                      ...formEleComponentProps,
                    });
                    break;
                  }
                }

                return (
                  <a-formItem
                    {...formItemComponentProps}
                    class={
                      [!formItemConfig.label ? classes.no_label : '', formItemConfig.class || '']
                        .filter(Boolean)
                        .join(' ') || undefined
                    }
                  >
                    <div class={classes.form_item_body}>
                      <div class={classes.form_item_content}>
                        {formEleComponent}
                        {slots[`form-item-after-${formItemConfig.key}`]?.()}
                      </div>
                      {formItemConfig.tip && (
                        <div class={classes.form_item_tip}>*{formItemConfig.tip}</div>
                      )}
                    </div>
                  </a-formItem>
                );
              } else {
                return null;
              }
            })}
          </div>
        </a-form>

        {/* 按钮区域 */}
        {props.config.showButton && (
          <div style="display: flex; justify-content: center; margin-top: 20px;">
            {slots.button ? (
              slots.button()
            ) : (
              <div>
                <a-button
                  type="primary"
                  onClick={submitButtonClickHandler}
                  style="margin-right: 20px"
                >
                  确认
                </a-button>
                <a-button onClick={clearFormData}>清空</a-button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
});
