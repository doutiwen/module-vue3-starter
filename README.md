#vue3+vuex4+vue-router4+vite2+element-plus2 通用前端开发框架说明

##1.目录说明（src 下）
assets——所有不与特定业务场景关联的工具类方法，
asyncRequesApi——异步请求方法（包含 mock 部分）
components——公用组件（偏向功能类）
css——公用样式和样式变量定义
layout——布局组件（偏向样式类，调用时常用插槽）
pages——页面组件，对应路由配置
router——路由相关
vuex——store 相关

##2.命名法
变量、文件、文件夹名建议使用小驼峰命名法，类名建议使用大驼峰命名法。

##3.eslint 规则
继承 plugin:vue/vue3-essential 和 vue-global-api 规则，外加自行声明规则，已有较高宽容度，建议不要自行修改。ES 版本为 2020。

##4.框架部分
###1.css 部分
建议统一使用 scss，css 目录中 all.scss 为全局样式，有一些常用的样式类可以直接加在 html 标签中使用。var.scss 为定义的样式变量，可以在编写组件的样式时直接使用，不必手动引入该文件。可以根据项目实际情况自行增改。

###2.vue 部分
####1.默认使用的核心是带运行时模板编译的核心，可以像声明一个对象一样声明一个子组件。
####2.vue 单文件内可以直接在 script steup 标签上定义 name，不用再写一个 script 标签来定义。
####3.vue 单文件内可以直接使用 vue,vuex,vue-router 的 api，不必手动引入。
####4.element 组件也可以直接使用。
以上 2 和 3 分别使用了 vite-plugin-vue-setup-extend 和 unplugin-auto-import 插件，有特殊需求者可以在 vite.config.js 中自行修改。

###3.vuex 部分
####1.vuex 分为多个子模块，默认有一个 user 模块以及一个开发调试专用的模块，可以自行增改（具体格式看 user 模块注释），模块名为声明文件名大写（小驼峰命名法，会用下划线隔开单词）。开发调试专用模块请勿删改，除非不使用自定义的事件总线（具体参见下文）。
####2.子模块均为自动导入，且都会自动声明设置和删除的 mutation，名称分别为 SET\_模块名称大写\_INFO、DELETE\_模块名称大写\_INFO，会被子模块文件内的同名 mutation 覆盖，其它 mutation 可按需在子模块文件内自行声明。
####3.子模块有两个钩子函数：created 和 beforeDestroy，在子模块对象的 config 属性下声明使用。created 有一个仅能访问本模块的 storeProxy 参数，可以直接调用声明好的 mutations 和 actions。beforeDestroy 除此外还有一个 moduleName 参数。created 函数的调用时机是在 app.use(store)后，beforeDestroy 是在页面刷新或者关闭前。
####4.可以在 vuex/modulesConfigManage/manager 目录下添加一个处理器，以供多个子模块复用。已经添加一个 vuex 数据持久化的 persistence 处理器，可以在需要的模块下声明 persistence 属性和相关配置。处理器的声明方法在 persistence.js 的注释中。

###4.vue-router 部分
####1.static 静态路由
#####1.角色列表
在/router/static/roleList.js 内，分为所有角色列表和会员列表，已有一个默认会员角色和游客角色（visitor，该角色名称不要修改），可以按需自行声明更多会员
#####2.路由列表
mete 内 title 是页面的标题，会自动切换。roleList 是可访问的角色列表，下级子路由可不用声明。如果为空则所有角色均可访问。homePage 和 loginPage 分别表示功能首页和登录页，只有第一个声明的一级路由会生效，不用可不声明。

###5.异步请求接口部分
位于 asyncRequestApi 目录下，使用时如下调用：
import asyncRequestApi from '@/asyncRequestApi/index.js';
asyncRequestApi({
apiFilePath: 'user/userLogin.js',
apiName: 'login',
requestData: {
name:'xxxx'
password: 'xxxx',
},
});
具体参数类型可看注释
####1.需要根据项目实际需求修改 config.js 文件内容，具体可看文件内注释
####2.使用时先在 api 目录下添加 api 描述：首先新建对应的大功能块的目录（若没有），再新建细分的功能块接口的 js 文件（固定为两层目录），js 文件内容的具体格式可看 userLogin.js 内容和注释
####3.应用运行在 mock 模式下将使用 api 描述中的 mock 属性项的值来验证参数和返回数据，使用了 mockjs 来生成返回数据（非 download 类型）

###6.其它部分
####1.事件总线
首先建议遵从 vue 官方指导，使用其它方式来进行通信，不再使用 vue2 中常见的事件总线。若确有必要，可引入 assets 中的 eventBus.js 进行使用。新增了一个订阅某事件的组件名的列表，开发模式下会放入 vuex 中以便调试使用。具体使用方法参见文件内注释。
####2.全局方法
位于 assets/global/global.js 中，可直接使用其中方法，不需手动引入。包含一些判断数据类型等非常常用的基本方法，若实际项目中存在极为常用的工具类方法，可以考虑加入其中。
####3.页面刷新、关闭前调用方法（vuex 数据持久化处理器用到此方法）
位于 assets/beforePageUnload.js 中，将 callback 作为参数传入，会挨个执行，数量限制为 4 个方法
####4.工具类方法
位于 assets/tools.js 中，已经包含一些方法，自行添加前请先参阅，勿重复编写方法
####5.数据体类（功能与 vue 计算属性有重复，暂处于实验期）
位于 assets/dataBody/dataBody.js 中，用于拉取数据对象后和提交数据对象前的属性值的格式转换。
