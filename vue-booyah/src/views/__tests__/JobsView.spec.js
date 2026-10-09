import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import JobsView from '../JobsView.vue'

// Tiny hand-made HN responses (no real data is stored). Thread ids: 1 = current month (skipped),
// 2..7 = Sep, Aug, Jul, Jun, May, Apr 2026.
const MONTHS = ['October', 'September', 'August', 'July', 'June', 'May', 'April']
const post = (author, text) => ({ author, text })

const CHILDREN = {
  2: [
    post('a', 'Acme | Backend Engineer | Remote<p>Salary: $150k-$200k'),
    post('b', 'Beta | ML Engineer | Remote'),
    post('c', '[flagged]'), // not a job post
    post('d', 'Location: X<p>Willing to relocate: yes'), // job seeker
  ],
  3: [
    post('e', 'Co | Backend Engineer | Remote'),
    post('f', 'Gamma | Backend Engineer | AU$120-160k'), // not USD, must be excluded from salaries
  ],
  4: [
    post('a', 'Acme | Backend Engineer | Remote<p>Salary: $150k-$200k'), // same poster + band: counted once
    post('g', 'Co | Backend Engineer | Remote'),
  ],
  5: [post('h', 'Co | Backend Engineer | Remote')], // outside the 3-month demand window
  6: [post('i', 'Co | Backend Engineer | Remote')],
  7: [post('j', 'Co | Backend Engineer | Remote')],
}

function makeFetch({ failItem = [], failSearch = false } = {}) {
  return vi.fn(async (url) => {
    const json = (body) => ({ ok: true, status: 200, json: async () => body })
    if (url.includes('/search_by_date')) {
      if (failSearch) return { ok: false, status: 500, json: async () => ({}) }
      return json({
        hits: MONTHS.map((m, i) => ({
          objectID: String(i + 1),
          title: `Ask HN: Who is hiring? (${m} 2026)`,
        })),
      })
    }
    const id = url.match(/\/items\/(\d+)/)[1]
    if (failItem.includes(id)) return { ok: false, status: 500, json: async () => ({}) }
    return json({ id, children: CHILDREN[id] ?? [] })
  })
}

async function mountView() {
  const wrapper = mount(JobsView)
  await flushPromises()
  return wrapper
}

describe('JobsView', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(console, 'error').mockImplementation(() => {}) // failure tests log on purpose
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('shows a loading skeleton first', () => {
    vi.stubGlobal('fetch', makeFetch())
    const wrapper = mount(JobsView)
    expect(wrapper.find('.sk').exists()).toBe(true)
  })

  it('turns HN threads into the numbers on the page', async () => {
    vi.stubGlobal('fetch', makeFetch())
    const wrapper = await mountView()
    const text = wrapper.text()

    // Sep 2 + Aug 2 + Jul 2 = 6 posts ([flagged] and the job seeker are not counted)
    expect(wrapper.find('.strip').text()).toContain('6')
    // 5 of 6 posts mention a software role, 1 of 6 an ML role
    expect(text).toContain('Software Engineer')
    expect(text).toContain('83%')
    expect(text).toContain('AI/ML Engineer')
    expect(text).toContain('17%')
    // oldest month first
    const months = wrapper
      .findAll('.data-list')[1]
      .findAll('li')
      .map((li) => li.findAll('span').map((s) => s.text()))
    expect(months).toEqual([
      ['Jul 2026', '2'],
      ['Aug 2026', '2'],
      ['Sep 2026', '2'],
    ])
  })

  it('counts the same poster + band once and ignores non-USD pay', async () => {
    vi.stubGlobal('fetch', makeFetch())
    const wrapper = await mountView()
    // only one USD band for Software Engineer: too few to show a range, so it sits under "not enough data"
    expect(wrapper.find('.data-table tbody').text()).toBe('')
    expect(wrapper.find('.thin').text()).toContain('Software Engineer')
    expect(wrapper.find('.thin').text()).toContain('n = 1')
  })

  it('shows a warning but still renders when one month fails', async () => {
    vi.stubGlobal('fetch', makeFetch({ failItem: ['3'] }))
    const wrapper = await mountView()
    expect(wrapper.find('.banner-warn').text()).toContain('August 2026')
    expect(wrapper.find('.strip').exists()).toBe(true)
    // Sep 2 + Jul 2 = 4 posts
    expect(wrapper.find('.strip').text()).toContain('4')
  })

  it('shows an error with a retry button when nothing loads, and recovers', async () => {
    vi.stubGlobal('fetch', makeFetch({ failSearch: true }))
    const wrapper = await mountView()
    expect(wrapper.find('[role="alert"]').text()).toContain('Could not load job data')
    expect(wrapper.find('.strip').exists()).toBe(false)

    vi.stubGlobal('fetch', makeFetch())
    await wrapper.find('.retry').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.find('.strip').text()).toContain('6')
  })

  it('reuses cached numbers on the next visit instead of fetching again', async () => {
    const f = makeFetch()
    vi.stubGlobal('fetch', f)
    await mountView()
    const callsAfterFirst = f.mock.calls.length
    const second = await mountView()
    expect(f.mock.calls.length).toBe(callsAfterFirst)
    expect(second.find('.strip').text()).toContain('6')
  })

  it('does not cache a partial result', async () => {
    vi.stubGlobal('fetch', makeFetch({ failItem: ['3'] }))
    await mountView()
    expect(localStorage.getItem('jobs-view-v1')).toBeNull()
  })
})

describe('JobsView error logging', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('logs the real reason to the console when nothing loads', async () => {
    vi.stubGlobal('fetch', makeFetch({ failSearch: true }))
    await mountView()
    expect(console.error).toHaveBeenCalledTimes(1)
    const [message, err] = console.error.mock.calls[0]
    expect(message).toContain('JobsView')
    expect(err.message).toContain('500') // HTTP status from getJSON
  })

  it('logs which month failed on a partial failure', async () => {
    vi.stubGlobal('fetch', makeFetch({ failItem: ['3'] }))
    await mountView()
    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(console.warn.mock.calls[0][0]).toContain('August 2026')
  })
})

// Each function called on its own through wrapper.vm (they are not exported)
describe('JobsView functions', () => {
  let vm
  beforeEach(async () => {
    localStorage.clear()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', makeFetch())
    vm = (await mountView()).vm
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('getJSON returns the body, and throws with the HTTP status when not ok', async () => {
    expect(await vm.getJSON('https://x/items/2')).toBeDefined()
    vi.stubGlobal('fetch', async () => ({ ok: false, status: 503, json: async () => ({}) }))
    await expect(vm.getJSON('https://x/bad')).rejects.toThrow('503')
  })

  it('latestThreads skips the live month and returns the requested number', async () => {
    const six = await vm.latestThreads(6)
    expect(six.map((t) => t.objectID)).toEqual(['2', '3', '4', '5', '6', '7'])
    expect(six[0].title).toContain('September')
    expect(await vm.latestThreads(2)).toHaveLength(2)
  })

  it('latestThreads ignores threads that are not "Who is hiring?"', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => ({
        hits: [
          { objectID: '1', title: 'Ask HN: Who is hiring? (October 2026)' },
          { objectID: '9', title: 'Ask HN: Who wants to be hired? (September 2026)' },
          { objectID: '2', title: 'Ask HN: Who is hiring? (September 2026)' },
        ],
      }),
    }))
    expect((await vm.latestThreads(6)).map((t) => t.objectID)).toEqual(['2'])
  })

  it('label helpers', () => {
    expect(vm.monthOf({ title: 'Ask HN: Who is hiring? (September 2026)' })).toBe('September 2026')
    expect(vm.shortMonth('September 2026')).toBe('Sep 2026')
    expect(vm.roleLabel('AI / ML Engineer')).toBe('AI/ML Engineer')
    expect(vm.usd(175)).toBe('$175k')
  })

  it('isJobPost rejects [flagged] and job seekers', () => {
    expect(vm.isJobPost('Acme | Backend Engineer')).toBe(true)
    expect(vm.isJobPost('[flagged]')).toBe(false)
    expect(vm.isJobPost('Willing to relocate: yes')).toBe(false)
  })

  it('findSalaries reads annual ranges and tags the currency', () => {
    expect(vm.findSalaries('$150k-$200k')).toEqual([{ currency: 'USD', lo: 150000, hi: 200000 }])
    expect(vm.findSalaries('AU$120-160k')[0].currency).toBe('AUD')
    expect(vm.findSalaries('€100k-120k')[0].currency).toBe('EUR')
  })

  it('findSalaries drops hourly rates and out-of-range numbers', () => {
    expect(vm.findSalaries('$50-80/hr')).toEqual([])
    expect(vm.findSalaries('$50 - $80 per hour')).toEqual([])
    expect(vm.findSalaries('$5k-$10k')).toEqual([])
    expect(vm.findSalaries('raised $10-20M')).toEqual([])
  })

  it('analyseThread counts posts, roles and USD bands only', () => {
    const out = vm.analyseThread({ children: CHILDREN[2].concat(CHILDREN[3]) })
    expect(out.posts).toBe(4) // 2 from Sep + 2 from Aug; [flagged] and the job seeker dropped
    expect(out.roleCounts).toEqual({ 'Software Engineer': 3, 'AI / ML Engineer': 1 })
    expect(out.bands).toEqual([
      { author: 'a', role: 'Software Engineer', lo: 150000, hi: 200000 }, // AU$ band from "f" is excluded
    ])
  })

  it('buildResults: shares, window, sort order, minimum bands, dedupe, oldest-first months', () => {
    const band = (author, role, lo = 150000, hi = 200000) => ({ author, role, lo, hi })
    const ten = Array.from({ length: 10 }, (_, i) => band(`p${i}`, 'Software Engineer'))
    const sep = {
      month: 'September 2026',
      posts: 10,
      roleCounts: { 'Software Engineer': 6, 'AI / ML Engineer': 3 },
      bands: [...ten, band('x', 'Data')],
    }
    const jul = {
      month: 'July 2026',
      posts: 10,
      roleCounts: { 'Software Engineer': 4 },
      bands: [band('p0', 'Software Engineer')], // same poster + band as in Sep: counted once
    }
    const out = vm.buildResults([sep, null, jul]) // null = August failed to load

    expect(out.postsAnalysed).toBe(20)
    expect(out.roles).toEqual([
      { name: 'Software Engineer', share: 50 }, // (6 + 4) / 20
      { name: 'AI/ML Engineer', share: 15 }, // 3 / 20
    ])
    expect(out.postsPerMonth).toEqual([
      { month: 'Jul 2026', count: 10 },
      { month: 'Sep 2026', count: 10 },
    ])
    expect(out.salaries).toEqual([
      { role: 'Software Engineer', low: 150, high: 200, n: 10 },
      { role: 'Data', low: null, high: null, n: 1 }, // under 10 bands: no range shown
    ])
  })

  it('buildResults leaves "(Role unclear)" out of the salary list', () => {
    const out = vm.buildResults([
      {
        month: 'September 2026',
        posts: 1,
        roleCounts: {},
        bands: [{ author: 'a', role: '(Role unclear)', lo: 150000, hi: 200000 }],
      },
    ])
    expect(out.salaries).toEqual([])
  })

  it('readCache returns fresh data and ignores expired or broken entries', () => {
    const data = { postsAnalysed: 1, roles: [], salaries: [], postsPerMonth: [] }
    localStorage.setItem('jobs-view-v1', JSON.stringify({ savedAt: Date.now(), data }))
    expect(vm.readCache()).toEqual(data)
    localStorage.setItem(
      'jobs-view-v1',
      JSON.stringify({ savedAt: Date.now() - 7 * 60 * 60 * 1000, data }),
    )
    expect(vm.readCache()).toBeNull() // older than 6h
    localStorage.setItem('jobs-view-v1', '{not json')
    expect(vm.readCache()).toBeNull()
  })
})
