import './css/app.css'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { auth } from './stores/auth'

auth.init().finally(() => createApp(App).use(router).mount('#app'))
