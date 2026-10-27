import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

import AlertBanners from '@/components/shared/AlertBanners.vue'
import BookmarkButton from '@/components/shared/BookmarkButton.vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import RetryCard from '@/components/shared/RetryCard.vue'
import SegmentedToggle from '@/components/shared/SegmentedToggle.vue'
import SignalLoader from '@/components/shared/SignalLoader.vue'
import SortPills from '@/components/shared/SortPills.vue'

// --- Mocks & Globals ---
const mockSetLight = vi.fn()
const mockEmitSignal = vi.fn()
const mockDestroy = vi.fn()

vi.mock('@/utils/signalScene', () => ({
    createScene: vi.fn(() => ({
        setLight: mockSetLight,
        emitSignal: mockEmitSignal,
        destroy: mockDestroy
    }))
}))

const mockTheme = ref('dark')
vi.mock('@/composables/useTheme', () => ({
    useTheme: () => ({
        theme: mockTheme
    })
}))

global.ResizeObserver = class {
    observe() { }
    unobserve() { }
    disconnect() { }
}

beforeEach(() => {
    vi.clearAllMocks()
    mockTheme.value = 'dark'

    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn()
        }))
    })
})

// ============================================================================
// 1. AlertBanners.vue
// ============================================================================
describe('AlertBanners', () => {
    it('renders warning alert message when warning prop is provided', () => {
        const wrapper = mount(AlertBanners, {
            props: { warning: 'API rate limit approaching' }
        })

        expect(wrapper.find('.alert-warning').text()).toBe('API rate limit approaching')
        expect(wrapper.find('.alert-danger').exists()).toBe(false)
    })

    it('renders error alert with retry button and emits "retry" on click', async () => {
        const wrapper = mount(AlertBanners, {
            props: { error: 'Failed to fetch repositories' }
        })

        expect(wrapper.find('.alert-danger').text()).toContain('Failed to fetch repositories')

        const retryBtn = wrapper.find('.alert-danger button')
        await retryBtn.trigger('click')

        expect(wrapper.emitted('retry')).toBeTruthy()
        expect(wrapper.emitted('retry')).toHaveLength(1)
    })
})

// ============================================================================
// 2. BookmarkButton.vue
// ============================================================================
describe('BookmarkButton', () => {
    it('renders bookmark button with unsaved aria attributes and label', () => {
        const wrapper = mount(BookmarkButton, {
            props: { label: 'vuejs/core', saved: false }
        })

        const btn = wrapper.find('button')
        expect(btn.attributes('aria-label')).toBe('Save vuejs/core')
        expect(btn.attributes('aria-pressed')).toBe('false')
        expect(btn.classes()).not.toContain('is-saved')
    })

    it('applies saved styling and updates aria-label when saved is true', () => {
        const wrapper = mount(BookmarkButton, {
            props: { label: 'vuejs/core', saved: true }
        })

        const btn = wrapper.find('button')
        expect(btn.attributes('aria-label')).toBe('Remove vuejs/core from saved')
        expect(btn.attributes('aria-pressed')).toBe('true')
        expect(btn.classes()).toContain('is-saved')
    })

    it('emits "click" when bookmark button is clicked', async () => {
        const wrapper = mount(BookmarkButton, {
            props: { label: 'vuejs/core' }
        })

        await wrapper.find('button').trigger('click')
        expect(wrapper.emitted('click')).toBeTruthy()
    })
})

// ============================================================================
// 3. PageHeader.vue
// ============================================================================
describe('PageHeader', () => {
    it('splits title string into individual letter elements and renders title', () => {
        const wrapper = mount(PageHeader, {
            props: { title: 'Discovery' }
        })

        const letters = wrapper.findAll('.letter')
        expect(letters).toHaveLength(9)
        expect(letters[0].text()).toBe('D')
        expect(letters[8].text()).toBe('y')
    })

    it('renders status pill and applies "is-live" class when live is true', () => {
        const wrapper = mount(PageHeader, {
            props: { title: 'Dashboard', status: 'Live Updates', live: true }
        })

        const statusPill = wrapper.find('.status-pill')
        expect(statusPill.exists()).toBe(true)
        expect(statusPill.classes()).toContain('is-live')
        expect(statusPill.text()).toContain('Live Updates')
    })

    it('renders slot content for subtitle and aside', () => {
        const wrapper = mount(PageHeader, {
            props: { title: 'Jobs' },
            slots: {
                subtitle: '<span class="custom-sub">Explore tech jobs</span>',
                aside: '<button class="aside-btn">Filter</button>'
            }
        })

        expect(wrapper.find('.custom-sub').text()).toBe('Explore tech jobs')
        expect(wrapper.find('.aside-btn').text()).toBe('Filter')
    })
})

// ============================================================================
// 4. RetryCard.vue
// ============================================================================
describe('RetryCard', () => {
    it('renders error title and message, emitting "retry" on button click', async () => {
        const wrapper = mount(RetryCard, {
            props: { title: 'Unable to load content', message: 'Network connection lost.' }
        })

        expect(wrapper.text()).toContain('Unable to load content')
        expect(wrapper.text()).toContain('Network connection lost.')

        await wrapper.find('button').trigger('click')
        expect(wrapper.emitted('retry')).toBeTruthy()
        expect(wrapper.emitted('retry')).toHaveLength(1)
    })
})

// ============================================================================
// 5. SegmentedToggle.vue
// ============================================================================
describe('SegmentedToggle', () => {
    const options = [
        { value: 'all', label: 'All' },
        { value: 'active', label: 'Active' }
    ]

    it('renders option buttons and highlights selected option', () => {
        const wrapper = mount(SegmentedToggle, {
            props: { options, modelValue: 'all' }
        })

        const btns = wrapper.findAll('.seg-btn')
        expect(btns).toHaveLength(2)
        expect(btns[0].classes()).toContain('is-on')
        expect(btns[1].classes()).not.toContain('is-on')
    })

    it('emits "update:modelValue" when clicking an inactive option button', async () => {
        const wrapper = mount(SegmentedToggle, {
            props: { options, modelValue: 'all' }
        })

        await wrapper.findAll('.seg-btn')[1].trigger('click')
        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
        expect(wrapper.emitted('update:modelValue')[0][0]).toBe('active')
    })
})

// ============================================================================
// 6. SignalLoader.vue
// ============================================================================
describe('SignalLoader', () => {
    it('initializes signal scene canvas and displays loading status hud', () => {
        const legend = [{ label: 'Vue', colour: [65, 184, 131] }]
        const wrapper = mount(SignalLoader, {
            props: { done: 2, total: 5, status: 'Fetching data', legend }
        })

        expect(wrapper.find('canvas').exists()).toBe(true)
        expect(wrapper.text()).toContain('Fetching data')
        expect(wrapper.findAll('.pip')).toHaveLength(5)
        expect(wrapper.findAll('.pip-on')).toHaveLength(2)
        expect(wrapper.text()).toContain('Vue')
    })

    it('renders progress bar meter when total is greater than 12', () => {
        const wrapper = mount(SignalLoader, {
            props: { done: 10, total: 20, status: 'Loading items' }
        })

        expect(wrapper.find('.pip').exists()).toBe(false)
        expect(wrapper.find('.meter').exists()).toBe(true)
        expect(wrapper.find('.meter-fill').attributes('style')).toContain('width: 50%;')
    })
})

// ============================================================================
// 7. SortPills.vue
// ============================================================================
describe('SortPills', () => {
    const options = [
        { value: 'newest', label: 'Recently saved' },
        { value: 'stars', label: 'Stars' },
        { value: 'name', label: 'Name' }
    ]

    it('renders sort options and highlights active pill', () => {
        const wrapper = mount(SortPills, {
            props: { options, modelValue: 'stars' }
        })

        const btns = wrapper.findAll('button')
        expect(btns).toHaveLength(3)
        expect(btns[1].classes()).toContain('active')
        expect(btns[1].attributes('aria-checked')).toBe('true')
    })

    it('emits "update:modelValue" when clicking a sort pill', async () => {
        const wrapper = mount(SortPills, {
            props: { options, modelValue: 'stars' }
        })

        await wrapper.findAll('button')[0].trigger('click')
        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
        expect(wrapper.emitted('update:modelValue')[0][0]).toBe('newest')
    })

    it('navigates options via keyboard arrow key events', async () => {
        const wrapper = mount(SortPills, {
            props: { options, modelValue: 'newest' }
        })

        const scroller = wrapper.find('.scroller')
        await scroller.trigger('keydown', { key: 'ArrowRight' })

        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
        expect(wrapper.emitted('update:modelValue')[0][0]).toBe('stars')
    })
})