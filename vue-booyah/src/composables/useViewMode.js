import { useLocalStorage } from '@vueuse/core'

/**
 * useViewMode(page, fallback)
 * Remembers carousel vs list per page in localStorage. Every caller with the same page
 * shares the value (VueUse keeps same-key storage refs in sync), so a toolbar and a list
 * can both use it without passing it through the view.
 */
export const useViewMode = (page, fallback = 'list') =>
    useLocalStorage(`booyah:view:${page}`, fallback)
