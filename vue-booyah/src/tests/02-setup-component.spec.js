import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

import ExperienceForm from '@/components/setup/experienceForm.vue'
import Setup from '@/components/setup/setup.vue'
import SetupView from '@/views/SetupView.vue'
import API from '@/api'

const mockPush = vi.fn()

vi.mock('vue-router', () => ({
    useRoute: () => ({}),
    useRouter: () => ({ push: mockPush })
}))

vi.mock('@/api', () => ({
    default: { put: vi.fn() }
}))

vi.mock('@/utils/langColors', () => ({
    getLangColor: vi.fn(() => '#58a6ff')
}))

vi.mock('@/utils/motion', () => ({
    vSpotlight: {}, vTilt: {}
}))

beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    mockPush.mockReset()

    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
            matches: true, media: query, onchange: null,
            addListener: vi.fn(), removeListener: vi.fn(),
            addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn()
        }))
    })
})

describe('ExperienceForm', () => {
    it('renders options and selects initial experience prop value', () => {
        const wrapper = mount(ExperienceForm, { props: { experience: 'Newcomer' } })

        const radioNewcomer = wrapper.find('input#expNewcomer')
        const radioPractitioner = wrapper.find('input#expPractitioner')

        expect((radioNewcomer.element).checked).toBe(true)
        expect((radioPractitioner.element).checked).toBe(false)
        expect(wrapper.text()).toContain("You'll land on Discovery")
    })

    it('emits "update:experience" when selecting a different radio option', async () => {
        const wrapper = mount(ExperienceForm, { props: { experience: 'Newcomer' } })
        await wrapper.find('input#expPractitioner').setValue(true)

        expect(wrapper.emitted('update:experience')).toBeTruthy()
        expect(wrapper.emitted('update:experience')[0][0]).toBe('Practitioner')
    })

    it('submits form, updates user profile via API and localStorage, then routes to /discovery', async () => {
        localStorage.setItem('user', JSON.stringify({ id: 'user_123', name: 'Alex' }))
        API.put.mockResolvedValueOnce({ data: { success: true } })

        const wrapper = mount(ExperienceForm, { props: { experience: 'Newcomer' } })
        await wrapper.find('form').trigger('submit.prevent')
        await flushPromises()
        await new Promise((r) => setTimeout(r, 50))

        expect(mockPush).toHaveBeenCalledWith('/discovery')
    })

    it('routes to /my-projects when experience is Practitioner upon submit', async () => {
        localStorage.setItem('user', JSON.stringify({ id: 'user_456' }))
        API.put.mockResolvedValueOnce({ data: { success: true } })

        const wrapper = mount(ExperienceForm, { props: { experience: 'Practitioner' } })
        await wrapper.find('form').trigger('submit.prevent')
        await flushPromises()
        await new Promise((r) => setTimeout(r, 50))

        expect(mockPush).toHaveBeenCalledWith('/my-projects')
    })

    it('displays error alert when API call fails during submission', async () => {
        localStorage.setItem('user', JSON.stringify({ id: 'user_123' }))
        API.put.mockRejectedValueOnce({
            response: { data: { message: 'Failed to update user profile.' } }
        })

        const wrapper = mount(ExperienceForm, { props: { experience: 'Newcomer' } })
        await wrapper.find('form').trigger('submit.prevent')
        await flushPromises()
        await new Promise((r) => setTimeout(r, 50))

        expect(wrapper.find('.alert-danger').text()).toBe('Failed to update user profile.')
        expect(mockPush).not.toHaveBeenCalled()
    })
})

describe('Setup', () => {
    it('renders fallback greeting when user is not present in localStorage', () => {
        localStorage.removeItem('user')
        const wrapper = mount(Setup, { props: { experience: 'Newcomer' } })

        const titleText = wrapper.find('.hero-title').text().replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
        expect(titleText).toContain('Welcome to Booyah')
    })

    it('renders personalized greeting when user name is in localStorage', () => {
        localStorage.setItem('user', JSON.stringify({ name: 'Jordan Lee' }))
        const wrapper = mount(Setup, { props: { experience: 'Newcomer' } })

        const titleText = wrapper.find('.hero-title').text().replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
        expect(titleText).toContain('Hi Jordan Lee, welcome to Booyah')
    })

    it('applies structured grid styling when experience prop is Practitioner', () => {
        const wrapper = mount(Setup, { props: { experience: 'Practitioner' } })
        expect(wrapper.find('.position-fixed').classes()).toContain('is-structured')
    })
})

describe('SetupView', () => {
    it('renders main setup stage and child components', () => {
        const wrapper = mount(SetupView, {
            global: { stubs: { Setup: true, ExperienceForm: true } }
        })

        expect(wrapper.find('main.setup-stage').exists()).toBe(true)
        expect(wrapper.findComponent({ name: 'Setup' }).exists()).toBe(true)
        expect(wrapper.findComponent({ name: 'ExperienceForm' }).exists()).toBe(true)
    })

    it('passes default experience state "Newcomer" and syncs updates from ExperienceForm', async () => {
        const wrapper = mount(SetupView, {
            global: {
                stubs: {
                    Setup: { name: 'Setup', template: '<div class="setup-stub">{{ experience }}</div>', props: ['experience'] },
                    ExperienceForm: {
                        name: 'ExperienceForm',
                        template: '<button class="change-exp-btn" @click="$emit(\'update:experience\', \'Practitioner\')">Change</button>',
                        props: ['experience']
                    }
                }
            }
        })

        expect(wrapper.find('.setup-stub').text()).toBe('Newcomer')
        await wrapper.find('.change-exp-btn').trigger('click')
        expect(wrapper.find('.setup-stub').text()).toBe('Practitioner')
    })
})