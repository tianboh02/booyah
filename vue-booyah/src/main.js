import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import Particles from '@tsparticles/vue3'
import { loadSlim } from '@tsparticles/slim'
import router from './router'

// Import Bootstrap CSS and JS
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './assets/main.css'
import './assets/tailwind.css'

const app = createApp(App)

app.use(createPinia())
app.use(Particles, {
    init: async (engine) => {
        await loadSlim(engine)
    }
})
app.use(router)

app.mount('#app')
