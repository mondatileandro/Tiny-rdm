import { find, findIndex, isEmpty, size } from 'lodash'
import { defineStore } from 'pinia'

const useTabStore = defineStore('tab', {
    /**
     * @typedef {Object} TabItem
     * @property {string} name connection name
     * @property {boolean} blank is blank tab
     * @property {string} [title] tab title
     * @property {string} [icon] tab title
     * @property {string} [type] key type
     * @property {Object|Array} [value] key value
     * @property {string} [server] server name
     * @property {int} [db] database index
     * @property {string} [key] current key name
     * @property {int} [ttl] ttl of current key
     */

    /**
     *
     * @returns {{tabList: TabItem[], activatedTab: string, activatedIndex: number}}
     */
    state: () => ({
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
            if (isEmpty(this.tabList)) {
                this.newBlankTab()
            }
            return this.tabList
        },

        /**
         * get current activated tab item
         * @returns {TabItem|null}
         */
        currentTab() {
            return this.tabs[this.activatedIndex || 0]
            // let current = find(this.tabs, {name: this.activatedTab})
            // if (current == null) {
            //     current = this.tabs[0]
            // }
            // return current
        },

        currentTabIndex() {
            const len = size(this.tabs)
            if (this.activatedIndex < 0 || this.activatedIndex >= len) {
                this.activatedIndex = 0
            }
            return this.tabs[this.activatedIndex]
        },
    },
    actions: {
        /**
         * create new blank tab to tail
         */
        newBlankTab() {
            this.tabList.push({
                name: Date.now().toString(),
                title: 'new tab',
                blank: true,
            })
            this.activatedIndex = size(this.tabList) - 1
        },

        /**
         * update or insert a new tab if not exists with the same name
         * @param {string} server
         * @param {number} db
         * @param {number} type
         * @param {number} ttl
         * @param {string} key
         * @param {*} value
         */
        upsertTab({ server, db, type, ttl, key, value }) {
            let tabIndex = findIndex(this.tabList, { name: server })
            if (tabIndex === -1) {
                this.tabList.push({
                    name: server,
                    server,
                    db,
                    type,
                    ttl,
                    key,
                    value,
                })
                tabIndex = this.tabList.length - 1
            }
            const tab = this.tabList[tabIndex]
            tab.blank = false
            tab.title = `${server}/db${db}`
            tab.server = server
            tab.db = db
            tab.type = type
            tab.ttl = ttl
            tab.key = key
            tab.value = value
            this.activatedIndex = tabIndex
            // this.activatedTab = tab.name
        },

        /**
         * update ttl by tag
         * @param {string} server
         * @param {number} db
         * @param {string} key
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
        removeTab(tabIndex) {
            const len = size(this.tabs)
            // ignore remove last blank tab
            if (len === 1 && this.tabs[0].blank) {
                return
            }

            if (tabIndex < 0 || tabIndex >= len) {
                return
            }
            this.tabList.splice(tabIndex, 1)

            if (len === 1) {
                this.newBlankTab()
            } else {
                // Update select index if removed index equal current selected
                this.activatedIndex -= 1
                if (this.activatedIndex < 0 && this.tabList.length > 0) {
                    this.activatedIndex = 0
                }
            }
        },
        removeTabByName(tabName) {
            const idx = findIndex(this.tabs, { name: tabName })
            if (idx !== -1) {
                this.removeTab(idx)
            }
        },
        removeAllTab() {
            this.tabList = []
            this.newBlankTab()
        },
    },
})

export default useTabStore
