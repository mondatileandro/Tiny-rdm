import { defineStore } from 'pinia'
import { lang } from '@/langs/index.js'
import { camelCase, clone, find, get, isEmpty, isObject, map, set, snakeCase, split } from 'lodash'
import {
    GetFontList,
    GetPreferences,
    RestorePreferences,
    SetPreferences,
} from 'wailsjs/go/services/preferencesService.js'
import { BrowserOpenURL } from 'wailsjs/runtime/runtime.js'
import { i18nGlobal } from '@/utils/i18n.js'
import { useOsTheme } from 'naive-ui'

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
        general: {
            theme: 'light',
            language: 'en',
            font: '',
            fontSize: 14,
            useSysProxy: false,
            useSysProxyHttp: false,
            checkUpdate: false,
            asideWidth: 300,
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
                    label: i18nGlobal.t('theme_light'),
                },
                {
                    value: 'dark',
                    label: i18nGlobal.t('theme_dark'),
                },
                {
                    value: 'auto',
                    label: i18nGlobal.t('theme_auto'),
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
                label: value['lang_name'],
            }))
            options.splice(0, 0, {
                value: 'auto',
                label: i18nGlobal.t('system_lang'),
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
                label: i18nGlobal.t('default'),
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
            if (th === 'auto') {
                if (osTheme.value === 'dark') {
                    return true
                }
            } else if (th === 'dark') {
                return true
            }
            return false
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
            const pf = Object.assign({}, obj2Map('general', this.general), obj2Map('editor', this.editor))
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
            this.general.asideWidth = width
        },

        async checkForUpdate(manual = false) {
            let msgRef = null
            if (manual) {
                msgRef = $message.loading('Retrieving for new version', { duration: 0 })
            }
            let respObj = null
            try {
                const resp = await fetch('https://api.github.com/repos/tiny-craft/tiny-rdm/releases/latest')
                if (resp.status === 200) {
                    respObj = await resp.json()
                }
            } finally {
                if (msgRef != null) {
                    msgRef.destroy()
                    msgRef = null
                }
            }

            // TODO: check current version is older then remote
            if (respObj != null && !isEmpty(respObj['html_url'])) {
                $dialog.warning(i18nGlobal.t('new_version_tip'), () => {
                    BrowserOpenURL(respObj['html_url'])
                })
            } else {
                if (manual) {
                    $message.info(i18nGlobal.t('no_update'))
                }
            }
        },
    },
})

export default usePreferencesStore
