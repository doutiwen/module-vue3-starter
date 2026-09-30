<template>
  <AdvModalCore
    :class="$style['custom_adv_modal']"
    v-bind="$attrs"
    :config="processedConfig"
    :close-on-click-modal="false"
    ref="advModalCoreRef"
  >
    <!-- 将所有非 modal-*-footer 的插槽透传 -->
    <template
      v-for="(_, slotName) in filteredSlots"
      :key="slotName"
      #[slotName]="slotProps"
    >
      <slot
        :name="slotName"
        v-bind="slotProps || {}"
      ></slot>
    </template>
    <!-- 为所有 modal-{key}-footer 插槽提供默认内容 -->
    <template
      v-for="key in modalKeys"
      :key="`modal-${key}-footer`"
      #[`modal-${key}-footer`]="slotProps"
    >
      <slot
        :name="`modal-${key}-footer`"
        v-bind="slotProps || {}"
      >
        <div class="drawer-footer">
          <el-button
            class="cancel-btn"
            :disabled="slotProps?.okLoading"
            @click="slotProps?.onCancel"
          >
            <el-icon><Close /></el-icon>
            {{ slotProps?.config?.cancelButton?.text || '取消' }}
          </el-button>
          <el-button
            :loading="slotProps?.okLoading"
            :disabled="slotProps?.okDisabled"
            type="primary"
            @click="slotProps?.onOk()"
            class="confirm-btn"
          >
            <el-icon><Check /></el-icon>
            <!-- okButtonText 为已解析的文案（okButton.text 支持方法形式，由核心层在数据落库后解析），
                 此处不调用用户方法：底部渲染在 ElOverlay 的渲染副作用内，渲染期抛错会连带炸掉整个弹窗 -->
            {{ slotProps?.okButtonText || '确定' }}
          </el-button>
        </div>
      </slot>
    </template>
  </AdvModalCore>
</template>

<script setup>
  /**
   * AdvModal - 高级弹窗管理组件（入口组件）
   *
   * 【组件功能】
   * 基于 AdvModalCore 封装的高级弹窗管理组件，
   * 为所有弹窗提供统一的默认底部按钮样式。
   *
   * 【组件架构】
   * AdvModal (当前组件，样式层)
   *   └── AdvModalCore (核心弹窗管理器，业务层)
   *
   * 【核心特性】
   * 1. 默认底部按钮：为每个弹窗提供带图标的取消/确定按钮
   * 2. 插槽透传：非 footer 插槽透传给核心组件
   * 3. 样式统一：自动为弹窗添加 drawer 样式类
   * 4. 方法透传：将核心组件的方法透传给父组件
   *
   * 【插槽说明】
   * | 插槽名 | 说明 |
   * |--------|------|
   * | modal-{key}-content | 弹窗内容自定义 |
   * | modal-{key}-footer | 弹窗底部区域自定义（可覆盖默认样式） |
   * | form-* | 表单项自定义插槽 |
   *
   * 【暴露方法】
   * | 方法名 | 说明 | 参数 |
   * |--------|------|------|
   * | openModal | 打开弹窗 | key, payload, title |
   * | closeModal | 关闭弹窗 | key, refreshRecordList, resetFormData |
   * | getModalData | 获取弹窗数据 | key |
   */

  import AdvModalCore from './core/ele/index.jsx';
  import { computed, shallowRef, useCssModule, useSlots } from 'vue';
  import { Close, Check } from '@element-plus/icons-vue';

  /**
   * 组件属性定义
   */
  const props = defineProps({
    config: {
      type: Array,
      required: true,
    },
  });

  const $style = useCssModule();
  const slots = useSlots();

  /**
   * 提取所有弹窗的 key 列表
   * @returns {Array<string>} 弹窗 key 数组
   */
  const modalKeys = computed(() => {
    return (props.config || []).map((item) => item.key).filter(Boolean);
  });

  /**
   * 过滤后的插槽列表（排除 modal-*-footer 模式）
   * @returns {Object} 过滤后的插槽对象
   */
  const filteredSlots = computed(() => {
    const result = {};
    for (const [name, fn] of Object.entries(slots)) {
      if (!name.match(/modal-.*-footer/)) {
        result[name] = fn;
      }
    }
    return result;
  });

  /**
   * 处理后的弹窗配置列表
   * 为每个弹窗配置应用默认样式类
   * @returns {Array} 处理后的弹窗配置列表
   */
  const processedConfig = computed(() => {
    return (props.config || []).map((item) => ({
      ...item,
      modalWrapClass: item.modalWrapClass || $style['custom_modal_wrapper'],
    }));
  });

  /**
   * 核心弹窗组件引用
   */
  const advModalCoreRef = shallowRef(null);

  /**
   * 暴露给父组件的方法
   */
  defineExpose({
    openModal: (...args) => advModalCoreRef.value?.openModal(...args),
    closeModal: (...args) => advModalCoreRef.value?.closeModal(...args),
    getModalData: (key) => advModalCoreRef.value?.getModalData(key),
  });
</script>

<style lang="scss" module>
  .custom_adv_modal {
    height: 100%;
  }

  .custom_modal_wrapper {
    :global {
      @include drawer;
    }
  }
</style>
