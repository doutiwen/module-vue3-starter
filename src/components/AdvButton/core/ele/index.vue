<template>
  <el-button v-if="showButton" v-bind="$attrs" :loading="isLoading" @click="throttleClick">
    <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps || {}" />
    </template>
  </el-button>
</template>

<script setup>
  import { useAdvButton, propsConfig } from '../common/index.js';

  const props = defineProps(propsConfig);
  const route = useRoute();

  const { showButton, isLoading, throttleClick } = useAdvButton(props, route);
</script>
