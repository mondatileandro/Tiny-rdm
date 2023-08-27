import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import './styles/style.scss'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import { i18n } from '@/utils/i18n.js'
import { setupDiscreteApi } from '@/utils/discrete.js'
import usePreferencesStore from 'stores/preferences.js'

dayjs.extend(duration)
dayjs.extend(relativeTime)

async function setupApp() {
    const app = createApp(App)
    app.use(i18n)
    app.use(createPinia())

    const prefStore = usePreferencesStore()
    await prefStore.loadPreferences()
    await setupDiscreteApi()
    app.config.errorHandler = (err, instance, info) => {
        // TODO: add "send error message to author" later
        $notification.error({
            title: i18n.global.t('error'),
            content: err.toString(),
            // meta: err.stack,
        })
        console.error(err)
    }
    app.config.warnHandler = (message) => {
        console.warn(message)
    }
    app.mount('#app')
}

setupApp()
