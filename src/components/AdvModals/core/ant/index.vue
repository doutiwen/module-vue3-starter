<template>
  <Teleport to="body">
    <template v-for="modalItem in modalList" :key="modalItem.key">
      <a-modal
        v-model:open="modalItem.show"
        :title="modalItem.title"
        :destroyOnClose="true"
        :width="modalItem.fullScreen ? '100%' : ''"
        :wrapClassName="modalItem.fullScreen ? $style['full-modal'] : ''"
        @cancel="() => modalButtonEventHandler(modalItem.key, 'cancel')"
        v-bind="modalItem.attrs"
      >
        <template #default>
          <a-spin :spinning="modalItem.loading">
            <Form
              v-if="modalItem.form"
              :config="modalItem.form"
              :formData="modalItem.formData"
              :ref="(ref) => setFormRef(modalItem.key, ref)"
              v-on="modalItem.form.events || {}"
            ></Form>
            <slot
              v-else
              :name="`modal-${modalItem.key}`"
              :data="modalItem.data"
              :closeModal="() => closeModal(modalItem.key)"
              :setFormRef="(ref) => setFormRef(modalItem.key, ref)"
            ></slot>
          </a-spin>
        </template>
        <template #footer>
          <a-popconfirm
            v-if="modalItem.okButton.confirm"
            :title="modalItem.okButton.confirm.text"
            :ok-text="modalItem.okButton.confirm.okText || '确认'"
            :cancel-text="modalItem.okButton.confirm.cancelText || '取消'"
            :disabled="modalItem.confirmShow"
            v-bind="modalItem.okButton.confirm.attrs"
            @confirm="modalButtonEventHandler(modalItem.key, 'ok')"
          >
            <a-button :loading="modalItem.okButtonLoading" type="primary">
              {{ modalItem.okText || '确定' }}
            </a-button>
          </a-popconfirm>
          <a-button
            v-else
            :loading="modalItem.okButtonLoading"
            type="primary"
            @click="modalButtonEventHandler(modalItem.key, 'ok')"
          >
            {{ modalItem?.okButton.text || '确定' }}
          </a-button>
          <a-popconfirm
            v-if="modalItem.cancelButton.confirm"
            :title="modalItem.cancelButton.confirm.text"
            :ok-text="modalItem.cancelButton.confirm.okText || '确认'"
            :cancel-text="modalItem.cancelButton.confirm.cancelText || '取消'"
            :disabled="modalItem.confirmShow"
            v-bind="modalItem.cancelButton.confirm.attrs"
            @confirm="modalButtonEventHandler(modalItem.key, 'cancel')"
          >
            <a-button
              type="primary"
              ghost
              @click="modalButtonEventHandler(modalItem.key, 'cancel')"
            >
              {{ modalItem.cancelButton.text || '取消' }}
            </a-button>
          </a-popconfirm>
          <a-button
            v-else
            type="primary"
            ghost
            :disabled="modalItem.okButtonLoading"
            @click="modalButtonEventHandler(modalItem.key, 'cancel')"
          >
            {{ modalItem.cancelButton.text || '取消' }}
          </a-button>
        </template>
      </a-modal>
    </template>
  </Teleport>
</template>
<script setup>
  import { useAdvModal, advModalProps, advModalEmits } from '../common/index.js';
  import Form from '@/components/AdvForm/core/ant/index.jsx';
  const props = defineProps(advModalProps);
  const emits = defineEmits(advModalEmits);

  const {
    modalList,
    modalDict,
    setFormRef,
    openModal,
    closeModal,
    modalButtonEventHandler,
    getModalData,
  } = useAdvModal(props, emits);

  defineExpose({
    openModal,
    closeModal,
    getModalData,
  });
</script>
<style lang="scss" scoped>
  .viewPic {
    width: 100%;
    display: block;
  }
</style>
<style lang="scss" module>
  .full-modal {
    font-size: 16px;
    :global(.ant-modal) {
      max-width: 100%;
      top: 0;
      padding-bottom: 0;
      margin: 0;
    }
    :global(.ant-modal-content) {
      display: flex;
      flex-direction: column;
      height: calc(100vh);
    }
    :global(.ant-modal-body) {
      flex: 1;
    }
  }
</style>
