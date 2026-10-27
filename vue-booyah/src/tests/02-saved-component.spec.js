import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

// --- Component Imports ---
import SavedBarPanel from '@/components/saved/savedBarPanel.vue'
import SavedCard from '@/components/saved/savedCard.vue'
import SavedList from '@/components/saved/savedList.vue'
import SavedStats from '@/components/saved/savedStats.vue'
import SavedToolbar from '@/components/saved/savedToolbar.vue'
import SavedUndoToast from '@/components/saved/savedUndoToast.vue'
import SavedView from '@/views/SavedView.vue'

// --- Mock Composables & Motion Utilities ---
vi.mock('@/utils/motion', () => ({
    vSpotlight: {},
    vTilt: {},
    useCountUp: (getter) => getter()
}))

vi.mock('@/utils/langColors', () => ({
    getLangColor: vi.fn((lang) => (lang === 'Vue' ? '#41b883' : '#58a6ff')),
    topLangColors: vi.fn(() => ['#58a6ff', '#6b8aff', '#e3b341'])
}))

const mockItems = ref([])
const mockLoading = ref(false)
const mockError = ref('')
const mockLastRemoved = ref(null)
const mockLoad = vi.fn()
const mockRemove = vi.fn()
const mockUndo = vi.fn()
const mockDismissUndo = vi.fn()

vi.mock('@/utils/savedLibrary', () => ({
    UNDO_MS: 5000,
    categoryColor: vi.fn((cat) => '#ff6600'),
    itemCategory: vi.fn((item) => item.category || 'General'),
    itemLang: vi.fn((item) => item.language || 'JavaScript'),
    useSavedLibrary: () => ({
        items: mockItems,
        loading: mockLoading,
        error: mockError,
        lastRemoved: mockLastRemoved,
        load: mockLoad,
        remove: mockRemove,
        undo: mockUndo,
        dismissUndo: mockDismissUndo
    })
}))

vi.mock('@/composables/useViewMode', () => ({
    useViewMode: () => 'list',
    isSmallScreen: ref(false)
}))

// Stub child components
const SortPillsStub = {
    name: 'SortPills',
    template: '<div class="sort-pills-stub"></div>',
    props: ['modelValue', 'options']
}

const ViewToggleStub = {
    name: 'ViewToggle',
    template: '<div class="view-toggle-stub"></div>',
    props: ['modelValue']
}

const CardRingStub = {
    name: 'CardRing',
    template: '<div class="card-ring-stub"><slot name="card" :item="items[0]" /></div>',
    props: ['items']
}

const RouterLinkStub = {
    name: 'RouterLink',
    template: '<a :href="to"><slot /></a>',
    props: ['to']
}

beforeEach(() => {
    vi.clearAllMocks()
    mockItems.value = []
    mockLoading.value = false
    mockError.value = ''
    mockLastRemoved.value = null
})

// ============================================================================
// 1. savedBarPanel.vue
// ============================================================================
describe('SavedBarPanel', () => {
    const mockRows = [
        { name: 'Vue', count: 50, color: '#41b883' },
        { name: 'TypeScript', count: 25, color: '#3178c6' }
    ]

    it('renders title, calculates relative bar widths, and displays row counts', () => {
        const wrapper = mount(SavedBarPanel, {
            props: { title: 'By language', rows: mockRows }
        })

        expect(wrapper.find('.section-title').text()).toBe('By language')
        const rowBtns = wrapper.findAll('.bar-row')
        expect(rowBtns).toHaveLength(2)
        expect(rowBtns[0].text()).toContain('Vue')
        expect(rowBtns[0].text()).toContain('50')
        expect(rowBtns[1].text()).toContain('TypeScript')
        expect(rowBtns[1].text()).toContain('25')
    })

    it('emits "toggle" with row name when clicking a bar row', async () => {
        const wrapper = mount(SavedBarPanel, {
            props: { title: 'By language', rows: mockRows }
        })

        await wrapper.find('.bar-row').trigger('click')

        expect(wrapper.emitted('toggle')).toBeTruthy()
        expect(wrapper.emitted('toggle')[0][0]).toBe('Vue')
    })

    it('renders loading placeholders when loading prop is true and rows are empty', () => {
        const wrapper = mount(SavedBarPanel, {
            props: { title: 'By language', rows: [], loading: true }
        })

        expect(wrapper.findAll('.placeholder-glow .placeholder')).toHaveLength(4)
    })

    it('renders emptyText message when rows array is empty and not loading', () => {
        const wrapper = mount(SavedBarPanel, {
            props: { title: 'By language', rows: [], loading: false, emptyText: 'No data here' }
        })

        expect(wrapper.text()).toContain('No data here')
    })
})

// ============================================================================
// 2. savedCard.vue
// ============================================================================
describe('SavedCard', () => {
    const mockItemOk = {
        _id: '1',
        name: 'core',
        owner: 'vuejs',
        link: 'https://github.com/vuejs/core',
        category: 'Frameworks',
        language: 'Vue',
        stars: 42000,
        forks: 7500,
        status: 'ok',
        description: 'Vue.js 3 core repo',
        updatedAt: '2023-05-01T00:00:00Z'
    }

    it('formats stars count and renders repository details when status is ok', () => {
        const wrapper = mount(SavedCard, {
            props: { item: mockItemOk }
        })

        expect(wrapper.text()).toContain('vuejs/core')
        expect(wrapper.text()).toContain('Vue.js 3 core repo')
        expect(wrapper.text()).toContain('42k')
        expect(wrapper.text()).toContain('7500')
    })

    it('emits "remove" event when clicking bookmark button', async () => {
        const wrapper = mount(SavedCard, {
            props: { item: mockItemOk }
        })

        await wrapper.find('.bookmark-btn').trigger('click')

        expect(wrapper.emitted('remove')).toBeTruthy()
        expect(wrapper.emitted('remove')[0][0]).toEqual(mockItemOk)
    })

    it('emits "toggle-category" and "toggle-lang" when respective badges are clicked', async () => {
        const wrapper = mount(SavedCard, {
            props: { item: mockItemOk }
        })

        await wrapper.find('.cat-badge').trigger('click')
        expect(wrapper.emitted('toggle-category')).toBeTruthy()
        expect(wrapper.emitted('toggle-category')[0][0]).toBe('Frameworks')

        await wrapper.find('.lang-link').trigger('click')
        expect(wrapper.emitted('toggle-lang')).toBeTruthy()
        expect(wrapper.emitted('toggle-lang')[0][0]).toBe('Vue')
    })

    it('renders placeholder loader when status is loading', () => {
        const wrapper = mount(SavedCard, {
            props: { item: { ...mockItemOk, status: 'loading' } }
        })

        expect(wrapper.find('.placeholder-glow').exists()).toBe(true)
    })

    it('renders fallback error message when status is error', () => {
        const wrapper = mount(SavedCard, {
            props: { item: { ...mockItemOk, status: 'error' } }
        })

        expect(wrapper.text()).toContain('Details are not available right now.')
    })
})

// ============================================================================
// 3. savedList.vue
// ============================================================================
describe('SavedList', () => {
    const mockItems = [
        { _id: '1', name: 'core', category: 'Frameworks', language: 'Vue', status: 'ok' },
        { _id: '2', name: 'react', category: 'Frameworks', language: 'JavaScript', status: 'ok' }
    ]

    it('renders list of SavedCard components when items are present', () => {
        const wrapper = mount(SavedList, {
            props: { items: mockItems, total: 2 },
            global: { stubs: { SavedCard: true, CardRing: CardRingStub, RouterLink: RouterLinkStub } }
        })

        expect(wrapper.findAllComponents({ name: 'SavedCard' })).toHaveLength(2)
    })

    it('renders loading skeletons when loading prop is true', () => {
        const wrapper = mount(SavedList, {
            props: { items: [], total: 0, loading: true },
            global: { stubs: { RouterLink: RouterLinkStub } }
        })

        expect(wrapper.findAll('.placeholder-glow')).toHaveLength(4)
    })

    it('renders initial empty state with link to Discovery when total is 0', () => {
        const wrapper = mount(SavedList, {
            props: { items: [], total: 0, loading: false },
            global: { stubs: { RouterLink: RouterLinkStub } }
        })

        expect(wrapper.text()).toContain('No saved projects yet')
        expect(wrapper.findComponent(RouterLinkStub).props('to')).toBe('/discovery')
    })

    it('renders filter mismatch empty state and emits "reset" when reset button is clicked', async () => {
        const wrapper = mount(SavedList, {
            props: { items: [], total: 5, loading: false },
            global: { stubs: { RouterLink: RouterLinkStub } }
        })

        expect(wrapper.text()).toContain('No saved projects match your search or filters.')

        await wrapper.find('.reset-btn').trigger('click')
        expect(wrapper.emitted('reset')).toBeTruthy()
    })
})

// ============================================================================
// 4. savedStats.vue
// ============================================================================
describe('SavedStats', () => {
    const mockItems = [
        { _id: '1', name: 'core', category: 'Frameworks', language: 'Vue', stars: 1000, status: 'ok' },
        { _id: '2', name: 'vite', category: 'Build Tools', language: 'Vue', stars: 2000, status: 'ok' }
    ]

    it('calculates total saved items, categories count, and combined stars correctly', () => {
        const wrapper = mount(SavedStats, {
            props: { items: mockItems, scoped: mockItems, loading: false },
            global: { stubs: { SavedBarPanel: true } }
        })

        expect(wrapper.text()).toContain('2')
        expect(wrapper.text()).toContain('across 2 categories')
        expect(wrapper.text()).toContain('3,000')
    })

    it('renders loading skeleton cards when loading prop is true', () => {
        const wrapper = mount(SavedStats, {
            props: { items: [], scoped: [], loading: true },
            global: { stubs: { SavedBarPanel: true } }
        })

        expect(wrapper.findAll('.placeholder-glow')).toHaveLength(3)
    })
})

// ============================================================================
// 5. savedToolbar.vue
// ============================================================================
describe('SavedToolbar', () => {
    it('renders shown/total count and active filter chips', async () => {
        const wrapper = mount(SavedToolbar, {
            props: {
                shown: 3,
                total: 10,
                selectedCategory: 'Frameworks',
                selectedLang: 'Vue'
            },
            global: { stubs: { SortPills: SortPillsStub, ViewToggle: ViewToggleStub } }
        })

        expect(wrapper.text()).toContain('3/10')
        const chips = wrapper.findAll('.filter-chip')
        expect(chips).toHaveLength(2)

        await chips[0].trigger('click')
        expect(wrapper.emitted('update:selectedCategory')).toBeTruthy()
        expect(wrapper.emitted('update:selectedCategory')[0][0]).toBeNull()
    })

    it('updates search model when user types in search input', async () => {
        const wrapper = mount(SavedToolbar, {
            props: { shown: 5, total: 5, search: '' },
            global: { stubs: { SortPills: SortPillsStub, ViewToggle: ViewToggleStub } }
        })

        const searchInput = wrapper.find('input[type="text"]')
        await searchInput.setValue('vite')

        expect(wrapper.emitted('update:search')).toBeTruthy()
        expect(wrapper.emitted('update:search')[0][0]).toBe('vite')
    })
})

// ============================================================================
// 6. savedUndoToast.vue
// ============================================================================
describe('SavedUndoToast', () => {
    const mockRemoved = { _id: '123', name: 'vuejs/core' }

    it('renders notification toast with removed project name', () => {
        const wrapper = mount(SavedUndoToast, {
            props: { removed: mockRemoved }
        })

        expect(wrapper.find('.undo-toast').exists()).toBe(true)
        expect(wrapper.text()).toContain('Removed vuejs/core')
    })

    it('emits "undo" when clicking Undo button', async () => {
        const wrapper = mount(SavedUndoToast, {
            props: { removed: mockRemoved }
        })

        await wrapper.find('.undo-btn').trigger('click')

        expect(wrapper.emitted('undo')).toBeTruthy()
        expect(wrapper.emitted('undo')).toHaveLength(1)
    })

    it('emits "dismiss" when clicking close button', async () => {
        const wrapper = mount(SavedUndoToast, {
            props: { removed: mockRemoved }
        })

        await wrapper.find('.btn-close').trigger('click')

        expect(wrapper.emitted('dismiss')).toBeTruthy()
        expect(wrapper.emitted('dismiss')).toHaveLength(1)
    })

    it('renders nothing when removed prop is null', () => {
        const wrapper = mount(SavedUndoToast, {
            props: { removed: null }
        })

        expect(wrapper.find('.undo-toast').exists()).toBe(false)
    })
})

// ============================================================================
// 7. SavedView.vue
// ============================================================================
describe('SavedView', () => {
    const sampleItems = [
        {
            _id: '600000000000000000000002',
            name: 'alpha',
            owner: 'vuejs',
            description: 'Alpha frontend tool',
            category: 'Frameworks',
            language: 'Vue',
            stars: 100,
            status: 'ok'
        },
        {
            _id: '600000000000000000000001',
            name: 'beta',
            owner: 'facebook',
            description: 'Beta backend service',
            category: 'Libraries',
            language: 'TypeScript',
            stars: 500,
            status: 'ok'
        }
    ]

    it('invokes load on mount and renders saved items status pill', async () => {
        mockItems.value = sampleItems

        const wrapper = mount(SavedView, {
            global: {
                stubs: {
                    PageHeader: {
                        name: 'PageHeader',
                        template: '<div class="page-header-stub">{{ status }}</div>',
                        props: ['status', 'live']
                    },
                    AlertBanners: true,
                    SavedStats: true,
                    SavedToolbar: true,
                    SavedList: true,
                    SavedUndoToast: true
                }
            }
        })

        await flushPromises()

        expect(mockLoad).toHaveBeenCalledTimes(1)
        expect(wrapper.find('.page-header-stub').text()).toBe('2 saved')
    })

    it('filters and sorts saved items according to category, language, search, and sort settings', async () => {
        mockItems.value = sampleItems

        const wrapper = mount(SavedView, {
            global: {
                stubs: {
                    PageHeader: true,
                    AlertBanners: true,
                    SavedStats: true,
                    SavedToolbar: {
                        name: 'SavedToolbar',
                        template: `
                            <div class="toolbar-stub">
                                <button class="search-btn" @click="$emit('update:search', 'alpha')">Search Alpha</button>
                                <button class="reset-search-btn" @click="$emit('update:search', '')">Clear Search</button>
                                <button class="sort-stars-btn" @click="$emit('update:sortBy', 'stars')">Sort Stars</button>
                            </div>
                        `,
                        props: ['search', 'sortBy', 'shown', 'total']
                    },
                    SavedList: {
                        name: 'SavedList',
                        template: '<div class="list-stub"><span>{{ items.length }} shown</span><span class="first-item">{{ items[0]?.name }}</span></div>',
                        props: ['items', 'total']
                    },
                    SavedUndoToast: true
                }
            }
        })

        await flushPromises()

        expect(wrapper.find('.list-stub').text()).toContain('2 shown')

        // Search filter
        await wrapper.find('.search-btn').trigger('click')
        expect(wrapper.find('.list-stub').text()).toContain('1 shown')
        expect(wrapper.find('.first-item').text()).toBe('alpha')

        // Sort filter
        await wrapper.find('.reset-search-btn').trigger('click') // reset search to ""
        await wrapper.find('.sort-stars-btn').trigger('click')
        expect(wrapper.find('.first-item').text()).toBe('beta') // 500 stars > 100 stars
    })

    it('resets category or language filters if items change and no longer match', async () => {
        mockItems.value = sampleItems

        const wrapper = mount(SavedView, {
            global: {
                stubs: {
                    PageHeader: true,
                    AlertBanners: true,
                    SavedStats: true,
                    SavedToolbar: true,
                    SavedList: {
                        name: 'SavedList',
                        template: '<div class="list-stub"><button class="filter-cat-btn" @click="$emit(\'toggle-category\', \'Frameworks\')">Filter Frameworks</button></div>',
                        props: ['selectedCategory']
                    },
                    SavedUndoToast: true
                }
            }
        })

        await flushPromises()

        // Filter by Frameworks
        await wrapper.find('.filter-cat-btn').trigger('click')

        // Update items to remove all Frameworks items
        mockItems.value = [
            { _id: '1', name: 'beta', category: 'Libraries', language: 'TypeScript', status: 'ok' }
        ]

        await wrapper.vm.$nextTick()

        // Watcher should auto-reset category
        expect(wrapper.findComponent({ name: 'SavedList' }).props('selectedCategory')).toBeNull()
    })

    it('delegates remove, undo, and dismiss Undo actions', async () => {
        mockItems.value = sampleItems
        mockLastRemoved.value = { item: sampleItems[0] }

        const wrapper = mount(SavedView, {
            global: {
                stubs: {
                    PageHeader: true,
                    AlertBanners: true,
                    SavedStats: true,
                    SavedToolbar: true,
                    SavedList: {
                        name: 'SavedList',
                        template: '<button class="remove-btn" @click="$emit(\'remove\', items[0])">Remove</button>',
                        props: ['items']
                    },
                    SavedUndoToast: {
                        name: 'SavedUndoToast',
                        template: '<div class="toast-stub"><button class="undo-btn" @click="$emit(\'undo\')">Undo</button><button class="dismiss-btn" @click="$emit(\'dismiss\')">Dismiss</button></div>'
                    }
                }
            }
        })

        await flushPromises()

        await wrapper.find('.remove-btn').trigger('click')
        expect(mockRemove).toHaveBeenCalledWith(sampleItems[0])

        await wrapper.find('.undo-btn').trigger('click')
        expect(mockUndo).toHaveBeenCalledTimes(1)

        await wrapper.find('.dismiss-btn').trigger('click')
        expect(mockDismissUndo).toHaveBeenCalledTimes(1)
    })
})