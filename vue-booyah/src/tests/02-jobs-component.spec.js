globalThis.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
}

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

import JobsShareBar from '@/components/jobs/jobsShareBar.vue'
import JobsStatCard from '@/components/jobs/jobsStatCard.vue'
import JobsStatSection from '@/components/jobs/jobsStatSection.vue'
import JobsWorkModeDonut from '@/components/jobs/jobsWorkModeDonut.vue'
import JobsRoleDemandCards from '@/components/jobs/jobsRoleDemandCards.vue'
import JobsRoleDetail from '@/components/jobs/jobsRoleDetail.vue'
import JobsView from '@/views/JobsView.vue'

import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
use([CanvasRenderer])

const mockFetchHNJobsData = vi.fn()
vi.mock('@/utils/hackernewsJobs', () => ({
    fetchHNJobsData: (...args) => mockFetchHNJobsData(...args)
}))

vi.mock('@/utils/langColors', () => ({
    langColors: { Vue: '#41b883', TypeScript: '#3178c6', JavaScript: '#f7df1e' }
}))

vi.mock('@/utils/motion', () => ({
    vSpotlight: {}, vTilt: {}, useCountUp: (getter) => getter()
}))

vi.mock('@/utils/charts', () => ({
    ACCENT: '#58a6ff', fade: vi.fn(), tipRow: vi.fn(), hexAlpha: vi.fn(),
    useChartTheme: () => ({ value: { animation: false, grid: '#ccc', surface: '#fff' } })
}))

const VChartStub = {
    name: 'VChart', template: '<div class="v-chart-stub"><slot /></div>', props: ['option', 'autoresize']
}

const SegmentedToggleStub = {
    name: 'SegmentedToggle', template: '<div class="segmented-toggle-stub"></div>', props: ['modelValue', 'options']
}

beforeEach(() => {
    vi.clearAllMocks()
    HTMLDialogElement.prototype.showModal = vi.fn()
    HTMLDialogElement.prototype.close = vi.fn()
})

describe('JobsShareBar', () => {
    it('renders label, percentage, and configures progressbar attributes', () => {
        const wrapper = mount(JobsShareBar, { props: { label: 'TypeScript', value: 65 } })

        expect(wrapper.text()).toContain('TypeScript')
        expect(wrapper.text()).toContain('65%')
        expect(wrapper.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('65')
    })

    it('renders post count when provided', () => {
        const wrapper = mount(JobsShareBar, { props: { label: 'Docker', value: 40, count: 120 } })
        expect(wrapper.text()).toContain('120 posts')
    })
})

describe('JobsStatCard', () => {
    it('renders count value, label, and custom style variables', () => {
        const wrapper = mount(JobsStatCard, { props: { value: 2500, label: 'Active Jobs', index: 2, accent: '#3fb950' } })

        expect(wrapper.text()).toContain('2500')
        expect(wrapper.text()).toContain('Active Jobs')
    })
})

describe('JobsStatSection', () => {
    it('renders title and slot content when status is ok', () => {
        const wrapper = mount(JobsStatSection, {
            props: { title: 'Salary Distribution', status: 'ok' },
            slots: { default: '<div class="test-slot">Chart Content</div>' }
        })

        expect(wrapper.text()).toContain('Salary Distribution')
        expect(wrapper.find('.test-slot').exists()).toBe(true)
    })

    it('displays low sample badge when status is thin', () => {
        const wrapper = mount(JobsStatSection, {
            props: { title: 'Salary Distribution', status: 'thin' },
            slots: { default: '<div>Slot</div>' }
        })

        expect(wrapper.find('.badge').text()).toBe('Low sample')
    })

    it('displays reason message and hides slot when status is none', () => {
        const wrapper = mount(JobsStatSection, {
            props: { title: 'Salary Distribution', status: 'none', reason: 'no-bands' },
            slots: { default: '<div class="test-slot">Slot</div>' }
        })

        expect(wrapper.text()).toContain('No salary posted for this role.')
        expect(wrapper.find('.test-slot').exists()).toBe(false)
    })
})

describe('JobsWorkModeDonut', () => {
    const mockCounts = { remote: 50, hybrid: 30, onsite: 20, mixed: 0, unspecified: 0 }

    it('filters out zero-count slices and renders non-zero modes in legend', () => {
        const wrapper = mount(JobsWorkModeDonut, {
            props: { counts: mockCounts, posts: 100 },
            global: { stubs: { VChart: VChartStub, 'v-chart': VChartStub } }
        })

        const legendRows = wrapper.findAll('.legend-row')
        expect(legendRows).toHaveLength(3)
        expect(wrapper.text()).toContain('Remote')
        expect(wrapper.text()).toContain('Hybrid')
    })

    it('calculates and renders dominant category percentage in center text', () => {
        const wrapper = mount(JobsWorkModeDonut, {
            props: { counts: mockCounts, posts: 100 },
            global: { stubs: { VChart: VChartStub, 'v-chart': VChartStub } }
        })

        expect(wrapper.find('.centre-value').text()).toBe('50%')
        expect(wrapper.find('.centre-label').text()).toBe('Remote')
    })

    it('updates center text on legend row hover', async () => {
        const wrapper = mount(JobsWorkModeDonut, {
            props: { counts: mockCounts, posts: 100 },
            global: { stubs: { VChart: VChartStub, 'v-chart': VChartStub } }
        })

        const hybridRow = wrapper.findAll('.legend-row')[1]
        await hybridRow.trigger('mouseenter')
        expect(wrapper.find('.centre-value').text()).toBe('30%')

        await hybridRow.trigger('mouseleave')
        expect(wrapper.find('.centre-value').text()).toBe('50%')
    })
})

describe('JobsRoleDemandCards', () => {
    const mockRoles = [
        { name: 'Frontend Engineer', share: 40, count: 1200 },
        { name: 'Backend Engineer', share: 30, count: 900 },
        { name: 'DevOps Engineer', share: 15, count: 450 },
        { name: 'Data Scientist', share: 10, count: 300 },
        { name: 'QA Engineer', share: 3, count: 90 },
        { name: 'Security Engineer', share: 2, count: 60 }
    ]

    it('limits visible roles to top 5 by default', () => {
        const wrapper = mount(JobsRoleDemandCards, {
            props: { roles: mockRoles },
            global: { stubs: { SegmentedToggle: SegmentedToggleStub, JobsMonthChart: true } }
        })

        const roleRows = wrapper.findAll('.role-item')
        expect(roleRows).toHaveLength(5)
    })

    it('emits "select" event with role name when role row is clicked', async () => {
        const wrapper = mount(JobsRoleDemandCards, {
            props: { roles: mockRoles },
            global: { stubs: { SegmentedToggle: SegmentedToggleStub, JobsMonthChart: true } }
        })

        await wrapper.find('.role-row').trigger('click')
        expect(wrapper.emitted('select')).toBeTruthy()
        expect(wrapper.emitted('select')[0][0]).toBe('Frontend Engineer')
    })
})

describe('JobsRoleDetail', () => {
    const mockDetail = {
        posts: 450,
        salary: { status: 'ok', bands: [], stats: { mean: 140, p25: 120, p75: 160 }, n: 300 },
        trend: { status: 'ok', change: 'up', points: [] },
        workMode: { status: 'ok', counts: { remote: 200 }, posts: 200 },
        tech: { status: 'ok', coverage: 85, top: [{ name: 'Vue', share: 60, count: 120 }] }
    }

    it('invokes showModal and sets overflow hidden on mount, cleans up on unmount', () => {
        const wrapper = mount(JobsRoleDetail, {
            props: { role: 'Frontend Engineer', detail: mockDetail },
            global: {
                stubs: {
                    JobsStatSection: true, JobsSalaryStrip: true, JobsTrendChart: true,
                    JobsWorkModeDonut: true, JobsShareBar: true, SegmentedToggle: SegmentedToggleStub
                }
            }
        })

        expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1)
        expect(document.body.classList.contains('overflow-hidden')).toBe(true)

        wrapper.unmount()
        expect(document.body.classList.contains('overflow-hidden')).toBe(false)
    })

    it('renders role title and post count correctly', () => {
        const wrapper = mount(JobsRoleDetail, {
            props: { role: 'Frontend Engineer', detail: mockDetail },
            global: {
                stubs: {
                    JobsStatSection: true, JobsSalaryStrip: true, JobsTrendChart: true,
                    JobsWorkModeDonut: true, JobsShareBar: true, SegmentedToggle: SegmentedToggleStub
                }
            }
        })

        expect(wrapper.find('#role-dialog-title').text()).toBe('Frontend Engineer')
        expect(wrapper.text()).toContain('450 posts over the last 6 months')
    })
})

describe('JobsView', () => {
    const mockJobData = {
        postsAnalysed: 1500,
        roles: [{ name: 'Frontend Engineer', share: 40, count: 600 }],
        salaryBands: 800,
        postsPerMonth: [{ month: '2026-01', count: 250 }],
        rolesDetail: { 'Frontend Engineer': { posts: 600, tech: { top: [{ name: 'Vue', share: 50 }] } } }
    }

    it('renders SignalLoader while fetching jobs data on mount and displays dashboard upon success', async () => {
        mockFetchHNJobsData.mockImplementationOnce(async (onProgress) => {
            onProgress(1, 2)
            return { data: mockJobData, warning: '' }
        })

        const wrapper = mount(JobsView, {
            global: {
                stubs: {
                    PageHeader: true, SignalLoader: { template: '<div class="signal-loader-stub">Loader</div>' },
                    AlertBanners: true, JobsStatCard: { template: '<div>{{ value }} - {{ label }}</div>', props: ['value', 'label'] },
                    JobsRoleDemandCards: true, JobsRoleDetail: true
                }
            }
        })

        expect(wrapper.find('.signal-loader-stub').exists()).toBe(true)
        await flushPromises()
        expect(wrapper.find('.signal-loader-stub').exists()).toBe(false)
        expect(wrapper.text()).toContain('1500 - Job posts analysed')
    })

    it('displays error banner on fetch failure and retries loading when retry event is emitted', async () => {
        mockFetchHNJobsData.mockRejectedValueOnce(new Error('Network error'))

        const wrapper = mount(JobsView, {
            global: {
                stubs: {
                    PageHeader: true, SignalLoader: true,
                    AlertBanners: {
                        name: 'AlertBanners', props: ['error', 'warning'],
                        template: '<div class="alert-banners-stub"><button class="retry-btn" @click="$emit(\'retry\')">Retry</button><span>{{ error }}</span></div>'
                    },
                    JobsStatCard: true, JobsRoleDemandCards: true, JobsRoleDetail: true
                }
            }
        })

        await flushPromises()
        expect(wrapper.text()).toContain('Could not load job data from Hacker News')

        mockFetchHNJobsData.mockResolvedValueOnce({ data: mockJobData, warning: '' })
        await wrapper.find('.retry-btn').trigger('click')
        await flushPromises()

        expect(mockFetchHNJobsData).toHaveBeenCalledTimes(2)
    })

    it('opens role detail dialog when a role is selected and closes it on close event', async () => {
        mockFetchHNJobsData.mockResolvedValueOnce({ data: mockJobData, warning: '' })

        const wrapper = mount(JobsView, {
            global: {
                stubs: {
                    PageHeader: true, SignalLoader: true, AlertBanners: true, JobsStatCard: true,
                    JobsRoleDemandCards: {
                        name: 'JobsRoleDemandCards',
                        template: '<div class="demand-cards-stub"><button class="select-role-btn" @click="$emit(\'select\', \'Frontend Engineer\')">Select Role</button></div>'
                    },
                    JobsRoleDetail: {
                        name: 'JobsRoleDetail',
                        template: '<div class="role-detail-stub"><button class="close-role-btn" @click="$emit(\'close\')">Close</button><span>{{ role }}</span></div>',
                        props: ['role', 'detail']
                    }
                }
            }
        })

        await flushPromises()
        expect(wrapper.find('.role-detail-stub').exists()).toBe(false)

        await wrapper.find('.select-role-btn').trigger('click')
        expect(wrapper.find('.role-detail-stub').exists()).toBe(true)

        await wrapper.find('.close-role-btn').trigger('click')
        expect(wrapper.find('.role-detail-stub').exists()).toBe(false)
    })
})