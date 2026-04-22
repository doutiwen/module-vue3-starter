import predefineValidateRules from './predefineValidateRules.js';

const advFormProps = {
  modelValue: {
    type: Object,
  },
  config: {
    type: Object,
    required: true,
  },
};
const advFormEmits = ['update:modelValue', 'input', 'validateSuccess', 'validateFail'];

const useAdvForm = (
  { config, modelValue },
  emits,
  formRef,
  UIAttrsTransform,
  vModelKey = 'value'
) => {
  const watchManager = new WatchManager();
  const formItemRowList = ref([]); // [[id,每一行样式,表单元素...]]
  const formItemDict = computed(() => {
    const dictInfo = {};
    for (const row of formItemRowList.value) {
      row.slice(2).forEach((item) => {
        dictInfo[item.key] = item;
      });
    }
    return dictInfo;
  });
  const formEleComponentProps = {};
  let currentInputKey;
  const formItemHasDataTransform = (key) => {
    const formItemConfig = formItemDict.value[key];
    return typeof formItemConfig?.get === 'function' && typeof formItemConfig?.set === 'function';
  };
  const formDataState = reactive({});
  watch(
    modelValue,
    (n, o) => {
      if (n) {
        for (const [key, val] of Object.entries(n)) {
          const formItemConfig = formItemDict.value[key];
          currentInputKey = key;
          if (val ?? false) {
            if (formItemHasDataTransform(key)) {
              formDataState[key] = formItemConfig.get(val);
            } else {
              formDataState[key] = val;
            }
          } else {
            formDataState[key] = val;
          }
        }
      }
    },
    {
      deep: true,
      immediate: true,
    }
  );
  watch(
    formDataState,
    (n, o) => {
      emits('input', {
        key: currentInputKey,
        data: n[currentInputKey],
      });
    },
    {
      deep: true,
      flush: 'sync',
    }
  );
  const validateRules = ref({});
  const formItemRef = new Map();
  const formEleComponentShowInfo = ref({});
  const formEleComponentOptionsInfo = {};

  const isOwnOptionsType = (type) => {
    return ['select', 'treeSelect', 'radio', 'checkbox'].includes(type);
  };
  const setFormItemRef = (formItemKey, ref) => {
    formItemRef.set(formItemKey, ref);
  };
  const getFormItemRef = (formItemKey) => {
    return formItemRef.get[formItemKey];
  };
  const formItemToggleShow = (key, newShowValue) => {};
  const validateConfigItemFormat = (sourceValidateItem, label) => {
    const targetValidateRuleItem = {};
    if (sourceValidateItem.type && Reflect.has(predefineValidateRules, sourceValidateItem.type)) {
      Object.assign(
        targetValidateRuleItem,
        { type: sourceValidateItem.type },
        predefineValidateRules[sourceValidateItem.type]
      );
    } else if (sourceValidateItem.type) {
      Object.assign(targetValidateRuleItem, { type: sourceValidateItem.type }, sourceValidateItem);
    } else {
      Object.assign(targetValidateRuleItem, { type: 'custom' }, sourceValidateItem);
    }
    if (typeof targetValidateRuleItem.notice === 'function') {
      targetValidateRuleItem.notice = targetValidateRuleItem.notice(label);
    }
    return targetValidateRuleItem;
  };
  //获取给组件watch配置中的handle方法使用的参数
  const getWatchHandleArgs = (keys) => {
    const watchHandleArgs = {
      optionsInfo: Object.entries(formEleComponentOptionsInfo).reduce((newObj, [key, value]) => {
        newObj[key] = value.value;
        return newObj;
      }, {}),
      currentSelectInfo: {},
      formData: { ...formDataState },
    };
    keys.forEach((key) => {
      if (formEleComponentOptionsInfo[key]) {
        watchHandleArgs.currentSelectInfo[key] = formEleComponentOptionsInfo[key].value.find(
          (i) => i.value === formDataState[key]
        );
      }
      watchHandleArgs[key] = formDataState[key];
    });
    return watchHandleArgs;
  };
  //获取给vue watch方法使用的参数
  const getWatchSetting = (key, sourceWatchConfig, vueWatchHandleFn) => {
    const targetWatchConfig = {
      keys: [],
      handle: null,
    };
    if (typeof sourceWatchConfig === 'string') {
      const keyNameRegex = /[a-zA-Z_$][a-zA-Z0-9_$]*/g;
      const allMatches = sourceWatchConfig.match(keyNameRegex) || [];
      const allKeys = [...new Set(allMatches)];
      targetWatchConfig.keys.push(...allKeys);
      targetWatchConfig.handle = new Function(
        `{${targetWatchConfig.keys.join(',')}}`,
        `return ${sourceWatchConfig}`
      );
    } else if (sourceWatchConfig.keys) {
      if (typeof sourceWatchConfig.keys === 'string') {
        targetWatchConfig.keys.push(sourceWatchConfig.keys);
      } else if (getVarType(sourceWatchConfig.keys) === 'array') {
        targetWatchConfig.keys.push(...sourceWatchConfig.keys);
      }

      if (sourceWatchConfig.handle) {
        targetWatchConfig.handle = sourceWatchConfig.handle;
      } else {
        targetWatchConfig.handle = new Function(
          `{${targetWatchConfig.keys.join(',')}}`,
          `return ${targetWatchConfig.keys.join('&&')}`
        );
      }
    }
    const watchSetting = [
      computed(() => targetWatchConfig.keys.map((key) => formDataState[key])),
      () => {
        vueWatchHandleFn(key, targetWatchConfig.keys, targetWatchConfig.handle);
      },
    ];
    return watchSetting;
  };
  const updateFormDataState = (key, value) => {
    currentInputKey = key;
    let realValue = value;
    const formItemConfig = formItemDict.value[key];
    if (toValue(modelValue)) {
      if (formItemHasDataTransform(key)) {
        realValue = formItemConfig.set(value);
      }
      emits(
        'update:modelValue',
        Object.assign(toValue(modelValue), {
          [key]: realValue,
        })
      );
    } else {
      if (formItemHasDataTransform(key)) {
        realValue = formItemConfig.get(formItemConfig.set(value));
      }
      formDataState[key] = realValue;
    }
  };
  //表单项显隐watch处理方法
  const formEleItemShowChangeFn = (key, watchKeys, handle) => {
    const isShow = handle(getWatchHandleArgs(watchKeys));
    if (!isShow) {
      formDataState[key] = undefined;
    }
    formEleComponentShowInfo.value[key] = isShow;
  };
  //表单项options watch处理方法
  const formEleItemOptionsChangeFn = (key, watchKeys, handle) => {
    const handleArgs = getWatchHandleArgs(watchKeys);
    if (getVarType(handle) === 'asyncFunction') {
      handle(handleArgs).then((res) => {
        updateFormDataState(key, undefined);
        formEleComponentOptionsInfo[key].value = res;
      });
    } else if (typeof handle === 'function') {
      updateFormDataState(key, undefined);
      formEleComponentOptionsInfo[key].value = handle(handleArgs);
    }
  };
  const formEleItemBindValueChangeFn = (key, watchKeys, handle) => {
    updateFormDataState(key, handle(getWatchHandleArgs(watchKeys)));
  };
  const formEleItemValidateChangeFn = (key, watchKeys, handle) => {
    const newValidateRules = handle(getWatchHandleArgs(watchKeys));
    if (newValidateRules) {
      formDataState[key] = undefined;
      validateRules.value[key] = newValidateRules.map((validateItem) => {
        return validateConfigItemFormat(validateItem, sourceFormItem.label);
      });
      formRef.value?.clearValidate();
    } else {
      Reflect.deleteProperty(validateRules.value, key);
    }
  };
  const setFormItemWatch = (sourceFormItem) => {
    const formItemKey = sourceFormItem.key;
    //处理显隐
    if (sourceFormItem?.show) {
      formEleComponentShowInfo.value[sourceFormItem.key] = false;
      const watchSetting = getWatchSetting(
        formItemKey,
        sourceFormItem.show,
        formEleItemShowChangeFn
      );
      watchManager.setWatchInfo(formItemKey, watchSetting);
    }
    //处理options的变化
    if (sourceFormItem?.options?.watch) {
      const watchSetting = getWatchSetting(
        formItemKey,
        sourceFormItem.options.watch,
        formEleItemOptionsChangeFn
      );
      watchManager.setWatchInfo(formItemKey, watchSetting);
    }
    //处理值的联动
    if (sourceFormItem?.watch) {
      const watchSetting = getWatchSetting(
        formItemKey,
        sourceFormItem.watch,
        formEleItemBindValueChangeFn
      );
      watchManager.setWatchInfo(formItemKey, watchSetting);
    }
    //处理验证规则的联动
    if (sourceFormItem?.validate?.watch) {
      const watchSetting = getWatchSetting(
        formItemKey,
        sourceFormItem.validate.watch,
        formEleItemValidateChangeFn
      );
      watchManager.setWatchInfo(formItemKey, watchSetting);
    }
  };
  const setValidateConfig = (sourceFormItem) => {
    if (sourceFormItem.validate) {
      const targetValidateRules = [];
      if (getVarType(sourceFormItem.validate) === 'array') {
        for (const validateItem of sourceFormItem.validate) {
          targetValidateRules.push(validateConfigItemFormat(validateItem, sourceFormItem.label));
        }
      }
      validateRules.value[sourceFormItem.key] = targetValidateRules;
    }
  };
  const formItemConfigFormat = (sourceFormItem) => {
    const targetFormItem = {
      ...sourceFormItem,
    };
    const formItemKey = sourceFormItem.key;
    //处理option列表
    if (isOwnOptionsType(sourceFormItem.type)) {
      formEleComponentOptionsInfo[formItemKey] = shallowRef([]);
      if (sourceFormItem.options) {
        if (getVarType(sourceFormItem.options) === 'asyncFunction') {
          //option列表靠异步方法获取
          const getOptionsFn = sourceFormItem.options;
          getOptionsFn().then((res) => {
            formEleComponentOptionsInfo[formItemKey].value = res;
          });
        } else if (getVarType(sourceFormItem.options) === 'function') {
          //option列表靠同步方法获取
          const getOptionsFn = sourceFormItem.options;
          formEleComponentOptionsInfo[formItemKey].value = getOptionsFn();
        } else if (getVarType(sourceFormItem.options) === 'array') {
          //直接赋值数组
          formEleComponentOptionsInfo[formItemKey].value = sourceFormItem.options;
        }
      }
    }
    //处理提示信息
    if (!Reflect.has(sourceFormItem, 'placeholder')) {
      switch (sourceFormItem.type) {
        case 'select':
        case 'treeSelect':
        case 'radio':
        case 'checkbox':
        case 'switch': {
          targetFormItem.placeholder = `请选择${sourceFormItem.label}`;
          break;
        }
        default: {
          targetFormItem.placeholder = `请输入${sourceFormItem.label}`;
        }
      }
    }
    //UI组件属性
    if (UIAttrsTransform) {
      targetFormItem.attrs = UIAttrsTransform(targetFormItem.attrs);
    } else if (!sourceFormItem?.attrs) {
      targetFormItem.attrs = {};
    }
    return targetFormItem;
  };
  const getFormEleComponentProps = (sourceFormItem) => {
    const key = sourceFormItem.key;
    if (!formEleComponentProps[key]) {
      formEleComponentProps[key] = {
        [`onUpdate:${vModelKey}`]: (value) => {
          updateFormDataState(key, value);
        },
        placeholder: sourceFormItem.placeholder,
        ...(sourceFormItem.attrs ?? {}),
        ...(sourceFormItem.events ?? {}),
        ref: (el) => setFormItemRef(key, el),
      };
    }
    return formEleComponentProps[key];
  };
  const setFormEleComponentShowInfo = (sourceFormItem) => {
    formEleComponentShowInfo.value[sourceFormItem.key] = true;
  };
  const setFormDataState = (sourceFormItem) => {
    let realValue = undefined;
    if (!sourceFormItem?.watch) {
      if (typeof sourceFormItem?.defaultValue === 'function') {
        realValue = sourceFormItem.defaultValue();
      } else if (Reflect.has(sourceFormItem, 'defaultValue')) {
        realValue = sourceFormItem.defaultValue;
      }
    }
    formDataState[sourceFormItem.key] = realValue;
  };
  const initFormRow = (formatRow) => {
    if (formatRow.length > 2) {
      const targetRow = [...formatRow];
      formatRow.forEach((sourceFormItem, index) => {
        if (index >= 2) {
          targetRow[index] = formItemConfigFormat(sourceFormItem);
          setFormEleComponentShowInfo(sourceFormItem);
          setValidateConfig(sourceFormItem);
          setFormItemWatch(sourceFormItem);
        }
      });
      formItemRowList.value.push(targetRow);
    }
  };
  const settingStrToVLayoutAttrs = (settingStr) => {
    const vLayoutAttrs = {};
    const attrStrList = settingStr
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean);
    attrStrList.forEach((attrStr) => {
      const colonIndex = attrStr.indexOf(':');
      if (colonIndex !== -1) {
        const key = attrStr.slice(0, colonIndex).trim();
        const value = attrStr.slice(colonIndex + 1).trim();
        vLayoutAttrs[key] = value;
      }
    });
    return vLayoutAttrs;
  };
  const initForm = (sourceData) => {
    if (sourceData?.length) {
      if (getVarType(sourceData[0]) === 'array') {
        for (const sourceRow of sourceData) {
          initFormRow([
            new UUId().getNewId(),
            { type: 'list-card', itemSize: '220px,auto', gap: '15px' },
            ...sourceRow,
          ]);
        }
      } else if (getVarType(sourceData[0]) === 'string') {
        initFormRow([
          new UUId().getNewId(),
          settingStrToVLayoutAttrs(sourceData[0]),
          ...sourceData.slice(1),
        ]);
      } else {
        for (const sourceFormItem of sourceData) {
          initFormRow([new UUId().getNewId(), null, sourceFormItem]);
        }
      }
      watchManager.registerWatch();
    }
  };
  const submit = () => {
    return new Promise((res, rej) => {
      formRef.value
        .validate()
        .then(() => {
          const submitData = cleanObject(formDataState, (sourceValue, key) => {
            const formItem = formItemDict.value[key];
            let realValue;
            if (formItemHasDataTransform(key)) {
              realValue = formItem.set(sourceValue);
            } else {
              if (Array.isArray(sourceValue)) {
                realValue = [...sourceValue];
              } else if (typeof sourceValue === 'object') {
                realValue = { ...sourceValue };
              } else {
                realValue = sourceValue;
              }
            }
            return realValue;
          });
          res(submitData);
          emits('validateSuccess', submitData);
        })
        .catch((err) => {
          console.log('验证失败', err);
          rej(err);
          emits('validateFail', err);
        });
    });
  };
  const clearFormData = () => {
    for (const key of Object.keys(formDataState)) {
      const formItem = formItemRowList.value.find((i) => i.key === key);
      if (Reflect.has(formItem, 'defaultValue')) {
        if (getVarType(formItem.defaultValue) === 'asyncFunction') {
          formItem.defaultValue().then((res) => {
            formDataState[key] = res;
          });
        } else if (typeof formItem.defaultValue === 'function') {
          formDataState[key] = formItem.defaultValue();
        } else {
          formDataState[key] = formItem.defaultValue;
        }
      } else {
        formDataState[key] = undefined;
      }
    }
  };
  initForm(config.value.list);

  onUnmounted(() => {
    watchManager.clear();
  });

  const submitButtonClickHandler = () => {
    submit().catch(() => {}); //避免浏览器控制台报错
  };

  const defineExposeConfig = {
    submit,
    clearFormData,
  };

  return {
    formItemRowList: formItemRowList,
    formItemDict: formItemDict,
    formDataState: formDataState,
    validateRules: validateRules,
    getFormEleComponentProps,
    formEleComponentShowInfo: formEleComponentShowInfo,
    formEleComponentOptionsInfo: formEleComponentOptionsInfo,
    setFormItemRef,
    getFormItemRef,
    submit,
    submitButtonClickHandler,
    clearFormData,
    defineExposeConfig,
  };
};

export { useAdvForm, advFormProps, advFormEmits };
