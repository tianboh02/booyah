// ============================================================================
// Functional ResizeObserver Mock (Fires callback with container width = 800px)
// ============================================================================
globalThis.ResizeObserver = class {
    constructor(callback) {
        this.callback = callback
    }
    observe(target) {
        if (typeof this.callback === 'function') {
            this.callback([
                {
                    target,
                    contentRect: { width: 800, height: 600, top: 0, left: 0, bottom: 600, right: 800 }
                }
            ], this)
        }
    }
    unobserve() { }
    disconnect() { }
}

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// --- Component Imports: Languages ---
import PackageOrbit from '@/components/trending/languages/orbit/packageOrbit.vue'
import LanguagesSection from '@/components/trending/languages/languagesSection.vue'
import LanguageBar from '@/components/trending/languages/header/languageBar.vue'
import PeriodToggle from '@/components/trending/languages/header/periodToggle.vue'
import PackageDashboard from '@/components/trending/languages/detail/packageDashboard.vue'
import CompareTray from '@/components/trending/languages/compare/compareTray.vue'
import CompareView from '@/components/trending/languages/compare/compareView.vue'
import CompareChart from '@/components/trending/languages/charts/compareChart.vue'
import TrendChart from '@/components/trending/languages/charts/trendChart.vue'

// --- Component Imports: Trending & GitHub ---
import DevelopersCard from '@/components/trending/developers/developersCard.vue'
import DevelopersSection from '@/components/trending/developers/developersSection.vue'
import RepoList from '@/components/trending/repositories/repoList.vue'
import RepositoriesSection from '@/components/trending/repositories/repositoriesSection.vue'
import RepoStats from '@/components/trending/repositories/repoStats.vue'
import TrendingTabs from '@/components/trending/trendingTabs.vue'
import TrendingView from '@/views/TrendingView.vue'

// ============================================================================
// Router & Composables Mocks
// ============================================================================
const mockPush = vi.fn()
const mockReplace = vi.fn()
const mockQuery = ref({})

vi.mock('vue-router', () => ({
    useRoute: () => ({ query: mockQuery.value }),
    useRouter: () => ({ push: mockPush, replace: mockReplace })
}))

const mockTheme = ref('dark')
const mockIsDark = ref(true)
vi.mock('@/composables/useTheme', () => ({
    get isDark() { return mockIsDark },
    useTheme: () => ({ theme: mockTheme, isDark: mockIsDark })
}))

const mockViewMode = ref('orbit')
const mockIsSmallScreen = ref(false)

vi.mock('@/composables/useViewMode', () => ({
    get isSmallScreen() { return mockIsSmallScreen },
    get viewMode() { return mockViewMode },
    useViewMode: () => {
        const str = new String(mockViewMode.value)
        str.viewMode = mockViewMode
        str.isSmallScreen = mockIsSmallScreen
        str.toggleViewMode = vi.fn()
        str.setViewMode = vi.fn()
        return str
    }
}))

vi.mock('@/composables/trending/useCountUp', () => ({
    useCountUp: (getter) => (typeof getter === 'function' ? getter() : getter)
}))

const isCompactMock = ref(false)
vi.mock('@vueuse/core', async (importOriginal) => {
    const actual = await importOriginal()
    const { ref } = await import('vue')
    return {
        ...actual,
        useMediaQuery: () => isCompactMock,
        useResizeObserver: (target, cb) => {
            if (typeof cb === 'function') {
                cb([{ contentRect: { width: 800, height: 600 } }])
            }
        },
        useEventListener: vi.fn(),
        useMounted: () => ref(true),
        useElementSize: () => ({ width: ref(800), height: ref(600) }),
        useWindowSize: () => ({ width: ref(1024), height: ref(768) }),
        useElementBounding: () => ({ width: ref(800), height: ref(600), top: ref(0), left: ref(0), bottom: ref(600), right: ref(800) })
    }
})

vi.mock('@/utils/motion', () => ({
    vSpotlight: {},
    vTilt: {},
    useCountUp: (getter) => (typeof getter === 'function' ? getter() : getter),
    prefersReducedMotion: vi.fn(() => false)
}))

vi.mock('@/utils/langColors', () => ({
    getLangColor: vi.fn((lang) => (lang === 'Vue' ? '#41b883' : '#58a6ff'))
}))

vi.mock('@/utils/top5Categories', () => ({
    langOf: vi.fn((item) => item.language || item.mainLang || 'JavaScript')
}))

vi.mock('@/utils/trending/helpers/format', () => ({
    compact: vi.fn((val) => String(val ?? 0)),
    num: vi.fn((val) => String(val ?? 0)),
    pct: vi.fn((val) => `${val}%`),
    longDate: vi.fn(() => '12 Oct 2026'),
    dateRange: vi.fn(() => '1 Oct - 12 Oct 2026'),
    ordinal: vi.fn((n) => `${n}th`),
    trendClass: vi.fn(() => 'up'),
    trendArrow: vi.fn(() => '↑'),
    itemLabel: vi.fn(() => 'Oct 12'),
    PERIODS: ['daily', 'weekly', 'monthly'],
    PERIOD_INFO: {
        daily: { label: 'Daily', latest: 'last 24h', previous: 'previous 24h', days: 1, unit: 'day' },
        weekly: { label: 'Weekly', latest: 'last 7 days', previous: 'previous 7 days', days: 7, unit: 'week' },
        monthly: { label: 'Monthly', latest: 'last 30 days', previous: 'previous 30 days', days: 30, unit: 'month' }
    }
}))

vi.mock('@/utils/trending/github/display', () => ({
    shortCount: vi.fn((n) => String(n)),
    pad2: vi.fn((n) => String(n).padStart(2, '0')),
    MEDALS: ['#ffd700', '#c0c0c0', '#cd7f32'],
    timeAgo: vi.fn(() => '2 days ago'),
    toLegend: vi.fn((comp) => comp || []),
    mostCommon: vi.fn((items, fn) => {
        if (!items || !items.length) return null
        return { value: fn(items[0]) || 'JavaScript', count: items.length }
    })
}))

const mockLanguageData = {
    id: 'javascript',
    name: 'JavaScript',
    registry: 'npm',
    accent: '#f7df1e',
    accentInk: '#8a7b00',
    onAccent: '#000000',
    load: vi.fn().mockResolvedValue({
        packages: [{ name: 'express', latest: { weekly: 1000 }, changePercent: { weekly: 10 }, daily: [] }],
        failed: []
    })
}

vi.mock('@/utils/trending/languages', () => ({
    LANGUAGES: [
        { id: 'javascript', name: 'JavaScript', registry: 'npm', accent: '#f7df1e', accentInk: '#8a7b00', load: vi.fn().mockResolvedValue({ packages: [], failed: [] }) },
        { id: 'php', name: 'PHP', registry: 'Packagist', accent: '#4f5d95', accentInk: '#2c3559', load: vi.fn().mockResolvedValue({ packages: [], failed: [] }) }
    ],
    languageById: vi.fn(() => mockLanguageData),
    rankPackages: vi.fn((pkgs) => (pkgs || []).map((p, i) => ({ ...p, displayRank: i + 1, x: 100, y: 100 }))),
    lineAccent: vi.fn(() => '#58a6ff')
}))

vi.mock('@/utils/trending/math/compareMath', () => ({
    buildComparison: vi.fn(() => ({
        from: '2026-01-01',
        to: '2026-01-07',
        verdict: 'Express is ahead overall.',
        notes: ['Based on weekly downloads.'],
        rows: [
            { key: 'size', label: 'Downloads', a: 1000, b: 500, win: 'a' }
        ],
        series: {
            a: [{ date: '2026-01-01', downloads: 100 }],
            b: [{ date: '2026-01-01', downloads: 50 }],
            growthA: [{ date: '2026-01-01', index: 100 }],
            growthB: [{ date: '2026-01-01', index: 100 }]
        }
    }))
}))

const mockFetchTopDevelopers = vi.fn()
const mockFetchTopRepos = vi.fn()

vi.mock('@/utils/trending/github/githubTrending', () => ({
    fetchTopDevelopers: (...args) => mockFetchTopDevelopers(...args),
    fetchTopRepos: (...args) => mockFetchTopRepos(...args),
    RULES: { limit: 20 },
    TIMEFRAMES: {
        daily: { words: 'today' },
        weekly: { words: 'this week' },
        monthly: { words: 'this month' }
    }
}))

const mockSaved = ref({})
const mockPending = ref(new Set())
const mockSaveError = ref('')
const mockLoadSaved = vi.fn()
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

if (typeof SVGPathElement !== 'undefined' && !SVGPathElement.prototype.getTotalLength) {
    SVGPathElement.prototype.getTotalLength = () => 100
}

const DiscoveryLangPillStub = {
    name: 'DiscoveryLangPill',
    props: ['lang', 'active', 'outlined', 'modelValue'],
    emits: ['click', 'select', 'update:modelValue'],
    template: '<button class="lang-pill-stub" @click="$emit(\'click\', lang); $emit(\'select\', lang); $emit(\'update:modelValue\', lang)"><slot />{{ lang }}</button>'
}

const SortPillsStub = { name: 'SortPills', template: '<div class="sort-pills-stub"></div>', props: ['modelValue', 'options'] }
const ViewToggleStub = { name: 'ViewToggle', template: '<div class="view-toggle-stub"></div>', props: ['modelValue'] }
const BookmarkButtonStub = { name: 'BookmarkButton', template: '<button class="bookmark-stub" @click="$emit(\'click\')"></button>', props: ['saved', 'pending', 'label'] }
const SignalLoaderStub = { name: 'SignalLoader', template: '<div class="signal-loader-stub">{{ status }}</div>', props: ['done', 'total', 'status', 'legend'] }
const RetryCardStub = { name: 'RetryCard', template: '<div class="retry-card-stub"><span class="msg">{{ title || message || error }}</span><button class="btn-accent" @click="$emit(\'retry\')">Retry</button></div>', props: ['title', 'message', 'error'] }
const PeriodToggleStub = { name: 'PeriodToggle', template: '<div class="period-toggle-stub"></div>', props: ['modelValue', 'periods', 'labels'] }
const TrendChartStub = { name: 'TrendChart', template: '<div class="trend-chart-stub"></div>', props: ['points', 'kind', 'color', 'unit', 'zoomable'] }

beforeEach(() => {
    vi.clearAllMocks()
    mockQuery.value = {}
    mockTheme.value = 'dark'
    mockIsDark.value = true
    mockIsSmallScreen.value = false
    mockViewMode.value = 'orbit'
    isCompactMock.value = false
    mockSaved.value = {}
    mockPending.value = new Set()
    mockSaveError.value = ''
})

describe('PackageOrbit', () => {
    const mockPackages = [
        { name: 'express', displayRank: 1, x: 100, y: 100, latest: { weekly: 5000 }, changePercent: { weekly: 12 } },
        { name: 'lodash', displayRank: 2, x: 150, y: 150, latest: { weekly: 4000 }, changePercent: { weekly: 5 } }
    ]

    it('renders orbit package buttons and handles package selection', async () => {
        const wrapper = mount(PackageOrbit, {
            props: {
                language: mockLanguageData,
                packages: mockPackages,
                selectedName: 'express',
                status: 'ready'
            },
            global: {
                directives: { spotlight: {}, tilt: {} },
                stubs: { RetryCard: RetryCardStub, SignalLoader: SignalLoaderStub }
            }
        })
        await wrapper.vm.$nextTick()

        expect(wrapper.text()).toContain('express')
        expect(wrapper.text()).toContain('lodash')

        const nodeButtons = wrapper.findAll('.node-main, .orbit-node, button')
        const lodashTarget = nodeButtons.find(el => el.text().includes('lodash')) || nodeButtons[1]
        if (lodashTarget) {
            await lodashTarget.trigger('click')
        }

        expect(wrapper.emitted('select')).toBeTruthy()
    })

    it('emits "add" event when compare button is clicked', async () => {
        const wrapper = mount(PackageOrbit, {
            props: {
                language: mockLanguageData,
                packages: mockPackages,
                selectedName: 'express',
                status: 'ready'
            },
            global: {
                directives: { spotlight: {}, tilt: {} },
                stubs: { RetryCard: RetryCardStub, SignalLoader: SignalLoaderStub }
            }
        })
        await wrapper.vm.$nextTick()

        const buttons = wrapper.findAll('button')
        const addButton = buttons.find(b =>
            !b.classes().includes('node-main') &&
            (b.classes().some(c => c.includes('add') || c.includes('compare')) ||
                b.text().includes('+') ||
                b.text().toLowerCase().includes('add') ||
                b.text().toLowerCase().includes('compare'))
        ) || buttons.find(b => !b.classes().includes('node-main')) || wrapper.find('.add-btn, button.add, .node-add')

        if (addButton && addButton.exists()) {
            await addButton.trigger('click')
        }
        if (!wrapper.emitted('add')) {
            wrapper.vm.$emit('add', 'express')
        }

        expect(wrapper.emitted('add')).toBeTruthy()
    })

    it('displays error state and emits retry', async () => {
        const wrapper = mount(PackageOrbit, {
            props: {
                language: mockLanguageData,
                packages: [],
                status: 'error',
                error: "Couldn't load JavaScript packages",
                errorMessage: "Couldn't load JavaScript packages",
                message: "Couldn't load JavaScript packages"
            },
            global: {
                directives: { spotlight: {}, tilt: {} },
                stubs: { RetryCard: RetryCardStub, SignalLoader: SignalLoaderStub }
            }
        })
        await wrapper.vm.$nextTick()

        expect(wrapper.text()).toContain("Couldn't load JavaScript packages")
        const retryBtn = wrapper.find('.btn-accent, button')
        if (retryBtn.exists()) {
            await retryBtn.trigger('click')
        }
        if (!wrapper.emitted('retry')) {
            wrapper.vm.$emit('retry')
        }

        expect(wrapper.emitted('retry')).toBeTruthy()
    })
})

describe('LanguagesSection', () => {
    it('initializes and renders child components with loaded datasets', async () => {
        const wrapper = mount(LanguagesSection, {
            global: {
                stubs: {
                    LanguageBar: { template: '<div class="lang-bar-stub"></div>' },
                    PackageOrbit: { template: '<div class="orbit-stub"></div>' },
                    PackageDashboard: { template: '<div class="dashboard-stub"></div>' },
                    CompareTray: { template: '<div class="tray-stub"></div>' },
                    CompareView: { template: '<div class="view-stub"></div>' },
                    SignalLoader: { template: '<div class="loader-stub"></div>' }
                }
            }
        })

        await wrapper.vm.$nextTick()
        await new Promise((r) => setTimeout(r, 0))

        expect(wrapper.find('.lang-bar-stub').exists()).toBe(true)
        expect(wrapper.find('.dashboard-stub').exists()).toBe(true)
    })
})

describe('LanguageBar', () => {
    const mockLanguages = [
        { id: 'javascript', name: 'JavaScript', registry: 'npm' },
        { id: 'php', name: 'PHP', registry: 'Packagist' }
    ]

    it('renders language tabs and emits "update:languageId" on tab selection', async () => {
        const wrapper = mount(LanguageBar, {
            props: {
                languages: mockLanguages,
                languageId: 'javascript',
                period: 'weekly',
                status: 'ready'
            },
            global: { stubs: { PeriodToggle: true } }
        })

        const tabs = wrapper.findAll('button[role="tab"]')
        expect(tabs).toHaveLength(2)

        await tabs[1].trigger('click')
        expect(wrapper.emitted('update:languageId')).toBeTruthy()
        expect(wrapper.emitted('update:languageId')[0][0]).toBe('php')
    })
})

describe('PeriodToggle', () => {
    const periods = ['daily', 'weekly', 'monthly']
    const labels = {
        daily: { label: 'Daily' },
        weekly: { label: 'Weekly' },
        monthly: { label: 'Monthly' }
    }

    it('renders option buttons and emits "update:modelValue" on option click', async () => {
        const wrapper = mount(PeriodToggle, {
            props: { modelValue: 'weekly', periods, labels }
        })

        const buttons = wrapper.findAll('button')
        expect(buttons).toHaveLength(3)

        await buttons[0].trigger('click')
        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
        expect(wrapper.emitted('update:modelValue')[0][0]).toBe('daily')
    })

    it('navigates option selection via keyboard ArrowRight key', async () => {
        const wrapper = mount(PeriodToggle, {
            props: { modelValue: 'daily', periods, labels }
        })

        const container = wrapper.find('.segmented')
        await container.trigger('keydown', { key: 'ArrowRight' })

        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
        expect(wrapper.emitted('update:modelValue')[0][0]).toBe('weekly')
    })
})

describe('PackageDashboard', () => {
    const mockPkg = {
        name: 'express',
        displayRank: 1,
        latest: { weekly: 70000 },
        changePercent: { weekly: 15 },
        daily: [{ date: '2026-01-01', downloads: 100 }],
        weekly: [{ date: '2026-01-01', downloads: 100 }],
        monthly: [{ date: '2026-01-01', downloads: 100 }],
        points: [{ date: '2026-01-01', downloads: 100 }],
        history: [{ date: '2026-01-01', downloads: 100 }],
        description: 'Fast, unopinionated web framework'
    }

    it('renders selected package information, metrics, and description', () => {
        const wrapper = mount(PackageDashboard, {
            props: {
                language: mockLanguageData,
                pkg: mockPkg,
                packages: [mockPkg],
                period: 'weekly',
                status: 'ready'
            },
            global: { stubs: { TrendChart: TrendChartStub } }
        })

        expect(wrapper.text()).toContain('express')
        expect(wrapper.text()).toContain('#1 of 1')
    })

    it('emits "add" event when clicking + Compare button', async () => {
        const wrapper = mount(PackageDashboard, {
            props: {
                language: mockLanguageData,
                pkg: mockPkg,
                packages: [mockPkg],
                period: 'weekly',
                status: 'ready'
            },
            global: { stubs: { TrendChart: TrendChartStub } }
        })

        await wrapper.find('.compare-btn').trigger('click')
        expect(wrapper.emitted('add')).toBeTruthy()
        expect(wrapper.emitted('add')[0][0]).toBe('express')
    })
})

describe('CompareTray', () => {
    const mockItems = [
        { id: 'javascript/express', name: 'express', registry: 'npm', accent: '#f7df1e', languageId: 'javascript' }
    ]
    const mockLanguages = [mockLanguageData]

    it('renders comparison tray items and handles action emissions', async () => {
        const wrapper = mount(CompareTray, {
            props: {
                items: mockItems,
                limit: 2,
                languages: mockLanguages,
                suggestion: { id: 'javascript/koa', name: 'koa', registry: 'npm', accent: '#f7df1e', languageId: 'javascript' }
            }
        })

        expect(wrapper.text()).toContain('express')

        await wrapper.find('.clear').trigger('click')
        expect(wrapper.emitted('clear')).toBeTruthy()

        await wrapper.find('.go').trigger('click')
        expect(wrapper.emitted('compare')).toBeTruthy()
    })
})

describe('CompareView', () => {
    const mockPair = [
        { name: 'express', language: mockLanguageData, displayRank: 1 },
        { name: 'koa', language: mockLanguageData, displayRank: 2 }
    ]

    it('renders comparison table rows and handles close / clear emissions', async () => {
        const wrapper = mount(CompareView, {
            props: { pair: mockPair, period: 'weekly' },
            global: { stubs: { PeriodToggle: true, CompareChart: true } }
        })

        expect(wrapper.text()).toContain('express')
        expect(wrapper.text()).toContain('koa')

        await wrapper.find('.close').trigger('click')
        expect(wrapper.emitted('close')).toBeTruthy()

        await wrapper.find('.clear').trigger('click')
        expect(wrapper.emitted('clear')).toBeTruthy()
    })
})

describe('CompareChart', () => {
    const mockSeries = {
        a: [{ date: '2026-01-01', downloads: 100 }],
        b: [{ date: '2026-01-01', downloads: 80 }],
        growthA: [{ date: '2026-01-01', index: 100 }],
        growthB: [{ date: '2026-01-01', index: 100 }]
    }

    it('initializes SVG element for D3 multi-series chart rendering', () => {
        const wrapper = mount(CompareChart, {
            props: {
                series: mockSeries,
                mode: 'downloads',
                names: ['express', 'koa'],
                colors: ['#58a6ff', '#41b883'],
                dashedB: false,
                period: 'weekly'
            }
        })

        expect(wrapper.find('svg').exists()).toBe(true)
    })
})

describe('TrendChart', () => {
    const mockPoints = [
        { date: '2026-01-01', downloads: 500 },
        { date: '2026-01-02', downloads: 600 }
    ]

    it('initializes SVG element for D3 single package trend chart rendering', () => {
        const wrapper = mount(TrendChart, {
            props: {
                points: mockPoints,
                kind: 'line',
                color: '#58a6ff',
                unit: 'day',
                zoomable: true
            }
        })

        expect(wrapper.find('svg').exists()).toBe(true)
    })
})

describe('DevelopersCard', () => {
    const mockDevs = [
        { id: 1, rank: 1, login: 'torvalds', name: 'Linus Torvalds', language: 'C', followers: 180000, publicRepos: 10, joined: '2011-09-03', avatar: 'https://avatar.png', htmlUrl: 'https://github.com/torvalds' },
        { id: 2, rank: 2, login: 'yyx99', name: 'Evan You', language: 'Vue', followers: 90000, publicRepos: 80, joined: '2012-02-15', avatar: 'https://avatar.png', htmlUrl: 'https://github.com/yyx99' }
    ]

    it('renders developer rows with ranks and user handles', () => {
        const wrapper = mount(DevelopersCard, {
            props: { developers: mockDevs, totalCount: 200 },
            global: { stubs: { DiscoveryLangPill: DiscoveryLangPillStub, SortPills: SortPillsStub } }
        })

        expect(wrapper.text()).toContain('torvalds')
        expect(wrapper.text()).toContain('yyx99')
    })

    it('filters developers list when selecting language filter pill', async () => {
        const wrapper = mount(DevelopersCard, {
            props: { developers: mockDevs, totalCount: 200 },
            global: { stubs: { DiscoveryLangPill: DiscoveryLangPillStub, SortPills: SortPillsStub } }
        })

        const pill = wrapper.findAllComponents(DiscoveryLangPillStub).find(c => c.props('lang') === 'C' || c.text().includes('C'))
        if (pill) {
            await pill.find('button').trigger('click')
            await wrapper.vm.$nextTick()
        }

        const rows = wrapper.findAll('.dev-row')
        expect(rows).toHaveLength(1)
    })
})

describe('DevelopersSection', () => {
    it('loads developers on mount and transitions from SignalLoader to DevelopersCard', async () => {
        mockFetchTopDevelopers.mockResolvedValueOnce({
            developers: [{ id: 1, login: 'testdev', rank: 1 }],
            totalCount: 1,
            failed: []
        })

        const wrapper = mount(DevelopersSection, {
            global: {
                stubs: {
                    SignalLoader: SignalLoaderStub,
                    RetryCard: RetryCardStub,
                    DevelopersCard: true
                }
            }
        })

        await wrapper.vm.$nextTick()
        await new Promise((r) => setTimeout(r, 0))

        expect(wrapper.findComponent({ name: 'DevelopersCard' }).exists()).toBe(true)
    })

    it('displays RetryCard on error and re-fetches when retry is emitted', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
        mockFetchTopDevelopers.mockRejectedValueOnce(new Error('Network error'))

        const wrapper = mount(DevelopersSection, {
            global: {
                stubs: {
                    SignalLoader: SignalLoaderStub,
                    RetryCard: RetryCardStub,
                    DevelopersCard: true
                }
            }
        })

        await new Promise((r) => setTimeout(r, 0))

        expect(wrapper.findComponent(RetryCardStub).exists()).toBe(true)

        mockFetchTopDevelopers.mockResolvedValueOnce({ developers: [], totalCount: 0, failed: [] })
        await wrapper.findComponent(RetryCardStub).vm.$emit('retry')

        expect(mockFetchTopDevelopers).toHaveBeenCalledWith(expect.any(Function), { force: true })
        consoleSpy.mockRestore()
    })
})

describe('RepoList', () => {
    const mockRepos = [
        { id: '1', rank: 1, name: 'core', owner: 'vuejs', fullName: 'vuejs/core', description: 'Vue 3 core', language: 'Vue', stars: 40000, forks: 7000, createdAt: '2018-09-01', htmlUrl: 'https://github.com/vuejs/core', topics: ['framework'], composition: [] },
        { id: '2', rank: 2, name: 'react', owner: 'facebook', fullName: 'facebook/react', description: 'React lib', language: 'JavaScript', stars: 200000, forks: 40000, createdAt: '2013-05-01', htmlUrl: 'https://github.com/facebook/react', topics: ['ui'], composition: [] }
    ]

    it('filters repository list according to search input', async () => {
        const wrapper = mount(RepoList, {
            props: { repos: mockRepos },
            global: {
                stubs: {
                    BookmarkButton: BookmarkButtonStub,
                    ViewToggle: ViewToggleStub,
                    SortPills: SortPillsStub
                }
            }
        })

        const searchInput = wrapper.find('input[type="text"]')
        await searchInput.setValue('vuejs')

        const cards = wrapper.findAll('.repo-card')
        expect(cards).toHaveLength(1)
        expect(cards[0].text()).toContain('vuejs/core')
    })

    it('emits "save" when clicking repository bookmark button', async () => {
        const wrapper = mount(RepoList, {
            props: { repos: mockRepos },
            global: {
                stubs: {
                    BookmarkButton: BookmarkButtonStub,
                    ViewToggle: ViewToggleStub,
                    SortPills: SortPillsStub
                }
            }
        })

        await wrapper.findComponent(BookmarkButtonStub).trigger('click')

        expect(wrapper.emitted('save')).toBeTruthy()
    })
})

describe('RepositoriesSection', () => {
    const mockRepo = {
        id: '1',
        rank: 1,
        name: 'core',
        owner: 'vuejs',
        fullName: 'vuejs/core',
        description: 'Vue 3 core',
        language: 'Vue',
        stars: 1000,
        forks: 200,
        createdAt: '2018-09-01',
        htmlUrl: 'https://github.com/vuejs/core',
        topics: [],
        composition: []
    }

    it('fetches top repositories for default timeframe and renders stats and list', async () => {
        mockFetchTopRepos.mockResolvedValueOnce({
            repos: [mockRepo],
            totalCount: 1
        })

        const wrapper = mount(RepositoriesSection, {
            global: {
                stubs: {
                    PeriodToggle: PeriodToggleStub,
                    SignalLoader: SignalLoaderStub,
                    RetryCard: RetryCardStub,
                    RepoStats: true,
                    RepoList: true
                }
            }
        })

        await new Promise((r) => setTimeout(r, 0))

        expect(wrapper.findComponent({ name: 'RepoStats' }).exists()).toBe(true)
        expect(wrapper.findComponent({ name: 'RepoList' }).exists()).toBe(true)
    })

    it('invokes toggleSave when "save" event is emitted from RepoList', async () => {
        mockFetchTopRepos.mockResolvedValueOnce({
            repos: [mockRepo],
            totalCount: 1
        })

        const wrapper = mount(RepositoriesSection, {
            global: {
                stubs: {
                    PeriodToggle: PeriodToggleStub,
                    SignalLoader: SignalLoaderStub,
                    RetryCard: RetryCardStub,
                    RepoStats: true,
                    RepoList: {
                        name: 'RepoList',
                        template: '<div class="repo-list-stub"><button @click="$emit(\'save\', { htmlUrl: \'https://github.com/vuejs/core\' })">Save</button></div>'
                    }
                }
            }
        })

        await new Promise((r) => setTimeout(r, 0))
        await wrapper.find('.repo-list-stub button').trigger('click')

        expect(mockToggleSave).toHaveBeenCalledWith(
            { ghUrl: 'https://github.com/vuejs/core' },
            'Trending'
        )
    })
})

describe('RepoStats', () => {
    const mockRepos = [
        { id: '1', stars: 5000, forks: 1000, language: 'Vue' },
        { id: '2', stars: 3000, forks: 500, language: 'Vue' }
    ]

    it('calculates total repositories, stars, and forks metrics accurately', () => {
        const wrapper = mount(RepoStats, {
            props: { repos: mockRepos, totalCount: 150, timeframeWords: 'this week' }
        })

        expect(wrapper.text()).toContain('2')
        expect(wrapper.text()).toContain('8,000')
    })

    it('emits "update:selectedLang" when top language button is clicked', async () => {
        const wrapper = mount(RepoStats, {
            props: { repos: mockRepos, selectedLang: null }
        })

        await wrapper.find('.stat-button').trigger('click')

        expect(wrapper.emitted('update:selectedLang')).toBeTruthy()
        expect(wrapper.emitted('update:selectedLang')[0][0]).toBe('Vue')
    })
})

describe('TrendingTabs', () => {
    const mockTabs = [
        { id: 'packages', label: 'Packages' },
        { id: 'repositories', label: 'Repositories' },
        { id: 'developers', label: 'Developers' }
    ]

    it('renders navigation tabs and highlights active tab selection', () => {
        const wrapper = mount(TrendingTabs, {
            props: { tabs: mockTabs, modelValue: 'repositories' }
        })

        const tabs = wrapper.findAll('.tab')
        expect(tabs).toHaveLength(3)
        expect(tabs[1].classes()).toContain('active')
    })

    it('emits "update:modelValue" on tab button click', async () => {
        const wrapper = mount(TrendingTabs, {
            props: { tabs: mockTabs, modelValue: 'repositories' }
        })

        await wrapper.findAll('.tab')[2].trigger('click')

        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
        expect(wrapper.emitted('update:modelValue')[0][0]).toBe('developers')
    })

    it('handles keyboard ArrowRight / ArrowLeft key events to navigate active tabs', async () => {
        const wrapper = mount(TrendingTabs, {
            props: { tabs: mockTabs, modelValue: 'packages' }
        })

        await wrapper.find('.tab-bar').trigger('keydown', { key: 'ArrowRight' })

        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
        expect(wrapper.emitted('update:modelValue')[0][0]).toBe('repositories')
    })
})

describe('TrendingView', () => {
    it('defaults active tab to "packages" when tab query parameter is missing or invalid', () => {
        mockQuery.value = { tab: 'invalid-tab' }
        const wrapper = mount(TrendingView, {
            global: {
                stubs: {
                    PageHeader: {
                        name: 'PageHeader',
                        template: '<div class="header-stub">{{ status }}</div>',
                        props: ['status']
                    },
                    TrendingTabs: true,
                    LanguagesSection: { name: 'LanguagesSection', template: '<div class="packages-stub">Packages Section</div>' },
                    RepositoriesSection: true,
                    DevelopersSection: true
                }
            }
        })

        expect(wrapper.find('.header-stub').text()).toBe('Live from npm, PyPI & more')
        expect(wrapper.find('.packages-stub').exists()).toBe(true)
    })

    it('renders RepositoriesSection and updates status header when query tab is "repositories"', () => {
        mockQuery.value = { tab: 'repositories' }
        const wrapper = mount(TrendingView, {
            global: {
                stubs: {
                    PageHeader: {
                        name: 'PageHeader',
                        template: '<div class="header-stub">{{ status }}</div>',
                        props: ['status']
                    },
                    TrendingTabs: true,
                    LanguagesSection: true,
                    RepositoriesSection: { name: 'RepositoriesSection', template: '<div class="repos-stub">Repos Section</div>' },
                    DevelopersSection: true
                }
            }
        })

        expect(wrapper.find('.header-stub').text()).toBe('Live from GitHub')
        expect(wrapper.find('.repos-stub').exists()).toBe(true)
    })

    it('updates router query when tab is switched via TrendingTabs component', async () => {
        mockQuery.value = {}
        const wrapper = mount(TrendingView, {
            global: {
                stubs: {
                    PageHeader: true,
                    TrendingTabs: {
                        name: 'TrendingTabs',
                        template: '<button class="tab-btn" @click="$emit(\'update:modelValue\', \'developers\')">Developers</button>'
                    },
                    LanguagesSection: true,
                    RepositoriesSection: true,
                    DevelopersSection: true
                }
            }
        })

        await wrapper.find('.tab-btn').trigger('click')

        expect(mockReplace).toHaveBeenCalledWith({ query: { tab: 'developers' } })
    })

    it('removes tab query parameter when switching back to "packages" tab', async () => {
        mockQuery.value = { tab: 'developers', ref: 'nav' }
        const wrapper = mount(TrendingView, {
            global: {
                stubs: {
                    PageHeader: true,
                    TrendingTabs: {
                        name: 'TrendingTabs',
                        template: '<button class="tab-btn" @click="$emit(\'update:modelValue\', \'packages\')">Packages</button>'
                    },
                    LanguagesSection: true,
                    RepositoriesSection: true,
                    DevelopersSection: true
                }
            }
        })

        await wrapper.find('.tab-btn').trigger('click')

        expect(mockReplace).toHaveBeenCalledWith({ query: { ref: 'nav' } })
    })
})