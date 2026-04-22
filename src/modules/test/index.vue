<template>
  <TestLayout>
    <router-link :to="{ name: 'home' }">跳转首页</router-link>
  </TestLayout>
</template>
<script setup>
  import TestLayout from '@/layouts/test.vue';
</script>
