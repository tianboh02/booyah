import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import axios from 'axios'

// --- Component Imports ---
import LearnChoiceCard from '@/components/learn/learnChoiceCard.vue'
import LearnExtendCard from '@/components/learn/learnExtendCard.vue'
import LearnProjectList from '@/components/learn/learnProjectList.vue'
import LearnResourceList from '@/components/learn/learnResourceList.vue'
import LearnStep from '@/components/learn/learnStep.vue'
import LearnView from '@/views/LearnView.vue'

// --- Mock API & Utilities ---
vi.mock('axios', () => ({
    default: {
        get: vi.fn().mockResolvedValue({ data: [] })
    }
}))

const mockFetchDiscoveryData = vi.fn()
vi.mock('@/utils/hackernewsDiscovery', () => ({
    fetchDiscoveryData: (...args) => mockFetchDiscoveryData(...args)
}))

const mockFetchTopRepos = vi.fn()
vi.mock('@/utils/trending/github/githubTrending', () => ({
    fetchTopRepos: (...args) => mockFetchTopRepos(...args)
}))

const mockFetchHNJobsData = vi.fn()
vi.mock('@/utils/hackernewsJobs', () => ({
    fetchHNJobsData: (...args) => mockFetchHNJobsData(...args)
}))

const mockExperience = ref('newcomer')
vi.mock('@/utils/userSettings', () => ({
    useUserSettings: () => ({ experience: mockExperience })
}))

vi.mock('@/utils/savedLibrary', () => ({
    categoryColor: vi.fn(() => '#3178c6')
}))

vi.mock('@/utils/langColors', () => ({
    getLangColor: vi.fn(() => '#58a6ff'),
    topLangColors: vi.fn(() => ['#58a6ff'])
}))

vi.mock('@/utils/motion', () => ({
    vSpotlight: {},
    vTilt: {},
    prefersReducedMotion: vi.fn(() => false)
}))

vi.mock('@/utils/trending/helpers/format', () => ({
    compact: vi.fn((val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : String(val)))
}))

vi.mock('@/utils/learnPath', () => ({
    readCodeUrl: vi.fn((url) => url.replace('github.com', 'github.dev')),
    extendIdeas: vi.fn(() => [{ text: 'Add AI feature' }]),
    jobDemand: vi.fn(() => ({})),
    languageCounts: vi.fn((langs) => {
        if (!langs || !langs.length) return {}
        return { Vue: 2 }
    }),
    nextLanguages: vi.fn(() => [{ lang: 'Python', why: 'High demand' }]),
    recommendedProjects: vi.fn(() => [{ ghUrl: 'https://github.com/test/rec', name: 'rec-project', description: 'desc', language: 'Python', stars: 500 }]),
    reposToExtend: vi.fn(() => ({ repos: [{ id: 1, name: 'my-repo', html_url: 'https://github.com/user/my-repo', stargazers_count: 10, language: 'Vue' }], matched: true })),
    starterProjects: vi.fn(() => [{ ghUrl: 'https://github.com/test/starter', name: 'starter-project', description: 'desc', language: 'TypeScript', stars: 100 }]),
    suggestLanguages: vi.fn(() => [{ lang: 'TypeScript', why: 'Popular in web' }])
}))

vi.mock('@/utils/learnResources', () => ({
    isKnownLanguage: vi.fn((lang) => lang === 'Python' || lang === 'TypeScript'),
    resourcesFor: vi.fn((lang) => ({
        docs: `https://${lang.toLowerCase()}.org/docs`,
        roadmap: `https://roadmap.sh/${lang.toLowerCase()}`,
        exercism: `https://exercism.org/tracks/${lang.toLowerCase()}`,
        videos: [
            {
                url: 'https://youtube.com/watch?v=123',
                title: `${lang} Tutorial for Beginners`,
                by: 'Code Academy',
                thumb: 'https://img.youtube.com/vi/123/0.jpg'
            }
        ]
    }))
}))

const DiscoveryLangPillStub = {
    name: 'DiscoveryLangPill',
    template: '<span class="discovery-lang-pill-stub">{{ lang }}</span>',
    props: ['lang', 'static']
}

beforeEach(() => {
    vi.clearAllMocks()
    mockExperience.value = 'newcomer'
    mockFetchDiscoveryData.mockResolvedValue({ data: [], warning: '' })
    mockFetchTopRepos.mockResolvedValue({ repos: [] })
    mockFetchHNJobsData.mockResolvedValue({ data: { rolesDetail: {} } })
    axios.get.mockResolvedValue({ data: [] })
    Element.prototype.scrollIntoView = vi.fn()
})

// ============================================================================
// 1. learnChoiceCard.vue
// ============================================================================
describe('LearnChoiceCard', () => {
    it('renders label, subtext, and emits "select" on click', async () => {
        const wrapper = mount(LearnChoiceCard, {
            props: {
                label: 'Python Path',
                sub: 'Recommended for AI & Backend',
                color: '#3776ab'
            }
        })

        expect(wrapper.text()).toContain('Python Path')
        expect(wrapper.text()).toContain('Recommended for AI & Backend')

        await wrapper.find('button').trigger('click')

        expect(wrapper.emitted('select')).toBeTruthy()
        expect(wrapper.emitted('select')).toHaveLength(1)
    })

    it('applies active class and sets aria-pressed="true" when active prop is true', () => {
        const wrapper = mount(LearnChoiceCard, {
            props: {
                label: 'JavaScript',
                active: true,
                color: '#f7df1e'
            }
        })

        const btn = wrapper.find('button')
        expect(btn.classes()).toContain('is-active')
        expect(btn.attributes('aria-pressed')).toBe('true')
    })
})

// ============================================================================
// 2. learnExtendCard.vue
// ============================================================================
describe('LearnExtendCard', () => {
    const mockRepo = {
        name: 'awesome-vue-app',
        html_url: 'https://github.com/user/awesome-vue-app',
        stargazers_count: 2400,
        language: 'Vue'
    }

    const mockIdeas = [
        { text: 'Add TypeScript support', url: 'https://github.com/user/awesome-vue-app/issues/1' },
        { text: 'Refactor state management using Pinia' }
    ]

    it('renders repository header details and formatted stars', () => {
        const wrapper = mount(LearnExtendCard, {
            props: { repo: mockRepo, ideas: mockIdeas },
            global: { stubs: { DiscoveryLangPill: DiscoveryLangPillStub } }
        })

        const repoLink = wrapper.find('.repo-link')
        expect(repoLink.text()).toBe('awesome-vue-app')
        expect(repoLink.attributes('href')).toBe('https://github.com/user/awesome-vue-app')
        expect(wrapper.text()).toContain('★ 2.4k')
    })

    it('conditionally renders anchor tag for ideas with url and span for ideas without url', () => {
        const wrapper = mount(LearnExtendCard, {
            props: { repo: mockRepo, ideas: mockIdeas },
            global: { stubs: { DiscoveryLangPill: DiscoveryLangPillStub } }
        })

        const ideaLinks = wrapper.findAll('.idea-link')
        expect(ideaLinks).toHaveLength(1)
        expect(ideaLinks[0].text()).toBe('Add TypeScript support')
        expect(ideaLinks[0].attributes('href')).toBe('https://github.com/user/awesome-vue-app/issues/1')

        const plainIdea = wrapper.findAll('li')[1]
        expect(plainIdea.find('a').exists()).toBe(false)
        expect(plainIdea.text()).toContain('Refactor state management using Pinia')
    })
})

// ============================================================================
// 3. learnProjectList.vue
// ============================================================================
describe('LearnProjectList', () => {
    const mockProjects = [
        {
            ghUrl: 'https://github.com/vuejs/core',
            name: 'vuejs/core',
            description: 'Vue.js 3 core repository',
            language: 'TypeScript',
            stars: 42000
        }
    ]

    it('renders list of projects with github.dev code reader links', () => {
        const wrapper = mount(LearnProjectList, {
            props: { projects: mockProjects },
            global: { stubs: { DiscoveryLangPill: DiscoveryLangPillStub } }
        })

        expect(wrapper.text()).toContain('vuejs/core')
        expect(wrapper.text()).toContain('Vue.js 3 core repository')

        const codeLink = wrapper.find('a.btn-outline-primary')
        expect(codeLink.attributes('href')).toBe('https://github.dev/vuejs/core')
        expect(codeLink.text()).toBe('Read the code')
    })
})

// ============================================================================
// 4. learnResourceList.vue
// ============================================================================
describe('LearnResourceList', () => {
    it('renders starter documentation resources and video cards for specified language', () => {
        const wrapper = mount(LearnResourceList, {
            props: { lang: 'Python' }
        })

        // Starter section tests
        expect(wrapper.text()).toContain('Official Python guide')
        expect(wrapper.text()).toContain('roadmap.sh')
        expect(wrapper.text()).toContain('Exercism')

        // Video section tests
        expect(wrapper.text()).toContain('Python Tutorial for Beginners')
        expect(wrapper.text()).toContain('▶ Code Academy')
        expect(wrapper.find('img').attributes('src')).toBe('https://img.youtube.com/vi/123/0.jpg')
    })
})

// ============================================================================
// 5. learnStep.vue
// ============================================================================
describe('LearnStep', () => {
    it('formats step number with zero-padding and renders title, hint, and slot content', () => {
        const wrapper = mount(LearnStep, {
            props: {
                number: 2,
                title: 'Choose a Repository',
                hint: 'Pick a project that matches your current skill level.'
            },
            slots: {
                default: '<div class="step-content">Slot Payload</div>'
            }
        })

        expect(wrapper.find('span.font-monospace').text()).toBe('02')
        expect(wrapper.find('h2').text()).toBe('Choose a Repository')
        expect(wrapper.text()).toContain('Pick a project that matches your current skill level.')
        expect(wrapper.find('.step-content').text()).toBe('Slot Payload')
    })
})

// ============================================================================
// 6. LearnView.vue
// ============================================================================
describe('LearnView', () => {
    const mockCategories = [
        {
            id: 'cat-1',
            name: 'Web Frameworks',
            projects: [{ id: 'p1', language: 'TypeScript' }]
        }
    ]

    it('renders SignalLoader while fetching data on mount and displays newcomer choices upon success', async () => {
        mockExperience.value = 'newcomer'
        mockFetchDiscoveryData.mockResolvedValueOnce({ data: mockCategories, warning: '' })
        mockFetchTopRepos.mockResolvedValueOnce({ repos: [] })
        mockFetchHNJobsData.mockResolvedValueOnce({ data: { rolesDetail: {} } })

        const wrapper = mount(LearnView, {
            global: {
                stubs: {
                    PageHeader: true,
                    SignalLoader: { template: '<div class="signal-loader-stub">Loader</div>' },
                    AlertBanners: true,
                    LearnStep: { template: '<div class="learn-step-stub"><slot /></div>' },
                    LearnChoiceCard: {
                        name: 'LearnChoiceCard',
                        template: '<button class="choice-card-stub" @click="$emit(\'select\')">{{ label }}</button>',
                        props: ['label']
                    },
                    LearnProjectList: true,
                    LearnResourceList: true,
                    LearnExtendCard: true,
                    DiscoveryLangPill: true
                }
            }
        })

        expect(wrapper.find('.signal-loader-stub').exists()).toBe(true)

        await flushPromises()

        expect(wrapper.find('.signal-loader-stub').exists()).toBe(false)
        expect(wrapper.text()).toContain('Web Frameworks')
    })

    it('displays error banner when discovery data fails to load', async () => {
        mockFetchDiscoveryData.mockRejectedValueOnce(new Error('Network error'))
        mockFetchTopRepos.mockResolvedValueOnce({ repos: [] })
        mockFetchHNJobsData.mockResolvedValueOnce({ data: { rolesDetail: {} } })

        const wrapper = mount(LearnView, {
            global: {
                stubs: {
                    PageHeader: true,
                    SignalLoader: true,
                    AlertBanners: {
                        name: 'AlertBanners',
                        template: '<div class="alert-banners-stub"><button class="retry-btn" @click="$emit(\'retry\')">Retry</button><span>{{ error }}</span></div>',
                        props: ['error', 'warning']
                    },
                    LearnStep: true,
                    LearnChoiceCard: true,
                    LearnProjectList: true,
                    LearnResourceList: true,
                    LearnExtendCard: true,
                    DiscoveryLangPill: true
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

    it('supports newcomer flow: category selection -> language selection -> starters', async () => {
        mockExperience.value = 'newcomer'
        mockFetchDiscoveryData.mockResolvedValueOnce({ data: mockCategories, warning: '' })
        mockFetchTopRepos.mockResolvedValueOnce({ repos: [] })
        mockFetchHNJobsData.mockResolvedValueOnce({ data: { rolesDetail: {} } })

        const wrapper = mount(LearnView, {
            global: {
                stubs: {
                    PageHeader: true,
                    SignalLoader: true,
                    AlertBanners: true,
                    LearnStep: { template: '<div class="learn-step-stub"><slot /></div>' },
                    LearnChoiceCard: {
                        name: 'LearnChoiceCard',
                        template: '<button class="choice-card-stub" @click="$emit(\'select\')">{{ label }}</button>',
                        props: ['label']
                    },
                    LearnProjectList: { template: '<div class="project-list-stub">Starters</div>' },
                    LearnResourceList: { template: '<div class="resource-list-stub">Resources</div>' },
                    LearnExtendCard: true,
                    DiscoveryLangPill: true
                }
            }
        })

        await flushPromises()

        // Select category
        await wrapper.find('.choice-card-stub').trigger('click')
        await wrapper.vm.$nextTick()

        // Select language
        const langChoice = wrapper.findAll('.choice-card-stub')[1]
        await langChoice.trigger('click')
        await wrapper.vm.$nextTick()

        expect(wrapper.find('.project-list-stub').exists()).toBe(true)
        expect(wrapper.find('.resource-list-stub').exists()).toBe(true)
    })

    it('supports practitioner flow: learn next selection -> category -> extend projects', async () => {
        mockExperience.value = 'practitioner'
        mockFetchDiscoveryData.mockResolvedValueOnce({ data: mockCategories, warning: '' })
        mockFetchTopRepos.mockResolvedValueOnce({ repos: [] })
        mockFetchHNJobsData.mockResolvedValueOnce({ data: { rolesDetail: {} } })
        axios.get.mockResolvedValueOnce({
            data: [{ id: 1, name: 'my-repo', language: 'Vue' }]
        })

        const wrapper = mount(LearnView, {
            global: {
                stubs: {
                    PageHeader: true,
                    SignalLoader: true,
                    AlertBanners: true,
                    LearnStep: { template: '<div class="learn-step-stub"><slot /></div>' },
                    LearnChoiceCard: {
                        name: 'LearnChoiceCard',
                        template: '<button class="choice-card-stub" @click="$emit(\'select\')">{{ label }}</button>',
                        props: ['label']
                    },
                    LearnProjectList: { template: '<div class="project-list-stub">Recommended</div>' },
                    LearnResourceList: true,
                    LearnExtendCard: { template: '<div class="extend-card-stub">Extend Card</div>' },
                    DiscoveryLangPill: { template: '<span class="lang-pill-stub">{{ lang }}</span>', props: ['lang'] }
                }
            }
        })

        await flushPromises()

        // Select "Learn next" language option
        await wrapper.find('.choice-card-stub').trigger('click')
        await wrapper.vm.$nextTick()

        // Select Category
        const catChoice = wrapper.findAll('.choice-card-stub')[1]
        await catChoice.trigger('click')
        await wrapper.vm.$nextTick()

        expect(wrapper.find('.project-list-stub').exists()).toBe(true)
        expect(wrapper.find('.extend-card-stub').exists()).toBe(true)
    })
})