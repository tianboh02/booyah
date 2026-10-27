import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

import IconCloud from '@/components/ui/icon-cloud/IconCloud.vue'
import SleekLineCursor from '@/components/ui/sleek-line-cursor/SleekLineCursor.vue'
import { isDark } from '@/composables/useTheme'

vi.mock('@/composables/useTheme', async () => {
    const { ref } = await import('vue')
    return {
        isDark: ref(false),
        useTheme: () => ({ theme: ref('dark') })
    }
})

const mockContext2D = {
    clearRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), closePath: vi.fn(),
    clip: vi.fn(), drawImage: vi.fn(), save: vi.fn(), restore: vi.fn(),
    translate: vi.fn(), scale: vi.fn(), moveTo: vi.fn(), quadraticCurveTo: vi.fn(), stroke: vi.fn(),
    canvas: { width: 1000, height: 800 }
}

beforeEach(() => {
    vi.clearAllMocks()
    isDark.value = true

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => mockContext2D)

    // Async RAF mock prevents maximum call stack recursion errors
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        return setTimeout(() => cb(performance.now()), 16)
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
        clearTimeout(id)
    })
})

afterEach(() => {
    vi.restoreAllMocks()
})

describe('IconCloud', () => {
    const mockImages = [
        'https://example.com/icon1.png',
        'https://example.com/icon2.png',
        'https://example.com/icon3.png'
    ]

    it('renders canvas element with proper accessibility attributes', () => {
        const wrapper = mount(IconCloud, { props: { images: mockImages } })
        const canvas = wrapper.find('canvas')

        expect(canvas.exists()).toBe(true)
        expect(canvas.attributes('role')).toBe('img')
        expect(canvas.attributes('aria-label')).toBe('Interactive 3D Image Cloud')
    })

    it('handles mouse drag interaction events on canvas', async () => {
        const wrapper = mount(IconCloud, { props: { images: mockImages } })
        const canvas = wrapper.find('canvas')

        await canvas.trigger('mousedown', { clientX: 150, clientY: 150 })
        await canvas.trigger('mousemove', { clientX: 160, clientY: 170 })
        await canvas.trigger('mouseup')

        await new Promise((r) => setTimeout(r, 50)) // Allow RAF to execute asynchronously

        expect(mockContext2D.clearRect).toHaveBeenCalled()
    })

    it('cleans up animation frame on component unmount', () => {
        const wrapper = mount(IconCloud, { props: { images: mockImages } })
        const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame')

        wrapper.unmount()
        expect(cancelSpy).toHaveBeenCalled()
    })
})

describe('SleekLineCursor', () => {
    it('renders cursor canvas with default props', () => {
        const wrapper = mount(SleekLineCursor)
        const canvas = wrapper.find('canvas#canvas')

        expect(canvas.exists()).toBe(true)
        expect(canvas.classes()).toContain('pointer-events-none')
    })

    it('initializes line drawing when mouse movement occurs', async () => {
        const wrapper = mount(SleekLineCursor, { props: { trails: 10, friction: 0.5 } })

        document.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 200 }))
        expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d')

        wrapper.unmount()
    })

    it('cleans up event listeners on unmount', () => {
        const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
        const wrapper = mount(SleekLineCursor)

        wrapper.unmount()
        expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
        expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function))
    })
})