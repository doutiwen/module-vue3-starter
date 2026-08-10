/**
 * AdvForm 高级表单渲染组件
 *
 * 【组件功能】
 * 基于 Element Plus el-form 封装的表单渲染组件，根据配置自动渲染各种表单控件。
 *
 * 【表单项类型与组件映射】
 * | 类型 | Element Plus 组件 |
 * |------|------------------|
 * | input | el-input |
 * | phone | el-input (数字限制，长度11) |
 * | textarea | el-input (type="textarea") |
 * | number | el-inputNumber |
 * | select | el-select |
 * | treeSelect | el-tree-select |
 * | radio | el-radio-group |
 * | checkbox | el-checkbox-group |
 * | switch | el-switch |
 * | date | el-date-picker |
 * | dateTime | el-date-picker |
 * | time | el-time-picker |
 * | upload | Upload (自定义) |
 * | custom | 插槽 |
 *
 * 【插槽说明】
 * | 插槽名 | 说明 |
 * |--------|------|
 * | input-addonAfter-{key} | 输入框后缀内容 |
 * | custom-{key} | 自定义表单项组件 |
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
import { defineComponent, ref, computed, toRefs } from 'vue';
import Upload from './upload.vue';

export default defineComponent({
  name: 'adv-form',
  props: advFormProps,
  emits: advFormEmits,
  setup(props, { attrs, slots, emit, expose }) {
    /**
     * 表单引用
     */
    const eleFormRef = ref();

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
    } = useAdvForm(toRefs(props), emit, eleFormRef, null, 'modelValue');

    /**
     * 验证规则转换（适配 Element Plus 格式）
     */
    const validateRulesEle = computed(() => {
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
                        return true;
                      } else {
                        return false;
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
        <el-form
          model={formDataState}
          rules={validateRulesEle.value}
          {...props.config.attrs}
          ref={eleFormRef}
          validate-on-rule-change={false}
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
                formEleComponentProps.modelValue = formDataState[formItemConfig.key];
                const formItemComponentProps = {
                  style: {
                    ...(formItemConfig?.style ?? {}),
                    ...(formItemConfig?.grid?.col
                      ? { 'grid-column': formItemConfig.grid.col }
                      : {}),
                    ...(formItemConfig?.grid?.row
                      ? { 'grid-row': formItemConfig.grid.row }
                      : {}),
                  },
                  label: formItemConfig.label,
                  prop: formItemConfig.key,
                  labelWidth: !formItemConfig.label ? '0px' : '120px',
                  ...(formItemConfig.formItemAttrs ?? props.config.formItemAttrs ?? {}),
                };

                /**
                 * 根据类型渲染不同的表单组件
                 */
                switch (formItemConfig.type) {
                  case 'input': {
                    formEleComponent = (
                      <el-input
                        {...formEleComponentProps}
                        clearable={true}
                      >
                        {slots[`input-addonAfter-${formItemConfig.key}`] && {
                          addonAfter: () => slots[`input-addonAfter-${formItemConfig.key}`],
                        }}
                      </el-input>
                    );
                    break;
                  }
                  case 'phone': {
                    const { filterFn, maxlength } = createNumberInputFilter('phone');
                    const originalOnUpdateModelValue = formEleComponentProps['onUpdate:modelValue'];
                    formEleComponent = (
                      <el-input
                        {...formEleComponentProps}
                        clearable={true}
                        maxlength={maxlength}
                        formatter={filterFn}
                        onUpdate:modelValue={(value) => {
                          originalOnUpdateModelValue(filterFn(value));
                        }}
                      ></el-input>
                    );
                    break;
                  }
                  case 'number':
                  case 'intNumber': {
                    const { filterFn, maxlength } = createNumberInputFilter(formItemConfig.type);
                    const originalOnUpdateModelValue = formEleComponentProps['onUpdate:modelValue'];
                    formEleComponent = (
                      <el-input-number
                        {...formEleComponentProps}
                        clearable={true}
                        maxlength={maxlength}
                        formatter={filterFn}
                        onUpdate:modelValue={(value) => {
                          // filterFn 返回字符串，而 el-input-number 的 modelValue 要求 Number，
                          // 过滤后转回数字，避免 prop 类型校验警告；清空（空字符串）时存 undefined
                          const filtered = filterFn(value);
                          originalOnUpdateModelValue(filtered === '' ? undefined : Number(filtered));
                        }}
                      ></el-input-number>
                    );
                    break;
                  }
                  case 'textarea': {
                    formEleComponent = (
                      <el-input
                        show-word-limit={true}
                        type="textarea"
                        rows={5}
                        resize="none"
                        clearable={true}
                        {...formEleComponentProps}
                      ></el-input>
                    );
                    break;
                  }
                  case 'select': {
                    formEleComponent = (
                      <el-select
                        {...formEleComponentProps}
                        clearable={true}
                      >
                        {formEleComponentOptionsInfo[formItemConfig.key].value.map((optionItem) => (
                          <el-option
                            {...(optionItem.optionAttrs ?? {})}
                            key={optionItem.value}
                            value={optionItem.value}
                            label={optionItem.label}
                          ></el-option>
                        ))}
                      </el-select>
                    );
                    break;
                  }
                  case 'radio': {
                    formEleComponent = (
                      <el-radio-group {...formEleComponentProps}>
                        {formEleComponentOptionsInfo[formItemConfig.key].value.map(
                          (radioItemConfig) => (
                            <el-radio
                              key={radioItemConfig.value}
                              value={radioItemConfig.value}
                              {...(radioItemConfig.optionAttrs ?? {})}
                            >
                              {radioItemConfig.label}
                            </el-radio>
                          )
                        )}
                      </el-radio-group>
                    );
                    break;
                  }
                  case 'checkbox': {
                    formEleComponent = (
                      <el-checkbox-group {...formEleComponentProps}>
                        {formEleComponentOptionsInfo[formItemConfig.key].value.map(
                          (radioItemConfig) => (
                            <el-checkbox
                              {...(radioItemConfig.optionAttrs ?? {})}
                              key={radioItemConfig.value}
                              value={radioItemConfig.value}
                              label={radioItemConfig.label}
                            ></el-checkbox>
                          )
                        )}
                      </el-checkbox-group>
                    );
                    break;
                  }
                  case 'treeSelect': {
                    formEleComponent = (
                      <el-tree-select
                        dropdown-style={{ maxHeight: '400px', overflow: 'auto' }}
                        {...formEleComponentProps}
                        tree-data={formItemConfig.options}
                      ></el-tree-select>
                    );
                    break;
                  }
                  case 'switch': {
                    formEleComponent = <el-switch {...formEleComponentProps}></el-switch>;
                    break;
                  }
                  case 'time': {
                    formEleComponent = (
                      <el-time-picker
                        clearable={true}
                        format="HH:mm:ss"
                        {...formEleComponentProps}
                      ></el-time-picker>
                    );
                    break;
                  }
                  case 'date': {
                    formEleComponent = (
                      <el-date-picker
                        clearable={true}
                        format="YYYY-MM-DD"
                        {...formEleComponentProps}
                      ></el-date-picker>
                    );
                    break;
                  }
                  case 'dateTime': {
                    formEleComponent = (
                      <el-date-picker
                        clearable={true}
                        type="datetime"
                        format="YYYY-MM-DD HH:mm:ss"
                        value-format="YYYY-MM-DD HH:mm:ss"
                        {...formEleComponentProps}
                      ></el-date-picker>
                    );
                    break;
                  }
                  case 'numberRange': {
                    formEleComponent = (
                      <el-slider
                        {...formEleComponentProps}
                        range
                      ></el-slider>
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
                  <el-formItem
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
                  </el-formItem>
                );
              } else {
                return null;
              }
            })}
          </div>
        </el-form>

        {/* 按钮区域 */}
        {props.config.showButton && (
          <div style="display: flex; justify-content: center; margin-top: 20px;">
            {slots.button ? (
              slots.button()
            ) : (
              <div>
                <el-button
                  type="primary"
                  onClick={submitButtonClickHandler}
                  style="margin-right: 20px"
                >
                  确认
                </el-button>
                <el-button onClick={clearFormData}>清空</el-button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
});
