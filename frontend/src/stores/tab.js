import { find, findIndex, get, isEmpty, set, size } from 'lodash'
import { defineStore } from 'pinia'

const useTabStore = defineStore('tab', {
    /**
     * @typedef {Object} TabItem
     * @property {string} name connection name
     * @property {boolean} blank is blank tab
     * @property {string} subTab secondary tab value
     * @property {string} [title] tab title
     * @property {string} [icon] tab icon
     * @property {string[]} selectedKeys
     * @property {string} [type] key type
     * @property {Object|Array} [value] key value
     * @property {string} [server] server name
     * @property {int} [db] database index
     * @property {string} [key] current key name
     * @property {number[]|null|undefined} [keyCode] current key name as char array
     * @property {int} [ttl] ttl of current key
     */

    /**
     *
     * @returns {{tabList: TabItem[], activatedTab: string, activatedIndex: number}}
     */
    state: () => ({
        nav: 'server',
        asideWidth: 300,
        tabList: [],
        activatedTab: '',
        activatedIndex: 0, // current activated tab index
    }),
    getters: {
        /**
         * get current tab list item
         * @returns {TabItem[]}
         */
        tabs() {
            // if (isEmpty(this.tabList)) {
            //     this.newBlankTab()
            // }
            return this.tabList
        },

        /**
         * get current activated tab item
         * @returns {TabItem|null}
         */
        currentTab() {
            return get(this.tabs, this.activatedIndex)
            // let current = find(this.tabs, {name: this.activatedTab})
            // if (current == null) {
            //     current = this.tabs[0]
            // }
            // return current
        },

        currentSelectedKeys() {
            const tab = this.currentTab()
            return get(tab, 'selectedKeys', [])
        },
    },
    actions: {
        /**
         *
         * @param idx
         * @param {boolean} [switchNav]
         * @param {string} [subTab]
         * @private
         */
        _setActivatedIndex(idx, switchNav, subTab) {
            this.activatedIndex = idx
            if (switchNav === true) {
                this.nav = idx >= 0 ? 'browser' : 'server'
                if (!isEmpty(subTab)) {
                    set(this.tabList, [idx, 'subTab'], subTab)
                }
            } else {
                if (idx < 0) {
                    this.nav = 'server'
                }
            }
        },

        /**
         * update or insert a new tab if not exists with the same name
         * @param {string} subTab
         * @param {string} server
         * @param {number} [db]
         * @param {number} [type]
         * @param {number} [ttl]
         * @param {string} [key]
         * @param {string} [keyCode]
         * @param {number} [size]
         * @param {*} [value]
         * @param {string} [viewAs]
         */
        upsertTab({ subTab, server, db, type, ttl, key, keyCode, size, value, viewAs }) {
            let tabIndex = findIndex(this.tabList, { name: server })
            if (tabIndex === -1) {
                this.tabList.push({
                    name: server,
                    title: server,
                    subTab,
                    server,
                    db,
                    type,
                    ttl,
                    key,
                    keyCode,
                    size,
                    value,
                    viewAs,
                })
                tabIndex = this.tabList.length - 1
            } else {
                const tab = this.tabList[tabIndex]
                tab.blank = false
                tab.subTab = subTab
                // tab.title = db !== undefined ? `${server}/db${db}` : `${server}`
                tab.title = server
                tab.server = server
                tab.db = db
                tab.type = type
                tab.ttl = ttl
                tab.key = key
                tab.keyCode = keyCode
                tab.size = size
                tab.value = value
                tab.viewAs = viewAs
            }
            this._setActivatedIndex(tabIndex, true, subTab)
            // this.activatedTab = tab.name
        },

        /**
         * update ttl by tag
         * @param {string} server
         * @param {number} db
         * @param {string|number[]} key
         * @param {number} ttl
         */
        updateTTL({ server, db, key, ttl }) {
            let tab = find(this.tabList, { name: server, db, key })
            if (tab == null) {
                return
            }
            tab.ttl = ttl
        },

        /**
         * set tab's content to empty
         * @param {string} name
         */
        emptyTab(name) {
            const tab = find(this.tabList, { name })
            if (tab != null) {
                tab.key = null
                tab.value = null
            }
        },
        switchTab(tabIndex) {
            // const len = size(this.tabList)
            // if (tabIndex < 0 || tabIndex >= len) {
            //     tabIndex = 0
            // }
            // this.activatedIndex = tabIndex
            // const tabIndex = findIndex(this.tabList, {name})
            // if (tabIndex === -1) {
            //     return
            // }
            // this.activatedIndex = tabIndex
        },

        switchSubTab(name) {
            const tab = this.currentTab
            if (tab == null) {
                return
            }
            tab.subTab = name
        },

        /**
         *
         * @param {number} tabIndex
         * @returns {*|null}
         */
        removeTab(tabIndex) {
            const len = size(this.tabs)
            // ignore remove last blank tab
            if (len === 1 && this.tabs[0].blank) {
                return null
            }

            if (tabIndex < 0 || tabIndex >= len) {
                return null
            }
            const removed = this.tabList.splice(tabIndex, 1)

            // update select index if removed index equal current selected
            this.activatedIndex -= 1
            if (this.activatedIndex < 0) {
                if (this.tabList.length > 0) {
                    this._setActivatedIndex(0, false)
                } else {
                    this._setActivatedIndex(-1, false)
                }
            } else {
                this._setActivatedIndex(this.activatedIndex, false)
            }

            return size(removed) > 0 ? removed[0] : null
        },

        /**
         *
         * @param {string} tabName
         */
        removeTabByName(tabName) {
            const idx = findIndex(this.tabs, { name: tabName })
            if (idx !== -1) {
                this.removeTab(idx)
            }
        },

        /**
         *
         */
        removeAllTab() {
            this.tabList = []
            this._setActivatedIndex(-1, false)
        },

        /**
         * set selected keys of current display browser tree
         * @param {string} server
         * @param {string|string[]} [keys]
         */
        setSelectedKeys(server, keys = null) {
            let tab = find(this.tabList, { name: server })
            if (tab != null) {
                if (keys == null) {
                    // select nothing
                    tab.selectedKeys = [server]
                } else if (typeof keys === 'string') {
                    tab.selectedKeys = [keys]
                } else {
                    tab.selectedKeys = keys
                }
            }
        },
    },
})

export default useTabStore
