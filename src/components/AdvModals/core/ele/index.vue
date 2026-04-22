<template>
  <Teleport to="body">
    <template v-for="modalItem in modalList" :key="modalItem.key">
      <el-dialog
        v-model="modalItem.show"
        :title="modalItem.title"
        :destroyOnClose="true"
        :fullscreen="!!modalItem.fullScreen"
        @cancel="() => modalButtonEventHandler(modalItem.key, 'cancel')"
        v-bind="modalItem.attrs"
      >
        <template #default>
          <div v-loading="modalItem.loading">
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
            ></slot>
          </div>
        </template>
        <template #footer>
          <el-popconfirm
            v-if="modalItem.okButton.confirm"
            :title="modalItem.okButton.confirm.text"
            :confirm-button-text="modalItem.okButton.confirm.okText || '确认'"
            :cancel-button-text="modalItem.okButton.confirm.cancelText || '取消'"
            v-bind="modalItem.okButton.confirm.attrs"
            @confirm="modalButtonEventHandler(modalItem.key, 'ok')"
          >
            <template #reference>
              <el-button :loading="modalItem.okButtonLoading" type="primary">
                {{ modalItem.okText || '确定' }}
              </el-button>
            </template>
          </el-popconfirm>
          <el-button
            v-else
            :loading="modalItem.okButtonLoading"
            type="primary"
            @click="modalButtonEventHandler(modalItem.key, 'ok')"
          >
            {{ modalItem?.okButton.text || '确定' }}
          </el-button>
          <el-popconfirm
            v-if="modalItem.cancelButton.confirm"
            :title="modalItem.cancelButton.confirm.text"
            :confirm-button-text="modalItem.cancelButton.confirm.okText || '确认'"
            :cancel-button-text="modalItem.cancelButton.confirm.cancelText || '取消'"
            :disabled="modalItem.confirmShow"
            v-bind="modalItem.cancelButton.confirm.attrs"
            @confirm="modalButtonEventHandler(modalItem.key, 'cancel')"
          >
            <template #reference>
              <el-button @click="modalButtonEventHandler(modalItem.key, 'cancel')">
                {{ modalItem.cancelButton.text || '取消' }}
              </el-button>
            </template>
          </el-popconfirm>
          <el-button
            v-else
            :disabled="modalItem.okButtonLoading"
            @click="modalButtonEventHandler(modalItem.key, 'cancel')"
          >
            {{ modalItem.cancelButton.text || '取消' }}
          </el-button>
        </template>
      </el-dialog>
    </template>
  </Teleport>
</template>
<script setup>
  import { useAdvModal, advModalProps, advModalEmits } from '../common/index.js';
  import Form from '@/components/AdvForm/core/ele/index.jsx';
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
    defineExposeConfig,
  } = useAdvModal(props, emits);

  defineExpose(defineExposeConfig);
</script>
<style lang="scss" scoped>
  .viewPic {
    width: 100%;
    display: block;
  }
</style>
