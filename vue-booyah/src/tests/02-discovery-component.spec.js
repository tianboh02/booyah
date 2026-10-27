import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

import DiscoveryLangPill from '@/components/discovery/discoveryLangPill.vue'
import DiscoveryCategoryCard from '@/components/discovery/discoveryCategoryCard.vue'
import DiscoveryLanguageFilter from '@/components/discovery/discoveryLanguageFilter.vue'
import DiscoveryProjectDetail from '@/components/discovery/discoveryProjectDetail.vue'
import DiscoveryStats from '@/components/discovery/discoveryStats.vue'
import DiscoveryView from '@/views/DiscoveryView.vue'

// --- Mock Utilities & Composables ---
const mockFetchDiscoveryData = vi.fn()
vi.mock('@/utils/hackernewsDiscovery', () => ({
    fetchDiscoveryData: (...args) => mockFetchDiscoveryData(...args)
}))

const mockSaved = ref({})
const mockPending = ref(new Set())
const mockSaveError = ref('')
const mockLoadSaved = vi.fn().mockResolvedValue()
const mockToggleSave = vi.fn()

vi.mock('@/utils/savedProjects', () => ({
    useSavedProjects: () => ({
        saved: mockSaved,
        pending: mockPending,
        error: mockSaveError,
        loadSaved: mockLoadSaved,
        toggleSave: mockToggleSave
    })
}))

vi.mock('@/utils/langColors', () => ({
    getLangColor: vi.fn((lang) => (lang === 'Vue' ? '#41b883' : '#58a6ff')),
    topLangColors: vi.fn(() => ['#41b883', '#58a6ff'])
}))

vi.mock('@/utils/top5Categories', () => ({
    MIN_STARS: 500,
    REPOS_PER_CATEGORY: 5,
    langOf: vi.fn((project) => project.language || 'JavaScript'),
    visibleProjects: vi.fn((category, selectedLang) => {
        if (!category || !category.projects) return []
        if (!selectedLang) return category.projects
        return category.projects.filter((p) => (p.language || 'JavaScript') === selectedLang)
    })
}))

vi.mock('@/utils/motion', () => ({
    vSpotlight: {},
    vTilt: {},
    useCountUp: (getter) => getter()
}))

// Mock native HTMLDialogElement methods for JSDOM environment
beforeEach(() => {
    vi.clearAllMocks()
    mockSaved.value = {}
    mockPending.value = new Set()
    mockSaveError.value = ''
    mockLoadSaved.mockResolvedValue()

    HTMLDialogElement.prototype.showModal = vi.fn()
    HTMLDialogElement.prototype.close = vi.fn()
})

// ============================================================================
// 1. DiscoveryLangPill.vue
// ============================================================================
describe('DiscoveryLangPill', () => {
    it('renders as a button by default and displays language label', () => {
        const wrapper = mount(DiscoveryLangPill, {
            props: { lang: 'Vue' }
        })

        const btn = wrapper.find('button')
        expect(btn.exists()).toBe(true)
        expect(wrapper.text()).toContain('Vue')
        expect(wrapper.find('.lang-dot').exists()).toBe(true)
    })

    it('renders as a static span element when static prop is true', () => {
        const wrapper = mount(DiscoveryLangPill, {
            props: { lang: 'TypeScript', static: true }
        })

        expect(wrapper.find('button').exists()).toBe(false)
        expect(wrapper.find('span.lang-pill').exists()).toBe(true)
        expect(wrapper.classes()).toContain('is-static')
    })

    it('applies active class and aria-pressed attributes when active', () => {
        const wrapper = mount(DiscoveryLangPill, {
            props: { lang: 'Go', active: true }
        })

        expect(wrapper.classes()).toContain('is-active')
        expect(wrapper.find('button').attributes('aria-pressed')).toBe('true')
    })
})

// ============================================================================
// 2. DiscoveryCategoryCard.vue
// ============================================================================
describe('DiscoveryCategoryCard', () => {
    const mockCategory = {
        id: 'cat-1',
        name: 'Web Frameworks',
        rank: 1,
        builders: 120,
        projects: [
            { id: 'vuejs/core', name: 'core', owner: 'vuejs', stars: 40000, hnPoints: 350, ghUrl: 'https://github.com/vuejs/core', language: 'Vue' },
            { id: 'facebook/react', name: 'react', owner: 'facebook', stars: 200000, hnPoints: 500, ghUrl: 'https://github.com/facebook/react', language: 'JavaScript' }
        ]
    }

    it('renders category details and project rows', () => {
        const wrapper = mount(DiscoveryCategoryCard, {
            props: { category: mockCategory }
        })

        expect(wrapper.text()).toContain('Web Frameworks')
        expect(wrapper.text()).toContain('01')
        expect(wrapper.findAll('.project-row')).toHaveLength(2)
    })

    it('emits "open" event with project data when clicking a project link', async () => {
        const wrapper = mount(DiscoveryCategoryCard, {
            props: { category: mockCategory }
        })

        await wrapper.find('.project-link').trigger('click')

        expect(wrapper.emitted('open')).toBeTruthy()
        expect(wrapper.emitted('open')[0][0]).toEqual(mockCategory.projects[0])
    })

    it('emits "save" event when bookmark button is clicked', async () => {
        const wrapper = mount(DiscoveryCategoryCard, {
            props: { category: mockCategory }
        })

        await wrapper.find('.bookmark-btn').trigger('click')

        expect(wrapper.emitted('save')).toBeTruthy()
        expect(wrapper.emitted('save')[0][0]).toEqual(mockCategory.projects[0])
    })

    it('emits "update:selectedLang" to toggle language filter', async () => {
        const wrapper = mount(DiscoveryCategoryCard, {
            props: { category: mockCategory, selectedLang: null }
        })

        await wrapper.find('.lang-link').trigger('click')

        expect(wrapper.emitted('update:selectedLang')).toBeTruthy()
        expect(wrapper.emitted('update:selectedLang')[0][0]).toBe('Vue')
    })

    it('displays saved and pending state correctly on bookmark button', () => {
        const wrapper = mount(DiscoveryCategoryCard, {
            props: {
                category: mockCategory,
                savedMap: { 'https://github.com/vuejs/core': 'save-123' },
                pendingLinks: new Set(['https://github.com/facebook/react'])
            }
        })

        const bookmarkBtns = wrapper.findAll('.bookmark-btn')
        expect(bookmarkBtns[0].classes()).toContain('is-saved')
        expect(bookmarkBtns[1].classes()).toContain('is-pending')
    })

    it('displays empty message when no projects match filter', () => {
        const wrapper = mount(DiscoveryCategoryCard, {
            props: {
                category: { ...mockCategory, projects: [] },
                selectedLang: 'Rust'
            }
        })

        expect(wrapper.find('.rows.empty').text()).toContain('No Rust projects in this category this month.')
    })
})

// ============================================================================
// 3. DiscoveryLanguageFilter.vue
// ============================================================================
describe('DiscoveryLanguageFilter', () => {
    const mockCategories = [
        {
            id: 'cat-1',
            projects: [
                { id: '1', language: 'TypeScript' },
                { id: '2', language: 'TypeScript' },
                { id: '3', language: 'Python' }
            ]
        },
        {
            id: 'cat-2',
            projects: [
                { id: '4', language: 'Python' },
                { id: '5', language: 'Go' }
            ]
        }
    ]

    it('orders language buttons by frequency in categories', () => {
        const wrapper = mount(DiscoveryLanguageFilter, {
            props: { categories: mockCategories }
        })

        const pills = wrapper.findAllComponents(DiscoveryLangPill)
        expect(pills.map((p) => p.props('lang'))).toEqual(expect.arrayContaining(['TypeScript', 'Python', 'Go']))
    })

    it('emits update:selectedLang null when "All" button is clicked', async () => {
        const wrapper = mount(DiscoveryLanguageFilter, {
            props: { categories: mockCategories, selectedLang: 'Python' }
        })

        await wrapper.find('.all-pill').trigger('click')

        expect(wrapper.emitted('update:selectedLang')).toBeTruthy()
        expect(wrapper.emitted('update:selectedLang')[0][0]).toBeNull()
    })

    it('toggles info popover display state on interaction', async () => {
        const wrapper = mount(DiscoveryLanguageFilter, {
            props: { categories: mockCategories }
        })

        expect(wrapper.find('#discovery-info').exists()).toBe(false)

        await wrapper.find('.info').trigger('mouseenter')
        expect(wrapper.find('#discovery-info').exists()).toBe(true)

        await wrapper.find('.info').trigger('mouseleave')
        expect(wrapper.find('#discovery-info').exists()).toBe(false)
    })
})

// ============================================================================
// 4. DiscoveryProjectDetail.vue
// ============================================================================
describe('DiscoveryProjectDetail', () => {
    const mockProject = {
        id: 'vuejs/core',
        owner: 'vuejs',
        name: 'core',
        categoryName: 'Frameworks',
        description: 'Vue.js 3 core repository',
        language: 'TypeScript',
        stars: 42000,
        hnPoints: 610,
        hnUrl: 'https://news.ycombinator.com/item?id=12345',
        ghUrl: 'https://github.com/vuejs/core'
    }

    it('triggers native showModal on mount and toggles body overflow class', () => {
        const wrapper = mount(DiscoveryProjectDetail, {
            props: { project: mockProject }
        })

        expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1)
        expect(document.body.classList.contains('overflow-hidden')).toBe(true)

        wrapper.unmount()
        expect(document.body.classList.contains('overflow-hidden')).toBe(false)
    })

    it('renders project metadata correctly', () => {
        const wrapper = mount(DiscoveryProjectDetail, {
            props: { project: mockProject }
        })

        expect(wrapper.text()).toContain('vuejs/core')
        expect(wrapper.text()).toContain('Vue.js 3 core repository')
        expect(wrapper.text()).toContain('42,000 stars')
        expect(wrapper.text()).toContain('610 points')
    })

    it('emits "save" event when clicking save button', async () => {
        const wrapper = mount(DiscoveryProjectDetail, {
            props: { project: mockProject, saved: false }
        })

        await wrapper.find('.save-btn').trigger('click')

        expect(wrapper.emitted('save')).toBeTruthy()
        expect(wrapper.emitted('save')[0][0]).toEqual(mockProject)
    })
})

// ============================================================================
// 5. DiscoveryStats.vue
// ============================================================================
describe('DiscoveryStats', () => {
    const mockCategories = [
        {
            id: 'c1',
            projects: [
                { id: 'p1', stars: 1000, language: 'Vue' },
                { id: 'p2', stars: 2000, language: 'Vue' },
                { id: 'p3', stars: 3000, language: 'Go' }
            ]
        }
    ]

    it('calculates total projects, total stars, and top language percentage', () => {
        const wrapper = mount(DiscoveryStats, {
            props: { categories: mockCategories, selectedLang: null }
        })

        expect(wrapper.text()).toContain('3')
        expect(wrapper.text()).toContain('6000')
        expect(wrapper.text()).toContain('Vue')
        expect(wrapper.text()).toContain('67%')
    })

    it('filters metrics based on selectedLang prop', () => {
        const wrapper = mount(DiscoveryStats, {
            props: { categories: mockCategories, selectedLang: 'Go' }
        })

        expect(wrapper.text()).toContain('1')
        expect(wrapper.text()).toContain('3000')
        expect(wrapper.text()).toContain('Go projects')
    })
})

// ============================================================================
// 6. DiscoveryView.vue
// ============================================================================
describe('DiscoveryView', () => {
    const mockCategories = [
        {
            name: 'Web Frameworks',
            projects: [
                { id: 'vuejs/core', name: 'core', owner: 'vuejs', stars: 40000, hnPoints: 350, ghUrl: 'https://github.com/vuejs/core', language: 'Vue' }
            ]
        }
    ]

    it('renders SignalLoader while fetching discovery data on mount and displays categories upon success', async () => {
        mockFetchDiscoveryData.mockImplementationOnce(async (onProgress) => {
            onProgress(1, 2)
            return { data: mockCategories, warning: '' }
        })

        const wrapper = mount(DiscoveryView, {
            global: {
                stubs: {
                    PageHeader: true,
                    SignalLoader: { template: '<div class="signal-loader-stub">Loader</div>' },
                    AlertBanners: true,
                    DiscoveryStats: true,
                    DiscoveryLanguageFilter: true,
                    DiscoveryCategoryGrid: true,
                    DiscoveryProjectDetail: true
                }
            }
        })

        expect(wrapper.find('.signal-loader-stub').exists()).toBe(true)

        await flushPromises()

        expect(wrapper.find('.signal-loader-stub').exists()).toBe(false)
        expect(wrapper.findComponent({ name: 'DiscoveryCategoryGrid' }).exists()).toBe(true)
    })

    it('displays error banner on fetch failure and retries loading when retry event is emitted', async () => {
        mockFetchDiscoveryData.mockRejectedValueOnce(new Error('Network error'))

        const wrapper = mount(DiscoveryView, {
            global: {
                stubs: {
                    PageHeader: true,
                    SignalLoader: true,
                    AlertBanners: {
                        name: 'AlertBanners',
                        props: ['error', 'warning'],
                        template: '<div class="alert-banners-stub"><button class="retry-btn" @click="$emit(\'retry\')">Retry</button><span>{{ error }}</span></div>'
                    },
                    DiscoveryStats: true,
                    DiscoveryLanguageFilter: true,
                    DiscoveryCategoryGrid: true,
                    DiscoveryProjectDetail: true
                }
            }
        })

        await flushPromises()

        expect(wrapper.text()).toContain('Could not load projects from Hacker News and GitHub')

        mockFetchDiscoveryData.mockResolvedValueOnce({ data: mockCategories, warning: '' })
        await wrapper.find('.retry-btn').trigger('click')
        await flushPromises()

        expect(mockFetchDiscoveryData).toHaveBeenCalledTimes(2)
    })

    it('handles saved project loading errors and allows dismissing saveError alert', async () => {
        mockFetchDiscoveryData.mockResolvedValueOnce({ data: mockCategories, warning: '' })
        mockLoadSaved.mockImplementationOnce(async () => {
            mockSaveError.value = 'Failed to fetch bookmarks'
        })

        const wrapper = mount(DiscoveryView, {
            global: {
                stubs: {
                    PageHeader: true,
                    SignalLoader: true,
                    AlertBanners: true,
                    DiscoveryStats: true,
                    DiscoveryLanguageFilter: true,
                    DiscoveryCategoryGrid: true,
                    DiscoveryProjectDetail: true
                }
            }
        })

        await flushPromises()

        expect(wrapper.text()).toContain('Could not load Discovery Page')

        const dismissBtn = wrapper.find('.btn-close')
        expect(dismissBtn.exists()).toBe(true)
        await dismissBtn.trigger('click')

        expect(wrapper.text()).not.toContain('Could not load Discovery Page')
    })

    it('opens project detail dialog and delegates bookmark toggle actions', async () => {
        mockFetchDiscoveryData.mockResolvedValueOnce({ data: mockCategories, warning: '' })

        const wrapper = mount(DiscoveryView, {
            global: {
                stubs: {
                    PageHeader: true,
                    SignalLoader: true,
                    AlertBanners: true,
                    DiscoveryStats: true,
                    DiscoveryLanguageFilter: true,
                    DiscoveryCategoryGrid: {
                        name: 'DiscoveryCategoryGrid',
                        template: '<div class="grid-stub"><button class="open-btn" @click="$emit(\'open\', categories[0], categories[0].projects[0])">Open</button><button class="save-btn" @click="$emit(\'save\', categories[0], categories[0].projects[0])">Save</button></div>',
                        props: ['categories']
                    },
                    DiscoveryProjectDetail: {
                        name: 'DiscoveryProjectDetail',
                        template: '<div class="detail-stub"><button class="detail-save-btn" @click="$emit(\'save\', project)">Detail Save</button><button class="close-btn" @click="$emit(\'close\')">Close</button></div>',
                        props: ['project']
                    }
                }
            }
        })

        await flushPromises()

        // Test save from card
        await wrapper.find('.save-btn').trigger('click')
        expect(mockToggleSave).toHaveBeenCalledWith(mockCategories[0].projects[0], 'Web Frameworks')

        // Test opening project detail
        await wrapper.find('.open-btn').trigger('click')
        expect(wrapper.find('.detail-stub').exists()).toBe(true)

        // Test save from detail
        await wrapper.find('.detail-save-btn').trigger('click')
        expect(mockToggleSave).toHaveBeenCalledWith(
            expect.objectContaining({ ghUrl: 'https://github.com/vuejs/core', categoryName: 'Web Frameworks' }),
            'Web Frameworks'
        )

        // Test closing project detail
        await wrapper.find('.close-btn').trigger('click')
        expect(wrapper.find('.detail-stub').exists()).toBe(false)
    })
})