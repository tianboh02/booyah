import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

import SettingsAccountCard from '@/components/settings/settingsAccountCard.vue'
import SettingsAvatar from '@/components/settings/settingsAvatar.vue'
import SettingsExperienceCard from '@/components/settings/settingsExperienceCard.vue'
import SettingsLogoutCard from '@/components/settings/settingsLogoutCard.vue'
import SettingsProfileCard from '@/components/settings/settingsProfileCard.vue'
import SettingsSaveBar from '@/components/settings/settingsSaveBar.vue'
import SettingsView from '@/views/SettingsView.vue'

// --- Mock Composables & Utils ---
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
    useRouter: () => ({ push: mockPush })
}))

vi.mock('@/utils/motion', () => ({
    vSpotlight: {}
}))

const mockHandle = ref('octocat')
const mockDisplayName = ref('Octo Cat')
const mockExperience = ref('Newcomer')
const mockAvatarUrl = ref('https://github.com/avatar.png')
const mockInitial = ref('O')
const mockIsSignedIn = ref(true)
const mockRefreshUser = vi.fn()
const mockSaveDisplayName = vi.fn()
const mockSaveExperience = vi.fn()
const mockLogout = vi.fn()

vi.mock('@/utils/userSettings', () => ({
    useUserSettings: () => ({
        isSignedIn: mockIsSignedIn,
        refreshUser: mockRefreshUser,
        handle: mockHandle,
        displayName: mockDisplayName,
        shownName: mockDisplayName,
        experience: mockExperience,
        avatarUrl: mockAvatarUrl,
        initial: mockInitial,
        saveDisplayName: mockSaveDisplayName,
        saveExperience: mockSaveExperience,
        logout: mockLogout
    })
}))

// Stub sub-components where needed
const SettingsAvatarStub = {
    name: 'SettingsAvatar',
    template: '<div class="settings-avatar-stub"></div>',
    props: ['src', 'initial', 'size', 'ring', 'ringColor']
}

const SettingsSaveBarStub = {
    name: 'SettingsSaveBar',
    template: '<div class="settings-save-bar-stub"><button class="mock-save" @click="$emit(\'save\')">Save</button><button class="mock-reset" @click="$emit(\'reset\')">Reset</button></div>',
    props: ['dirty', 'status', 'disabled', 'error'],
    emits: ['save', 'reset']
}

beforeEach(() => {
    vi.clearAllMocks()
    mockHandle.value = 'octocat'
    mockDisplayName.value = 'Octo Cat'
    mockExperience.value = 'Newcomer'
    mockAvatarUrl.value = 'https://github.com/avatar.png'
    mockInitial.value = 'O'
    mockIsSignedIn.value = true
})

// ============================================================================
// 1. settingsAvatar.vue
// ============================================================================
describe('SettingsAvatar', () => {
    it('renders avatar image with correct size styles by default', () => {
        const wrapper = mount(SettingsAvatar, {
            props: { src: 'https://example.com/pic.png', size: 64 }
        })

        const img = wrapper.find('img')
        expect(img.exists()).toBe(true)
        expect(img.attributes('src')).toBe('https://example.com/pic.png')
        expect(wrapper.find('.avatar').attributes('style')).toContain('--size: 64px;')
    })

    it('falls back to initial string when image fails to load', async () => {
        const wrapper = mount(SettingsAvatar, {
            props: { src: 'https://invalid-url.png', initial: 'A' }
        })

        await wrapper.find('img').trigger('error')

        expect(wrapper.find('img').exists()).toBe(false)
        expect(wrapper.find('.initial').text()).toBe('A')
    })

    it('applies ring class when ring prop is true', () => {
        const wrapper = mount(SettingsAvatar, {
            props: { ring: true, ringColor: '#3fb950' }
        })

        expect(wrapper.find('.avatar').classes()).toContain('has-ring')
        expect(wrapper.find('.ring-spin').exists()).toBe(true)
    })
})

// ============================================================================
// 2. settingsSaveBar.vue
// ============================================================================
describe('SettingsSaveBar', () => {
    it('renders unsaved changes message and action buttons when dirty is true', () => {
        const wrapper = mount(SettingsSaveBar, {
            props: { dirty: true, status: 'idle' }
        })

        expect(wrapper.text()).toContain('You have unsaved changes')
        expect(wrapper.find('.discard-btn').exists()).toBe(true)
        expect(wrapper.find('.save-btn').text()).toBe('Save changes')
    })

    it('emits "save" and "reset" when corresponding buttons are clicked', async () => {
        const wrapper = mount(SettingsSaveBar, {
            props: { dirty: true, status: 'idle' }
        })

        await wrapper.find('.save-btn').trigger('click')
        expect(wrapper.emitted('save')).toBeTruthy()

        await wrapper.find('.discard-btn').trigger('click')
        expect(wrapper.emitted('reset')).toBeTruthy()
    })

    it('renders error alert when error prop is supplied', () => {
        const wrapper = mount(SettingsSaveBar, {
            props: { dirty: true, error: 'Failed to update settings.' }
        })

        expect(wrapper.find('.alert-danger').text()).toBe('Failed to update settings.')
    })

    it('disables save button when disabled or saving', () => {
        const wrapper = mount(SettingsSaveBar, {
            props: { dirty: true, disabled: true, status: 'saving' }
        })

        const saveBtn = wrapper.find('.save-btn')
        expect(saveBtn.attributes('disabled')).toBeDefined()
        expect(wrapper.text()).toContain('Saving...')
    })
})

// ============================================================================
// 3. settingsLogoutCard.vue
// ============================================================================
describe('SettingsLogoutCard', () => {
    it('requires two clicks to confirm logout and redirects to home page', async () => {
        const wrapper = mount(SettingsLogoutCard)

        const btn = wrapper.find('.logout-btn')
        expect(btn.text()).toBe('Log out')

        // First click: prompts for confirmation
        await btn.trigger('click')
        expect(btn.text()).toBe('Confirm log out')
        expect(mockLogout).not.toHaveBeenCalled()

        // Second click: triggers logout and routing
        await btn.trigger('click')
        expect(mockLogout).toHaveBeenCalledTimes(1)
        expect(mockPush).toHaveBeenCalledWith('/')
    })
})

// ============================================================================
// 4. settingsProfileCard.vue
// ============================================================================
describe('SettingsProfileCard', () => {
    it('binds display name input, shows live preview, and tracks character limit', async () => {
        const wrapper = mount(SettingsProfileCard, {
            global: {
                stubs: {
                    SettingsAvatar: SettingsAvatarStub,
                    SettingsSaveBar: SettingsSaveBarStub
                }
            }
        })

        const input = wrapper.find('input#displayName')
        expect(input.element.value).toBe('Octo Cat')
        expect(wrapper.find('.preview-name').text()).toBe('Octo Cat')

        await input.setValue('New Name')
        expect(wrapper.find('.counter').text()).toBe('8/40')
    })

    it('displays validation error if name is empty while dirty', async () => {
        const wrapper = mount(SettingsProfileCard, {
            global: {
                stubs: {
                    SettingsAvatar: SettingsAvatarStub,
                    SettingsSaveBar: SettingsSaveBarStub
                }
            }
        })

        const input = wrapper.find('input#displayName')
        await input.setValue('   ')

        expect(wrapper.find('.invalid-feedback').text()).toBe('Enter a name to show across Booyah.')
    })

    it('calls saveDisplayName with trimmed value when save is executed', async () => {
        mockSaveDisplayName.mockResolvedValueOnce()

        const wrapper = mount(SettingsProfileCard, {
            global: {
                stubs: {
                    SettingsAvatar: SettingsAvatarStub,
                    SettingsSaveBar: SettingsSaveBarStub
                }
            }
        })

        await wrapper.find('input#displayName').setValue('  Jane Doe  ')
        await wrapper.findComponent(SettingsSaveBarStub).vm.$emit('save')

        expect(mockSaveDisplayName).toHaveBeenCalledWith('Jane Doe')
    })
})

// ============================================================================
// 5. settingsExperienceCard.vue
// ============================================================================
describe('SettingsExperienceCard', () => {
    it('allows changing experience level radio options and saving update', async () => {
        mockSaveExperience.mockResolvedValueOnce()

        const wrapper = mount(SettingsExperienceCard, {
            global: {
                stubs: { SettingsSaveBar: SettingsSaveBarStub }
            }
        })

        const practitionerRadio = wrapper.find('input[value="Practitioner"]')
        await practitionerRadio.setValue(true)

        expect(wrapper.find('.landing-note').text()).toContain('My Projects')

        await wrapper.findComponent(SettingsSaveBarStub).vm.$emit('save')
        expect(mockSaveExperience).toHaveBeenCalledWith('Practitioner')
    })
})

// ============================================================================
// 6. settingsAccountCard.vue
// ============================================================================
describe('SettingsAccountCard', () => {
    it('displays GitHub handle, connection status, and external access link', () => {
        const wrapper = mount(SettingsAccountCard, {
            global: {
                stubs: { SettingsAvatar: SettingsAvatarStub }
            }
        })

        expect(wrapper.find('.handle').text()).toBe('@octocat')
        expect(wrapper.text()).toContain('Connected')
        expect(wrapper.find('.manage-link').attributes('href')).toBe('https://github.com/settings/applications')
    })
})

// ============================================================================
// 7. SettingsView.vue
// ============================================================================
describe('SettingsView', () => {
    it('calls refreshUser on mount and displays signed-in user header details', async () => {
        const wrapper = mount(SettingsView, {
            global: {
                stubs: {
                    PageHeader: {
                        name: 'PageHeader',
                        template: '<div class="header-stub"><slot name="subtitle" /><slot name="aside" /></div>',
                        props: ['title', 'colors']
                    },
                    SettingsAvatar: SettingsAvatarStub,
                    SettingsProfileCard: true,
                    SettingsExperienceCard: true,
                    SettingsAccountCard: true,
                    SettingsLogoutCard: true
                }
            }
        })

        await flushPromises()

        expect(mockRefreshUser).toHaveBeenCalledTimes(1)
        expect(wrapper.text()).toContain('Signed in as @octocat')
        expect(wrapper.find('.alert-warning').exists()).toBe(false)
    })

    it('displays warning alert when user is not signed in', async () => {
        mockIsSignedIn.value = false
        mockHandle.value = ''

        const wrapper = mount(SettingsView, {
            global: {
                stubs: {
                    PageHeader: {
                        name: 'PageHeader',
                        template: '<div class="header-stub"><slot name="subtitle" /></div>',
                        props: ['title', 'colors']
                    },
                    SettingsAvatar: SettingsAvatarStub,
                    SettingsProfileCard: true,
                    SettingsExperienceCard: true,
                    SettingsAccountCard: true,
                    SettingsLogoutCard: true
                }
            }
        })

        await flushPromises()

        expect(wrapper.find('.alert-warning').text()).toContain('We could not find your account details.')
        expect(wrapper.text()).toContain('Manage your profile and preferences.')
    })

    it('computes header colors dynamically based on experience level', async () => {
        mockExperience.value = 'Newcomer'

        const wrapper = mount(SettingsView, {
            global: {
                stubs: {
                    PageHeader: {
                        name: 'PageHeader',
                        template: '<div class="header-stub">Header</div>',
                        props: ['title', 'colors']
                    },
                    SettingsAvatar: SettingsAvatarStub,
                    SettingsProfileCard: true,
                    SettingsExperienceCard: true,
                    SettingsAccountCard: true,
                    SettingsLogoutCard: true
                }
            }
        })

        await flushPromises()

        expect(wrapper.findComponent({ name: 'PageHeader' }).props('colors')).toEqual(['#41b883', '#58a6ff', '#f1e05a'])

        mockExperience.value = 'Practitioner'
        await wrapper.vm.$nextTick()

        expect(wrapper.findComponent({ name: 'PageHeader' }).props('colors')).toEqual(['#58a6ff', '#6b8aff', '#3178c6'])
    })
})