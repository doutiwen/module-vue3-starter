import predefineValidateRules from './predefineValidateRules.js';
import { ref, computed, reactive, watch, onUnmounted, shallowRef } from 'vue';

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

  const formItemRowList = ref([]);

  const formItemDict = computed(() => {
    const dictInfo = {};
    for (const item of formItemRowList.value) {
      dictInfo[item.key] = item;
    }
    return dictInfo;
  });

  const formEleComponentProps = {};

  let currentInputKey;

  const _config = toValue(config);

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

  const formEleComponentAttrsInfo = {};

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
      const ruleFactory = predefineValidateRules[sourceValidateItem.type];
      // 支持工厂函数类型的预定义规则（如 sameWith(targetFieldName)）
      const ruleFromPredefine =
        typeof ruleFactory === 'function'
          ? ruleFactory(sourceValidateItem.targetFieldName)
          : ruleFactory;
      Object.assign(
        targetValidateRuleItem,
        { type: sourceValidateItem.type },
        ruleFromPredefine
      );
    } else if (sourceValidateItem.type) {
      Object.assign(targetValidateRuleItem, { type: sourceValidateItem.type }, sourceValidateItem);
    } else {
      Object.assign(targetValidateRuleItem, { type: 'custom' }, sourceValidateItem);
    }
    if (typeof targetValidateRuleItem.notice === 'function') {
      targetValidateRuleItem.notice = targetValidateRuleItem.notice(label);
    }
    // 配置中的 message 可覆盖预定义规则的默认提示
    if (sourceValidateItem.message) {
      targetValidateRuleItem.notice = sourceValidateItem.message;
    }
    return targetValidateRuleItem;
  };

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

  const getWatchSetting = (key, sourceWatchConfig, vueWatchHandleFn) => {
    const targetWatchConfig = {
      keys: [],
      handle: null,
    };
    let watchSetting;
    if (typeof sourceWatchConfig === 'string') {
      const keyNameRegex = /[a-zA-Z_$][a-zA-Z0-9_$]*/g;
      const allMatches = sourceWatchConfig.match(keyNameRegex) || [];
      const allKeys = [...new Set(allMatches)];
      targetWatchConfig.keys.push(...allKeys);
      targetWatchConfig.handle = new Function(
        `{${targetWatchConfig.keys.join(',')}}`,
        `return ${sourceWatchConfig}`
      );
      watchSetting = [
        computed(() => targetWatchConfig.keys.map((key) => formDataState[key])),
        () => {
          vueWatchHandleFn(key, targetWatchConfig.keys, targetWatchConfig.handle);
        },
      ];
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
      watchSetting = [
        computed(() => targetWatchConfig.keys.map((key) => formDataState[key])),
        () => {
          vueWatchHandleFn(key, targetWatchConfig.keys, targetWatchConfig.handle);
        },
      ];
      if (sourceWatchConfig?.option) {
        watchSetting.push(sourceWatchConfig.option);
      }
    }
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

  const formEleItemShowChangeFn = (key, watchKeys, handle) => {
    const isShow = handle(getWatchHandleArgs(watchKeys));
    if (!isShow) {
      formDataState[key] = undefined;
    }
    formEleComponentShowInfo.value[key] = isShow;
  };

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
    // 控制表单项显隐
    if (sourceFormItem?.show) {
      // 数组格式：展开为 Vue3 watch 参数 [source, callback, options?]
      // 对 callback 进行包装，将其返回值交由 formEleItemShowChangeFn 更新属性
      if (getVarType(sourceFormItem.show) === 'array') {
        const [source, callback, options] = sourceFormItem.show;
        const wrappedWatchSetting = [
          source,
          (newVal, oldVal) => {
            const result = callback(newVal, oldVal);
            formEleItemShowChangeFn(formItemKey, [], () => result);
          },
          options,
        ].filter(Boolean);
        formEleComponentShowInfo.value[formItemKey] = false;
        watchManager.setWatchInfo(formItemKey, wrappedWatchSetting);
      } else {
        formEleComponentShowInfo.value[sourceFormItem.key] = false;
        const watchSetting = getWatchSetting(
          formItemKey,
          sourceFormItem.show,
          formEleItemShowChangeFn
        );
        watchManager.setWatchInfo(formItemKey, watchSetting);
      }
    }
    // 动态更新选项数据
    if (sourceFormItem?.options?.watch) {
      // 数组格式：展开为 Vue3 watch 参数 [source, callback, options?]
      // 对 callback 进行包装，将其返回值交由 formEleItemOptionsChangeFn 更新属性
      if (getVarType(sourceFormItem.options.watch) === 'array') {
        const [source, callback, options] = sourceFormItem.options.watch;
        const wrappedWatchSetting = [
          source,
          (newVal, oldVal) => {
            const result = callback(newVal, oldVal);
            formEleItemOptionsChangeFn(formItemKey, [], () => result);
          },
          options,
        ].filter(Boolean);
        watchManager.setWatchInfo(formItemKey, wrappedWatchSetting);
      } else {
        const watchSetting = getWatchSetting(
          formItemKey,
          sourceFormItem.options.watch,
          formEleItemOptionsChangeFn
        );
        watchManager.setWatchInfo(formItemKey, watchSetting);
      }
    }
    // 动态更新校验规则
    if (sourceFormItem?.validate?.watch) {
      // 数组格式：展开为 Vue3 watch 参数 [source, callback, options?]
      // 对 callback 进行包装，将其返回值交由 formEleItemValidateChangeFn 更新属性
      if (getVarType(sourceFormItem.validate.watch) === 'array') {
        const [source, callback, options] = sourceFormItem.validate.watch;
        const wrappedWatchSetting = [
          source,
          (newVal, oldVal) => {
            const result = callback(newVal, oldVal);
            formEleItemValidateChangeFn(formItemKey, [], () => result);
          },
          options,
        ].filter(Boolean);
        watchManager.setWatchInfo(formItemKey, wrappedWatchSetting);
      } else {
        const watchSetting = getWatchSetting(
          formItemKey,
          sourceFormItem.validate.watch,
          formEleItemValidateChangeFn
        );
        watchManager.setWatchInfo(formItemKey, watchSetting);
      }
    }
    // 动态更新表单值
    if (sourceFormItem?.value?.watch) {
      // 数组格式：展开为 Vue3 watch 参数 [source, callback, options?]
      // 对 callback 进行包装，将其返回值交由 formEleItemBindValueChangeFn 更新属性
      if (getVarType(sourceFormItem.value.watch) === 'array') {
        const [source, callback, options] = sourceFormItem.value.watch;
        const wrappedWatchSetting = [
          source,
          (newVal, oldVal) => {
            const result = callback(newVal, oldVal);
            formEleItemBindValueChangeFn(formItemKey, [], () => result);
          },
          options,
        ].filter(Boolean);
        watchManager.setWatchInfo(formItemKey, wrappedWatchSetting);
      } else {
        const watchSetting = getWatchSetting(
          formItemKey,
          sourceFormItem.value.watch,
          formEleItemBindValueChangeFn
        );
        watchManager.setWatchInfo(formItemKey, watchSetting);
      }
    }

    // 动态更新自定义属性
    const watchConfig = sourceFormItem?.watch;
    if (watchConfig) {
      // 更新自定义属性的通用逻辑
      const updateFormEleAttrs = (key, newValue) => {
        if (!formEleComponentAttrsInfo[key]) {
          formEleComponentAttrsInfo[key] = {};
        }
        if (getVarType(newValue) === 'object') {
          for (const [attrKey, attrValue] of Object.entries(newValue)) {
            if (!formEleComponentAttrsInfo[key][attrKey]) {
              formEleComponentAttrsInfo[key][attrKey] = ref(attrValue);
            } else {
              formEleComponentAttrsInfo[key][attrKey].value = attrValue;
            }
          }
        }
      };

      if (watchConfig.keys) {
        // 有 keys：标准 watch 配置，通过 getWatchSetting 处理
        const watchSetting = getWatchSetting(formItemKey, watchConfig, (key, watchKeys, handle) => {
          const newValue = handle(getWatchHandleArgs(watchKeys));
          updateFormEleAttrs(key, newValue);
        });
        watchManager.setWatchInfo(formItemKey, watchSetting);
      } else if (getVarType(watchConfig) === 'array') {
        // 无 keys 且为数组：展开为 Vue3 watch 参数 [source, callback, options?]
        // 对 callback 进行包装，将其返回值更新到 formEleComponentAttrsInfo
        const [source, callback, options] = watchConfig;
        const wrappedWatchSetting = [
          source,
          (newVal, oldVal) => {
            const result = callback(newVal, oldVal);
            updateFormEleAttrs(formItemKey, result);
          },
          options,
        ].filter(Boolean);
        watchManager.setWatchInfo(formItemKey, wrappedWatchSetting);
      }
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
    if (isOwnOptionsType(sourceFormItem.type)) {
      formEleComponentOptionsInfo[formItemKey] = shallowRef([]);
      if (sourceFormItem.options) {
        if (getVarType(sourceFormItem.options) === 'asyncFunction') {
          const getOptionsFn = sourceFormItem.options;
          getOptionsFn(formDataState).then((res) => {
            formEleComponentOptionsInfo[formItemKey].value = res;
          });
        } else if (getVarType(sourceFormItem.options) === 'function') {
          const getOptionsFn = sourceFormItem.options;
          formEleComponentOptionsInfo[formItemKey].value = getOptionsFn(formDataState);
        } else if (getVarType(sourceFormItem.options) === 'array') {
          formEleComponentOptionsInfo[formItemKey].value = sourceFormItem.options;
        }
      }
    }
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
    if (UIAttrsTransform) {
      targetFormItem.attrs = UIAttrsTransform(targetFormItem.attrs);
    } else if (!sourceFormItem?.attrs) {
      targetFormItem.attrs = {};
    }

    if (sourceFormItem.attrs) {
      formEleComponentAttrsInfo[formItemKey] = {};
      for (const [attrKey, attrValue] of Object.entries(sourceFormItem.attrs)) {
        formEleComponentAttrsInfo[formItemKey][attrKey] = ref(attrValue);
      }
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
    const attrsInfo = formEleComponentAttrsInfo[key] ?? {};
    for (const [attrKey, attrRef] of Object.entries(attrsInfo)) {
      formEleComponentProps[key][attrKey] = attrRef.value;
    }
    return formEleComponentProps[key];
  };

  const setFormEleComponentShowInfo = (sourceFormItem) => {
    formEleComponentShowInfo.value[sourceFormItem.key] = true;
  };

  const setFormDataState = (sourceFormItem) => {
    if (formDataState[sourceFormItem.key] != null) return;
    let realValue = undefined;
    if (!sourceFormItem?.value?.watch) {
      if (getVarType(sourceFormItem?.defaultValue) === 'asyncFunction') {
        sourceFormItem.defaultValue().then((res) => {
          if (formDataState[sourceFormItem.key] == null) {
            formDataState[sourceFormItem.key] = res;
          }
        });
      } else if (typeof sourceFormItem?.defaultValue === 'function') {
        realValue = sourceFormItem.defaultValue();
      } else if (Reflect.has(sourceFormItem, 'defaultValue')) {
        realValue = sourceFormItem.defaultValue;
      }
    }
    formDataState[sourceFormItem.key] = realValue;
  };

  // 计算最大公约数
  const gcd = (a, b) => {
    while (b !== 0) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  };

  // 计算最小公倍数
  const lcm = (a, b) => {
    if (a === 0 || b === 0) return 0;
    return (a * b) / gcd(a, b);
  };

  // 计算数组的最小公倍数
  const lcmOfArray = (arr) => {
    return arr.reduce((acc, val) => lcm(acc, val), 1);
  };

  // 计算表格网格配置
  const computedGridConfig = ref(null);

  const initForm = (sourceData) => {
    if (sourceData?.length) {
      let allFormItems = [];
      const isTwoDimensional = getVarType(sourceData[0]) === 'array';

      if (isTwoDimensional) {
        // 二维数组：记录每行元素个数，转换为一维
        const rowLengthList = [];
        for (const sourceRow of sourceData) {
          rowLengthList.push(sourceRow.length);
          allFormItems.push(...sourceRow);
        }

        // 计算最小公倍数作为总列数（仅二维数组时自动计算）
        const totalCols = lcmOfArray(rowLengthList);
        computedGridConfig.value = {
          cols: `repeat(${totalCols}, 1fr)`,
          rows: _config?.grid?.rows || 'auto',
          gap: _config?.grid?.gap || '20px',
        };

        // 为每个表单项设置 grid.col
        for (const sourceRow of sourceData) {
          const rowSpan = totalCols / sourceRow.length;
          sourceRow.forEach((item) => {
            if (!item.grid) item.grid = {};
            item.grid.col = `span ${rowSpan}`;
          });
        }
      } else {
        // 一维数组：使用用户配置的 grid，不自动计算
        allFormItems.push(...sourceData);

        // 一维数组时，使用用户配置或默认值（默认一行一个）
        computedGridConfig.value = {
          cols: _config?.grid?.cols || 'repeat(1, 1fr)',
          rows: _config?.grid?.rows || 'auto',
          gap: _config?.grid?.gap || '16px',
        };
      }

      // 处理所有表单项（废弃行概念，直接扁平化）
      allFormItems.forEach((sourceFormItem) => {
        const formattedItem = formItemConfigFormat(sourceFormItem);
        setFormEleComponentShowInfo(sourceFormItem);
        setValidateConfig(sourceFormItem);
        setFormItemWatch(sourceFormItem);
        setFormDataState(sourceFormItem);
        formItemRowList.value.push(formattedItem);
      });

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
              if (sourceValue instanceof File || sourceValue instanceof Blob) {
                // File/Blob 对象的属性都是不可枚举的原型属性，
                // { ...file } 会得到空对象，必须直接保留原始引用
                realValue = sourceValue;
              } else if (Array.isArray(sourceValue)) {
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

  initForm(_config.list);

  onUnmounted(() => {
    watchManager.clear();
  });

  const submitButtonClickHandler = () => {
    submit().catch(() => {});
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
    formEleComponentAttrsInfo: formEleComponentAttrsInfo,
    setFormItemRef,
    getFormItemRef,
    submit,
    submitButtonClickHandler,
    clearFormData,
    defineExposeConfig,
    computedGridConfig,
  };
};

/**
 * 创建数字类型输入过滤器
 * 用于 phone / intNumber / number 类型，阻止非数字字符输入
 *
 * @param {'phone'|'intNumber'|'number'} type - 输入类型
 * @returns {{ filterFn: (value: any) => string, maxlength?: number }}
 */
const createNumberInputFilter = (type) => {
  switch (type) {
    case 'phone':
      return {
        filterFn: (value) => String(value ?? '').replace(/\D/g, '').slice(0, 11),
        maxlength: 11,
      };
    case 'intNumber':
      return {
        filterFn: (value) => String(value ?? '').replace(/\D/g, ''),
      };
    case 'number':
      return {
        filterFn: (value) => {
          let str = String(value ?? '').replace(/[^\d.]/g, '');
          // 只保留第一个小数点
          const dotIndex = str.indexOf('.');
          if (dotIndex !== -1) {
            str = str.substring(0, dotIndex + 1) + str.substring(dotIndex + 1).replace(/\./g, '');
          }
          return str;
        },
      };
    default:
      return { filterFn: (value) => String(value ?? '') };
  }
};

export { useAdvForm, advFormProps, advFormEmits, createNumberInputFilter };
