/*
 * @Author: Robin LEI
 * @Date: 2025-04-09 11:28:04
 * @LastEditTime: 2025-04-09 17:05:42
 * @FilePath: \lg-wms-admind:\自己搭建\vue\customize-pdf\src\main.ts
 */
import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './assets/font/iconfont.css'; // 引入自定义图标样式文件
import zhCn from 'element-plus/es/locale/lang/zh-cn'

const app = createApp(App)
app.use(ElementPlus, {
    locale: zhCn,
})
app.mount('#app')