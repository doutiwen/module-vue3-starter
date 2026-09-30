<template>
  <AdvFormCore
    v-bind="$attrs"
    :config="processedConfig"
    :modelValue="modelValue"
    ref="advFormCoreRef"
  >
    <!-- 将所有插槽透传 -->
    <template
      v-for="(_, slotName) in $slots"
      :key="slotName"
      #[slotName]="slotProps"
    >
      <slot
        :name="slotName"
        v-bind="slotProps || {}"
      ></slot>
    </template>
  </AdvFormCore>
</template>

<script setup>
  /**
   * AdvForm - 高级表单组件（入口组件）
   *
   * 【组件功能】
   * 基于 AdvFormCore 封装的高级表单组件，
   * 为表单提供统一的默认样式类。
   *
   * 【组件架构】
   * AdvForm (当前组件，样式层)
   *   └── AdvFormCore (核心表单渲染器，业务层)
   *
   * 【核心特性】
   * 1. 默认样式：自动为表单添加 formWrapClass 样式类（基于 @include form 混入）
   * 2. 插槽透传：所有插槽透传给核心组件
   * 3. 方法透传：将核心组件的 submit / clearFormData / setFormData 方法透传给父组件
   * 4. 表单项加解密：配置 encrypt: true 的字段在传入核心前包装 set/get（依托核心原有的 set/get 配置项）
   *    - set：仅在 setFormData() 设置表单数据时调用，用 urlPublicKey 解密（拉取数据时解密）
   *    - get：仅在 submit() 提交时调用，用 sm2Encrypt 加密（表单提交数据时加密）
   *    例：{ key: 'url', label: '报表地址', type: 'textarea', encrypt: true }
   *    说明：加密字段通过 setFormData() 加载（展示明文）、submit() 提交（发出密文）；
   *         用户编辑输入不触发 set/get 变换。set 解密失败时（后端已返回明文）原样透传。
   * 5. 输入即守卫的表单项配置（dateLimit / numberLimit）统一收纳于 inputGuard 对象下，顶层不再出现这两个键，
   *     且不参与自定义属性 watch 扫描；表单项配置形如 inputGuard: { dateLimit: {...}, numberLimit: {...} }。
   * 6. 日期范围限制：日期类型字段（date / dateTime）配置 inputGuard.dateLimit，派生三种能力（guard / report / 联动清空）：
   *    预置规则：{ type: 'notAfter' | 'notBefore', targetFieldName?: '另一字段key', date?: 'YYYY-MM-DD' }
   *      例：{ key: 'endDate', label: '结束日期', type: 'date', inputGuard: { dateLimit: { type: 'notAfter', targetFieldName: 'startDate' } } }
   *    - guard（事中禁用，非法日期单元格不可选）：纯 UI，直接落在 core/ele/guard/date.js；disabledDate 每次被面板
   *      调用时实时读目标字段当前值（targetFieldName）或取固定 date，同一函数引用永远返回最新判定，故联动无需
   *      watch（规避 EP 面板 setup 冻结首版 disabledDate 导致联动守卫不生效的缺陷）。
   *      同一文件还产出面板默认页（defaultValue）：字段为空时把面板一次定位到「离今天最近的合法日」所在页
   *      （界在很早以前时 EP 默认定位到今天会满屏禁用，要逐月翻回），已有值则交给 EP 按该值定位。
   *    - report（事后提示）：按配置派生一条 custom 校验并入既有 validate 通道，失焦/提交时提示；允许日期手输
   *      绕开面板，越界值由它兜底。
   *    - 联动清空（写表项）：targetFieldName 指向的源字段被用户改动到「使某依赖字段当前值越界」的方向时
   *      （如重选计划开工晚于既有计划完工 / 重选开始早于既有结束），自动清空该依赖字段，避免残留旧值触发派生校验
   *      误报。watch 走 WatchManager、逻辑落在 core/common/form.js；仅用户直接改动源字段时触发（userInputKeys 命中），
   *      setFormData / modelValue 回填等权威数据加载不清空。
   *    静态描述符 / watch 逃生门为内部旧形态、无消费方，已移除。
   * 7. 文本输入守卫（phone / intNumber / number）：逐类型直写于 core/ele/guard/text.js，不经任何中间抽象层。
   *    phone / intNumber / number 各自声明 canExtend（前缀能否扩展成合法值，按键否决时调用）与
   *    normalize（粘贴清洗时调用），据此生成 onKeydown（preventDefault 拦截）+ onPaste（整体 normalize 回写）
   *    + maxlength 兜底。phone 前缀拦截已收紧为“可扩展成合法 11 位手机号的前缀”（如第二位必须是 3–9）；
   *    intNumber 只允许数字、number 只允许数字与一个小数点。
   *    number / intNumber 可选配 inputGuard.numberLimit 声明【硬位数上限】，如 inputGuard: { numberLimit: { integer: 8, decimal: 2 } }
   *    —— integer=有效整数位上限（前导 0 不计）、decimal=小数位上限（intNumber 忽略 decimal）。逐键敲到第 N+1 位
   *    打不进去、粘贴超长自动清洗截断成规范值。两者渲染为 el-input-number，EP 不转发 maxlength/监听进内部 input，
   *    故 onKeydown/onPaste 靠根节点冒泡生效；当 integer 与 decimal 均有限且字段未自配 attrs.max 时，会派生
   *    EP max（如 99999999.99）作溢出收口（上箭头到顶禁用、步进/回填越界被 EP 钳制）。缺省（不配）时行为不变，
   *    且本面不派生 report 校验（超长回填仅由派生 max 钳制）。只对数字/整数文本有意义，numberRange(slider) 不适用。
   *    以上新实现为本版 AdvForm 的能力扩展；旧版已存档于 AdvFormOld 目录树，保持原行为不动。
   * 8. 数据更新时序（modelValue 路径）：字段值一律「先同步写入内部 formDataState，再按需防抖 emit 同步父层」。
   *    - 同步落库不可省：el-input 的 handleInput 在 emit 之后会 await nextTick() 回写原生 value，若此刻 props.modelValue
   *      仍是旧值，原生 value 会被回写成旧文本；待防抖 flush 后父层回显新值、再经 watch(nativeInputValue) 写 DOM 时
   *      （该路径 Element Plus 不做任何光标补偿），光标即跳到文本末尾——在文本中间删除字符时光标跳变即由此产生。
   *      同步写入后 props.modelValue 在一个微任务内即跟上 UI，EP 的 setNativeInputValue 判定新旧一致直接 return，
   *      其自带的光标恢复逻辑（useCursor）得以生效。故本地写入必须与防抖 emit 解耦，不得改为「只 emit、等父层回显」。
   *    - 父层侧行为不变：仍只收到防抖后的一次 update:modelValue，其内容（当前 modelValue 深拷贝 + 本次变更字段）
   *      与节流节奏（一次 setTimeout 0 一次 emit）均与改前一致；父层回显写回同值时不会触发额外渲染或事件。
   *    - 由此本地状态是「即时真源」：value/options/show/validate 联动 watch、submit()、input 事件都在用户输入当时
   *      即拿到最新值，不再依赖父层回显（父层若忽略 update:modelValue，联动与提交仍按用户输入工作）；
   *      终态仍以父层回显为准。
   *    - 例外：父层若在 v-model 的 setter 中对值做变换（trim / 过滤等），会有一小段窗口本地持未变换的原值，
   *      待父层回显后覆盖；该窗口内联动 watch 读到的是未变换值。
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

  import AdvFormCore from './core/ele/index.jsx';
  import { computed, shallowRef, useCssModule } from 'vue';
  import { sm2Encrypt, urlPublicKey } from '@common/utils/index';

  /**
   * 组件属性定义
   */
  const props = defineProps({
    modelValue: {
      type: Object,
    },
    config: {
      type: Object,
      required: true,
    },
  });

  const $style = useCssModule();

  /** 触发自动加解密的 label 关键词（命中任一即自动注入 encrypt: true） */
  const ENCRYPT_LABEL_KEYWORDS = ['身份证', '手机号码', '电话'];

  /**
   * 根据表单项 label 自动注入 encrypt 属性
   * 当 label 包含敏感关键词（身份证、手机号码等）且用户未显式设置 encrypt 时，自动标记为 true
   * @param {Object} formItem 表单项配置
   * @returns {Object} 处理后的表单项配置（如未命中关键词或已显式配置 encrypt 则原样返回）
   */
  const autoInjectEncryptByLabel = (formItem) => {
    if (!formItem || typeof formItem !== 'object') return formItem;
    // 用户已显式配置 encrypt 时不覆盖
    if (formItem.encrypt === true || formItem.encrypt === false) return formItem;
    const label = typeof formItem.label === 'string' ? formItem.label : '';
    const hitKeyword = ENCRYPT_LABEL_KEYWORDS.some((keyword) => label.includes(keyword));
    return hitKeyword ? { ...formItem, encrypt: true } : formItem;
  };

  /**
   * 为表单项创建加解密转换（在原有 set/get 配置外再包装一层）
   * 当表单项配置 encrypt 为 true 时启用，与核心组件的 set/get 调用时机对应：
   *   - set：在 setFormData 中调用，拉取数据时用 urlPublicKey 解密（还原明文）
   *   - get：在 submit 中调用，表单提交数据时用 sm2Encrypt 加密
   * 空值（'' / null / undefined）直接透传，不参与加解密；
   * set 解密失败时（如后端已直接返回明文）原样返回，避免拉取流程中断。
   * @param {Object} sourceFormItem 原始表单项配置
   * @returns {Object} 包装 set/get 后的表单项配置
   */
  const createEncryptTransform = (sourceFormItem) => {
    // 先根据 label 自动注入 encrypt，再判断是否需要包装
    const formItem = autoInjectEncryptByLabel(sourceFormItem);
    if (!formItem?.encrypt) return formItem;
    const originalSet = typeof sourceFormItem.set === 'function' ? sourceFormItem.set : null;
    const originalGet = typeof sourceFormItem.get === 'function' ? sourceFormItem.get : null;
    return {
      ...formItem,
      // set：数据进入表单（setFormData）时解密
      set(value) {
        if (value === undefined || value === null || value === '') return value;
        let decryptedValue;
        try {
          decryptedValue = urlPublicKey(value);
        } catch (error) {
          // 解密失败（密文非 RSA 密文，如后端已直接返回明文）时原样返回
          decryptedValue = value;
        }
        return originalSet ? originalSet(decryptedValue) : decryptedValue;
      },
      // get：数据提交（submit）时加密
      get(value) {
        if (value === undefined || value === null || value === '') return value;
        const rawValue = originalGet ? originalGet(value) : value;
        return sm2Encrypt(String(rawValue));
      },
    };
  };

  /**
   * 处理后的表单配置
   * 为表单配置应用默认样式类，并对 encrypt: true 的表单项包装 set/get 加解密
   * @returns {Object} 处理后的表单配置
   */
  const processedConfig = computed(() => {
    // 表单项列表支持一维数组及二维数组（分栏/分页配置）
    const processFormItemList = (list) =>
      list.map((formItem) =>
        Array.isArray(formItem)
          ? formItem.map(createEncryptTransform)
          : createEncryptTransform(formItem)
      );
    return {
      ...props.config,
      list: Array.isArray(props.config.list)
        ? processFormItemList(props.config.list)
        : props.config.list,
      formWrapClass: props.config.formWrapClass || $style['custom_form_wrapper'],
    };
  });

  /**
   * 核心表单组件引用
   */
  const advFormCoreRef = shallowRef(null);

  /**
   * 暴露给父组件的方法
   */
  defineExpose({
    submit: (...args) => advFormCoreRef.value?.submit(...args),
    clearFormData: (...args) => advFormCoreRef.value?.clearFormData(...args),
    setFormData: (...args) => advFormCoreRef.value?.setFormData(...args),
  });
</script>

<style lang="scss" module>
  .custom_form_wrapper {
    :global {
      @include form;
    }
  }
</style>
