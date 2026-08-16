import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from '@/App.vue'
import router from '@/router'
import { registrarGuardDeSesion } from '@/router/guard'
import '@/assets/scss/main.scss'

const app = createApp(App)

app.use(createPinia())
registrarGuardDeSesion(router)
app.use(router)
app.mount('#app')
