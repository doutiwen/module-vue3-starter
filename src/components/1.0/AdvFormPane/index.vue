<!--
 * 功能说明：AdvFormPane - 表单面板组件
 * 包装 AdvForm 组件，提供滚动区域和提交按钮布局。
 * 适用于需要在独立面板中展示表单并提交的场景。
 *
 * 【Props】
 * submitButtonText: 提交按钮文字，默认"提交"
 *
 * 【事件】
 * submit: 表单校验通过后触发，参数为表单数据
 * 其余事件透传至 AdvForm：update:modelValue / input / validateSuccess / validateFail
 *
 * 【插槽】
 * button: 自定义底部按钮区域
 * 其余插槽透传至 AdvForm
 *
 * 【暴露方法】
 * submit: 触发表单提交（校验 + 返回数据）
 * clearFormData: 清空表单数据
 -->
<template>
  <div class="adv_form_pane_wrap">
    <div class="adv_form_pane_content">
      <el-scrollbar>
        <AdvForm
          ref="AdvFormRef"
          :config="_config"
          v-bind="$attrs"
        >
          <template
            v-for="(_, name) in $slots"
            :key="name"
            #[name]="slotData"
          >
            <slot
              v-if="name !== 'footer'"
              :name="name"
              v-bind="slotData || {}"
            />
          </template>
        </AdvForm>
      </el-scrollbar>
    </div>

    <slot
      name="footer"
      :handleSubmit="handleSubmit"
    >
      <div class="adv_form_pane_btn">
        <AdvButton
          class="confirm-btn"
          type="primary"
          :onClick="handleSubmit"
        >
          <el-icon>
            <Check />
          </el-icon>
          保存
        </AdvButton>
      </div>
    </slot>
  </div>
</template>

<script setup>
  import AdvForm from '@common/components/AdvForm/index.js';
  import AdvButton from '@common/components/AdvButton/index.js';

  const props = defineProps({
    config: {
      type: Object,
      required: true,
    },
  });
  const emit = defineEmits(['submit']);

  const _config = computed(() => ({
    ...props.config,
    grid: {
      gap: '0 20px',
      ...props.config.grid,
    },
  }));

  const AdvFormRef = shallowRef(null);

  const handleSubmit = async () => {
    try {
      const data = await AdvFormRef.value.submit();
      emit('submit', data);
    } catch (error) {
      // 校验失败，AdvForm 已通过 validateFail 事件通知
      return Promise.reject(error);
    }
  };

  /**
   * 触发表单校验并返回数据
   * 校验失败时 reject，便于父组件（如统一提交审核流程）捕获并中止
   * @returns {Promise<Object>} 校验通过后返回表单数据
   */
  const submit = () => AdvFormRef.value?.submit();

  /** 清空表单数据 */
  const clearFormData = () => AdvFormRef.value?.clearFormData();

  defineExpose({
    submit: () => AdvFormRef.value?.submit(),
    clearFormData: () => AdvFormRef.value?.clearFormData(),
    setFormData: (args) => AdvFormRef.value?.setFormData(args),
  });
</script>

<style lang="scss" scoped>
  .adv_form_pane_wrap {
    background-color: #fff;
    height: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;

    .adv_form_pane_content {
      flex: 1;
      height: 1px;
    }

    @include formButtonGroup('.adv_form_pane_btn');
  }
</style>
