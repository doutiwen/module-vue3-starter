/**
 * AdvButton 高级按钮逻辑 Hook
 *
 * 【功能说明】
 * 基于 Element Plus el-button 封装的按钮逻辑 Hook，支持权限控制和节流点击。
 *
 * 【核心特性】
 * 1. 权限控制：根据 buttonId 和路由元信息控制按钮显示
 * 2. 节流点击：支持配置节流时间，防止重复点击
 * 3. 异步加载：异步点击函数自动显示 loading 状态
 *
 * 【Props 属性】
 * | 属性名 | 类型 | 说明 |
 * |--------|------|------|
 * | buttonId | String | 按钮权限标识 |
 * | throttleTime | Number | 节流时间（毫秒） |
 * | onClick | Function | 点击回调函数 |
 *
 * 【返回值】
 * | 返回值 | 类型 | 说明 |
 * |--------|------|------|
 * | isLoading | Boolean | 是否加载中 |
 * | throttleClick | Function | 节流点击处理函数 |
 */

import { ref, onBeforeUnmount } from 'vue';

/**
 * AdvButton 属性定义
 */
const propsConfig = {
  /**
   * 按钮权限标识
   */
  buttonId: {
    type: String,
  },
  /**
   * 节流时间（毫秒）
   */
  throttleTime: {
    type: Number,
  },
  /**
   * 点击回调函数
   */
  onClick: {
    type: Function,
  },
  /**
   * 是否需要确认
   */
  confirm: {
    type: Boolean,
    default: false,
  },
  /**
   * 确认提示消息
   */
  confirmMsg: {
    type: String,
  },
};

/**
 * 使用 AdvButton Hook
 * @param {Object} props - 组件属性
 * @param {Object} route - 路由信息对象
 * @returns {Object} 状态和方法
 */
const useAdvButton = (props, route, msgBox) => {
  /**
   * 按钮加载状态
   */
  const isLoading = ref(false);

  /**
   * 节流定时器
   */
  let throttleTimer = null;

  const executeOnClick = async (...e) => {
    if (props.confirm) {
      const noticeMsg = props.confirmMsg || '是否确认执行此操作？';
      try {
        await msgBox(noticeMsg, '提示', {
          confirmButtonText: '确认',
          cancelButtonText: '取消',
          type: 'warning',
        });
      } catch (err) {
        if (err === 'cancel') {
          return {};
        }
        return {};
      }
    }
    if (props?.onClick) {
      if (getVarType(props.onClick) === 'asyncFunction') {
        isLoading.value = true;
        try {
          return await props.onClick(...e);
        } finally {
          isLoading.value = false;
        }
      } else if (getVarType(props.onClick) === 'function') {
        return props.onClick(...e);
      }
    }
    return {};
  };

  const throttleClick = async (...e) => {
    if (!isLoading.value) {
      if (typeof props?.throttleTime === 'number' && props.throttleTime > 0) {
        if (!throttleTimer) {
          throttleTimer = setTimeout(async () => {
            try {
              await executeOnClick(...e);
            } finally {
              throttleTimer = null;
            }
          }, props.throttleTime);
        }
      } else {
        await executeOnClick(...e);
      }
    }
  };

  /**
   * 组件卸载时清理定时器，防止内存泄漏
   */
  onBeforeUnmount(() => {
    if (throttleTimer) {
      clearTimeout(throttleTimer);
    }
  });

  return {
    isLoading,
    throttleClick,
  };
};

export { useAdvButton, propsConfig };
