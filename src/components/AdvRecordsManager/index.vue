<template>
  <RecordsManager
    :recordListConfig="innerRecordListConfig"
    :toolBarConfig="innerToolBarConfig"
    v-bind="$attrs"
  >
    <template
      v-for="(_, slotName) in $slots"
      #[slotName]="slotProps"
    >
      <slot
        :name="slotName"
        v-bind="slotProps || {}"
      ></slot>
    </template>
  </RecordsManager>
</template>

<script setup>
  import { useUserStore } from '@/store';
  import RecordsManager from './core/ant/index.vue';

  const props = defineProps({
    toolBarConfig: {
      type: Object,
    },
    recordListConfig: {
      type: Object,
      required: true,
    },
  });

  const userStore = useUserStore();
  const route = useRoute();
  const permissonInfo = userStore.getPermissionInfo(route.meta.code);
  const buttonList = permissonInfo?.buttons;

  const innerToolBarConfig = computed(() => {
    if (props?.toolBarConfig) {
      if (buttonList) {
        const target = { ...props.toolBarConfig, list: [] };
        for (const tooBarItem of props.toolBarConfig.list) {
          if (['openModal', 'batch'].includes(tooBarItem.type)) {
            if (buttonList.includes(tooBarItem.key)) {
              target.list.push(tooBarItem);
            }
          } else {
            target.list.push(tooBarItem);
          }
        }
        return target;
      } else {
        return props.toolBarConfig;
      }
    } else {
      return null;
    }
  });

  const innerRecordListConfig = computed(() => {
    if (buttonList) {
      const target = { ...props.recordListConfig, columnsConfig: [] };
      for (const col of props.recordListConfig.columnsConfig) {
        if (col.type === 'operater') {
          const taretCol = { ...col, list: [] };
          for (const colBtn of col.list) {
            if (buttonList.includes(colBtn.key)) {
              taretCol.list.push(colBtn);
            }
          }
          target.columnsConfig.push(taretCol);
        } else {
          target.columnsConfig.push(col);
        }
      }
      return target;
    } else {
      return props.recordListConfig;
    }
  });
</script>
