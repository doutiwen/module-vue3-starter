import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', () => {
  const userInfo = {
    id: ref(),
    name: ref(),
    logo: ref(),
    token: ref(),
    permission: {
      list: [],
      map: new Map(),
    },
    other: shallowRef(),
  };

  const setUser = ({ id, name, logo, token, permission, other }) => {
    userInfo.id.value = id;
    userInfo.name.value = name;
    userInfo.logo.value = logo;
    userInfo.token.value = token;
    for (const [modulePath, permissionInfo] of Object.entries(permission)) {
      userInfo.permission.list.push(modulePath);
      userInfo.permission.map.set(modulePath, permissionInfo);
    }
    other && (userInfo.other.value = other);
  };

  const delUser = () => {
    userInfo.id.value = null;
    userInfo.name.value = null;
    userInfo.logo.value = null;
    userInfo.token.value = null;
    userInfo.permission.list = [];
    userInfo.permission.map.clear();
    userInfo.other.value = null;
  };

  const getToken = () => {
    return userInfo.token.value;
  };

  const getPermissionInfo = (modulePath) => {
    return userInfo.permission.map.get(modulePath);
  };

  const getPermissionList = () => {
    return userInfo.permission.list;
  };

  return {
    userInfo,
    setUser,
    delUser,
    getToken,
    getPermissionInfo,
    getPermissionList,
  };
});
