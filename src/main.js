import { createApp } from 'vue';
import App from './app.vue';
import dynamicRouterManager from './router/index.js';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import pinia from './store';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

const app = createApp(App);

const componentModules = import.meta.glob([
  './components/**/index.{vue,js,jsx,ts,tsx}',
  '!./components/**/core/**',
]);
Object.entries(componentModules).forEach(([path, loadComponent]) => {
  const pathParts = path.split('/');
  const componentName = pathParts[pathParts.length - 2];
  app.component(componentName, defineAsyncComponent(loadComponent));
});

pinia.use(piniaPluginPersistedstate);
app
  .use(pinia)
  .use(dynamicRouterManager.router)
  .use(ElementPlus, {
    locale: zhCn,
  })
  .mount('#app');

export default app;
