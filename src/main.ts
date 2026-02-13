import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { createPinia } from 'pinia';

import './assets/styles/variables.css';
import './assets/styles/global.css';
import './assets/styles/loading.css';
import { initTheme } from './composables/useTheme';

const app = createApp(App);

// Element 日期相关依赖 dayjs，这里与 Element 组件 locale 保持一致。
dayjs.locale('zh-cn');
initTheme();

const pinia = createPinia();
app.use(pinia);
app.use(router);
app.use(ElementPlus, { locale: zhCn });

app.mount('#app');

