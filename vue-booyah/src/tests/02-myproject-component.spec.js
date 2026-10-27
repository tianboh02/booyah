import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import axios from 'axios'

import ProjectList from '@/components/myproject/projectList.vue'
import ProjectStatsTable from '@/components/myproject/projectStatsTable.vue'
import MyProjectView from '@/views/MyProjectView.vue'
import { isSmallScreen } from '@/composables/useViewMode'

vi.mock('axios', () => ({ default: { get: vi.fn() } }))

vi.mock('@/composables/useViewMode', async () => {
    const { ref } = await import('vue')
    return {
        useViewMode: () => 'list',
        isSmallScreen: ref(false)
    }
})

vi.mock('@/utils/motion', () => ({
    vSpotlight: {},
    vTilt: {},
    useCountUp: (getter) => getter()
}))

vi.mock('@/utils/langColors', () => ({
    getLangColor: vi.fn((lang) => (lang === 'Vue' ? '#41b883' : '#58a6ff')),
    topLangColors: vi.fn(() => ['#41b883', '#58a6ff'])
}))

const SortPillsStub = {
    name: 'SortPills', template: '<div class="sort-pills-stub"></div>', props: ['modelValue', 'options']
}

const ViewToggleStub = {
    name: 'ViewToggle', template: '<div class="view-toggle-stub"></div>', props: ['modelValue']
}

beforeEach(() => {
    vi.clearAllMocks()
    isSmallScreen.value = false
    localStorage.clear()
})

describe('ProjectList', () => {
    const mockRepos = [
        { id: 1, name: 'alpha-repo', description: 'Vue framework component', language: 'Vue', stargazers_count: 100, forks_count: 10, updated_at: '2023-01-01T00:00:00Z', private: false, html_url: 'https://github.com/test/alpha' },
        { id: 2, name: 'beta-repo', description: 'TypeScript backend API', language: 'TypeScript', stargazers_count: 500, forks_count: 50, updated_at: '2023-06-01T00:00:00Z', private: true, html_url: 'https://github.com/test/beta' },
        { id: 3, name: 'gamma-repo', description: 'Vue documentation site', language: 'Vue', stargazers_count: 50, forks_count: 2, updated_at: '2022-01-01T00:00:00Z', private: false, html_url: 'https://github.com/test/gamma' }
    ]

    it('filters repositories based on selectedLang prop', () => {
        const wrapper = mount(ProjectList, {
            props: { repoList: mockRepos, selectedLang: 'Vue' },
            global: { stubs: { SortPills: SortPillsStub, ViewToggle: ViewToggleStub } }
        })

        const cards = wrapper.findAll('.repo-card')
        expect(cards).toHaveLength(2)
        expect(wrapper.text()).toContain('alpha-repo')
        expect(wrapper.text()).not.toContain('beta-repo')
    })

    it('filters repositories based on search query input', async () => {
        const wrapper = mount(ProjectList, {
            props: { repoList: mockRepos },
            global: { stubs: { SortPills: SortPillsStub, ViewToggle: ViewToggleStub } }
        })

        await wrapper.find('input[type="text"]').setValue('backend')

        const cards = wrapper.findAll('.repo-card')
        expect(cards).toHaveLength(1)
        expect(cards[0].text()).toContain('beta-repo')
    })

    it('emits "update:selectedLang" when clicking a language filter chip or link', async () => {
        const wrapper = mount(ProjectList, {
            props: { repoList: mockRepos, selectedLang: 'Vue' },
            global: { stubs: { SortPills: SortPillsStub, ViewToggle: ViewToggleStub } }
        })

        await wrapper.find('.filter-chip').trigger('click')
        expect(wrapper.emitted('update:selectedLang')).toBeTruthy()
        expect(wrapper.emitted('update:selectedLang')[0][0]).toBeNull()
    })

    it('displays loading skeletons when loading prop is true', () => {
        const wrapper = mount(ProjectList, {
            props: { repoList: mockRepos, loading: true },
            global: { stubs: { SortPills: SortPillsStub, ViewToggle: ViewToggleStub } }
        })

        expect(wrapper.findAll('.placeholder-glow')).toHaveLength(4)
        expect(wrapper.find('.repo-card').exists()).toBe(false)
    })

    it('displays matching empty message when search yields no results', async () => {
        const wrapper = mount(ProjectList, {
            props: { repoList: mockRepos },
            global: { stubs: { SortPills: SortPillsStub, ViewToggle: ViewToggleStub } }
        })

        await wrapper.find('input[type="text"]').setValue('nonexistent-term')
        expect(wrapper.text()).toContain('No repositories found matching "nonexistent-term"')
    })
})

describe('ProjectStatsTable', () => {
    const mockRepos = [
        { id: 1, name: 'repo-1', language: 'Vue', stargazers_count: 200, private: false },
        { id: 2, name: 'repo-2', language: 'Vue', stargazers_count: 300, private: true },
        { id: 3, name: 'repo-3', language: 'Go', stargazers_count: 100, private: false }
    ]

    it('calculates total repositories, star count, and primary language share correctly', () => {
        const wrapper = mount(ProjectStatsTable, { props: { repoList: mockRepos, selectedLang: null } })
        expect(wrapper.text()).toContain('3')
        expect(wrapper.text()).toContain('600')
        expect(wrapper.text()).toContain('Vue')
    })

    it('updates metric focus when selectedLang prop is supplied', () => {
        const wrapper = mount(ProjectStatsTable, { props: { repoList: mockRepos, selectedLang: 'Go' } })
        expect(wrapper.text()).toContain('Go repositories')
        expect(wrapper.text()).toContain('100')
    })

    it('emits "update:selectedLang" when clicking a language legend row', async () => {
        const wrapper = mount(ProjectStatsTable, { props: { repoList: mockRepos, selectedLang: null } })
        await wrapper.find('.legend-btn').trigger('click')

        expect(wrapper.emitted('update:selectedLang')).toBeTruthy()
        expect(wrapper.emitted('update:selectedLang')[0][0]).toBe('Vue')
    })

    it('displays loading skeleton when loading prop is true', () => {
        const wrapper = mount(ProjectStatsTable, { props: { repoList: mockRepos, loading: true } })
        expect(wrapper.findAll('.placeholder-glow')).toHaveLength(3)
    })

    it('displays fallback empty state when repoList is empty', () => {
        const wrapper = mount(ProjectStatsTable, { props: { repoList: [], loading: false } })
        expect(wrapper.text()).toContain('No repository data detected.')
    })
})

describe('MyProjectView', () => {
    const page1Repos = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `repo-${i + 1}`, language: 'JavaScript' }))
    const page2Repos = [{ id: 101, name: 'repo-101', language: 'Vue' }]

    it('fetches user repositories paginated from GitHub API on mount and renders project views', async () => {
        localStorage.setItem('auth_token', 'mock_token_123')
        axios.get.mockResolvedValueOnce({ data: page1Repos }).mockResolvedValueOnce({ data: page2Repos })

        const wrapper = mount(MyProjectView, {
            global: {
                stubs: {
                    PageHeader: { name: 'PageHeader', template: '<div class="header-stub">{{ title }} - {{ status }}</div>', props: ['title', 'status'] },
                    ProjectStatsTable: { name: 'ProjectStatsTable', template: '<div class="stats-stub">{{ repoList.length }} repos</div>', props: ['repoList'] },
                    ProjectList: { name: 'ProjectList', template: '<div class="list-stub">{{ repoList.length }} repos</div>', props: ['repoList'] }
                }
            }
        })

        await flushPromises()
        expect(axios.get).toHaveBeenCalledTimes(2)
        expect(wrapper.find('.header-stub').text()).toContain('My Projects - Synced with GitHub')
    })

    it('handles API failure gracefully when fetching repositories fails', async () => {
        axios.get.mockRejectedValueOnce(new Error('GitHub API Error'))

        const wrapper = mount(MyProjectView, {
            global: {
                stubs: {
                    PageHeader: { name: 'PageHeader', template: '<div class="header-stub">{{ status }}</div>', props: ['status'] },
                    ProjectStatsTable: true, ProjectList: true
                }
            }
        })

        await flushPromises()
        expect(wrapper.find('.header-stub').text()).toContain('Not connected')
    })

    it('shares selectedLang selection state between stats table and repository list', async () => {
        axios.get.mockResolvedValueOnce({ data: page2Repos })

        const wrapper = mount(MyProjectView, {
            global: {
                stubs: {
                    PageHeader: true,
                    ProjectStatsTable: {
                        name: 'ProjectStatsTable',
                        template: '<button class="select-lang-btn" @click="$emit(\'update:selectedLang\', \'Vue\')">Select Vue</button>'
                    },
                    ProjectList: {
                        name: 'ProjectList',
                        template: '<div class="list-lang-stub">{{ selectedLang }}</div>',
                        props: ['selectedLang']
                    }
                }
            }
        })

        await flushPromises()
        await wrapper.find('.select-lang-btn').trigger('click')

        expect(wrapper.find('.list-lang-stub').text()).toBe('Vue')
    })
})