import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

import Navbar from '@/components/navbar/navbar.vue'

// --- Mock Router & Composables ---
const mockPush = vi.fn()
const currentRoute = ref({ path: '/' })

vi.mock('vue-router', () => ({
    useRoute: () => currentRoute.value,
    useRouter: () => ({ push: mockPush }),
    RouterLink: {
        name: 'RouterLink',
        template: '<a :href="to"><slot /></a>',
        props: ['to', 'activeClass']
    }
}))

const mockTheme = ref('dark')
const mockToggleTheme = vi.fn()
const mockInitTheme = vi.fn()

vi.mock('@/composables/useTheme', () => ({
    useTheme: () => ({
        theme: mockTheme,
        toggleTheme: mockToggleTheme,
        initTheme: mockInitTheme
    })
}))

vi.mock('@/composables/useGitHubLogin', () => ({
    redirectToGitHub: vi.fn()
}))

vi.mock('@/composables/useLandingNav', () => ({
    navHidden: ref(false)
}))

// Stubs for nested components
const ShinyButtonStub = {
    name: 'ShinyButton',
    template: '<button class="shiny-button-stub" @click="$emit(\'click\')">Login</button>',
    props: ['small']
}

const ThemeToggleStub = {
    name: 'ThemeToggle',
    template: '<div class="theme-toggle-stub"></div>'
}

beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    currentRoute.value = { path: '/' }
    mockTheme.value = 'dark'
})

// ============================================================================
// navbar.vue
// ============================================================================
describe('Navbar', () => {
    it('renders login button on unauthenticated landing page path ("/")', () => {
        const wrapper = mount(Navbar, {
            global: {
                stubs: {
                    ShinyButton: ShinyButtonStub,
                    ThemeToggle: ThemeToggleStub
                }
            }
        })

        expect(wrapper.findComponent(ShinyButtonStub).exists()).toBe(true)
        expect(wrapper.find('.mobile-menu-card').exists()).toBe(false)
        expect(wrapper.find('#profileDropdown').exists()).toBe(false)
    })

    it('renders navigation links and user dropdown when user is authenticated', async () => {
        localStorage.setItem('auth_token', 'valid_token_123')
        localStorage.setItem('user', JSON.stringify({ name: 'Alex', experience: 'Pro', avatar: 'https://example.com/avatar.png' }))

        currentRoute.value = { path: '/discovery' }

        const wrapper = mount(Navbar, {
            global: {
                stubs: {
                    ShinyButton: ShinyButtonStub,
                    ThemeToggle: ThemeToggleStub
                }
            }
        })

        expect(wrapper.findComponent(ShinyButtonStub).exists()).toBe(false)
        expect(wrapper.find('.mobile-menu-card').exists()).toBe(true)
        expect(wrapper.text()).toContain('Discovery')
        expect(wrapper.text()).toContain('My Projects')
        expect(wrapper.text()).toContain('Alex')
        expect(wrapper.text()).toContain('✨ Pro')
    })

    it('clears credentials and redirects to home route ("/") when logging out', async () => {
        localStorage.setItem('auth_token', 'token_abc')
        localStorage.setItem('user', JSON.stringify({ name: 'Jordan' }))
        currentRoute.value = { path: '/discovery' }

        const wrapper = mount(Navbar, {
            global: {
                stubs: {
                    ShinyButton: ShinyButtonStub,
                    ThemeToggle: ThemeToggleStub
                }
            }
        })

        await wrapper.find('.logout-item').trigger('click')

        expect(localStorage.getItem('auth_token')).toBeNull()
        expect(localStorage.getItem('user')).toBeNull()
        expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('re-evaluates auth status when custom "booyah:user-updated" window event fires', async () => {
        const wrapper = mount(Navbar, {
            global: {
                stubs: {
                    ShinyButton: ShinyButtonStub,
                    ThemeToggle: ThemeToggleStub
                }
            }
        })

        expect(wrapper.find('#profileDropdown').exists()).toBe(false)

        localStorage.setItem('auth_token', 'token_new')
        localStorage.setItem('user', JSON.stringify({ name: 'Sam' }))
        currentRoute.value = { path: '/trending' }

        window.dispatchEvent(new CustomEvent('booyah:user-updated'))
        await wrapper.vm.$nextTick()

        expect(wrapper.text()).toContain('Sam')
    })
})