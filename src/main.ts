import { createApp } from 'vue'
import 'normalize.css'
import './assets/css/index.less'
import App from './App.vue'
import router from './router'
import store from './store'
import icons from './global/register-icons'

const app = createApp(App)
app.use(icons) // 注册element-plus图标
app.use(store) // 注册vuex
app.use(router) // 注册路由

app.mount('#app')
