import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

// --- Component Imports ---
import GitHubSSO from '@/components/landing/GitHubSSO.vue'
import SceneCta from '@/components/landing/SceneCta.vue'
import ShinyButton from '@/components/landing/ShinyButton.vue'
import LandingView from '@/views/LandingView.vue'

// --- Composable & Utility Imports ---
import { redirectToGitHub } from '@/composables/useGitHubLogin.js'
import { initTheme } from '@/composables/useTheme'
import { navHidden } from '@/composables/useLandingNav.js'

// --- Mock Composables, Lenis & Content Utilities ---
vi.mock('lenis', () => {
    return {
        default: class LenisMock {
            constructor() {
                this.on = vi.fn()
                this.raf = vi.fn()
                this.destroy = vi.fn()
            }
        }
    }
})

vi.mock('@/composables/useScrollScene', () => ({
    gsap: {
        to: vi.fn(),
        fromTo: vi.fn(),
        from: vi.fn(),
        set: vi.fn(),
        timeline: vi.fn(() => ({
            from: vi.fn().mockReturnThis(),
            fromTo: vi.fn().mockReturnThis(),
            to: vi.fn().mockReturnThis()
        })),
        ticker: {
            add: vi.fn(),
            remove: vi.fn(),
            lagSmoothing: vi.fn()
        }
    },
    ScrollTrigger: {
        create: vi.fn((opts) => opts),
        update: vi.fn(),
        refresh: vi.fn()
    },
    useScene: vi.fn()
}))

vi.mock('@/composables/useTheme', () => ({
    initTheme: vi.fn()
}))

vi.mock('@/composables/useGitHubLogin.js', () => ({
    redirectToGitHub: vi.fn()
}))

vi.mock('@/composables/useLandingNav.js', async () => {
    const { ref } = await import('vue')
    return {
        navHidden: ref(false)
    }
})

vi.mock('@/composables/useLandingPace', () => ({
    paced: vi.fn((val) => val)
}))

vi.mock('../../utils/landingContent', () => ({
    cta: {
        word: 'BOOYAH',
        before: 'Ready to ',
        grad: 'start?',
        fine: 'No credit card required'
    }
}))

describe('GitHubSSO', () => {
    const originalLocation = window.location

    beforeEach(() => {
        delete window.location
        window.location = { href: '' }
    })

    afterEach(() => {
        window.location = originalLocation
    })

    it('renders GitHub sign in button with icon and label', () => {
        const wrapper = mount(GitHubSSO)
        expect(wrapper.find('button').exists()).toBe(true)
        expect(wrapper.text()).toContain('Sign in with GitHub')
        expect(wrapper.find('svg').exists()).toBe(true)
    })

    it('redirects window to GitHub OAuth URL with client_id and scopes when clicked', async () => {
        import.meta.env.VITE_GITHUB_CLIENT_ID = 'test_github_client_id'

        const wrapper = mount(GitHubSSO)
        await wrapper.find('button').trigger('click')

        const redirectedUrl = new URL(window.location.href)
        expect(redirectedUrl.origin + redirectedUrl.pathname).toBe('https://github.com/login/oauth/authorize')
        expect(redirectedUrl.searchParams.get('client_id')).toBe('test_github_client_id')
        expect(redirectedUrl.searchParams.get('scope')).toBe('read:user user:email repo')
    })
})

describe('SceneCta', () => {
    it('emits "signin" event when call-to-action button is clicked', async () => {
        const wrapper = mount(SceneCta)
        const btn = wrapper.find('button.cta-btn, button.btn-primary, button')
        await btn.trigger('click')

        expect(wrapper.emitted('signin')).toBeTruthy()
    })
})

describe('ShinyButton', () => {
    it('renders GitHub sign in label and SVG icon by default', () => {
        const wrapper = mount(ShinyButton)
        expect(wrapper.text()).toContain('Sign in with GitHub')
        expect(wrapper.find('svg').exists()).toBe(true)
        expect(wrapper.find('.shiny').classes()).not.toContain('sm')
    })

    it('applies small variant class "sm" when small prop is true', () => {
        const wrapper = mount(ShinyButton, { props: { small: true } })
        expect(wrapper.find('.shiny').classes()).toContain('sm')
    })

    it('emits "click" event when button is clicked', async () => {
        const wrapper = mount(ShinyButton)
        await wrapper.find('button').trigger('click')

        expect(wrapper.emitted('click')).toBeTruthy()
        expect(wrapper.emitted('click')).toHaveLength(1)
    })
})

describe('LandingView', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        navHidden.value = false

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

    it('renders landing page container and scene components', () => {
        const wrapper = mount(LandingView, {
            global: {
                stubs: {
                    NeuralDots: true, SleekLineCursor: true, SceneHero: true,
                    SceneFeed: true, SceneClock: true, SceneTiles: true,
                    SceneStatement: true, SceneShowcase: true, SceneFeatures: true,
                    SceneRing: true, SceneCta: true
                }
            }
        })

        expect(wrapper.find('.landing').exists()).toBe(true)
        expect(wrapper.findComponent({ name: 'SceneHero' }).exists()).toBe(true)
        expect(wrapper.findComponent({ name: 'SceneCta' }).exists()).toBe(true)
    })

    it('initializes theme and scroll effects on mount', () => {
        mount(LandingView, {
            global: {
                stubs: {
                    NeuralDots: true, SleekLineCursor: true, SceneHero: true,
                    SceneFeed: true, SceneClock: true, SceneTiles: true,
                    SceneStatement: true, SceneShowcase: true, SceneFeatures: true,
                    SceneRing: true, SceneCta: true
                }
            }
        })

        expect(initTheme).toHaveBeenCalledTimes(1)
    })

    it('triggers GitHub sign in redirect when signin is emitted from SceneCta', async () => {
        const wrapper = mount(LandingView, {
            global: {
                stubs: {
                    NeuralDots: true, SleekLineCursor: true, SceneHero: true,
                    SceneFeed: true, SceneClock: true, SceneTiles: true,
                    SceneStatement: true, SceneShowcase: true, SceneFeatures: true,
                    SceneRing: true,
                    SceneCta: {
                        name: 'SceneCta',
                        template: '<button class="cta-signin-btn" @click="$emit(\'signin\')">Sign In</button>'
                    }
                }
            }
        })

        await wrapper.find('.cta-signin-btn').trigger('click')
        expect(redirectToGitHub).toHaveBeenCalledTimes(1)
    })

    it('resets navHidden on unmount', () => {
        navHidden.value = true

        const wrapper = mount(LandingView, {
            global: {
                stubs: {
                    NeuralDots: true, SleekLineCursor: true, SceneHero: true,
                    SceneFeed: true, SceneClock: true, SceneTiles: true,
                    SceneStatement: true, SceneShowcase: true, SceneFeatures: true,
                    SceneRing: true, SceneCta: true
                }
            }
        })

        wrapper.unmount()
        expect(navHidden.value).toBe(false)
    })
})