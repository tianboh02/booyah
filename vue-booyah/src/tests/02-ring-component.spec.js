import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

import ViewToggle from '@/components/ring/ViewToggle.vue'
import RingCaption from '@/components/ring/RingCaption.vue'
import CardRing from '@/components/ring/CardRing.vue'
import { isSmallScreen } from '@/composables/useViewMode'

vi.mock('@/composables/useViewMode', async () => {
    const { ref } = await import('vue')
    return {
        useViewMode: () => 'list',
        isSmallScreen: ref(false)
    }
})

const activeRef = ref(0)
const baseRef = ref(0)
const draggingRef = ref(false)
const goToMock = vi.fn((i) => { activeRef.value = i })
const nextMock = vi.fn(() => { activeRef.value += 1 })
const prevMock = vi.fn(() => { activeRef.value -= 1 })
const jumpToMock = vi.fn()
const startMock = vi.fn()

vi.mock('@/composables/useCardRing', () => ({
    useCardRing: () => ({
        active: activeRef,
        base: baseRef,
        dragging: draggingRef,
        goTo: goToMock,
        next: nextMock,
        prev: prevMock,
        jumpTo: jumpToMock,
        start: startMock,
        offsetOf: (i) => i - activeRef.value,
        handlers: {
            onPointerDown: vi.fn(), onPointerMove: vi.fn(), onPointerUp: vi.fn(),
            onPointerLeave: vi.fn(), onClickCapture: vi.fn(), onWheel: vi.fn(), onKeydown: vi.fn()
        }
    })
}))

vi.mock('@vueuse/core', () => ({
    useEventListener: vi.fn(),
    useResizeObserver: vi.fn()
}))

beforeEach(() => {
    vi.clearAllMocks()
    isSmallScreen.value = false
    activeRef.value = 0
    baseRef.value = 0
    draggingRef.value = false

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

describe('ViewToggle', () => {
    it('renders view toggle buttons when screen is not small', () => {
        const wrapper = mount(ViewToggle, { props: { modelValue: 'list' } })
        const buttons = wrapper.findAll('.toggle-btn')
        expect(buttons).toHaveLength(2)
        expect(buttons[1].classes()).toContain('active')
    })

    it('emits update:modelValue when a view button is clicked', async () => {
        const wrapper = mount(ViewToggle, { props: { modelValue: 'list' } })
        const buttons = wrapper.findAll('.toggle-btn')
        await buttons[0].trigger('click')

        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
        expect(wrapper.emitted('update:modelValue')[0][0]).toBe('carousel')
    })

    it('hides component when isSmallScreen is true', () => {
        isSmallScreen.value = true
        const wrapper = mount(ViewToggle, { props: { modelValue: 'list' } })
        expect(wrapper.find('.view-toggle').exists()).toBe(false)
    })
})

describe('RingCaption', () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    it('renders index, title, subtitle, and meta text', () => {
        const wrapper = mount(RingCaption, {
            props: { index: '01', title: 'Vue Framework', subtitle: '120 builders this month', meta: 'Category 01 / 05' }
        })

        expect(wrapper.find('.cap-index').text()).toBe('01')
        expect(wrapper.text()).toContain('Vue Framework')
        expect(wrapper.text()).toContain('120 builders this month')
        expect(wrapper.text()).toContain('Category 01 / 05')
    })

    it('completes title text decode animation over interval ticks', async () => {
        const wrapper = mount(RingCaption, { props: { title: 'React' } })
        vi.advanceTimersByTime(1000)
        await wrapper.vm.$nextTick()

        expect(wrapper.find('.cap-title').text()).toContain('React')
    })
})

describe('CardRing', () => {
    const mockItems = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
        { id: '3', name: 'Item 3' }
    ]

    it('renders ring slots and items in slot template', () => {
        const wrapper = mount(CardRing, {
            props: { items: mockItems, itemKey: 'id', itemLabel: 'name', label: 'Test Ring' },
            slots: { card: '<template #card="{ item }"><div class="custom-card">{{ item.name }}</div></template>' }
        })

        expect(wrapper.attributes('aria-label')).toBe('Test Ring')
        expect(wrapper.findAll('.ring-slot')).toHaveLength(3)
        expect(wrapper.find('.custom-card').text()).toBe('Item 1')
    })

    it('invokes prev and next navigation handlers on arrow button clicks', async () => {
        const wrapper = mount(CardRing, { props: { items: mockItems } })
        const arrows = wrapper.findAll('.ring-arrow')

        await arrows[0].trigger('click')
        expect(prevMock).toHaveBeenCalledTimes(1)

        await arrows[1].trigger('click')
        expect(nextMock).toHaveBeenCalledTimes(1)
    })

    it('renders individual pager bars for lists with <= 12 items and handles clicks', async () => {
        const wrapper = mount(CardRing, { props: { items: mockItems } })
        const pagerBars = wrapper.findAll('.pager-bar')

        expect(pagerBars).toHaveLength(3)
        expect(pagerBars[0].classes()).toContain('is-active')

        await pagerBars[1].trigger('click')
        expect(goToMock).toHaveBeenCalledWith(1)
    })

    it('renders progress bar indicator for lists with > 12 items', () => {
        const manyItems = Array.from({ length: 15 }, (_, i) => ({ id: String(i), name: `Item ${i}` }))
        const wrapper = mount(CardRing, { props: { items: manyItems } })

        expect(wrapper.find('.pager-bar').exists()).toBe(false)
        expect(wrapper.find('.pager-track').exists()).toBe(true)
        expect(wrapper.text()).toContain('01 / 15')
    })
})