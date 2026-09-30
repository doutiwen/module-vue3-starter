<template>
  <AdvRecordsManagerOriginal
    :class="$style['custom_adv_records_manager']"
    v-bind="$attrs"
    :buttonList="props.buttonList"
    :toolBarConfig="processedToolBarConfig"
    :recordListConfig="processedRecordListConfig"
    :modalConfigList="processedModalConfigList"
    ref="originalAdvRecordsManagerRef"
  >
    <!-- 将所有 AdvRecordsManager 相关插槽透传 -->
    <template
      v-for="(_, slotName) in $slots"
      #[slotName]="slotProps"
    >
      <slot
        :name="slotName"
        v-bind="slotProps || {}"
      ></slot>
    </template>
  </AdvRecordsManagerOriginal>
</template>

<script setup>
  /**
   * AdvRecordsManager - 高级记录管理组件（入口组件）
   *
   * 【组件功能】
   * 基于 AdvRecordsManagerOriginal 封装的高级记录管理组件。
   * 本组件为通用层，不依赖具体应用的权限 store：
   * 按钮权限列表（buttonList）由应用层以 prop 形式注入，
   * 各应用可在 app 的公共组件库中创建同名组件读取自身 store 后传入。
   *
   * 【组件架构】
   * AdvRecordsManager (当前组件，通用层)
   *   └── AdvRecordsManagerOriginal (原始记录管理器，业务层)
   *
   * 【核心特性】
   * 1. 权限注入：buttonList 由父级传入（'all' 全显 / 数组按权限过滤 / 空则隐藏权限按钮）
   * 2. 属性透传：所有 props 和 attrs 透传给原始组件
   * 3. 方法暴露：将原始组件的方法透传给父组件
   * 4. 自动图标：为 key 为 add、type 为 openModal 的按钮自动添加 Plus 图标
   * 5. 字典转换：列配置支持 dict: { type: 'static' | 'async', name: '字典名' }，
   *    有值时代理列配置的 get 方法自动做「值 -> label」字典转换（依托 get 方法渲染值），
   *    static 同步读静态字典、async 先加载异步字典再转换；可和 encrypt 解密叠加
   *
   * 【权限控制】
   * - buttonList prop 为权限 ID 数组，用于过滤工具栏和操作列按钮
   * - 传入 'all' 时不作过滤，传入空数组时隐藏所有需要权限的按钮
   *
   * 【暴露方法】
   * | 方法名 | 说明 | 参数 |
   * |--------|------|------|
   * | getBatchSelectList | 获取批量选中列表 | 无 |
   * | getToolBarParams | 获取工具栏参数 | 无 |
   * | getRecordList | 获取当前列表数据 | 无 |
   * | searchParamsClear | 清空搜索参数 | 无 |
   * | search | 触发搜索 | {...args} |
   * | openModal | 打开弹窗 | { key, data, title } |
   * | closeModal | 关闭弹窗 | { key, refreshRecordList, resetFormData } |
   * | getModalData | 获取弹窗数据 | key (弹窗标识) |
   * | refreshList | 刷新列表（保持当前页码不变） | { tempParams } |
   */

  import AdvRecordsManagerOriginal from './original_entry.vue';
  import { computed, shallowRef, useCssModule, useAttrs, markRaw } from 'vue';
  import { Plus, Search } from '@element-plus/icons-vue';
  import { urlPublicKey } from '@common/utils/index';
  // 字典单例缓存（各应用 dict/static.js、dict/async.js 在模块加载时注册字典）
  import staticCache from '@common/dict/staticCache';
  import dictionaryCache from '@common/dict/dictionaryCache';

  /**
   * 组件属性定义
   */
  const props = defineProps({
    toolBarConfig: {
      type: Object,
    },
    recordListConfig: {
      type: Object,
      required: true,
    },
    modalConfigList: {
      type: Array,
    },
    /**
     * 按钮权限列表（由应用层注入）
     * - 'all': 显示全部按钮
     * - Array: 只显示指定权限的按钮
     * - 空数组/其他: 隐藏所有需要权限的按钮
     */
    buttonList: {
      type: [Array, String],
      default: () => [],
    },
  });

  const $style = useCssModule();
  const attrs = useAttrs();

  /**
   * 弹窗配置格式化函数
   * 对弹窗配置应用自定义样式类
   * @param {Object} modalConfig - 弹窗配置对象
   * @returns {Object} 格式化后的弹窗配置
   */
  const modalConfigFormat = (modalConfig) => {
    if (!modalConfig?.form) {
      return modalConfig;
    }
    const hasFormList = modalConfig.form?.list?.length > 0;
    return {
      ...modalConfig,
      ...(hasFormList
        ? {
            form: {
              ...modalConfig.form,
              grid: {
                ...(modalConfig.form?.grid || {}),
                gap: modalConfig.form?.grid?.gap || '0 20px', // 默认横向20px，竖向0
              },
              attrs: {
                ...(modalConfig.form?.attrs || {}),
              },
            },
          }
        : {}),
    };
  };

  /**
   * 处理后的弹窗配置列表
   * 对 modalConfigList 中的弹窗配置应用自定义样式类
   * @returns {Array} 处理后的弹窗配置列表
   */
  const processedModalConfigList = computed(() => {
    const modalConfigList = props.modalConfigList ?? [];
    return modalConfigList.map((modalConfig) => modalConfigFormat(modalConfig));
  });

  /**
   * 处理后的工具栏配置
   * 对原始工具栏配置进行增强处理，包括：
   * 1. openModal 类型添加自定义样式类
   * 2. select 类型添加默认 searchTime: 'now' 实现自动搜索
   * 3. 为特定按钮自动添加图标
   * @returns {Object|null} 处理后的工具栏配置
   */
  const processedToolBarConfig = computed(() => {
    // 如果没有工具栏配置，直接返回 null
    if (!props.toolBarConfig) {
      return null;
    }
    // 解构配置列表和其他属性
    const { list, ...rest } = props.toolBarConfig;
    // 遍历处理每个工具栏项
    if (list) {
      const processedList = list.map((item) => {
        let processedItem = item;

        /**
         * 处理 openModal 类型且包含 form 配置的按钮
         * 为弹窗和表单添加自定义样式类
         */
        if (processedItem.type === 'openModal' && processedItem?.modal) {
          processedItem = {
            ...processedItem,
            modal: modalConfigFormat(processedItem.modal),
          };
        }

        /**
         * 处理 select 类型的表单项
         * 添加默认 searchTime: 'now'，使得选择后立即触发搜索
         * 如果用户已配置 searchTime，则保留用户配置
         */
        if (processedItem.type === 'select' && !processedItem.searchTime) {
          processedItem = {
            ...processedItem,
            searchTime: 200,
          };
        }

        /**
         * 处理图标配置
         * 如果已配置图标，使用 markRaw 标记为原始对象
         * 如果未配置图标，根据按钮类型自动添加默认图标
         */
        if (processedItem.icon) {
          processedItem = { ...processedItem, icon: markRaw(processedItem.icon) };
        } else {
          // 为 add 按钮添加 Plus 图标
          if (processedItem.key === 'add') {
            processedItem = { ...processedItem, icon: markRaw(Plus) };
          }
          // 为 searchButton 添加 Search 图标
          else if (processedItem.type === 'searchButton') {
            processedItem = { ...processedItem, icon: markRaw(Search) };
          }
        }

        return processedItem;
      });
      // 返回处理后的配置，添加工具栏容器样式
      return { ...rest, list: processedList, toolBarWrapClass: $style['custom_toolBar_wrapper'] };
    } else {
      return { ...rest, toolBarWrapClass: $style['custom_toolBar_wrapper'] };
    }
  });

  // 默认启用解密的敏感字段关键词（依据列头 title 自动识别）
  const ENCRYPT_KEYWORDS = ['身份证', '手机', '电话'];

  /**
   * 为列配置创建解密变换（依托 columnsConfig 列配置的 get 方法）
   * 启用条件（满足任一）：
   *   1. 列配置 encrypt 为 true
   *   2. 列头 title 包含"身份证"、"手机"、"电话"字样
   * 与 recordList.js formatNode 中的 get 调用时机对应：
   *   - get：数据进入列表（formatNode 派生展示值）时用 urlPublicKey 解密（还原明文）
   * 空值（'' / null / undefined）直接透传；解密失败时（如后端已直接返回明文）原样返回；
   * 原配置已有 get（如日期格式化）时，先解密还原明文，再执行原有 get。
   * @param {Object} sourceCol 原始列配置
   * @returns {Object} 包装 get 后的列配置
   */
  const createEncryptTransform = (sourceCol) => {
    // 列头 title 命中敏感关键词时自动启用解密
    const hasSensitiveKeyword =
      sourceCol?.title && ENCRYPT_KEYWORDS.some((kw) => sourceCol.title.includes(kw));
    if (!sourceCol?.encrypt && !hasSensitiveKeyword) return sourceCol;
    const originalGet = typeof sourceCol.get === 'function' ? sourceCol.get : null;
    return {
      ...sourceCol,
      // get：数据进入列表（formatNode 派生展示值）时解密
      get(value, rowIndex, sourceRowItem) {
        if (value === undefined || value === null || value === '') return value;
        let decryptedValue;
        try {
          decryptedValue = urlPublicKey(value);
        } catch (error) {
          // 解密失败（密文非 RSA 密文，如后端已直接返回明文）时原样返回
          decryptedValue = value;
        }
        return originalGet ? originalGet(decryptedValue, rowIndex, sourceRowItem) : decryptedValue;
      },
    };
  };

  /**
   * 字典注册名前缀（列配置 dict.type -> 缓存注册名前缀）
   * 各应用 dict/static.js 以 STATIC_ 前缀注册静态字典、dict/async.js 以 ASYNC_ 前缀注册异步字典，
   * 对外 DICT_STATIC / DICT_ASYNC 的 key 为去掉前缀的字典名（如 'TITLE'），本处据此还原缓存注册名。
   */
  const DICT_TYPE_PREFIX = {
    static: 'STATIC_',
    async: 'ASYNC_',
  };

  /**
   * 解析字典在单例缓存中的注册名
   * 兼容两种写法：仅字典名（如 'TITLE'，还原为 ASYNC_TITLE）或完整注册名（如 'ASYNC_TITLE'）。
   * @param {Object} dictConfig - 列配置 dict：{ type: 'static' | 'async', name: string }
   * @returns {string} 字典注册名；type/name 非法时返回空串
   */
  const resolveDictCacheName = (dictConfig) => {
    const type = String(dictConfig?.type || '').toLowerCase();
    const name = dictConfig?.name;
    const prefix = DICT_TYPE_PREFIX[type];
    if (!prefix || typeof name !== 'string' || !name) return '';
    return name.startsWith(prefix) ? name : `${prefix}${name}`;
  };

  /**
   * 创建静态字典列 get：值 -> label（同步，读 staticCache）
   * 依托列配置的 get 方法：先执行原配置 get（若有，得到待转换的字典值），
   * 再按字典做 value -> label 转换；空值直接透传，未匹配到文案（或字典未注册）时原样返回，避免列表清空。
   */
  const createStaticDictGet = (dictName, originalGet) =>
    function (value, rowIndex, sourceRowItem) {
      const derivedValue = originalGet ? originalGet(value, rowIndex, sourceRowItem) : value;
      if (derivedValue === '' || derivedValue === null || derivedValue === undefined) {
        return derivedValue;
      }
      const label = staticCache.getLabel(dictName, derivedValue);
      return label !== '' ? label : derivedValue;
    };

  /**
   * 创建异步字典列 get：值 -> label（异步，先确保字典加载完成再读 dictionaryCache）
   * 依托列配置的 get 方法：先执行原配置 get（若有），再按字典做 value -> label 转换。
   * 空值直接透传；未匹配到文案 / 字典未注册 / 加载失败时原样返回，避免列表清空。
   */
  const createAsyncDictGet = (dictName, originalGet) =>
    async function (value, rowIndex, sourceRowItem) {
      const derivedValue = originalGet ? originalGet(value, rowIndex, sourceRowItem) : value;
      if (derivedValue === '' || derivedValue === null || derivedValue === undefined) {
        return derivedValue;
      }
      try {
        // 首次触发字典数据请求（dictionaryCache 内置 loading 去重），后续直接命中缓存
        await dictionaryCache.getData(dictName);
        const label = dictionaryCache.getLabel(dictName, derivedValue);
        return label !== '' ? label : derivedValue;
      } catch (error) {
        return derivedValue;
      }
    };

  /**
   * 为列配置创建字典转换变换（依托列配置的 get 方法）
   * 当列配置存在 dict: { type: 'static' | 'async', name: string } 时，
   * 包装/生成 get 方法，实现「值 -> label」字典转换；与 createEncryptTransform 可叠加（先解密还原再转换）。
   * @param {Object} sourceCol 原始列配置
   * @returns {Object} 包装 get 后的列配置
   */
  const createDictTransform = (sourceCol) => {
    const dictConfig = sourceCol?.dict;
    if (!dictConfig || typeof dictConfig !== 'object') return sourceCol;
    const dictType = String(dictConfig.type || '').toLowerCase();
    if (dictType !== 'static' && dictType !== 'async') return sourceCol;
    const originalGet = typeof sourceCol.get === 'function' ? sourceCol.get : null;
    // 还原缓存注册名（兼容 'TITLE' 与 'ASYNC_TITLE' 两种写法）
    const dictName = resolveDictCacheName({ type: dictType, name: dictConfig.name });
    if (dictType === 'static') {
      return { ...sourceCol, get: createStaticDictGet(dictName, originalGet) };
    }
    return { ...sourceCol, get: createAsyncDictGet(dictName, originalGet) };
  };

  const processedRecordListConfig = computed(() => {
    const { columnsConfig, ...rest } = props.recordListConfig;
    const processedColumnsConfig = columnsConfig?.map((col) => {
      // 先对 encrypt: true 或 title 命中敏感关键词的列包装 get 解密变换
      let baseCol = createEncryptTransform(col);
      // 再对配置了 dict 的列包装 get 字典转换（值 -> label），可与加密变换叠加
      baseCol = createDictTransform(baseCol);
      // 列头 title 包含"时间"时默认设置宽度 180px，用户已配置 width 则保留
      const timeWidthCol = baseCol.title?.includes?.('时间')
        ? {
            ...baseCol,
            attrs: {
              ...(baseCol.attrs || {}),
              width: baseCol.attrs?.width ?? '170',
            },
          }
        : baseCol;
      if (timeWidthCol.type === 'operater') {
        const processedList = baseCol.list?.map((operaterItem) => {
          let processedItem = operaterItem;
          if (processedItem.type === 'openModal' && processedItem?.modal) {
            processedItem = {
              ...processedItem,
              modal: modalConfigFormat(processedItem.modal),
            };
          }
          return processedItem;
        });
        return {
          ...timeWidthCol,
          list: processedList,
          // 操作列默认左对齐，用户已配置 align 则保留用户配置
          attrs: {
            ...(timeWidthCol.attrs || {}),
            align: timeWidthCol.attrs?.align || 'left',
          },
        };
      } else if (timeWidthCol.type === 'openModal' && timeWidthCol?.modal) {
        // 普通列的 openModal 类型，应用弹窗样式
        return {
          ...timeWidthCol,
          modal: modalConfigFormat(timeWidthCol.modal),
        };
      } else {
        return timeWidthCol;
      }
    });
    if (processedColumnsConfig?.length > 0 && processedColumnsConfig[0]?.type !== 'index') {
      processedColumnsConfig.unshift({
        key: 'custom_index',
        title: '序号',
        type: 'index',
        width: 55,
        attrs: {
          fixed: 'left',
          align: 'center',
        },
      });
    }
    return {
      ...rest,
      columnsConfig: processedColumnsConfig,
      attrs: {
        ...(rest.attrs
          ? {
              ...rest.attrs,
              border: true,
            }
          : {
              border: true,
            }),
      },
      recordListWrapClass: $style['custom_recordList_wrapper'],
    };
  });

  /**
   * 原始记录管理器组件引用
   */
  const originalAdvRecordsManagerRef = shallowRef(null);
  /**
   * 暴露给父组件的方法
   */
  defineExpose({
    /**
     * 获取批量选中列表
     */
    getBatchSelectList: () => {
      return originalAdvRecordsManagerRef.value.getBatchSelectList();
    },
    /**
     * 获取工具栏参数
     */
    getToolBarParams: () => {
      return originalAdvRecordsManagerRef.value.getToolBarParams();
    },
    /**
     * 获取当前列表数据
     */
    getRecordList: () => {
      return originalAdvRecordsManagerRef.value.getRecordList();
    },
    /**
     * 清空搜索参数
     */
    searchParamsClear: () => {
      return originalAdvRecordsManagerRef.value.searchParamsClear();
    },
    /**
     * 触发搜索
     */
    search: (...args) => {
      return originalAdvRecordsManagerRef.value.search(...args);
    },
    /**
     * 打开弹窗
     */
    openModal: (...args) => {
      return originalAdvRecordsManagerRef.value.openModal(...args);
    },
    /**
     * 关闭弹窗
     */
    closeModal: (...args) => {
      return originalAdvRecordsManagerRef.value.closeModal(...args);
    },
    /**
     * 获取弹窗数据
     */
    getModalData: (key) => {
      return originalAdvRecordsManagerRef.value.getModalData(key);
    },
    /**
     * 刷新列表（保持当前页码不变）
     * @param {Object} [tempParams] - 临时参数（仅单次调用有效，调用后不保留）
     */
    refreshList: (tempParams) => {
      return originalAdvRecordsManagerRef.value.refreshList(tempParams);
    },
  });
</script>
<style lang="scss" module>
  .custom_adv_records_manager {
    height: 100%;
  }
  .custom_toolBar_wrapper {
    :global {
      @include toolBar;
    }
  }
  .custom_recordList_wrapper {
    :global {
      @include table;
    }
  }
</style>
