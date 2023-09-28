import { defineStore } from 'pinia'
import { lang } from '@/langs/index.js'
import { camelCase, clone, find, get, isEmpty, isObject, map, set, snakeCase, split } from 'lodash'
import {
    CheckForUpdate,
    GetFontList,
    GetPreferences,
    RestorePreferences,
    SetPreferences,
} from 'wailsjs/go/services/preferencesService.js'
import { BrowserOpenURL } from 'wailsjs/runtime/runtime.js'
import { i18nGlobal } from '@/utils/i18n.js'
import { enUS, NButton, NSpace, useOsTheme, zhCN } from 'naive-ui'
import { h, nextTick } from 'vue'

const osTheme = useOsTheme()
const usePreferencesStore = defineStore('preferences', {
    /**
     * @typedef {Object} FontItem
     * @property {string} name
     * @property {string} path
     */
    /**
     * @typedef {Object} Preferences
     * @property {Object} general
     * @property {Object} editor
     * @property {FontItem[]} fontList
     */
    /**
     *
     * @returns {Preferences}
     */
    state: () => ({
        behavior: {
            asideWidth: 300,
            windowWidth: 0,
            windowHeight: 0,
        },
        general: {
            theme: 'auto',
            language: 'en',
            font: '',
            fontSize: 14,
            useSysProxy: false,
            useSysProxyHttp: false,
            checkUpdate: false,
            skipVersion: '',
        },
        editor: {
            font: '',
            fontSize: 14,
        },
        lastPref: {},
        fontList: [],
    }),
    getters: {
        getSeparator() {
            return ':'
        },

        themeOption() {
            return [
                {
                    value: 'light',
                    label: i18nGlobal.t('preferences.general.theme_light'),
                },
                {
                    value: 'dark',
                    label: i18nGlobal.t('preferences.general.theme_dark'),
                },
                {
                    value: 'auto',
                    label: i18nGlobal.t('preferences.general.theme_auto'),
                },
            ]
        },

        /**
         * all available language
         * @returns {{label: string, value: string}[]}
         */
        langOption() {
            const options = Object.entries(lang).map(([key, value]) => ({
                value: key,
                label: value['name'],
            }))
            options.splice(0, 0, {
                value: 'auto',
                label: i18nGlobal.t('preferences.general.system_lang'),
            })
            return options
        },

        /**
         * all system font list
         * @returns {{path: string, label: string, value: string}[]}
         */
        fontOption() {
            const option = map(this.fontList, (font) => ({
                value: font.name,
                label: font.name,
                path: font.path,
            }))
            option.splice(0, 0, {
                value: '',
                label: i18nGlobal.t('preferences.general.default'),
                path: '',
            })
            return option
        },

        /**
         * current font selection
         * @returns {{fontSize: string}}
         */
        generalFont() {
            const fontStyle = {
                fontSize: this.general.fontSize + 'px',
            }
            if (!isEmpty(this.general.font) && this.general.font !== 'none') {
                const font = find(this.fontList, { name: this.general.font })
                if (font != null) {
                    fontStyle['fontFamily'] = `${font.name}`
                }
            }
            return fontStyle
        },

        /**
         * get current language setting
         * @return {string}
         */
        currentLanguage() {
            let lang = get(this.general, 'language', 'auto')
            if (lang === 'auto') {
                const systemLang = navigator.language || navigator.userLanguage
                lang = split(systemLang, '-')[0]
            }
            return lang || 'en'
        },

        isDark() {
            const th = get(this.general, 'theme', 'auto')
            if (th !== 'auto') {
                return th === 'dark'
            } else {
                return osTheme.value === 'dark'
            }
        },

        themeLocale() {
            const lang = this.currentLanguage
            switch (lang) {
                case 'zh':
                    return zhCN
                default:
                    return enUS
            }
        },

        autoCheckUpdate() {
            return get(this.general, 'checkUpdate', false)
        },
    },
    actions: {
        _applyPreferences(data) {
            for (const key in data) {
                const keys = map(split(key, '.'), camelCase)
                set(this, keys, data[key])
            }
        },

        /**
         * load preferences from local
         * @returns {Promise<void>}
         */
        async loadPreferences() {
            const { success, data } = await GetPreferences()
            if (success) {
                this.lastPref = clone(data)
                this._applyPreferences(data)
                i18nGlobal.locale.value = this.currentLanguage
            }
        },

        /**
         * load system font list
         * @returns {Promise<string[]>}
         */
        async loadFontList() {
            const { success, data } = await GetFontList()
            if (success) {
                const { fonts = [] } = data
                this.fontList = fonts
            } else {
                this.fontList = []
            }
            return this.fontList
        },

        /**
         * save preferences to local
         * @returns {Promise<boolean>}
         */
        async savePreferences() {
            const obj2Map = (prefix, obj) => {
                const result = {}
                for (const key in obj) {
                    if (isObject(obj[key])) {
                        const subResult = obj2Map(`${prefix}.${snakeCase(key)}`, obj[key])
                        Object.assign(result, subResult)
                    } else {
                        result[`${prefix}.${snakeCase(key)}`] = obj[key]
                    }
                }
                return result
            }
            const pf = Object.assign(
                {},
                obj2Map('behavior', this.behavior),
                obj2Map('general', this.general),
                obj2Map('editor', this.editor),
            )
            const { success, msg } = await SetPreferences(pf)
            return success === true
        },

        /**
         * reset to last loaded preferences
         * @returns {Promise<void>}
         */
        async resetToLastPreferences() {
            if (!isEmpty(this.lastPref)) {
                this._applyPreferences(this.lastPref)
            }
        },

        /**
         * restore preferences to default
         * @returns {Promise<boolean>}
         */
        async restorePreferences() {
            const { success, data } = await RestorePreferences()
            if (success === true) {
                const { pref } = data
                this._applyPreferences(pref)
                return true
            }
            return false
        },

        setAsideWidth(width) {
            this.behavior.asideWidth = width
        },

        async checkForUpdate(manual = false) {
            let msgRef = null
            if (manual) {
                msgRef = $message.loading('Retrieving for new version', { duration: 0 })
            }
            try {
                const { success, data = {} } = await CheckForUpdate()
                if (success) {
                    const { version = 'v1.0.0', latest, page_url: pageUrl } = data
                    if ((manual || latest > this.general.skipVersion) && latest > version && !isEmpty(pageUrl)) {
                        const notiRef = $notification.show({
                            title: i18nGlobal.t('dialogue.upgrade.title'),
                            content: i18nGlobal.t('dialogue.upgrade.new_version_tip', { ver: latest }),
                            action: () =>
                                h('div', { class: 'flex-box-h flex-item-expand' }, [
                                    h(NSpace, { wrapItem: false }, () => [
                                        h(
                                            NButton,
                                            {
                                                size: 'small',
                                                secondary: true,
                                                onClick: () => {
                                                    // skip this update
                                                    this.general.skipVersion = latest
                                                    this.savePreferences()
                                                    notiRef.destroy()
                                                },
                                            },
                                            () => i18nGlobal.t('dialogue.upgrade.skip'),
                                        ),
                                        h(
                                            NButton,
                                            {
                                                size: 'small',
                                                secondary: true,
                                                onClick: notiRef.destroy,
                                            },
                                            () => i18nGlobal.t('dialogue.upgrade.later'),
                                        ),
                                        h(
                                            NButton,
                                            {
                                                type: 'primary',
                                                size: 'small',
                                                secondary: true,
                                                onClick: () => BrowserOpenURL(pageUrl),
                                            },
                                            () => i18nGlobal.t('dialogue.upgrade.download_now'),
                                        ),
                                    ]),
                                ]),
                            onPositiveClick: () => BrowserOpenURL(pageUrl),
                        })
                        return
                    }
                }

                if (manual) {
                    $message.info(i18nGlobal.t('dialogue.upgrade.no_update'))
                }
            } finally {
                nextTick().then(() => {
                    if (msgRef != null) {
                        msgRef.destroy()
                        msgRef = null
                    }
                })
            }
        },
    },
})

export default usePreferencesStore
