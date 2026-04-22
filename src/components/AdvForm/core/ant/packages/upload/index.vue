<template>
  <a-upload
    v-model:fileList="_moduleValue"
    :beforeUpload="beforeUploadAnt"
    :customRequest="uploadHandler"
    :accept="limitTypeString"
    v-bind="$attrs"
  >
    <slot name="fileList" :fileList="_moduleValue">
      <ul class="file_list">
        <li class="file_item" v-for="file in _moduleValue" :key="file.id">
          <div class="file_item_content"></div>
          <div class="file_item_operate">
            <EditOutlined @click.stop="editUploadItemHandler" />
            <DeleteOutlined @click.stop="deleteUploadItemHandler" />
            <SearchOutlined @click.stop="previewUploadItemHandler" />
          </div>
        </li>
        <li class="add_file_btn" v-if="_moduleValue.length < props.limitNum">
          <plus-outlined />
        </li>
      </ul>
    </slot>
  </a-upload>
  <Teleport v-if="props.hasPreview" to="body">
    <a-modal
      v-model:open="showPreviewModal"
      :title="previewInfo.title"
      :footer="null"
      :style="`width: ${props.previewWidth}`"
    >
      <slot name="previewContent" :data="previewInfo.data">
        <img class="viewUploadPic" :src="previewInfo.data" />
      </slot>
    </a-modal>
  </Teleport>
</template>

<script setup>
  import { useSlots } from 'vue';
  import { useUpload, uploadProps, uploadEmits } from '../../../common/index.js';
  import { message } from 'ant-design-vue';

  const props = defineProps(uploadProps);
  const emits = defineEmits(uploadEmits);
  const {
    _moduleValue,
    limitTypeString,
    showPreviewModal,
    previewInfo,
    editUploadItemHandler,
    previewUploadItemHandler,
    deleteUploadItemHandler,
    beforeUploadHandler,
    uploadHandler,
    defineExposeConfig,
  } = useUpload(props, emits);

  const beforeUploadAnt = (file) => {
    return new Promise((res, rej) => {
      const { valid, notice } = beforeUploadHandler(file);
      if (valid) {
        res(file);
      } else {
        message.error(notice);
        rej();
      }
    });
  };

  defineExpose(defineExposeConfig);
</script>
<style lang="scss" scoped>
  @use './index.scss' as *;
</style>
