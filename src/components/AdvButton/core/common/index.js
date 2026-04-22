import { useUserStore } from '@/store';

const propsConfig = {
  buttonId: {
    type: String,
  },
  throttleTime: {
    type: Number,
  },
  onClick: {
    type: Function,
  },
};

const useAdvButton = (props, route) => {
  const isLoading = ref(false);
  const showButton = ref(false);
  const modulePath = route.meta.code;
  const userStore = useUserStore();
  const moduleButtonsPermissionList = userStore.getPermissionInfo(modulePath)?.buttons;
  if (moduleButtonsPermissionList && props.buttonId) {
    if (moduleButtonsPermissionList.includes(props.buttonId)) {
      showButton.value = true;
    }
  } else {
    showButton.value = true;
  }

  let throttleTimer = null;
  const throttleClick = (...e) => {
    if (!isLoading.value) {
      if (typeof props?.throttleTime === 'number' && props.throttleTime > 0) {
        if (!throttleTimer) {
          throttleTimer = setTimeout(() => {
            if (props?.onClick) {
              if (getVarType(props.onClick) === 'asyncFunction') {
                isLoading.value = true;
                props.onClick(...e).finally(() => {
                  isLoading.value = false;
                  throttleTimer = null;
                });
              } else if (getVarType(props.onClick) === 'function') {
                props.onClick(...e);
                throttleTimer = null;
              }
            }
          }, props.throttleTime);
        }
      } else {
        if (props?.onClick) {
          if (getVarType(props.onClick) === 'asyncFunction') {
            isLoading.value = true;
            props.onClick(...e).finally(() => {
              isLoading.value = false;
            });
          } else if (getVarType(props.onClick) === 'function') {
            props.onClick(...e);
          }
        }
      }
    }
  };

  // 组件卸载时清理定时器，防止内存泄漏
  onBeforeUnmount(() => {
    if (throttleTimer) {
      clearTimeout(throttleTimer);
    }
  });

  return {
    showButton,
    isLoading,
    throttleClick,
  };
};

export { useAdvButton, propsConfig };
