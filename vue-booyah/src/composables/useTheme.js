import { ref, computed } from 'vue'

const theme = ref(localStorage.getItem('theme') || 'dark')

export function useTheme() {
    function setTheme(newTheme) {
        theme.value = newTheme
        document.documentElement.setAttribute('data-bs-theme', newTheme)
        localStorage.setItem('theme', newTheme)
    }

    function toggleTheme() {
        setTheme(theme.value === 'dark' ? 'light' : 'dark')
    }

    function initTheme() {
        setTheme(theme.value)
    }

    return {
        theme,
        toggleTheme,
        initTheme
    }
}

export const isDark = computed(() => theme.value === 'dark')
export const toggleTheme = () => useTheme().toggleTheme()
export const initTheme = () => useTheme().initTheme()