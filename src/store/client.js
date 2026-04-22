import { defineStore } from 'pinia';

export const useClientStore = defineStore(
  'client',
  () => {
    const clientInfo = {
      name: '',
      type: 'pc',
    };

    const setClientInfo = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const mobileTypeList = [
        'phone',
        'pad',
        'pod',
        'iphone',
        'ipod',
        'ios',
        'ipad',
        'android',
        'mobile',
        'blackberry',
        'iemobile',
        'mqqbrowser',
        'juc',
        'fennec',
        'wosbrowser',
        'browserng',
        'webos',
        'symbian',
        'windows phone',
      ];
      if (mobileTypeList.some((mobileType) => userAgent.includes(mobileType))) {
        clientInfo.type = 'mobile';
      }
      /*以下语句不能辨别微信浏览器和微信小程序，如果需要，可参考以下代码进行处理
        安装插件：npm install weixin-js-sdk --save
        引入：import wx from 'weixin-js-sdk'
        判断：wx.miniProgram.getEnv(res => {
                if (res.miniprogram) {
                  alert("miniProgram"); //微信小程序
                } else {
                  alert("weChat"); //微信浏览器
                }
              })
      */
      if (
        userAgent.includes('chrome') &&
        userAgent.includes('safari') &&
        !userAgent.includes('edg')
      ) {
        clientInfo.name = 'chrome';
      } else if (userAgent.includes('firefox')) {
        clientInfo.name = 'firefox';
      } else if (userAgent.includes('edg')) {
        clientInfo.name = 'edge';
      } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
        clientInfo.name = 'safari';
      } else if (userAgent.includes('micromessenger')) {
        clientInfo.name = 'wx';
      } else if (userAgent.includes('opera')) {
        clientInfo.name = 'opera';
      } else if (userAgent.includes('compatible') && userAgent.includes('msie')) {
        clientInfo.name = 'ie';
      } else {
        clientInfo.name = 'chrome';
      }
    };
    setClientInfo();

    const getClientName = () => clientInfo.name;
    const getClientType = () => clientInfo.type;

    return {
      getClientName,
      getClientType,
    };
  },
  {
    persist: {
      key: 'client',
    },
  }
);
