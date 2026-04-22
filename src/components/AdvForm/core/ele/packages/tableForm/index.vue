<template>
  <div></div>
</template>

<script setup>
  import {
    useRecordListForm,
    recordListFormProps,
    recordListFormEmits,
  } from '../../../common/index.js';

  const props = defineProps(recordListFormProps);
  const emits = defineEmits(recordListFormEmits);
  const { defineExposeConfig } = useRecordListForm(props, emits);

  defineExpose(exposeConfig);
</script>
<style lang="scss" scoped></style>
