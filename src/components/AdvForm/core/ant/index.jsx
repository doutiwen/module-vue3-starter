import LayoutDirectives from '@/layoutPlugin/directives/index.js';
import classes from './index.module.scss'
import { useAdvForm, advFormProps, advFormEmits } from '../common/index.js';
import { withDirectives, defineComponent } from 'vue'
import Upload from './packages/upload/index.vue'

export default defineComponent({
  name: 'adv-form',
  props: advFormProps,
  emits: advFormEmits,
  setup(props, { attrs, slots, emit, expose }) {
    const layout = new LayoutDirectives();
    const antFormRef = ref();
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
    } = useAdvForm(toRefs(props), emit, antFormRef);

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
              case 'custom': {
                targetValidateRules.push(
                  Object.assign(targetValidateRuleItem, {
                    validator: (rule, value, callback) => {
                      if (sourceRule.validateFn(rule, value, formDataState.value)) {
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

    expose(defineExposeConfig);
    return () => <>
      <a-form
        model={formDataState}
        rules={validateRulesAnt.value}
        {...props.config.attrs}
        ref={antFormRef}
      >
        <div class={classes["form_item_rows_wrap"]}>
          {
            formItemRowList.value.map(row => {
              const rowContent = <div class={classes["form_item_row"]} key={row[0]}>
                {
                  row.slice(2).map(formItemConfig => {
                    if (formEleComponentShowInfo.value[formItemConfig.key]) {
                      let formEleComponent
                      const formEleComponentProps = getFormEleComponentProps(formItemConfig)
                      formEleComponentProps.value = formDataState[formItemConfig.key]
                      const formItemComponentProps = {
                        style: formItemConfig?.style || null,
                        label: formItemConfig.label,
                        name: formItemConfig.key,
                        ...(formItemConfig.UIformItemAttrs ?? props.config.UIformItemAttrs ?? {})
                      }

                      switch (formItemConfig.type) {
                        case 'input': {
                          formEleComponent = <a-input
                            {...formEleComponentProps}
                          >{
                              slots[`input-addonAfter-${formItemConfig.key}`] && {
                                addonAfter: () => slots[`input-addonAfter-${formItemConfig.key}`]
                              }
                            }
                          </a-input>
                          break;
                        }
                        case 'number': {
                          formEleComponent = <a-inputNumber
                            {...formEleComponentProps}
                          ></a-inputNumber>
                          break;
                        }
                        case 'textarea': {
                          formEleComponent = <a-textarea
                            showCount={true}
                            {...formEleComponentProps}
                          ></a-textarea>
                          break;
                        }
                        case 'select': {
                          formEleComponent = <a-select
                            {...formEleComponentProps}
                          >
                            {
                              formEleComponentOptionsInfo[formItemConfig.key].value.map(optionItem => <a-select-option
                                key={optionItem.value}
                                value={optionItem.value}
                                {...(optionItem.optionAttrs ?? {})}
                              >
                                {optionItem.label}
                              </a-select-option>)
                            }
                          </a-select>
                          break;
                        }
                        case 'radio': {
                          formEleComponent = <a-radio-group
                            {...formEleComponentProps}
                          >
                            {
                              formEleComponentOptionsInfo[formItemConfig.key].value.map(radioItemConfig => <a-radio-button
                                key={radioItemConfig.value}
                                value={radioItemConfig.value}
                                {...(radioItemConfig.optionAttrs ?? {})}
                              >
                                {radioItemConfig.label}
                              </a-radio-button>)
                            }
                          </a-radio-group>
                          break;
                        }
                        case 'checkbox': {
                          formEleComponent = <a-radio-group
                            {...formEleComponentProps}
                          >
                            {
                              formEleComponentOptionsInfo[formItemConfig.key].value.map(radioItemConfig => <a-radio-button
                                key={radioItemConfig.value}
                                value={radioItemConfig.value}
                                {...(radioItemConfig.optionAttrs ?? {})}
                              >
                                {radioItemConfig.label}
                              </a-radio-button>)
                            }
                          </a-radio-group>
                          break;
                        }
                        case 'treeSelect': {
                          formEleComponent = <a-tree-select
                            dropdown-style={{ maxHeight: '400px', overflow: 'auto' }}
                            {...formEleComponentProps}
                            tree-data={formEleComponentOptionsInfo[formItemConfig.key].value}
                          ></a-tree-select>
                          break;
                        }
                        case 'switch': {
                          formEleComponent = <a-switch
                            {...formEleComponentProps}
                          ></a-switch>
                          break;
                        }
                        case 'time': {
                          formEleComponent = <a-time-picker
                            valueFormat="HH:mm:ss"
                            showTime={formItemConfig?.timePickerAttrs}
                            {...formEleComponentProps}
                          ></a-time-picker>
                          break;
                        }
                        case 'date': {
                          formEleComponent = <a-date-picker
                            valueFormat="YYYY-MM-DD"
                            {...formEleComponentProps}
                            showTime={formItemConfig?.timePickerAttrs}
                          ></a-date-picker>
                          break;
                        }
                        case 'date-time': {
                          formEleComponent = <a-date-picker
                            valueFormat="YYYY-MM-DD HH:mm:ss"
                            {...formEleComponentProps}
                            showTime={formItemConfig?.timePickerAttrs}
                          ></a-date-picker>
                          break;
                        }
                        case 'numberRange': {
                          formEleComponent = <a-slider
                            {...formEleComponentProps}
                            range
                          ></a-slider>
                          break;
                        }
                        case 'upload': {
                          formEleComponent = <Upload
                            {...formEleComponentProps}>
                            {
                              {
                                ...(slots[`upload-${formItemConfig.key}-fileList`] && {
                                  fileList: ({ fileList }) => slots[`upload-${formItemConfig.key}-fileList`](fileList)
                                }),
                                ...(slots[`upload-${formItemConfig.key}-previewContent`] && {
                                  previewContent: ({ data }) => slots[`upload-${formItemConfig.key}-previewContent`](data)
                                }),
                              }
                            }
                          </Upload>
                          break;
                        }
                        /* case 'recordList':{
                          formEleComponent=
                          break;
                        } */
                        case 'custom': {
                          formEleComponent = slots[`custom-${formItemConfig.key}`](formEleComponentProps)
                          break;
                        }
                      }

                      return <a-formItem
                        {...formItemComponentProps}
                      >
                        {formEleComponent}
                      </a-formItem>
                    }
                    else {
                      return null
                    }
                  })
                }
              </div>
              return row[1] ? withDirectives(rowContent, [[layout, row[1]]]) : rowContent
            })
          }
        </div>
      </a-form>
      {
        props.config.showButton && withDirectives(<div>
          {slots.button ? slots.button() : <div>
            <a-button type="primary" onClick={submitButtonClickHandler} style="margin-right: 20px">确认</a-button>
            <a-button onClick={clearFormData}>清空</a-button>
          </div>}
        </div>, [[layout, { xStyle: 'center' }]])
      }
    </>
  }
})

