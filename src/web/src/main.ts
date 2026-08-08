import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './styles/global.css'
import './styles/themes/index.css'
import { useTheme } from './composables/useTheme'

const app = createApp(App)
app.use(createPinia())
app.use(router)

app.mount('#app')

// Initialize theme after mount to ensure DOM is ready
const { initTheme } = useTheme()
initTheme()
