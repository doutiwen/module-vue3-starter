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
    const eleFormRef = ref();
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
    } = useAdvForm(toRefs(props), emit, eleFormRef, null, 'modelValue');


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
              case 'custom': {
                targetValidateRules.push(
                  Object.assign(targetValidateRuleItem, {
                    validator: (rule, value, callback) => {
                      if (sourceRule.validateFn(rule, value, formDataState.value)) {
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



    expose(defineExposeConfig);
    return () => <>
      <el-form
        model={formDataState}
        rules={validateRulesEle.value}
        {...props.config.attrs}
        ref={eleFormRef}
        validate-on-rule-change={false}
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
                      formEleComponentProps.modelValue = formDataState[formItemConfig.key]
                      const formItemComponentProps = {
                        style: formItemConfig?.style || null,
                        label: formItemConfig.label,
                        prop: formItemConfig.key,
                        ...(formItemConfig.UIformItemAttrs ?? props.config.UIformItemAttrs ?? {})
                      }

                      switch (formItemConfig.type) {
                        case 'input': {
                          formEleComponent = <el-input
                            {...formEleComponentProps}
                          >{
                              slots[`input-addonAfter-${formItemConfig.key}`] && {
                                addonAfter: () => slots[`input-addonAfter-${formItemConfig.key}`]
                              }
                            }
                          </el-input>
                          break;
                        }
                        case 'number': {
                          formEleComponent = <el-inputNumber
                            {...formEleComponentProps}
                          ></el-inputNumber>
                          break;
                        }
                        case 'textarea': {
                          formEleComponent = <el-input
                            show-word-limit={true}
                            type="textarea"
                            {...formEleComponentProps}
                          ></el-input>
                          break;
                        }
                        case 'select': {
                          formEleComponent = <el-select
                            {...formEleComponentProps}
                          >
                            {
                              formEleComponentOptionsInfo[formItemConfig.key].value.map(optionItem => <el-option
                                {...(optionItem.optionAttrs ?? {})}
                                key={optionItem.value}
                                value={optionItem.value}
                                label={optionItem.label}
                              ></el-option>)
                            }
                          </el-select>
                          break;
                        }
                        case 'radio': {
                          formEleComponent = <el-radio-group
                            {...formEleComponentProps}
                          >
                            {
                              formEleComponentOptionsInfo[formItemConfig.key].value.map(radioItemConfig => <el-radio
                                key={radioItemConfig.value}
                                value={radioItemConfig.value}
                                {...(radioItemConfig.optionAttrs ?? {})}
                              >
                                {radioItemConfig.label}
                              </el-radio>)
                            }
                          </el-radio-group>
                          break;
                        }
                        case 'checkbox': {
                          formEleComponent = <el-checkbox-group
                            {...formEleComponentProps}
                          >
                            {
                              formEleComponentOptionsInfo[formItemConfig.key].value.map(radioItemConfig => <el-checkbox
                                {...(radioItemConfig.optionAttrs ?? {})}
                                key={radioItemConfig.value}
                                value={radioItemConfig.value}
                                label={radioItemConfig.label}
                              >
                              </el-checkbox>)
                            }
                          </el-checkbox-group>
                          break;
                        }
                        case 'treeSelect': {
                          formEleComponent = <el-tree-select
                            dropdown-style={{ maxHeight: '400px', overflow: 'auto' }}
                            {...formEleComponentProps}
                            tree-data={formItemConfig.options}
                          ></el-tree-select>
                          break;
                        }
                        case 'switch': {
                          formEleComponent = <el-switch
                            {...formEleComponentProps}
                          ></el-switch>
                          break;
                        }
                        case 'time': {
                          formEleComponent = <el-time-picker
                            valueFormat="HH:mm:ss"
                            showTime={formItemConfig?.timePickerAttrs}
                            {...formEleComponentProps}
                          ></el-time-picker>
                          break;
                        }
                        case 'date': {
                          formEleComponent = <el-date-picker
                            valueFormat="YYYY-MM-DD"
                            {...formEleComponentProps}
                            showTime={formItemConfig?.timePickerAttrs}
                          ></el-date-picker>
                          break;
                        }
                        case 'date-time': {
                          formEleComponent = <el-date-picker
                            valueFormat="YYYY-MM-DD HH:mm:ss"
                            {...formEleComponentProps}
                            showTime={formItemConfig?.timePickerAttrs}
                          ></el-date-picker>
                          break;
                        }
                        case 'numberRange': {
                          formEleComponent = <el-slider
                            {...formEleComponentProps}
                            range
                          ></el-slider>
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
                          formEleComponent = slots[`custom-${formItemConfig.key}`]({ ...formEleComponentProps })
                          break;
                        }
                      }

                      return <el-formItem
                        {...formItemComponentProps}
                      >
                        {formEleComponent}
                      </el-formItem>
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
      </el-form>
      {
        props.config.showButton && withDirectives(<div>
          {slots.button ? slots.button() : <div>
            <el-button type="primary" onClick={submitButtonClickHandler} style="margin-right: 20px">确认</el-button>
            <el-button onClick={clearFormData}>清空</el-button>
          </div>}
        </div>, [[layout, { xStyle: 'center' }]])
      }
    </>
  }
})

