import { ref } from 'vue'
import API from '@/api'

// Same source the setup form uses: the logged-in user object in localStorage.
function getUserID() {
    try {
        return JSON.parse(localStorage.getItem('user') || '{}').id ?? null
    } catch {
        return null
    }
}

/**
 * Keeps track of which projects the current user has saved.
 *
 * saved   -> { [projectlink]: _id }   (the _id is needed to delete the save later)
 * pending -> Set of projectlinks with a request in flight (blocks double clicks)
 * error   -> message to show the user, '' when fine
 *
 * The UI updates immediately (optimistic) and rolls back if the request fails.
 */
export function useSavedProjects() {
    const saved = ref({})
    const pending = ref(new Set())
    const error = ref('')

    async function fetchSaved(userID) {
        const response = await API.post('/getSave', { userID })
        const map = {}
        for (const s of response.data.data || []) {
            map[s.projectlink] = s._id
        }
        return map
    }

    // Call once when the page opens so previously saved bookmarks show as checked.
    async function loadSaved() {
        const userID = getUserID()
        if (!userID) return

        try {
            saved.value = await fetchSaved(userID)
        } catch (e) {
            console.error('savedProjects: could not load saves', e)
            error.value = 'Could not load your saved projects.'
        }
    }

    // Saves the project if it is not saved yet, otherwise removes the save.
    async function toggleSave(project, categoryName) {
        const link = project?.ghUrl
        if (!link || pending.value.has(link)) return

        const userID = getUserID()
        if (!userID) {
            error.value = 'Sign in to save projects.'
            return
        }

        error.value = ''
        const previous = saved.value
        pending.value.add(link)

        try {
            if (previous[link]) {
                // uncheck: remove from the UI first, then delete in the backend
                const next = { ...previous }
                delete next[link]
                saved.value = next

                await API.delete('/deleteSave', { data: { _id: previous[link], userID } })
            } else {
                // check: show it as saved first, then create it in the backend
                saved.value = { ...previous, [link]: 'pending' }

                const response = await API.post('/createSave', {
                    userID,
                    projectlink: link,
                    category: categoryName
                })

                const _id = response.data?.data?._id
                if (_id) {
                    saved.value = { ...saved.value, [link]: _id }
                } else {
                    // backend did not return the new document, so look its _id up
                    saved.value = await fetchSaved(userID)
                }
            }
        } catch (e) {
            console.error('savedProjects: could not update save', e)
            saved.value = previous
            error.value = 'Could not update your saved projects. Please try again.'

            // resync with the database so the bookmark matches what is really stored
            try {
                saved.value = await fetchSaved(userID)
            } catch { /* keep the rolled-back state */ }
        } finally {
            pending.value.delete(link)
        }
    }

    return { saved, pending, error, loadSaved, toggleSave }
}