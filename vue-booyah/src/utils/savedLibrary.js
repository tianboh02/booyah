import { ref } from 'vue'
import axios from 'axios'
import API from '@/api'

export const UNDO_MS = 6000

// --- Small shared helpers -------------------------------------------------
const CATEGORY_PALETTE = ['#58a6ff', '#41b883', '#e3b341', '#f34b7d', '#b07219', '#00ADD8', '#a371f7', '#f0883e']

// Same category name always gets the same color, across chips, bars and badges.
export function categoryColor(name = '') {
    let h = 0
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
    return CATEGORY_PALETTE[h % CATEGORY_PALETTE.length]
}

export const itemLang = (item) => item.language || 'No language'
export const itemCategory = (item) => item.category || 'Uncategorized'

function getUserID() {
    try {
        return JSON.parse(localStorage.getItem('user') || '{}').id ?? null
    } catch {
        return null
    }
}

// https://github.com/owner/name -> { owner, name }
function parseRepo(link) {
    try {
        const [owner, name] = new URL(link).pathname.split('/').filter(Boolean)
        return { owner: owner || '', name: name || link }
    } catch {
        return { owner: '', name: link }
    }
}

function toItem(save) {
    const { owner, name } = parseRepo(save.projectlink)
    return {
        _id: save._id,
        link: save.projectlink,
        category: save.category,
        owner,
        name,
        // filled in from GitHub afterwards
        description: '',
        language: null,
        stars: 0,
        forks: 0,
        updatedAt: null,
        status: 'loading' // 'loading' | 'ok' | 'error'
    }
}

async function fetchRepo(owner, name) {
    const base = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
    const token = localStorage.getItem('auth_token')
    const url = `https://api.github.com/repos/${owner}/${name}`

    try {
        const headers = token ? { ...base, Authorization: 'Bearer ' + token } : base
        return (await axios.get(url, { headers })).data
    } catch (e) {
        // a stale token should not stop public repos from loading
        if (token && e.response?.status === 401) {
            return (await axios.get(url, { headers: base })).data
        }
        throw e
    }
}

/**
 * The user's saved projects.
 *
 * items       -> one entry per save, newest first. Shows up instantly from the database,
 *                then each one is filled in with GitHub details (status: loading -> ok / error)
 * lastRemoved -> { item, index } for the undo toast, cleared after UNDO_MS
 */
export function useSavedLibrary() {
    const items = ref([])
    const loading = ref(true)
    const error = ref('')
    const lastRemoved = ref(null)
    const removing = new Set()
    let undoTimer = null

    async function enrich(item) {
        if (!item.owner) {
            item.status = 'error'
            return
        }
        try {
            const data = await fetchRepo(item.owner, item.name)
            item.description = data.description || ''
            item.language = data.language || null
            item.stars = data.stargazers_count || 0
            item.forks = data.forks_count || 0
            item.updatedAt = data.pushed_at || data.updated_at || null
            item.status = 'ok'
        } catch (e) {
            console.error('savedLibrary: could not load', item.link, e)
            item.status = 'error'
        }
    }

    // a few requests at a time so GitHub is not hit with everything at once
    async function enrichAll() {
        const queue = [...items.value]
        const worker = async () => {
            while (queue.length) await enrich(queue.shift())
        }
        await Promise.all(Array.from({ length: Math.min(6, queue.length) }, worker))
    }

    async function load() {
        loading.value = true
        error.value = ''

        const userID = getUserID()
        if (!userID) {
            error.value = 'Sign in to see your saved projects.'
            loading.value = false
            return
        }

        try {
            const response = await API.post('/getSave', { userID })
            // a Mongo _id starts with a timestamp, so sorting it descending gives newest first
            items.value = (response.data.data || [])
                .map(toItem)
                .sort((a, b) => String(b._id).localeCompare(String(a._id)))
        } catch (e) {
            console.error('savedLibrary: could not load saves', e)
            error.value = 'Could not load your saved projects.'
        } finally {
            loading.value = false
        }

        enrichAll()
    }

    function clearUndo() {
        clearTimeout(undoTimer)
        lastRemoved.value = null
    }

    // Unchecking the bookmark: leaves the list at once, DELETE /deleteSave runs behind it
    async function remove(item) {
        if (removing.has(item._id)) return

        const userID = getUserID()
        if (!userID) {
            error.value = 'Sign in to manage your saved projects.'
            return
        }

        const index = items.value.findIndex(i => i._id === item._id)
        if (index === -1) return

        removing.add(item._id)
        error.value = ''
        items.value.splice(index, 1)

        try {
            await API.delete('/deleteSave', { data: { _id: item._id, userID } })

            clearTimeout(undoTimer)
            lastRemoved.value = { item, index }
            undoTimer = setTimeout(() => (lastRemoved.value = null), UNDO_MS)
        } catch (e) {
            console.error('savedLibrary: could not remove', e)
            items.value.splice(Math.min(index, items.value.length), 0, item)
            error.value = 'Could not remove that project. Please try again.'
        } finally {
            removing.delete(item._id)
        }
    }

    // Undo creates the save again (POST /createSave) and puts it back where it was
    async function undo() {
        const last = lastRemoved.value
        if (!last) return
        clearUndo()

        const userID = getUserID()
        if (!userID) return

        try {
            const response = await API.post('/createSave', {
                userID,
                projectlink: last.item.link,
                category: last.item.category
            })

            const restored = { ...last.item, _id: response.data?.data?._id || last.item._id }
            items.value.splice(Math.min(last.index, items.value.length), 0, restored)

            // the backend did not return the new document, so look its _id up
            if (!response.data?.data?._id) {
                const fresh = await API.post('/getSave', { userID })
                const match = (fresh.data.data || []).find(s => s.projectlink === restored.link)
                const live = items.value.find(i => i.link === restored.link)
                if (match && live) live._id = match._id
            }
        } catch (e) {
            console.error('savedLibrary: could not undo', e)
            error.value = 'Could not restore that project. Save it again from Discovery.'
        }
    }

    return { items, loading, error, lastRemoved, load, remove, undo, dismissUndo: clearUndo }
}
