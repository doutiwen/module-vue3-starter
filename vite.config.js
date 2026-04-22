import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver, AntDesignVueResolver } from 'unplugin-vue-components/resolvers';
import vueJsx from '@vitejs/plugin-vue-jsx';
import VueSetupExtend from 'vite-plugin-vue-setup-extend';
import compressPlugin from 'vite-plugin-compression';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  return {
    server: {
      host: '0.0.0.0',
      port: 8088,
      proxy: {
        '/api': {
          target: '',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    plugins: [
      vue(),
      //自动引入ES模块
      AutoImport({
        include: [
          /\.[tj]sx?$/, // .ts, .tsx, .js, .jsx
          /\.vue$/,
          /\.vue\?vue/, // .vue
        ],
        //引入index.js中的模块
        fileFilter: (filePath) => {
          return /\.(js|ts)$/.test(filePath) && !filePath.includes('node_modules');
        },
        resolvers: [ElementPlusResolver()], //自动引入element-plus组件
        imports: ['vue', 'vuex', 'vue-router'],
        dirs: ['./src/utils', './src/api'],
        eslintrc: {
          enabled: true,
        },
      }),
      //自动按需引入vue组件
      Components({
        resolvers: [
          ElementPlusResolver(),
          AntDesignVueResolver({
            importStyle: false,
            resolveIcons: true,
          }),
        ], //自动引入element-plus、antD组件
        directoryAsNamespace: true, //解决命名冲突
        include: [/\.vue$/, /\.vue\?vue/, /\.jsx$/, /\.tsx$/],
      }),
      vueJsx({
        transformOn: true,
        mergeProps: true,
      }), //vue文件中使用jsx
      VueSetupExtend(), //支持在setup标签中直接添加vue组件name属性
      command === 'serve' &&
        mode === 'prod' &&
        compressPlugin({
          ext: '.gz',
          algorithm: 'gzip',
          deleteOriginFile: true,
        }), //产品模式下开启gzip压缩
    ].filter((i) => !!i),
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        request: resolve(
          __dirname,
          'src',
          mode === 'mock' ? './api/requestMock/index.js' : './api/request.js'
        ), //接口请求方法，根据是否为mock模式来引入不同的文件
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
    },
    css: {
      preprocessorOptions: {
        scss: {
          //自动引入全局scss变量定义文件
          additionalData: '@use "/src/styles/vars.scss" as *;',
          charset: false,
          api: 'modern',
        },
      },
      postcss: {
        plugins: [
          {
            postcssPlugin: 'internal:charset-removal',
            AtRule: {
              charset: (atRule) => {
                if (atRule.name === 'charset') {
                  atRule.remove();
                }
              },
            },
          },
        ],
      },
    },
    assetsInclude: [
      '**/*.doc',
      '**/*.docx',
      '**/*.xls',
      '**/*.xlsx',
      '**/*.7z',
      '**/*.zip',
      '**/*.rar',
      '**/*.txt',
      '**/*.pdf',
    ],
    build: {
      outDir: 'dist', // 打包输出目录
      assetsDir: 'assets', // 静态资源目录
      sourcemap: false, // 生产环境通常关闭 sourcemap 以保护源码并减小体积
      minify: 'terser', // 使用 terser 压缩 (比 esbuild 压缩率更高，但速度稍慢)
      cssCodeSplit: true, // CSS 代码分割
      chunkSizeWarningLimit: 1500, // 增大 chunk 警告限制
      rollupOptions: {
        output: {
          manualChunks: {
            'vue-vendor': ['vue', 'vue-router', 'pinia'], // 框架相关库单独打包
            'ui-vendor': ['element-plus'], // 大型 UI 库单独打包 (按需引入时可选)
          },
          chunkFileNames: 'assets/chunk/[hash]_[name].js',
          assetFileNames: (assetInfo) => {
            /* 
              type assetInfo={
                fileName: string;
                name?: string; //模块名称，assetsInclude中声明的类型为绝对地址
                source: string | Uint8Array;
                type: 'asset';
              }
            */
            if (assetInfo.name.includes('/src/asyncRequestApi/mockFile/mock')) {
              return 'assets/static/mockFile/[name].[ext]';
            } else {
              return 'assets/static/[ext]/[hash]_[name].[ext]';
            }
          },
          entryFileNames: 'assets/entry/[name].js',
        },
      },
      // Terser 压缩配置
      terserOptions: {
        compress: {
          drop_console: true, // 生产环境移除 console
          drop_debugger: true, // 移除 debugger
        },
      },
    },
  };
});
