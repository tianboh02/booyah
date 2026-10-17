import { ref, computed } from 'vue'
import API from '@/api'

// ---------------------------------------------------------------------------
// Where things live in the `user` object in localStorage.
// I could not see your user object, so these names are best guesses.
// If yours differ, change them here and everything else follows.
// ---------------------------------------------------------------------------
const FIELDS = {
    id: ['id'],
    displayName: ['name'], // the setup page greeting already reads `name` first
    handle: ['username', 'login', 'githubUsername'], // the GitHub @handle
    avatar: ['avatar_url', 'avatarUrl', 'avatar']
}

const pick = (obj, keys) => {
    for (const k of keys) if (obj[k]) return obj[k]
    return ''
}

function readUser() {
    try {
        return JSON.parse(localStorage.getItem('user') || '{}')
    } catch {
        return {}
    }
}

// One shared copy, so the header, the cards and the navbar all see the same data.
const user = ref(readUser())

// Merge a change into the stored user, keep localStorage in sync, and tell the rest of the app.
function persist(patch) {
    user.value = { ...readUser(), ...patch }
    localStorage.setItem('user', JSON.stringify(user.value))
    window.dispatchEvent(new CustomEvent('booyah:user-updated', { detail: user.value }))
}

export function useUserSettings() {
    const userID = computed(() => pick(user.value, FIELDS.id))
    const isSignedIn = computed(() => !!userID.value)
    const handle = computed(() => pick(user.value, FIELDS.handle))
    const displayName = computed(() => String(pick(user.value, FIELDS.displayName) || '').trim())
    const avatarUrl = computed(() => pick(user.value, FIELDS.avatar))
    const experience = computed(() => user.value.experience || 'New')

    // what the app calls the person: their display name, otherwise their GitHub handle
    const shownName = computed(() => displayName.value || handle.value)
    const initial = computed(() => (shownName.value || '?').charAt(0).toUpperCase())

    // Re-read localStorage, e.g. when the page opens
    function refreshUser() {
        user.value = readUser()
    }

    // PUT /auth/updateExperience  { userID, experience }  (same call as the setup page)
    async function saveExperience(value) {
        if (!userID.value) throw new Error('Not signed in')
        await API.put('/auth/updateExperience', { userID: userID.value, experience: value })
        persist({ experience: value })
    }

    // PUT /auth/updateDisplayName  { userID, displayName }  (new route, see the notes)
    async function saveDisplayName(name) {
        if (!userID.value) throw new Error('Not signed in')
        await API.put('/auth/updateDisplayName', { userID: userID.value, displayName: name })
        persist({ name })
    }

    function logout() {
        localStorage.removeItem('user')
        localStorage.removeItem('auth_token')
        user.value = {}
        window.dispatchEvent(new CustomEvent('booyah:user-updated', { detail: {} }))
    }

    return {
        user,
        isSignedIn,
        handle,
        displayName,
        shownName,
        avatarUrl,
        initial,
        experience,
        refreshUser,
        saveExperience,
        saveDisplayName,
        logout
    }
}
