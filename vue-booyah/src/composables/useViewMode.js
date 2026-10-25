import { computed, effectScope } from 'vue'
import { useLocalStorage, useMediaQuery } from '@vueuse/core'

// One app-wide "tablet and below" flag. Detached scope, so it outlives whichever component read it first.
const scope = effectScope(true)
export const isSmallScreen = scope.run(() => useMediaQuery('(max-width: 768px)'))

const views = {}

/**
 * useViewMode(page, fallback)
 * Carousel vs list per page, remembered in localStorage. At 768px and below it's always list
 * (ViewToggle hides itself there); crossing back up restores the saved choice, live both ways.
 * Every caller with the same page shares one ref, so a toolbar and a list stay in sync.
 */
export function useViewMode(page, fallback = 'list') {
    views[page] ??= scope.run(() => {
        const saved = useLocalStorage(`booyah:view:${page}`, fallback)
        return computed({
            get: () => (isSmallScreen.value ? 'list' : saved.value),
            set: (v) => (saved.value = v),
        })
    })
    return views[page]
}
