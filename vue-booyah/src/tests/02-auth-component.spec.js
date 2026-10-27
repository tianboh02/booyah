import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

import AuthView from '@/views/AuthView.vue'
import API from '@/api.js'
import { createScene, sampleAvatar } from '@/utils/signalScene'

// --- Mock Vue Router ---
const mockPush = vi.fn()
const mockReplace = vi.fn()
const mockQuery = ref({})

vi.mock('vue-router', () => ({
    useRoute: () => ({ query: mockQuery.value }),
    useRouter: () => ({ push: mockPush, replace: mockReplace }),
    RouterLink: {
        template: '<a><slot /></a>'
    }
}))

// --- Mock API & Utils ---
vi.mock('@/api.js', () => ({
    default: {
        post: vi.fn()
    }
}))

vi.mock('@/utils/signalScene', () => ({
    createScene: vi.fn(() => ({
        setMode: vi.fn(),
        success: vi.fn((points, callbacks) => {
            callbacks?.onWelcome?.()
            callbacks?.onFade?.()
            callbacks?.onDone?.()
        }),
        destroy: vi.fn()
    })),
    sampleAvatar: vi.fn().mockResolvedValue([[0, 0, 0]]),
    SUCCESS_MS: 500
}))

// --- Mock Global Window Properties ---
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
        matches: true, // Default to reduced motion to simplify async timer checks in tests
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
    }))
})

describe('AuthView.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
        mockQuery.value = {}
        localStorage.clear()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('displays error state when mounted without an authorization code', async () => {
        mockQuery.value = {}
        const wrapper = mount(AuthView, {
            global: { stubs: { GitHubSSO: true } }
        })

        await flushPromises()
        vi.runAllTimers()
        await wrapper.vm.$nextTick()

        expect(wrapper.text()).toContain('Nothing to sign in with')
        expect(wrapper.text()).toContain('This page only works when GitHub sends you back here')
    })

    it('handles "access_denied" error query parameter from GitHub', async () => {
        mockQuery.value = { error: 'access_denied' }
        const wrapper = mount(AuthView, {
            global: { stubs: { GitHubSSO: true } }
        })

        expect(mockReplace).toHaveBeenCalledWith({ query: {} })

        await flushPromises()
        vi.runAllTimers()
        await wrapper.vm.$nextTick()

        expect(wrapper.text()).toContain('Sign-in cancelled')
        expect(wrapper.text()).toContain('You chose not to authorise Booyah on GitHub')
    })

    it('authenticates successfully and redirects Practitioner user to /my-projects', async () => {
        mockQuery.value = { code: 'valid_oauth_code' }
        const mockUserData = {
            token: 'mock_jwt_token',
            user: {
                username: 'octocat',
                name: 'Monomorphic Octocat',
                experience: 'Practitioner',
                avatar: 'https://github.com/avatar.png'
            },
            newUser: false
        }

        API.post.mockResolvedValueOnce({ data: mockUserData })

        const wrapper = mount(AuthView, {
            global: { stubs: { GitHubSSO: true } }
        })

        expect(mockReplace).toHaveBeenCalledWith({ query: {} })
        expect(API.post).toHaveBeenCalledWith(
            '/auth/githubOAuth',
            { code: 'valid_oauth_code' },
            { timeout: 20000 }
        )

        await flushPromises()
        vi.runAllTimers()

        expect(localStorage.getItem('auth_token')).toBe('mock_jwt_token')
        expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUserData.user))
        expect(mockPush).toHaveBeenCalledWith('/my-projects')
    })

    it('authenticates successfully and redirects general user to /discovery', async () => {
        mockQuery.value = { code: 'valid_oauth_code' }
        const mockUserData = {
            token: 'mock_jwt_token_2',
            user: {
                username: 'dev_user',
                name: 'Dev User',
                experience: 'Beginner',
                avatar: 'https://github.com/avatar.png'
            },
            newUser: true
        }

        API.post.mockResolvedValueOnce({ data: mockUserData })

        mount(AuthView, {
            global: { stubs: { GitHubSSO: true } }
        })

        await flushPromises()
        vi.runAllTimers()

        expect(mockPush).toHaveBeenCalledWith('/discovery')
    })

    it('handles HTTP 400 expired code error from auth API', async () => {
        mockQuery.value = { code: 'expired_code' }
        API.post.mockRejectedValueOnce({
            isAxiosError: true,
            response: { status: 400, data: { message: 'Code expired' } }
        })

        const wrapper = mount(AuthView, {
            global: { stubs: { GitHubSSO: true } }
        })

        await flushPromises()
        vi.runAllTimers()
        await wrapper.vm.$nextTick()

        expect(wrapper.text()).toContain('This sign-in link has expired')
    })

    it('handles network error and allows user to retry authentication', async () => {
        mockQuery.value = { code: 'retry_code' }
        API.post.mockRejectedValueOnce({
            isAxiosError: true,
            response: null,
            message: 'Network Error'
        })

        const wrapper = mount(AuthView, {
            global: { stubs: { GitHubSSO: true } }
        })

        await flushPromises()
        vi.runAllTimers()
        await wrapper.vm.$nextTick()

        expect(wrapper.text()).toContain("Can't reach Booyah")

        const retryBtn = wrapper.find('button')
        expect(retryBtn.exists()).toBe(true)
        expect(retryBtn.text()).toBe('Try again')

        API.post.mockResolvedValueOnce({
            data: {
                token: 'new_token',
                user: { username: 'retried_user', experience: 'Practitioner' }
            }
        })

        await retryBtn.trigger('click')
        await flushPromises()
        vi.runAllTimers()

        expect(API.post).toHaveBeenCalledTimes(2)
        expect(mockPush).toHaveBeenCalledWith('/my-projects')
    })

    it('cleans up 3D scene and timers on unmount', () => {
        mockQuery.value = { code: 'test_code' }
        API.post.mockReturnValue(new Promise(() => { }))

        const wrapper = mount(AuthView, {
            global: { stubs: { GitHubSSO: true } }
        })

        wrapper.unmount()
        expect(createScene).toHaveBeenCalled()
    })
})