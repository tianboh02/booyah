import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

import ThemeToggle from '@/components/navbar/themeToggle.vue'

// --- Mock Composables ---
const mockTheme = ref('dark')
const mockToggleTheme = vi.fn(() => {
    mockTheme.value = mockTheme.value === 'dark' ? 'light' : 'dark'
})

vi.mock('@/composables/useTheme', () => ({
    useTheme: () => ({
        theme: mockTheme,
        toggleTheme: mockToggleTheme
    })
}))

beforeEach(() => {
    vi.clearAllMocks()
    mockTheme.value = 'dark'
})

// ============================================================================
// themeToggle.vue
// ============================================================================
describe('ThemeToggle', () => {
    it('renders dark theme toggle state by default', () => {
        const wrapper = mount(ThemeToggle)

        expect(wrapper.find('button').classes()).toContain('bg-dark')
        expect(wrapper.find('button').attributes('title')).toBe('Switch to light mode')
        expect(wrapper.find('svg').exists()).toBe(true)
    })

    it('triggers toggleTheme when clicked and updates DOM attributes reactively', async () => {
        const wrapper = mount(ThemeToggle)

        await wrapper.find('button').trigger('click')

        expect(mockToggleTheme).toHaveBeenCalledTimes(1)
        expect(mockTheme.value).toBe('light')

        await wrapper.vm.$nextTick()

        expect(wrapper.find('button').classes()).toContain('bg-white')
        expect(wrapper.find('button').attributes('title')).toBe('Switch to dark mode')
    })
})