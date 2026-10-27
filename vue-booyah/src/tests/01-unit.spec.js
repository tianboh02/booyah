import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ============================================================================
// Shared setup (must run before the modules below are imported)
// ============================================================================

// window.matchMedia() method returns a MediaQueryList object that determines if a document matches a specific CSS media query string -> only for charts.js, which reads the reduced-motion preference.

// githubTrending.js builds an axios instance at import time; we replace axios with a fake so no real request ever goes out and we can grab the request interceptor.

// vi.hoisted tells Vitest to move this block above the imports so it runs first.

const gh = vi.hoisted(() => {
    window.matchMedia = (query) => ({
        matches: false,
        media: query,
        addEventListener() {},
        removeEventListener() {},
    })
    return { get: null, interceptor: null, createConfig: null }
})

// vi.mock('axios', ...) replaces axios with a fake for this whole test file.
// Vitest also moves vi.mock calls above the imports automatically, so githubTrending.js only ever sees the fake. The fake copies just the parts that file uses:
vi.mock('axios', () => {
    gh.get = vi.fn()
    return {
        default: {
            create: (config) => {
                gh.createConfig = config
                return {
                    get: (...args) => gh.get(...args),
                    interceptors: { request: { use: (fn) => (gh.interceptor = fn) } },
                }
            },
        },
    }
})

// ---------- Modules under test ----------
import * as top5 from '@/utils/top5Categories'
import { langColors, getLangColor, topLangColors } from '@/utils/langColors'
import { ACCENT, reduceMotion, fade, hexAlpha, useChartTheme, tipRow } from '@/utils/charts'
import { useTheme } from '@/composables/useTheme'
import { fetchDiscoveryData, CACHE_KEY as DISCOVERY_CACHE_KEY, CACHE_TTL_MS } from '@/utils/hackernewsDiscovery'
import { ROLES, fetchHNJobsData } from '@/utils/hackernewsJobs'
import { isKnownLanguage, resourcesFor } from '@/utils/learnResources'
import * as learnPath from '@/utils/learnPath'
import { timeAgo, shortCount, pad2, mostCommon, MEDALS, OTHER_COLOR, toLegend, toPillLabels } from '@/utils/trending/github/display'
import { RULES, TIMEFRAMES, fetchTopRepos, fetchTopDevelopers } from '@/utils/trending/github/githubTrending'
import * as fmt from '@/utils/trending/helpers/format'
import * as cmp from '@/utils/trending/math/compareMath'
import * as tm from '@/utils/trending/math/trendMath'

// ---------- Shared helpers ----------

// A fake fetch Response
const res = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data })

// A run of daily download entries starting on `start`: downloadsFor(i, date) → number
const makeDays = (start, count, downloadsFor) =>
    Array.from({ length: count }, (_, i) => {
        const date = tm.addDays(start, i)
        return { date, downloads: downloadsFor(i, date) }
    })

// Silence the console.error calls the code makes on purpose for failed requests
let consoleSpy
beforeEach(() => {
    localStorage.clear()
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
    consoleSpy.mockRestore()
    vi.unstubAllGlobals()
    vi.useRealTimers()
})

// ============================================================================
// 1. top5Categories.js — Show HN classifier, ranking and repo filters
// ============================================================================
describe('1. top5Categories.js', () => {
    const ghRepo = (over = {}) => ({
        name: 'tool',
        description: 'A handy tool',
        language: 'Go',
        topics: [],
        fork: false,
        archived: false,
        stargazers_count: 100,
        ...over,
    })

    it('1.1 exposes the Discovery limits', () => {
        expect(top5.TOP_CATEGORIES).toBe(5)
        expect(top5.REPOS_PER_CATEGORY).toBe(5)
        expect(top5.MIN_STARS).toBe(50)
    })

    it('1.2 BUCKET_BY_ID looks buckets up by id with label and ranked flag', () => {
        expect(top5.BUCKET_BY_ID.agents.label).toBe('AI agents and agent tooling')
        expect(top5.BUCKET_BY_ID.agents.ranked).toBe(true)
        expect(top5.BUCKET_BY_ID.games.ranked).toBe(false)
        expect(top5.BUCKET_BY_ID.unknown).toBeUndefined()
    })

    it('1.3 normalizeTitle strips the "Show HN:" prefix in any case and handles empty input', () => {
        expect(top5.normalizeTitle('Show HN: My tool')).toBe('My tool')
        expect(top5.normalizeTitle('  show hn  My tool ')).toBe('My tool')
        expect(top5.normalizeTitle('Not a show post')).toBe('Not a show post')
        expect(top5.normalizeTitle(null)).toBe('')
        expect(top5.normalizeTitle(undefined)).toBe('')
    })

    it('1.4 classify puts titles into the highest-scoring bucket', () => {
        expect(top5.classify('Show HN: An MCP server for AI agents')).toBe('agents')
        expect(top5.classify('Show HN: Fast LLM inference on a single GPU')).toBe('models')
        expect(top5.classify('Show HN: A CLI for parsing logs, written in Rust')).toBe('devtools')
        expect(top5.classify('Show HN: Rootless containers with gVisor')).toBe('systems')
        expect(top5.classify('Show HN: An e-ink weather display on an ESP32')).toBe('hardware')
        expect(top5.classify('Show HN: Open-source invoicing and billing')).toBe('business')
        expect(top5.classify('Show HN: A habit tracker for iOS')).toBe('consumer')
        expect(top5.classify('Show HN: A roguelike chess game')).toBe('games')
        expect(top5.classify('Show HN: An interactive visualization of the solar system')).toBe('explainers')
    })

    it('1.5 classify breaks a tie in favour of the bucket listed first', () => {
        // "hacker news" (hn_meta, 3) ties with "terminal" (devtools, 3): hn_meta is listed first
        expect(top5.classify('Show HN: Hacker News terminal')).toBe('hn_meta')
        // "ai" (models weak, 1) ties with "app" (consumer weak, 1): models is listed first
        expect(top5.classify('ai app')).toBe('models')
    })

    it('1.6 classify returns "unclassified" when nothing matches, and matches whole words only', () => {
        expect(top5.classify('Show HN: My weekend')).toBe('unclassified')
        expect(top5.classify('')).toBe('unclassified')
        // "paint" contains "ai" but not as a whole word
        expect(top5.classify('paint')).toBe('unclassified')
    })

    it('1.7 extractRepo parses GitHub repo links into owner, name and a lowercase key', () => {
        expect(top5.extractRepo('https://github.com/Owner/Repo')).toEqual({ owner: 'Owner', name: 'Repo', key: 'owner/repo' })
        expect(top5.extractRepo('http://www.github.com/a/b.git')).toEqual({ owner: 'a', name: 'b', key: 'a/b' })
        expect(top5.extractRepo('https://github.com/a/b/tree/main/src')).toEqual({ owner: 'a', name: 'b', key: 'a/b' })
    })

    it('1.8 extractRepo rejects missing, non-GitHub, non-repo and reserved-owner links', () => {
        expect(top5.extractRepo(null)).toBeNull()
        expect(top5.extractRepo('')).toBeNull()
        expect(top5.extractRepo('https://gitlab.com/a/b')).toBeNull()
        expect(top5.extractRepo('https://github.com/onlyowner')).toBeNull()
        expect(top5.extractRepo('https://github.com/topics/rust')).toBeNull()
        expect(top5.extractRepo('https://github.com/Sponsors/someone')).toBeNull()
        expect(top5.extractRepo('https://github.com/a/.git')).toBeNull() // name is empty after stripping .git
    })

    it('1.9 rankCategories counts distinct builders per ranked bucket and skips unranked ones', () => {
        const ranked = top5.rankCategories([
            { objectID: '1', bucket: 'agents', author: 'alice' },
            { objectID: '2', bucket: 'agents', author: 'alice' },
            { objectID: '3', bucket: 'agents', author: 'bob' },
            { objectID: '4', bucket: 'devtools', author: null }, // no author → counts as its own builder
            { objectID: '5', bucket: 'devtools', author: null },
            { objectID: '6', bucket: 'devtools', author: 'carol' },
            { objectID: '7', bucket: 'games', author: 'dave' }, // unranked
            { objectID: '8', bucket: 'unclassified', author: 'erin' },
        ])
        expect(ranked).toEqual([
            { id: 'devtools', posts: 3, builders: 3 },
            { id: 'agents', posts: 3, builders: 2 },
        ])
    })

    it('1.10 rankCategories breaks ties by post count, then by id', () => {
        const ranked = top5.rankCategories([
            { objectID: '1', bucket: 'systems', author: 'a' },
            { objectID: '2', bucket: 'models', author: 'b' },
            { objectID: '3', bucket: 'agents', author: 'c' },
            { objectID: '4', bucket: 'agents', author: 'c' },
        ])
        expect(ranked.map((r) => r.id)).toEqual(['agents', 'models', 'systems'])
        expect(top5.rankCategories([])).toEqual([])
    })

    it('1.11 hardCheckFailures returns [] for a good repo', () => {
        expect(top5.hardCheckFailures(ghRepo())).toEqual([])
        expect(top5.passesHardChecks(ghRepo())).toBe(true)
        expect(top5.passesHardChecks(ghRepo({ stargazers_count: top5.MIN_STARS }))).toBe(true)
    })

    it('1.12 hardCheckFailures flags forks, archived, blocked words and low stars', () => {
        expect(top5.hardCheckFailures(ghRepo({ fork: true }))).toEqual(['fork'])
        expect(top5.hardCheckFailures(ghRepo({ archived: true }))).toEqual(['archived'])
        expect(top5.hardCheckFailures(ghRepo({ description: 'nsfw image tagger' }))).toEqual(['blocked'])
        expect(top5.hardCheckFailures(ghRepo({ topics: ['hentai'] }))).toEqual(['blocked'])
        expect(top5.hardCheckFailures(ghRepo({ stargazers_count: 49 }))).toEqual(['stars'])
        expect(top5.hardCheckFailures(ghRepo({ stargazers_count: undefined }))).toEqual(['stars'])
        expect(top5.passesHardChecks(ghRepo({ fork: true }))).toBe(false)
    })

    it('1.13 hardCheckFailures flags lists and docs as not-software', () => {
        expect(top5.hardCheckFailures(ghRepo({ name: 'awesome-rust' }))).toEqual(['not-software'])
        expect(top5.hardCheckFailures(ghRepo({ topics: ['awesome-list'] }))).toEqual(['not-software'])
        expect(top5.hardCheckFailures(ghRepo({ topics: ['awesome'] }))).toEqual(['not-software'])
        expect(top5.hardCheckFailures(ghRepo({ description: 'A curated list of tools' }))).toEqual(['not-software'])
        // docs-like description only counts when the repo has no language
        expect(top5.hardCheckFailures(ghRepo({ language: null, description: 'Interview questions' }))).toEqual(['not-software'])
        expect(top5.hardCheckFailures(ghRepo({ language: 'Go', description: 'Interview questions' }))).toEqual([])
        // missing name/description/topics do not crash
        expect(top5.hardCheckFailures({ stargazers_count: 60 })).toEqual([])
    })

    it('1.14 langOf and visibleProjects filter by language and cap at REPOS_PER_CATEGORY', () => {
        expect(top5.langOf({ language: 'Go' })).toBe('Go')
        expect(top5.langOf({ language: null })).toBe('No language')
        const category = {
            projects: [
                ...Array.from({ length: 7 }, (_, i) => ({ name: `go${i}`, language: 'Go' })),
                { name: 'nolang', language: null },
            ],
        }
        expect(top5.visibleProjects(category, null)).toHaveLength(5)
        expect(top5.visibleProjects(category, 'Go').every((p) => p.language === 'Go')).toBe(true)
        expect(top5.visibleProjects(category, 'No language').map((p) => p.name)).toEqual(['nolang'])
        expect(top5.visibleProjects(category, 'Rust')).toEqual([])
    })
})

// ============================================================================
// 2. langColors.js — language → colour lookup
// ============================================================================
describe('2. langColors.js', () => {
    const HEX = /^#[0-9a-f]{6}$/i

    it('2.1 every listed colour is a valid 6-digit hex', () => {
        for (const color of Object.values(langColors)) expect(color).toMatch(HEX)
    })

    it('2.2 getLangColor returns the listed colour for a known language', () => {
        expect(getLangColor('JavaScript')).toBe('#f1e05a')
        expect(getLangColor('Vue')).toBe('#41b883')
        expect(getLangColor('C#')).toBe('#159b05')
    })

    it('2.3 getLangColor falls back to "No language" for empty input', () => {
        expect(getLangColor(null)).toBe(langColors['No language'])
        expect(getLangColor('')).toBe(langColors['No language'])
        expect(getLangColor(undefined)).toBe(langColors['No language'])
    })

    it('2.4 getLangColor resolves aliases and is case-insensitive', () => {
        expect(getLangColor('TSX')).toBe(langColors.TypeScript)
        expect(getLangColor('JSX')).toBe(langColors.JavaScript)
        expect(getLangColor('Vim script')).toBe(langColors['Vim Script'])
        expect(getLangColor('typescript')).toBe(langColors.TypeScript)
        expect(getLangColor('PYTHON')).toBe(langColors.Python)
    })

    it('2.5 getLangColor generates a stable, valid colour for unknown languages', () => {
        const a = getLangColor('Brainfudge')
        expect(a).toMatch(HEX)
        expect(getLangColor('Brainfudge')).toBe(a) // same input, same colour
        expect(getLangColor('Whitespace')).not.toBe(a) // different language, different colour
        expect(Object.values(langColors)).not.toContain(a)
    })

    it('2.6 topLangColors returns the colours of the 3 most common languages, skipping empty ones', () => {
        const langs = ['Go', 'Go', 'Go', 'Rust', 'Rust', 'Python', 'Python', 'Vue', null, '', undefined]
        expect(topLangColors(langs)).toEqual([langColors.Go, langColors.Rust, langColors.Python])
        expect(topLangColors(['Go'])).toEqual([langColors.Go])
        expect(topLangColors([])).toEqual([])
        expect(topLangColors([null, ''])).toEqual([])
    })
})

// ============================================================================
// 3. charts.js — shared ECharts styling
// ============================================================================
describe('3. charts.js', () => {
    afterEach(() => {
        useTheme().theme.value = 'dark'
    })

    it('3.1 exports the accent colour and reads reduced-motion from matchMedia', () => {
        expect(ACCENT).toBe('#58a6ff')
        expect(reduceMotion).toBe(false) // our matchMedia stub reports no preference
    })

    it('3.2 hexAlpha turns a hex colour into rgba()', () => {
        expect(hexAlpha('#58a6ff', 0.5)).toBe('rgba(88, 166, 255, 0.5)')
        expect(hexAlpha('#000000', 1)).toBe('rgba(0, 0, 0, 1)')
        expect(hexAlpha('#ffffff', 0)).toBe('rgba(255, 255, 255, 0)')
    })

    it('3.3 fade builds a top-to-bottom gradient with default opacities', () => {
        const g = fade('#ff0000')
        expect(g.type).toBe('linear')
        expect([g.x, g.y, g.x2, g.y2]).toEqual([0, 0, 0, 1])
        expect(g.colorStops).toEqual([
            { offset: 0, color: 'rgba(255, 0, 0, 0.9)' },
            { offset: 1, color: 'rgba(255, 0, 0, 0.05)' },
        ])
    })

    it('3.4 fade accepts custom top and bottom opacities', () => {
        const g = fade('#00ff00', 0.4, 0)
        expect(g.colorStops.map((s) => s.color)).toEqual(['rgba(0, 255, 0, 0.4)', 'rgba(0, 255, 0, 0)'])
    })

    it('3.5 useChartTheme uses the dark palette and shared building blocks', () => {
        useTheme().theme.value = 'dark'
        const t = useChartTheme().value
        expect(t.text).toBe('#8b949e')
        expect(t.surface).toBe('#0d1117')
        expect(t.animation).toBe(true)
        expect(t.tooltip).toMatchObject({ backgroundColor: t.tipBg, borderColor: t.tipBorder, borderWidth: 1 })
        expect(t.tooltip.textStyle.color).toBe(t.strong)
        expect(t.axisLabel).toEqual({ color: t.text, fontSize: 12 })
        expect(t.splitLine.lineStyle).toEqual({ color: t.grid, type: 'dashed' })
    })

    it('3.6 useChartTheme follows the theme switch reactively', () => {
        const { theme } = useTheme()
        theme.value = 'dark'
        const chart = useChartTheme()
        expect(chart.value.surface).toBe('#0d1117')
        theme.value = 'light'
        expect(chart.value.surface).toBe('#ffffff')
        expect(chart.value.text).toBe('#57606a')
    })

    it('3.7 useChartTheme falls back to dark for an unknown theme', () => {
        useTheme().theme.value = 'sepia'
        expect(useChartTheme().value.surface).toBe('#0d1117')
    })

    it('3.8 tipRow renders a label and value into tooltip HTML', () => {
        const html = tipRow('Stars', '1.2k')
        expect(html).toContain('>Stars</span>')
        expect(html).toContain('>1.2k</span>')
        expect(html.startsWith('<div')).toBe(true)
    })
})

// ============================================================================
// 4. hackernewsDiscovery.js — Show HN → GitHub categories (fetch is mocked)
// ============================================================================
describe('4. hackernewsDiscovery.js', () => {
    const hit = (objectID, title, author, url, points) => ({ objectID, title, author, url, points })

    const HN_HITS = [
        hit('1', 'Show HN: An MCP server for AI agents', 'alice', 'https://github.com/a/agent-one', 100),
        hit('2', 'Show HN: Swarm – agentic orchestration', 'bob', 'https://github.com/b/swarm', 50),
        hit('3', 'Show HN: Agent harness v2', 'alice', 'https://github.com/a/agent-one', 20), // same repo, fewer points
        hit('4', 'Show HN: A CLI for parsing logs, written in Rust', 'carol', 'https://github.com/c/logcli', 80),
        hit('5', 'Show HN: A roguelike game in the terminal', 'dave', 'https://github.com/d/rogue', 300), // games: unranked
        hit('6', 'Show HN: A terminal text editor', 'eve', 'https://github.com/a/agent-one', 10), // repo already taken
        hit('7', 'Show HN: Autonomous agents for your inbox', 'gina', 'https://github.com/g/forked', 40), // fork
        hit('8', 'Show HN: Agents everywhere', 'alice', 'https://github.com/x/gone', 5), // 404
        hit('9', 'Show HN: Codex helper', null, null, 30), // no author, no repo
        hit('10', 'Show HN: Agent hive', 'bob', 'https://github.com/h/hive', 50), // same points as swarm, more stars
    ]

    const ghRepoJson = (full, over = {}) => {
        const [owner, name] = full.split('/')
        return {
            full_name: full,
            owner: { login: owner },
            name,
            description: `${name} does things`,
            language: 'Go',
            stargazers_count: 100,
            fork: false,
            archived: false,
            topics: [],
            html_url: `https://github.com/${full}`,
            ...over,
        }
    }

    const GH = {
        'a/agent-one': ghRepoJson('a/agent-one', { description: null, language: 'Python', stargazers_count: 500 }),
        'b/swarm': ghRepoJson('b/swarm', { language: null, stargazers_count: 100 }),
        'c/logcli': ghRepoJson('c/logcli', { language: 'Rust', stargazers_count: 300 }),
        'g/forked': ghRepoJson('g/forked', { fork: true, stargazers_count: 999 }),
        'h/hive': ghRepoJson('h/hive', { stargazers_count: 900 }),
    }

    // pages: array of hit arrays; ghStatus: { 'owner/name': status } overrides
    const mockFetch = ({ pages = [HN_HITS], ghStatus = {}, hnStatus = 200 } = {}) => {
        const fetchMock = vi.fn(async (url) => {
            if (url.startsWith('https://hn.algolia.com')) {
                if (hnStatus !== 200) return res(null, hnStatus)
                const page = Number(new URL(url).searchParams.get('page'))
                return res({ hits: pages[page], nbPages: pages.length })
            }
            const key = url.replace('https://api.github.com/repos/', '')
            if (ghStatus[key]) return res(null, ghStatus[key])
            return GH[key] ? res(GH[key]) : res(null, 404)
        })
        vi.stubGlobal('fetch', fetchMock)
        return fetchMock
    }

    it('4.1 builds ranked categories with deduped, filtered, sorted projects', async () => {
        mockFetch()
        const { data, warning } = await fetchDiscoveryData()
        expect(warning).toBe('')
        expect(data.map((c) => [c.id, c.rank, c.builders])).toEqual([
            ['agents', 1, 4], // alice, bob, gina, and the author-less post
            ['devtools', 2, 2], // carol, eve — games is unranked so it never appears
        ])
        expect(data[0].name).toBe('AI agents and agent tooling')
        // most HN points first; equal points → more stars first; fork + 404 dropped
        expect(data[0].projects.map((p) => p.id)).toEqual(['a/agent-one', 'h/hive', 'b/swarm'])
        // a/agent-one was already claimed by the higher-ranked category
        expect(data[1].projects.map((p) => p.id)).toEqual(['c/logcli'])
    })

    it('4.2 maps a GitHub repo + its best HN post into a project card', async () => {
        mockFetch()
        const { data } = await fetchDiscoveryData()
        expect(data[0].projects[0]).toEqual({
            id: 'a/agent-one',
            owner: 'a',
            name: 'agent-one',
            description: 'No description', // null description gets a placeholder
            language: 'Python',
            stars: 500,
            hnPoints: 100, // the 100-point post wins over the 20-point one for the same repo
            hnUrl: 'https://news.ycombinator.com/item?id=1',
            ghUrl: 'https://github.com/a/agent-one',
        })
        expect(data[0].projects[2].language).toBeNull()
    })

    it('4.3 reports progress once for HN and once per GitHub request', async () => {
        mockFetch()
        const onProgress = vi.fn()
        await fetchDiscoveryData(onProgress)
        // 7 candidates (5 agents repos + 2 devtools repos) + 1 HN step
        expect(onProgress).toHaveBeenCalledTimes(8)
        expect(onProgress).toHaveBeenNthCalledWith(1, 1, 8)
        expect(onProgress).toHaveBeenLastCalledWith(8, 8)
    })

    it('4.4 sends the stored GitHub token and API headers', async () => {
        localStorage.setItem('auth_token', 'tok123')
        const fetchMock = mockFetch()
        await fetchDiscoveryData()
        const ghCall = fetchMock.mock.calls.find(([url]) => url.includes('api.github.com'))
        expect(ghCall[1].headers).toEqual({
            Authorization: 'Bearer tok123',
            'X-GitHub-Api-Version': '2022-11-28',
            Accept: 'application/vnd.github+json',
        })
    })

    it('4.5 leaves out the Authorization header when signed out', async () => {
        const fetchMock = mockFetch()
        await fetchDiscoveryData()
        const ghCall = fetchMock.mock.calls.find(([url]) => url.includes('api.github.com'))
        expect(ghCall[1].headers).not.toHaveProperty('Authorization')
    })

    it('4.6 queries Show HN with the 30-day window and points floor', async () => {
        const fetchMock = mockFetch()
        await fetchDiscoveryData()
        const params = new URL(fetchMock.mock.calls[0][0]).searchParams
        expect(params.get('tags')).toBe('show_hn')
        expect(params.get('numericFilters')).toMatch(/^created_at_i>\d+,points>=10$/)
        expect(params.get('hitsPerPage')).toBe('100')
    })

    it('4.7 follows HN pagination and counts a post seen on two pages once', async () => {
        const fetchMock = mockFetch({ pages: [HN_HITS.slice(0, 5), HN_HITS.slice(4)] }) // hit 5 is on both pages
        const { data } = await fetchDiscoveryData()
        const hnCalls = fetchMock.mock.calls.filter(([url]) => url.includes('hn.algolia.com'))
        expect(hnCalls).toHaveLength(2)
        expect(data[0].builders).toBe(4)
    })

    it('4.8 writes a successful result to the cache and reuses it without fetching', async () => {
        const fetchMock = mockFetch()
        const first = await fetchDiscoveryData()
        expect(JSON.parse(localStorage.getItem(DISCOVERY_CACHE_KEY)).data).toEqual(first.data)
        fetchMock.mockClear()
        const second = await fetchDiscoveryData()
        expect(fetchMock).not.toHaveBeenCalled()
        expect(second).toEqual({ data: first.data, warning: '' })
    })

    it('4.9 ignores a stale or corrupt cache', async () => {
        localStorage.setItem(DISCOVERY_CACHE_KEY, JSON.stringify({ savedAt: Date.now() - CACHE_TTL_MS - 1, data: ['old'] }))
        const fetchMock = mockFetch()
        expect((await fetchDiscoveryData()).data).not.toEqual(['old'])
        localStorage.setItem(DISCOVERY_CACHE_KEY, '{not json')
        fetchMock.mockClear()
        await fetchDiscoveryData()
        expect(fetchMock).toHaveBeenCalled()
    })

    it('4.10 warns (singular) and skips the cache when one GitHub request fails', async () => {
        mockFetch({ ghStatus: { 'b/swarm': 500 } })
        const { data, warning } = await fetchDiscoveryData()
        expect(warning).toBe('Could not check 1 repository on GitHub, so some projects may be missing.')
        expect(data[0].projects.map((p) => p.id)).toEqual(['a/agent-one', 'h/hive'])
        expect(localStorage.getItem(DISCOVERY_CACHE_KEY)).toBeNull()
        expect(consoleSpy).toHaveBeenCalled()
    })

    it('4.11 uses the plural wording when several GitHub requests fail', async () => {
        mockFetch({ ghStatus: { 'b/swarm': 500, 'h/hive': 403 } })
        const { warning } = await fetchDiscoveryData()
        expect(warning).toBe('Could not check 2 repositories on GitHub, so some projects may be missing.')
    })

    it('4.12 throws when there are no ranked software posts', async () => {
        mockFetch({ pages: [[hit('1', 'Show HN: A roguelike game', 'a', null, 50)]] })
        await expect(fetchDiscoveryData()).rejects.toThrow('no Show HN software posts found')
    })

    it('4.13 throws when the HN request fails', async () => {
        mockFetch({ hnStatus: 503 })
        await expect(fetchDiscoveryData()).rejects.toThrow(/^503 https:\/\/hn\.algolia\.com/)
    })

    it('4.14 treats a Show HN hit with no points as 0 points', async () => {
        mockFetch({ pages: [[hit('1', 'Show HN: An MCP server for AI agents', 'alice', 'https://github.com/c/logcli', undefined)]] })
        const { data } = await fetchDiscoveryData()
        expect(data[0].projects[0].hnPoints).toBe(0)
    })

    it('4.15 still works when localStorage refuses to save', async () => {
        mockFetch()
        const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError')
        })
        const { data, warning } = await fetchDiscoveryData()
        expect(data).toHaveLength(2)
        expect(warning).toBe('')
        setItem.mockRestore()
    })
})

// ============================================================================
// 5. hackernewsJobs.js — "Who is hiring?" analysis (fetch is mocked)
// ============================================================================
describe('5. hackernewsJobs.js', () => {
    const JOBS_CACHE_KEY = 'jobs-view-v4'
    // The newest thread (November) is still running, so the code skips it and reads the next 6.
    const MONTHS = ['November 2026', 'October 2026', 'September 2026', 'August 2026', 'July 2026', 'June 2026', 'May 2026']
    const ID = { Oct: 't1', Sep: 't2', Aug: 't3', Jul: 't4', Jun: 't5', May: 't6' }
    const post = (text, author) => ({ text, author })
    const filler = (n, tag = 'f') => Array.from({ length: n }, (_, i) => post(`${tag}${i} | Barista | Onsite`, `${tag}${i}`))
    const se = (n, tag = 'se') => Array.from({ length: n }, (_, i) => post(`${tag}${i} | Software Engineer | Remote`, `${tag}${i}`))

    // threads: { t1: children[] | number (HTTP status to fail with) }, default 1 filler post per month
    const mockJobsFetch = (threads = {}, { listStatus = 200, hits } = {}) => {
        const threadHits = hits ?? [
            { objectID: 'w', title: 'Ask HN: Who wants to be hired? (November 2026)' },
            ...MONTHS.map((m, i) => ({ objectID: `t${i}`, title: `Ask HN: Who is hiring? (${m})` })),
        ]
        const fetchMock = vi.fn(async (url) => {
            if (url.includes('search_by_date')) return listStatus === 200 ? res({ hits: threadHits }) : res(null, listStatus)
            const id = url.split('/items/')[1]
            const t = threads[id] ?? filler(1, id)
            return typeof t === 'number' ? res(null, t) : res({ children: t })
        })
        vi.stubGlobal('fetch', fetchMock)
        return fetchMock
    }

    // The mixed October thread used by 5.4 – 5.8
    const OCT_MIXED = [
        post('Acme | Senior Software Engineer | Remote (US) | $150k - $200k<p>We use Python, React and AWS.', 'a1'),
        post('Beta | ML Engineer | Onsite SF<p>Pay: $180,000 to $220,000<p>PyTorch and Python', 'a2'),
        post('Gamma | Product Manager | Hybrid | €80k-€100k', 'a3'),
        post('Location: Berlin<p>Remote: yes<p>Willing to relocate: yes<p>Résumé/CV: https://example.com', 'seeker'),
        { author: 'deleted' }, // no text
        post('Delta | Software Engineer, Data Engineer | Remote<p>Salary: $120k-$160k', 'a4'),
        post('Eps | Backend Engineer | NYC on-site or remote | CA$100k - 140k', 'a5'),
        post('Zeta | Full Stack Engineer | Remote | $30 - $40 per hour<p>We write Go, TypeScript and C&#x2B;&#x2B;', 'a6'),
        post('Eta | UX Designer | Remote', 'a7'),
        post('Theta | Software Engineer | Remote | $90k - 2,000,000<p>Rust and Kubernetes', 'a8'),
        post('Iota | Software Engineer | Not remote, in-office | 120-150k USD<p>Rust', 'a9'),
    ]

    it('5.1 ROLES regexes recognise common job titles', () => {
        const match = (text) => Object.keys(ROLES).filter((r) => ROLES[r].test(text))
        expect(match('Senior Full-Stack Engineer')).toEqual(['Software Engineer'])
        expect(match('Member of Technical Staff')).toEqual(['Software Engineer'])
        expect(match('Machine Learning Engineer')).toEqual(['AI / ML Engineer'])
        expect(match('Research Scientist')).toEqual(['AI / ML Engineer'])
        expect(match('Forward Deployed Engineer')).toEqual(['Forward Deployed Engineer'])
        expect(match('Analytics Engineer')).toEqual(['Data'])
        expect(match('Site Reliability Engineer')).toEqual(['Infra / DevOps / SRE'])
        expect(match('AppSec Engineer')).toEqual(['Security'])
        expect(match('Firmware Engineer')).toEqual(['Embedded / Hardware / Robotics'])
        expect(match('Program Manager')).toEqual(['Product Manager'])
        expect(match('Brand Designer')).toEqual(['Designer'])
        expect(match('VP of Engineering')).toEqual(['Engineering Manager'])
        expect(match('Barista')).toEqual([])
    })

    it('5.2 reads only the 6 complete "Who is hiring?" threads', async () => {
        const fetchMock = mockJobsFetch()
        await fetchHNJobsData()
        const itemCalls = fetchMock.mock.calls.map(([url]) => url).filter((u) => u.includes('/items/'))
        expect(itemCalls.map((u) => u.split('/items/')[1]).sort()).toEqual(['t1', 't2', 't3', 't4', 't5', 't6'])
    })

    it('5.3 reports progress for the thread list and each thread', async () => {
        mockJobsFetch()
        const onProgress = vi.fn()
        await fetchHNJobsData(onProgress)
        expect(onProgress).toHaveBeenCalledTimes(7)
        expect(onProgress).toHaveBeenNthCalledWith(1, 1, 7)
        expect(onProgress).toHaveBeenLastCalledWith(7, 7)
    })

    it('5.4 counts job posts (not seekers or empty posts) and ranks roles by share', async () => {
        mockJobsFetch({ [ID.Oct]: OCT_MIXED })
        const { data, warning } = await fetchHNJobsData()
        expect(warning).toBe('')
        // demand = latest 3 months: Oct 9 job posts + Sep 1 + Aug 1
        expect(data.postsAnalysed).toBe(11)
        expect(data.roles).toEqual([
            { name: 'Software Engineer', count: 6, share: 55 },
            { name: 'AI/ML Engineer', count: 1, share: 9 },
            { name: 'Data', count: 1, share: 9 },
            { name: 'Product Manager', count: 1, share: 9 },
            { name: 'Designer', count: 1, share: 9 },
        ])
        expect(Object.keys(data.rolesDetail)).toEqual(data.roles.map((r) => r.name))
        expect(data.postsPerMonth).toEqual([
            { month: 'Aug 2026', count: 1 },
            { month: 'Sep 2026', count: 1 },
            { month: 'Oct 2026', count: 9 },
        ])
    })

    it('5.5 parses only valid USD salary ranges and ties them to a role', async () => {
        mockJobsFetch({ [ID.Oct]: OCT_MIXED })
        const { data } = await fetchHNJobsData()
        // Kept: $150k-$200k (SE), $180,000 to $220,000 (AI/ML, single role + single band), 120-150k USD (SE)
        // Dropped: € range, CA$ range, hourly $30-$40, >$1M high end, and the "(Role unclear)" band
        expect(data.salaryBands).toBe(3)
        expect(data.rolesDetail['Software Engineer'].salary).toEqual({ status: 'none', reason: 'too-few', n: 2 })
        expect(data.rolesDetail['AI/ML Engineer'].salary).toEqual({ status: 'none', reason: 'too-few', n: 1 })
        expect(data.rolesDetail['Product Manager'].salary).toEqual({ status: 'none', reason: 'no-bands', n: 0 })
        expect(data.rolesDetail.Data.salary).toEqual({ status: 'none', reason: 'no-bands', n: 0 })
    })

    it('5.6 reads work mode from the header line (remote / onsite / mixed / hybrid, "not remote")', async () => {
        mockJobsFetch({ [ID.Oct]: OCT_MIXED })
        const { data } = await fetchHNJobsData()
        expect(data.rolesDetail['Software Engineer'].workMode).toEqual({
            status: 'thin', // 6 posts is under the 20-post sample size
            posts: 6,
            counts: { remote: 4, mixed: 1, onsite: 1 },
        })
        expect(data.rolesDetail['Product Manager'].workMode.counts).toEqual({ hybrid: 1 })
        expect(data.rolesDetail['AI/ML Engineer'].workMode.counts).toEqual({ onsite: 1 })
    })

    it('5.7 lists the top 5 technologies (HTML entities decoded) and skips non-engineering roles', async () => {
        mockJobsFetch({ [ID.Oct]: OCT_MIXED })
        const { data } = await fetchHNJobsData()
        const tech = data.rolesDetail['Software Engineer'].tech
        expect(tech.status).toBe('thin')
        expect(tech.coverage).toBe(67) // 4 of 6 SE posts name a technology
        expect(tech.top).toEqual([
            { name: 'Rust', count: 2, share: 33 },
            { name: 'Python', count: 1, share: 17 },
            { name: 'React', count: 1, share: 17 },
            { name: 'AWS', count: 1, share: 17 },
            { name: 'TypeScript', count: 1, share: 17 },
        ]) // Go and C++ (decoded from C&#x2B;&#x2B;) are 6th/7th and cut off
        expect(data.rolesDetail.Designer.tech).toEqual({ status: 'none', reason: 'not-applicable' })
        expect(data.rolesDetail['Product Manager'].tech).toEqual({ status: 'none', reason: 'not-applicable' })
    })

    it('5.8 builds a 6-month share trend, oldest first', async () => {
        mockJobsFetch({ [ID.Oct]: OCT_MIXED })
        const { data } = await fetchHNJobsData()
        const trend = data.rolesDetail['Software Engineer'].trend
        expect(trend.status).toBe('ok')
        expect(trend.change).toBe('steady') // May has 0 SE posts: too few to call a move
        expect(trend.points.map((p) => p.month)).toEqual(['May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026'])
        expect(trend.points[0]).toEqual({ month: 'May 2026', share: 0, count: 0, posts: 1 })
        expect(trend.points[5]).toEqual({ month: 'Oct 2026', share: 67, count: 6, posts: 9 })
    })

    it('5.9 computes full salary stats once a role has 10+ bands', async () => {
        const sec = Array.from({ length: 10 }, (_, i) => {
            const lo = 100 + 10 * i
            return post(`Sec${i} | Security Engineer | Remote | $${lo}k - $${lo + 50}k`, `s${i}`)
        })
        mockJobsFetch({ [ID.Oct]: sec })
        const { data } = await fetchHNJobsData()
        const salary = data.rolesDetail.Security.salary
        expect(salary.status).toBe('ok')
        expect(salary.n).toBe(10)
        expect(salary.bands[0]).toEqual({ lo: 100, hi: 150 })
        expect(salary.stats).toEqual({
            medianLo: 145,
            medianHi: 195,
            mean: 170,
            p25: 148,
            p75: 193,
            min: 100,
            max: 240,
            mode: 120, // every $10k bucket has one band → the tie goes to the lowest bucket
        })
        expect(data.rolesDetail.Security.tech).toEqual({ status: 'thin', coverage: 0, top: [] })
    })

    it('5.10 shows 5–9 bands as "thin" and handles currency prefixes/suffixes and dedupe', async () => {
        const sec = (n, range) => post(`C${n} | Security Engineer | Remote | ${range}`, `c${n}`)
        mockJobsFetch({
            [ID.Oct]: [
                sec(1, '$100k-$150k CAD'), // CAD suffix → not USD
                sec(2, 'S$100k - S$150k'), // S$ → SGD
                sec(3, '100k - $150k'), // $ only on the high end → USD
                sec(4, 'US$120k - 160k'), // US$ → USD
                sec(5, '£70k - £90k'), // GBP
                sec(6, '$200k - $150k'), // reversed → swapped
                sec(7, '$90k–$110k'), // en dash
                sec(8, '$80k to $100k'), // "to"
                sec(9, '$1,500,000 - $2,000,000'), // above $1M → dropped
            ],
            [ID.Sep]: [sec(8, '$80k to $100k')], // same author + band in another month → counted once
        })
        const { data } = await fetchHNJobsData()
        expect(data.salaryBands).toBe(5)
        expect(data.rolesDetail.Security.salary).toEqual({
            status: 'thin',
            n: 5,
            bands: [
                { lo: 100, hi: 150 },
                { lo: 120, hi: 160 },
                { lo: 150, hi: 200 },
                { lo: 90, hi: 110 },
                { lo: 80, hi: 100 },
            ],
        })
    })

    it.each([
        ['up', 5, 40],
        ['down', 40, 5],
    ])('5.11 flags a clear share change as "%s"', async (expected, mayCount, octCount) => {
        mockJobsFetch({
            [ID.May]: [...se(mayCount, 'm'), ...filler(50 - mayCount, 'mf')],
            [ID.Oct]: [...se(octCount, 'o'), ...filler(50 - octCount, 'of')],
        })
        const { data } = await fetchHNJobsData()
        expect(data.rolesDetail['Software Engineer'].trend.change).toBe(expected)
    })

    it('5.12 keeps a failed month as a gap, warns about it and does not cache', async () => {
        mockJobsFetch({ [ID.Oct]: se(3), [ID.Jul]: 500 })
        const { data, warning } = await fetchHNJobsData()
        expect(warning).toBe('Could not load July 2026. The figures below leave that month out.')
        expect(data.rolesDetail['Software Engineer'].trend.points[2]).toEqual({ month: 'Jul 2026', missing: true })
        expect(localStorage.getItem(JOBS_CACHE_KEY)).toBeNull()
    })

    it('5.13 hides the trend when fewer than 3 months load (plural warning)', async () => {
        mockJobsFetch({ [ID.Oct]: se(3), [ID.Aug]: 500, [ID.Jul]: 500, [ID.Jun]: 500, [ID.May]: 500 })
        const { data, warning } = await fetchHNJobsData()
        expect(warning).toBe(
            'Could not load August 2026, July 2026, June 2026, May 2026. The figures below leave those months out.',
        )
        expect(data.rolesDetail['Software Engineer'].trend).toEqual({ status: 'none', reason: 'no-history' })
    })

    it('5.14 caches a clean result and serves it next time without fetching', async () => {
        const fetchMock = mockJobsFetch({ [ID.Oct]: se(2) })
        const first = await fetchHNJobsData()
        expect(localStorage.getItem(JOBS_CACHE_KEY)).not.toBeNull()
        fetchMock.mockClear()
        const second = await fetchHNJobsData()
        expect(fetchMock).not.toHaveBeenCalled()
        expect(second).toEqual({ data: first.data, warning: '' })
    })

    it('5.15 ignores an expired or corrupt cache', async () => {
        localStorage.setItem(JOBS_CACHE_KEY, JSON.stringify({ savedAt: Date.now() - 7 * 3600 * 1000, data: 'old' }))
        const fetchMock = mockJobsFetch()
        expect((await fetchHNJobsData()).data).not.toBe('old')
        localStorage.setItem(JOBS_CACHE_KEY, 'corrupt{')
        fetchMock.mockClear()
        await fetchHNJobsData()
        expect(fetchMock).toHaveBeenCalled()
    })

    it('5.16 throws when no hiring threads exist', async () => {
        mockJobsFetch({}, { hits: [{ objectID: 'x', title: 'Ask HN: Freelancer? Seeking freelancer?' }] })
        await expect(fetchHNJobsData()).rejects.toThrow('no hiring threads found')
    })

    it('5.17 throws when the thread list request fails', async () => {
        mockJobsFetch({}, { listStatus: 502 })
        await expect(fetchHNJobsData()).rejects.toThrow(/^502 /)
    })

    it('5.18 throws when every thread fails to load', async () => {
        mockJobsFetch(Object.fromEntries(Object.values(ID).map((id) => [id, 500])))
        await expect(fetchHNJobsData()).rejects.toThrow('every thread failed to load')
    })

    it('5.19 decodes decimal and named HTML entities before matching', async () => {
        mockJobsFetch({
            [ID.Oct]: [post('Lambda | Software Engineer | Remote<p>Node&#46;js &amp; SQL &lt;3 &quot;Go&quot; &gt; all', 'l1')],
        })
        const { data } = await fetchHNJobsData()
        expect(data.rolesDetail['Software Engineer'].tech.top.map((t) => t.name)).toEqual(['Node.js', 'Go', 'SQL'])
    })


    // Fix: /^\s*\[(flagged|dead)\]\s*$/i, then change it.skip → it.
    it('5.20 skips "[dead]" and "[flagged]" posts', async () => {
        mockJobsFetch({ [ID.Oct]: [post('[dead]', 'd1'), post('[flagged]', 'd2'), ...se(1)] })
        const { data } = await fetchHNJobsData()
        expect(data.postsPerMonth.at(-1)).toEqual({ month: 'Oct 2026', count: 1 })
    })

    it('5.21 still returns data when localStorage refuses to save', async () => {
        mockJobsFetch({ [ID.Oct]: se(2) })
        const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked')
        })
        const { data } = await fetchHNJobsData()
        expect(data.roles[0].name).toBe('Software Engineer')
        setItem.mockRestore()
    })
})

// ============================================================================
// 6. learnResources.js — learning links per language
// ============================================================================
describe('6. learnResources.js', () => {
    it('6.1 isKnownLanguage only accepts curated languages (own keys only)', () => {
        expect(isKnownLanguage('Python')).toBe(true)
        expect(isKnownLanguage('C++')).toBe(true)
        expect(isKnownLanguage('python')).toBe(false) // GitHub names are case-sensitive
        expect(isKnownLanguage('Haskell')).toBe(false)
        expect(isKnownLanguage('toString')).toBe(false) // not fooled by Object.prototype
    })

    it('6.2 resourcesFor returns docs, roadmap, exercism and ready-to-show videos', () => {
        const r = resourcesFor('Python')
        expect(r.docs).toBe('https://docs.python.org/3/tutorial/')
        expect(r.roadmap).toBe('https://roadmap.sh/python')
        expect(r.exercism).toBe('https://exercism.org/tracks/python')
        expect(r.videos[0]).toEqual({
            title: 'Python in 100 Seconds',
            by: 'Fireship',
            url: 'https://www.youtube.com/watch?v=x7X9w_GIm1s',
            thumb: 'https://i.ytimg.com/vi/x7X9w_GIm1s/mqdefault.jpg',
        })
        expect(r.videos).toHaveLength(2)
    })

    it('6.3 every curated language gives https links and well-formed videos', () => {
        for (const lang of ['Python', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'Java', 'Kotlin', 'C++', 'C', 'C#', 'Swift', 'Ruby', 'PHP', 'Dart', 'Shell']) {
            const r = resourcesFor(lang)
            expect(r.docs).toMatch(/^https:\/\//)
            expect(r.exercism).toMatch(/^https:\/\/exercism\.org\/tracks\//)
            expect(r.roadmap === null || r.roadmap.startsWith('https://roadmap.sh/')).toBe(true)
            expect(r.videos.length).toBeGreaterThan(0)
            for (const v of r.videos) {
                expect(v.url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/)
                expect(v.thumb).toMatch(/^https:\/\/i\.ytimg\.com\/vi\/.+\/mqdefault\.jpg$/)
            }
        }
        expect(resourcesFor('C').roadmap).toBeNull()
    })

    it('6.4 resourcesFor gives an unknown language a GitHub topic and a YouTube search', () => {
        expect(resourcesFor('F#')).toEqual({
            docs: 'https://github.com/topics/f%23',
            roadmap: null,
            exercism: null,
            videos: [{
                title: 'Learn F# on YouTube',
                by: 'YouTube search',
                url: 'https://www.youtube.com/results?search_query=learn+F%23',
                thumb: null,
            }],
        })
    })

    it('6.5 resourcesFor returns a fresh copy each time', () => {
        const a = resourcesFor('Go')
        a.videos.push('junk')
        expect(resourcesFor('Go').videos).toHaveLength(1)
    })
})

// ============================================================================
// 7. learnPath.js — Learn page suggestions
// ============================================================================
describe('7. learnPath.js', () => {
    const category = {
        projects: [
            { name: 'big', language: 'Python', stars: 900, description: 'Big data pipeline', ghUrl: 'https://github.com/a/big' },
            { name: 'small', language: 'Python', stars: 60, description: 'Small helper', ghUrl: 'https://github.com/a/small' },
            { name: 'mid', language: 'Python', stars: 300, description: 'Medium thing', ghUrl: 'https://github.com/a/mid' },
            { name: 'tiny', language: 'Python', stars: 55, description: 'Tiny thing', ghUrl: 'https://github.com/a/tiny' },
            { name: 'fast', language: 'Rust', stars: 120, description: 'Fast parser', ghUrl: 'https://github.com/a/fast' },
            { name: 'quick', language: 'Go', stars: 80, description: 'Quick server', ghUrl: 'https://github.com/a/quick' },
            { name: 'none', language: null, stars: 80, description: 'Nothing', ghUrl: 'https://github.com/a/none' },
        ],
    }
    const repo = (over) => ({
        name: 'repo',
        description: 'something',
        topics: [],
        language: 'JavaScript',
        stargazers_count: 100,
        fork: false,
        archived: false,
        pushed_at: '2026-01-01T00:00:00Z',
        ...over,
    })

    it('7.1 languageCounts counts languages and skips empty values', () => {
        expect(learnPath.languageCounts(['Go', null, 'Go', 'Rust', ''])).toEqual({ Go: 2, Rust: 1 })
        expect(learnPath.languageCounts([])).toEqual({})
    })

    it('7.2 suggestLanguages ranks by count, breaks ties by Trending, and caps at 3', () => {
        const out = learnPath.suggestLanguages(category, { Go: 3 })
        expect(out).toEqual([
            { lang: 'Python', why: '4 of 7 projects' },
            { lang: 'Go', why: '1 of 7 projects · 3 trending repos this week' }, // Go beats Rust on Trending
            { lang: 'Rust', why: '1 of 7 projects' },
        ])
    })

    it('7.3 suggestLanguages uses singular wording and works without Trending data', () => {
        const out = learnPath.suggestLanguages({ projects: [{ language: 'Go' }] }, { Go: 1 })
        expect(out).toEqual([{ lang: 'Go', why: '1 of 1 project · 1 trending repo this week' }])
        expect(learnPath.suggestLanguages({ projects: [] })).toEqual([])
    })

    it('7.4 starterProjects lists the 3 smallest projects in the language', () => {
        expect(learnPath.starterProjects(category, 'Python').map((p) => p.name)).toEqual(['tiny', 'small', 'mid'])
        expect(learnPath.starterProjects(category, 'Zig')).toEqual([])
    })

    it('7.5 recommendedProjects prefers the language and falls back to the top projects', () => {
        expect(learnPath.recommendedProjects(category, 'Rust').map((p) => p.name)).toEqual(['fast'])
        expect(learnPath.recommendedProjects(category, 'Zig').map((p) => p.name)).toEqual(['big', 'small', 'mid'])
    })

    it('7.6 jobDemand sums each technology share across roles', () => {
        const rolesDetail = {
            SE: { tech: { top: [{ name: 'Python', share: 30 }, { name: 'Go', share: 10 }] } },
            Data: { tech: { top: [{ name: 'Python', share: 50 }] } },
            PM: { tech: { status: 'none' } }, // no top list
            Designer: {}, // no tech at all
        }
        expect(learnPath.jobDemand(rolesDetail)).toEqual({ Python: 80, Go: 10 })
        expect(learnPath.jobDemand()).toEqual({})
    })

    it('7.7 nextLanguages scores Trending + Jobs + natural pairing and explains why', () => {
        const out = learnPath.nextLanguages(['JavaScript'], { Rust: 4, Go: 2 }, { Python: 50, Go: 20, AWS: 99 })
        expect(out.map((o) => o.lang)).toEqual(['Go', 'Rust', 'Python'])
        expect(out[0].why).toBe('pairs with JavaScript · 2 trending repos this week · #2 language in job posts')
        expect(out[1].why).toBe('4 trending repos this week')
        expect(out[2].why).toBe('#1 language in job posts')
    })

    it('7.8 nextLanguages never suggests known or non-curated languages, and keeps the first pairing', () => {
        const out = learnPath.nextLanguages(['Python', 'C'], {}, {})
        // Python → Go, Rust; C → Rust, C++ ; Rust stays paired with Python (first seen)
        expect(out.map((o) => o.lang).sort()).toEqual(['C++', 'Go', 'Rust'])
        expect(out.find((o) => o.lang === 'Rust').why).toBe('pairs with Python')
        expect(learnPath.nextLanguages(['Elm'], { Elm: 9, Zig: 9 }, {})).toEqual([])
    })

    it('7.9 readCodeUrl opens a repo in github.dev', () => {
        expect(learnPath.readCodeUrl('https://github.com/a/b')).toBe('https://github.dev/a/b')
    })

    it('7.10 reposToExtend returns up to 3 of your repos in the category, newest first, no forks', () => {
        const repos = [
            repo({ name: 'cli-one', description: 'A CLI tool', pushed_at: '2026-01-01T00:00:00Z' }),
            repo({ name: 'cli-two', description: 'A CLI tool', pushed_at: '2026-05-01T00:00:00Z' }),
            repo({ name: 'cli-three', description: 'A CLI tool', pushed_at: '2026-03-01T00:00:00Z' }),
            repo({ name: 'cli-four', description: 'A CLI tool', pushed_at: null }),
            repo({ name: 'cli-fork', description: 'A CLI tool', fork: true }),
        ]
        const { matched, repos: out } = learnPath.reposToExtend(repos, 'devtools')
        expect(matched).toBe(true)
        expect(out.map((r) => r.name)).toEqual(['cli-two', 'cli-three', 'cli-one'])
    })

    it('7.11 reposToExtend falls back to your 2 most recent repos', () => {
        const repos = [
            repo({ name: 'a', pushed_at: '2026-01-01T00:00:00Z' }),
            repo({ name: 'b', pushed_at: '2026-03-01T00:00:00Z' }),
            repo({ name: 'c', pushed_at: '2026-02-01T00:00:00Z' }),
        ]
        expect(learnPath.reposToExtend(repos, 'hardware')).toEqual({ matched: false, repos: [repos[1], repos[2]] })
        expect(learnPath.reposToExtend([], 'hardware')).toEqual({ matched: false, repos: [] })
    })

    it('7.12 extendIdeas suggests a rewrite and the most similar project', () => {
        const mine = repo({ name: 'quick-server', description: 'A quick server' })
        const ideas = learnPath.extendIdeas(mine, category, 'Go')
        expect(ideas[0]).toEqual({ text: 'Rewrite one module of quick-server in Go, practising on code you already know' })
        expect(ideas[1]).toEqual({ text: 'Compare with quick: similar work in Go. Borrow one feature.', url: 'https://github.com/a/quick' })
        expect(ideas).toHaveLength(2) // healthy repo: nothing else to fix
    })

    it('7.13 extendIdeas skips the rewrite when there is no new language or it is the same one', () => {
        const mine = repo({ language: 'Go' })
        expect(learnPath.extendIdeas(mine, category, 'Go')[0].text).not.toMatch(/^Rewrite/)
        expect(learnPath.extendIdeas(mine, category, null)[0].text).not.toMatch(/^Rewrite/)
    })

    it('7.14 extendIdeas falls back to a same-language project, then the first one', () => {
        const rustRepo = repo({ name: 'zzz', description: 'zzz', language: 'Rust' })
        expect(learnPath.extendIdeas(rustRepo, category, null)[0].text).toContain('Compare with fast')
        const elmRepo = repo({ name: 'zzz', description: 'zzz', language: 'Elm' })
        expect(learnPath.extendIdeas(elmRepo, category, null)[0].text).toContain('Compare with big')
        // a project without a language gets no " in X"
        const noLang = { projects: [{ name: 'bare', language: null, description: '', ghUrl: 'u' }] }
        expect(learnPath.extendIdeas(elmRepo, noLang, null)[0].text).toBe('Compare with bare: similar work. Borrow one feature.')
        // an empty category gives no comparison at all
        expect(learnPath.extendIdeas(elmRepo, { projects: [] }, null)).toEqual([])
    })

    it('7.15 extendIdeas flags Discovery gaps and caps the list at 4', () => {
        const weak = repo({ name: 'old', description: '', archived: true, stargazers_count: 49 })
        const texts = learnPath.extendIdeas(weak, category, 'Rust').map((i) => i.text)
        expect(texts).toHaveLength(4)
        expect(texts[2]).toBe('Archived. Unarchive it to keep building')
        expect(texts[3]).toBe('Add a description so people (and Discovery) know what it does')
        // the stars idea was 5th and got cut; on its own it uses singular wording
        const oneShort = repo({ stargazers_count: 49 })
        expect(learnPath.extendIdeas(oneShort, { projects: [] }, null)).toEqual([{ text: '1 more star and Discovery would list it' }])
        const noStars = repo({ stargazers_count: undefined })
        expect(learnPath.extendIdeas(noStars, { projects: [] }, null)).toEqual([{ text: '50 more stars and Discovery would list it' }])
    })
})

// ============================================================================
// 8. display.js — Top Repositories / Developers text helpers
// ============================================================================
describe('8. trending/github/display.js', () => {
    const NOW = new Date('2026-10-26T12:00:00Z')
    const ago = (ms) => new Date(NOW.getTime() - ms).toISOString()
    const MIN = 60e3
    const HOUR = 60 * MIN
    const DAY = 24 * HOUR

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(NOW)
    })

    it('8.1 timeAgo handles empty input and "just now"', () => {
        expect(timeAgo('')).toBe('')
        expect(timeAgo(null)).toBe('')
        expect(timeAgo(ago(59e3))).toBe('just now')
    })

    it('8.2 timeAgo uses singular and plural for minutes, hours and days', () => {
        expect(timeAgo(ago(MIN))).toBe('1 minute ago')
        expect(timeAgo(ago(59 * MIN))).toBe('59 minutes ago')
        expect(timeAgo(ago(HOUR))).toBe('1 hour ago')
        expect(timeAgo(ago(23 * HOUR))).toBe('23 hours ago')
        expect(timeAgo(ago(DAY))).toBe('1 day ago')
        expect(timeAgo(ago(29 * DAY))).toBe('29 days ago')
    })

    it('8.3 timeAgo switches to months and years', () => {
        expect(timeAgo(ago(30 * DAY))).toBe('1 month ago')
        expect(timeAgo(ago(359 * DAY))).toBe('11 months ago')
        expect(timeAgo(ago(365 * DAY))).toBe('1 year ago')
        expect(timeAgo(ago(800 * DAY))).toBe('2 years ago')
    })

    it('8.4 shortCount abbreviates thousands and millions', () => {
        expect(shortCount(null)).toBe('–')
        expect(shortCount(undefined)).toBe('–')
        expect(shortCount(0)).toBe('0')
        expect(shortCount(999)).toBe('999')
        expect(shortCount(1000)).toBe('1k')
        expect(shortCount(1234)).toBe('1.2k')
        expect(shortCount(99_950)).toBe('100k')
        expect(shortCount(254_000)).toBe('254k') // 100k+ drops the decimal
        expect(shortCount(1_500_000)).toBe('1.5M')
        expect(shortCount(2_000_000)).toBe('2M')
    })

    it('8.5 pad2 zero-pads rank numbers', () => {
        expect(pad2(3)).toBe('03')
        expect(pad2(12)).toBe('12')
        expect(pad2(100)).toBe('100')
    })

    it('8.6 mostCommon finds the top value and skips empty ones', () => {
        const list = [{ l: 'Go' }, { l: 'Rust' }, { l: 'Go' }, { l: null }, { l: '' }, { l: null }]
        expect(mostCommon(list, (x) => x.l)).toEqual({ value: 'Go', count: 2 })
        expect(mostCommon([{ l: null }], (x) => x.l)).toBeNull()
        expect(mostCommon([], (x) => x)).toBeNull()
    })

    it('8.7 exposes medal and "Other" colours', () => {
        expect(MEDALS).toHaveLength(3)
        for (const c of [...MEDALS, OTHER_COLOR]) expect(c).toMatch(/^#[0-9a-f]{6}$/i)
    })

    it('8.8 toLegend keeps short lists and folds the rest into "Other"', () => {
        const part = (name, pct) => ({ name, pct, color: '#000000' })
        const four = [part('A', 50), part('B', 30), part('C', 15), part('D', 5)]
        expect(toLegend(four)).toBe(four) // max + 1 items: unchanged
        const six = [...four, part('E', 3), part('F', 2)]
        expect(toLegend(six)).toEqual([part('A', 50), part('B', 30), part('C', 15), { name: 'Other', pct: 10, color: OTHER_COLOR }])
        expect(toLegend(six, 1)).toEqual([part('A', 50), { name: 'Other', pct: 55, color: OTHER_COLOR }])
        expect(toLegend([])).toEqual([])
    })

    it('8.9 toPillLabels reshapes options for the period toggle', () => {
        expect(toPillLabels([{ value: 'daily', label: 'Today' }, { value: 'weekly', label: 'This week' }])).toEqual({
            values: ['daily', 'weekly'],
            labels: { daily: { label: 'Today' }, weekly: { label: 'This week' } },
        })
        expect(toPillLabels([])).toEqual({ values: [], labels: {} })
    })
})

// ============================================================================
// 9. githubTrending.js — Top Repositories / Developers loaders (axios is mocked)
// ============================================================================
describe('9. trending/github/githubTrending.js', () => {
    const NOW = new Date('2026-10-26T12:00:00Z')
    const httpError = (status, headers = {}) => Object.assign(new Error(`HTTP ${status}`), { response: { status, headers } })
    // routes: { '/path': data | Error | (params) => data }
    const route = (routes) =>
        gh.get.mockImplementation(async (path, { params } = {}) => {
            const r = routes[path]
            if (r === undefined) throw httpError(404)
            if (r instanceof Error) throw r
            return { data: typeof r === 'function' ? r(params) : r }
        })

    const searchItem = (id, over = {}) => ({
        id,
        name: `repo${id}`,
        full_name: `own${id}/repo${id}`,
        owner: { login: `own${id}`, avatar_url: `https://avatars/${id}`, type: 'Organization' },
        html_url: `https://github.com/own${id}/repo${id}`,
        description: `Repo ${id}`,
        language: 'Go',
        stargazers_count: 10 * id,
        forks_count: id,
        topics: ['cli'],
        license: { spdx_id: 'MIT' },
        created_at: '2026-10-20T00:00:00Z',
        private: false,
        ...over,
    })

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(NOW)
        gh.get.mockReset()
    })

    it('9.1 exposes the list rules and timeframes', () => {
        expect(RULES.limit).toBe(20)
        expect(RULES.repos.sort).toBe('stars')
        expect(RULES.developers.sort).toBe('followers')
        expect(Object.keys(TIMEFRAMES)).toEqual(['daily', 'weekly', 'monthly'])
        expect(TIMEFRAMES.monthly.days).toBe(30)
    })

    it('9.2 the axios client targets the GitHub API with the right headers', () => {
        expect(gh.createConfig).toEqual({
            baseURL: 'https://api.github.com',
            headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
        })
    })

    it('9.3 the request interceptor adds the stored token, fresh on every request', () => {
        expect(gh.interceptor({ headers: {} }).headers).toEqual({})
        localStorage.setItem('auth_token', 'abc')
        expect(gh.interceptor({ headers: {} }).headers).toEqual({ Authorization: 'Bearer abc' })
    })

    it('9.4 the request interceptor still works when storage is blocked', () => {
        const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('SecurityError')
        })
        expect(gh.interceptor({ headers: {} }).headers).toEqual({})
        spy.mockRestore()
    })

    it('9.5 fetchTopRepos searches repos created in the timeframe and maps them', async () => {
        route({
            '/search/repositories': {
                total_count: 1234,
                items: [
                    searchItem(1),
                    searchItem(2, { private: true }), // filtered out
                    searchItem(3, { owner: undefined, description: null, language: null, stargazers_count: undefined, forks_count: undefined, topics: undefined, license: { spdx_id: 'NOASSERTION' } }),
                ],
            },
            '/repos/own1/repo1/languages': { Go: 900, Shell: 95, Makefile: 5 },
            '/repos//repo3/languages': {},
        })
        const { repos, totalCount } = await fetchTopRepos('weekly', undefined, { force: true })
        expect(gh.get.mock.calls[0]).toEqual([
            '/search/repositories',
            { params: { q: 'created:>2026-10-19 is:public', sort: 'stars', order: 'desc', per_page: 20 } },
        ])
        expect(totalCount).toBe(1234)
        expect(repos).toHaveLength(2)
        expect(repos[0]).toMatchObject({
            id: 1, rank: 1, name: 'repo1', fullName: 'own1/repo1', owner: 'own1', ownerAvatar: 'https://avatars/1',
            ownerType: 'Organization', description: 'Repo 1', language: 'Go', stars: 10, forks: 1, topics: ['cli'], license: 'MIT',
        })
        // missing fields fall back to safe defaults
        expect(repos[1]).toMatchObject({
            rank: 2, owner: '', ownerAvatar: '', ownerType: 'User', description: '', language: null,
            stars: 0, forks: 0, topics: [], license: null, composition: [],
        })
    })

    it('9.6 fetchTopRepos turns language bytes into %, grouping <1% as "Other"', async () => {
        route({
            '/search/repositories': { total_count: 1, items: [searchItem(1)] },
            '/repos/own1/repo1/languages': { Shell: 95, Go: 900, Makefile: 3, Dockerfile: 2 },
        })
        const { repos } = await fetchTopRepos('daily', undefined, { force: true })
        expect(repos[0].composition).toEqual([
            { name: 'Go', pct: 90, color: getLangColor('Go') },
            { name: 'Shell', pct: 9.5, color: getLangColor('Shell') },
            { name: 'Other', pct: 0.5, color: OTHER_COLOR },
        ])
    })

    it('9.7 fetchTopRepos shows no bar for a repo whose languages failed, and reports progress', async () => {
        route({
            '/search/repositories': { items: [searchItem(1), searchItem(2)] }, // no total_count
            '/repos/own1/repo1/languages': httpError(500),
            '/repos/own2/repo2/languages': { Go: 1 },
        })
        const onProgress = vi.fn()
        const { repos, totalCount } = await fetchTopRepos('monthly', onProgress, { force: true })
        expect(totalCount).toBe(0)
        expect(repos[0].composition).toEqual([])
        expect(repos[1].composition).toEqual([{ name: 'Go', pct: 100, color: getLangColor('Go') }])
        expect(onProgress.mock.calls).toEqual([[0, 2], [1, 2], [2, 2]])
        expect(gh.get.mock.calls[0][1].params.q).toBe('created:>2026-09-26 is:public')
    })

    it('9.8 fetchTopRepos falls back to weekly for an unknown timeframe and handles no items', async () => {
        route({ '/search/repositories': {} })
        const { repos } = await fetchTopRepos('yearly', undefined, { force: true })
        expect(repos).toEqual([])
        expect(gh.get.mock.calls[0][1].params.q).toBe('created:>2026-10-19 is:public')
    })

    it('9.9 fetchTopRepos caches for 10 minutes and refetches after that', async () => {
        route({ '/search/repositories': { items: [] } })
        await fetchTopRepos('daily', undefined, { force: true })
        await fetchTopRepos('daily') // cached
        expect(gh.get).toHaveBeenCalledTimes(1)
        vi.setSystemTime(new Date(NOW.getTime() + 10 * 60000 + 1))
        await fetchTopRepos('daily')
        expect(gh.get).toHaveBeenCalledTimes(2)
    })

    it('9.10 a failed load is not cached, so the next call tries again', async () => {
        route({ '/search/repositories': httpError(500) })
        await expect(fetchTopRepos('weekly', undefined, { force: true })).rejects.toThrow(
            'GitHub answered with an error (500). Try again in a moment.',
        )
        route({ '/search/repositories': { items: [] } })
        await expect(fetchTopRepos('weekly')).resolves.toEqual({ repos: [], totalCount: 0 })
    })

    it.each([
        ['no response (offline)', Object.assign(new Error('Network Error'), { response: undefined }), "Couldn't reach GitHub. Check your connection and try again."],
        ['401', httpError(401), 'Your GitHub sign-in has expired. Sign in again to load this list.'],
        ['422', httpError(422), "GitHub didn't accept the search. Check RULES in githubTrending.js."],
        ['403 not rate-limited', httpError(403, { 'x-ratelimit-remaining': '12' }), 'GitHub answered with an error (403). Try again in a moment.'],
        ['429 without reset', httpError(429), "GitHub's request limit has been reached. Try again in a few minutes."],
        ['403 rate-limited, 5 min', httpError(403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(NOW / 1000 + 300) }), "GitHub's request limit has been reached. Try again in about 5 minutes."],
        ['403 rate-limited, <1 min', httpError(403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(NOW / 1000 + 10) }), "GitHub's request limit has been reached. Try again in about 1 minute."],
    ])('9.11 turns a GitHub error (%s) into a readable message', async (_, error, message) => {
        route({ '/search/repositories': error })
        await expect(fetchTopRepos('daily', undefined, { force: true })).rejects.toThrow(message)
    })

    it('9.12 fetchTopDevelopers merges search, profiles and main language', async () => {
        route({
            '/search/users': { total_count: 99, items: [
                { id: 1, login: 'ada', avatar_url: 'av1', html_url: 'https://github.com/ada' },
                { id: 2, login: 'bob', avatar_url: 'av2', html_url: 'https://github.com/bob' },
            ] },
            '/users/ada': { name: 'Ada', bio: 'Math', company: 'AE', location: 'London', followers: 5000, public_repos: 12, created_at: '2010-01-01' },
            '/users/ada/repos': [
                { language: 'Rust', fork: false }, { language: 'Rust', fork: false }, { language: 'Go', fork: false },
                { language: 'Go', fork: true }, { language: 'Go', fork: true }, // forks ignored
            ],
            '/users/bob': {}, // empty profile
            '/users/bob/repos': [],
        })
        const onProgress = vi.fn()
        const { developers, totalCount, failed } = await fetchTopDevelopers(onProgress, { force: true })
        expect(totalCount).toBe(99)
        expect(failed).toEqual([])
        expect(developers[0]).toEqual({
            id: 1, rank: 1, login: 'ada', name: 'Ada', avatar: 'av1', htmlUrl: 'https://github.com/ada', bio: 'Math',
            company: 'AE', location: 'London', followers: 5000, publicRepos: 12, joined: '2010-01-01', language: 'Rust',
        })
        expect(developers[1]).toMatchObject({ name: '', bio: '', company: '', location: '', followers: null, publicRepos: null, joined: null, language: null })
        // 2 developers × 2 requests each, plus the starting 0
        expect(onProgress).toHaveBeenCalledTimes(5)
        expect(onProgress).toHaveBeenLastCalledWith(4, 4)
        const searchCall = gh.get.mock.calls.find(([p]) => p === '/search/users')
        expect(searchCall[1].params).toEqual({ q: 'type:user followers:>1000', sort: 'followers', order: 'desc', per_page: 20 })
        const reposCall = gh.get.mock.calls.find(([p]) => p === '/users/ada/repos')
        expect(reposCall[1].params).toEqual({ sort: 'pushed', per_page: 30, type: 'owner' })
    })

    it('9.13 fetchTopDevelopers keeps a developer whose profile failed and lists them in failed', async () => {
        route({
            '/search/users': { items: [{ id: 7, login: 'ghost', avatar_url: 'a', html_url: 'h' }] },
            '/users/ghost': httpError(500),
            '/users/ghost/repos': httpError(500),
        })
        const { developers, failed, totalCount } = await fetchTopDevelopers(undefined, { force: true })
        expect(totalCount).toBe(0)
        expect(failed).toEqual(['ghost'])
        expect(developers[0]).toMatchObject({ login: 'ghost', name: '', followers: null, language: null })
    })

    it('9.14 fetchTopDevelopers handles an empty search and uses its cache', async () => {
        route({ '/search/users': {} })
        expect(await fetchTopDevelopers(undefined, { force: true })).toEqual({ developers: [], totalCount: 0, failed: [] })
        await fetchTopDevelopers()
        expect(gh.get).toHaveBeenCalledTimes(1)
    })
})

// ============================================================================
// 10. format.js — number, date and period formatting
// ============================================================================
describe('10. trending/helpers/format.js', () => {
    it('10.1 num adds thousands separators and rounds', () => {
        expect(fmt.num(72371526)).toBe('72,371,526')
        expect(fmt.num(1234.6)).toBe('1,235')
        expect(fmt.num(0)).toBe('0')
        expect(fmt.num(null)).toBe('–')
        expect(fmt.num(undefined)).toBe('–')
    })

    it('10.2 compact shortens to K / M / B with at most one decimal', () => {
        expect(fmt.compact(72371526)).toBe('72.4M')
        expect(fmt.compact(5200)).toBe('5.2K')
        expect(fmt.compact(40000)).toBe('40K')
        expect(fmt.compact(2.5e9)).toBe('2.5B')
        expect(fmt.compact(999)).toBe('999')
        expect(fmt.compact(12.6)).toBe('13')
        expect(fmt.compact(-1500)).toBe('-1.5K')
        expect(fmt.compact(null)).toBe('–')
        expect(fmt.compact(undefined)).toBe('–')
    })

    it('10.3 pct signs a % change with + or a real minus', () => {
        expect(fmt.pct(5.3)).toBe('+5.3%')
        expect(fmt.pct(-2.1)).toBe('−2.1%')
        expect(fmt.pct(0)).toBe('0.0%')
        expect(fmt.pct(12.345)).toBe('+12.3%')
        expect(fmt.pct(null)).toBe('–')
        expect(fmt.pct(undefined)).toBe('–')
    })

    it('10.4 trendClass and trendArrow follow the sign', () => {
        expect([fmt.trendClass(3), fmt.trendClass(-3), fmt.trendClass(0)]).toEqual(['up', 'down', 'flat'])
        expect([fmt.trendArrow(3), fmt.trendArrow(-3), fmt.trendArrow(0)]).toEqual(['▲', '▼', '•'])
        expect(fmt.trendClass(null)).toBe('flat')
    })

    it('10.5 ordinal handles st/nd/rd/th and the 11–13 exceptions', () => {
        const cases = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 11: '11th', 12: '12th', 13: '13th', 21: '21st', 22: '22nd', 23: '23rd', 101: '101st', 111: '111th', 112: '112th' }
        for (const [n, text] of Object.entries(cases)) expect(fmt.ordinal(Number(n))).toBe(text)
    })

    it('10.6 shortDate and longDate format in UTC', () => {
        expect(fmt.shortDate('2026-10-12')).toBe('12 Oct')
        expect(fmt.longDate('2026-10-12')).toBe('12 Oct 2026')
        expect(fmt.shortDate('2026-01-01')).toBe('1 Jan')
    })

    it('10.7 itemLabel labels a day or a block', () => {
        expect(fmt.itemLabel({ date: '2026-10-12' })).toBe('12 Oct')
        expect(fmt.itemLabel({ start: '2026-10-06', end: '2026-10-12' })).toBe('6 Oct – 12 Oct')
    })

    it('10.8 dateRange shows the year once when both ends share it', () => {
        expect(fmt.dateRange('2026-07-13', '2026-10-13')).toBe('13 Jul – 13 Oct 2026')
        expect(fmt.dateRange('2025-12-20', '2026-01-10')).toBe('20 Dec 2025 – 10 Jan 2026')
        expect(fmt.dateRange('', '2026-01-10')).toBe('')
        expect(fmt.dateRange('2026-01-10', null)).toBe('')
    })

    it('10.9 PERIODS and PERIOD_INFO describe the three periods consistently', () => {
        expect(fmt.PERIODS).toEqual(['daily', 'weekly', 'monthly'])
        expect(fmt.PERIODS.map((p) => fmt.PERIOD_INFO[p].days)).toEqual([1, 7, 30])
        for (const p of fmt.PERIODS) {
            expect(Object.keys(fmt.PERIOD_INFO[p]).sort()).toEqual(['days', 'label', 'latest', 'previous', 'unit'])
        }
    })
})

// ============================================================================
// 11. compareMath.js — the "compare two packages" popup
// ============================================================================
describe('11. trending/math/compareMath.js', () => {
    // 2026-07-27 is a Monday, so blocks of 7 start on Mondays
    const START = '2026-07-27'
    const side = (over) => ({ name: 'x', size: 100, change: null, weekdayShare: null, ...over })

    it('11.1 alignDays keeps only the dates both packages have', () => {
        const a = makeDays('2026-10-01', 5, () => 1) // 1–5 Oct
        const b = makeDays('2026-10-03', 5, () => 2) // 3–7 Oct
        const { a: outA, b: outB } = cmp.alignDays(a, b)
        expect(outA.map((d) => d.date)).toEqual(['2026-10-03', '2026-10-04', '2026-10-05'])
        expect(outB.map((d) => d.date)).toEqual(['2026-10-03', '2026-10-04', '2026-10-05'])
        expect(outB[0].downloads).toBe(2)
        expect(cmp.alignDays([], b)).toEqual({ a: [], b: [] })
    })

    it('11.2 trend90 compares the last 28 days with the first 28', () => {
        const days = makeDays(START, 60, (i) => (i < 28 ? 100 : i >= 32 ? 125 : 0))
        expect(cmp.trend90(days)).toBe(25)
        expect(cmp.trend90(makeDays(START, 55, () => 1))).toBeNull() // fewer than 56 days
        expect(cmp.trend90(makeDays(START, 56, (i) => (i < 28 ? 0 : 5)))).toBeNull() // nothing to compare against
    })

    it('11.3 trendLabel turns a % into words around the ±5% threshold', () => {
        expect(cmp.trendLabel(null)).toBe('Not enough data')
        expect(cmp.trendLabel(5.1)).toBe('Growing')
        expect(cmp.trendLabel(5)).toBe('Steady')
        expect(cmp.trendLabel(-5)).toBe('Steady')
        expect(cmp.trendLabel(-5.1)).toBe('Declining')
    })

    it('11.4 weekdayShare returns the Monday–Friday share in UTC', () => {
        const week = makeDays(START, 7, (i) => (i < 5 ? 16 : 10)) // Mon–Fri 16 each, Sat+Sun 10 each
        expect(cmp.weekdayShare(week)).toBe(80) // 80 / 100
        expect(cmp.weekdayShare(makeDays(START, 7, () => 0))).toBeNull()
        expect(cmp.weekdayShare([])).toBeNull()
    })

    it('11.5 toGrowth indexes every point to the first one (= 100)', () => {
        const out = cmp.toGrowth([{ downloads: 200 }, { downloads: 250 }, { downloads: 199 }])
        expect(out.map((p) => p.index)).toEqual([100, 125, 99.5])
        expect(out[1].downloads).toBe(250) // original fields kept
        expect(cmp.toGrowth([{ downloads: 0 }, { downloads: 5 }]).map((p) => p.index)).toEqual([null, null])
        expect(cmp.toGrowth([])).toEqual([])
    })

    describe('11.6 verdictSentence', () => {
        it('11.6.1 says "about the same amount" under 1.2×', () => {
            expect(cmp.verdictSentence(side({ name: 'a', size: 110 }), side({ name: 'b', size: 100 })))
                .toBe('a and b are downloaded about the same amount.')
        })

        it('11.6.2 shows one decimal under 2× and whole numbers above', () => {
            expect(cmp.verdictSentence(side({ name: 'a', size: 100 }), side({ name: 'b', size: 147 })))
                .toBe('b is downloaded about 1.5× more than a.')
            expect(cmp.verdictSentence(side({ name: 'a', size: 604 }), side({ name: 'b', size: 100 })))
                .toBe('a is downloaded about 6× more than b.')
        })

        it('11.6.3 says "far" more when the other side has no downloads', () => {
            expect(cmp.verdictSentence(side({ name: 'a', size: 50 }), side({ name: 'b', size: 0 })))
                .toBe('a is downloaded about far more than b.')
            expect(cmp.verdictSentence(side({ name: 'a', size: null }), side({ name: 'b', size: 5 })))
                .toBe('b is downloaded about far more than a.')
        })

        it('11.6.4 describes similar paces (both growing / both shrinking / flat)', () => {
            const s = (a, b) => cmp.verdictSentence(side({ name: 'a', size: 100, change: a }), side({ name: 'b', size: 100, change: b }))
            expect(s(3, 3.5)).toBe('a and b are downloaded about the same amount, and both are growing at a similar pace.')
            expect(s(-3, -3.5)).toBe('a and b are downloaded about the same amount, and both are shrinking at a similar pace.')
            expect(s(0.3, -0.2)).toBe('a and b are downloaded about the same amount, and both are roughly flat.')
        })

        it('11.6.5 names who shrinks less or grows faster', () => {
            const s = (sa, ca, sb, cb) => cmp.verdictSentence(side({ name: 'a', size: sa, change: ca }), side({ name: 'b', size: sb, change: cb }))
            expect(s(300, -2, 100, -8)).toBe('a is downloaded about 3× more than b, but both are shrinking, a less so (−2.0% vs −8.0%).')
            expect(s(100, 2, 100, 9)).toBe('a and b are downloaded about the same amount, but b is growing faster (+9.0% vs +2.0%).')
            expect(s(300, 9, 100, 2)).toBe("a is downloaded about 3× more than b, and it's growing faster too (+9.0% vs +2.0%).")
            expect(s(300, 2, 100, 9)).toBe('a is downloaded about 3× more than b, but b is growing faster (+9.0% vs +2.0%).')
        })

        it('11.6.6 skips the pace part when a change is missing', () => {
            expect(cmp.verdictSentence(side({ name: 'a', change: 5 }), side({ name: 'b', change: null })))
                .toBe('a and b are downloaded about the same amount.')
        })

        it('11.6.7 adds the weekend note only when weekday shares differ by 10+ points', () => {
            const s = (wa, wb) => cmp.verdictSentence(side({ name: 'a', weekdayShare: wa }), side({ name: 'b', weekdayShare: wb }))
            expect(s(85, 70)).toBe('a and b are downloaded about the same amount. b gets more of its downloads at weekends, a sign of more hobby and side-project use.')
            expect(s(70, 80)).toContain(' a gets more of its downloads at weekends')
            expect(s(85, 76)).toBe('a and b are downloaded about the same amount.')
            expect(s(85, null)).toBe('a and b are downloaded about the same amount.')
        })
    })

    describe('11.7 buildComparison', () => {
        const js = { id: 'javascript', name: 'JavaScript' }
        const rust = { id: 'rust', name: 'Rust' }
        // 89 days (the standard window), A steady at 200/day, B growing 1/day from 100
        const pkgA = { name: 'react', language: js, displayRank: 1, rank: 4, daily: makeDays(START, 89, () => 200) }
        const pkgB = { name: 'vue', language: js, rank: 2, daily: makeDays(START, 92, (i) => 100 + i) } // 3 extra days at the end

        it('11.7.1 lines up dates and reports the shared range', () => {
            const out = cmp.buildComparison(pkgA, pkgB, 'weekly')
            expect(out.from).toBe(START)
            expect(out.to).toBe(tm.addDays(START, 88))
            expect(out.series.a).toHaveLength(12)
            expect(out.series.b).toHaveLength(12)
        })

        it('11.7.2 builds the six weekly rows with winners only where "more is better"', () => {
            const out = cmp.buildComparison(pkgA, pkgB, 'weekly')
            expect(out.rows.map((r) => r.key)).toEqual(['size', 'change', 'averagePerDay', 'trend', 'weekdayShare', 'rank'])
            const row = Object.fromEntries(out.rows.map((r) => [r.key, r]))
            expect(row.size).toMatchObject({ label: 'Downloads, last 7 days', a: 1400, win: 'a' })
            expect(row.size.b).toBe(7 * 185) // days 82–88 → 182..188
            expect(row.change).toMatchObject({ label: 'Change vs previous week', a: 0, win: 'b' })
            expect(row.averagePerDay).toMatchObject({ a: 200, b: 185, win: 'a' })
            expect(row.trend).toMatchObject({ a: 0, aLabel: 'Steady', bLabel: 'Growing', win: 'b' })
            expect(row.weekdayShare.win).toBeNull()
            expect(row.rank).toEqual({ key: 'rank', label: 'Rank in its language', a: 1, b: 2, win: null }) // displayRank wins over rank
        })

        it('11.7.3 adds no notes for a weekly same-language comparison', () => {
            expect(cmp.buildComparison(pkgA, pkgB, 'weekly').notes).toEqual([])
        })

        it('11.7.4 daily view uses day rows, both notes, and growth series', () => {
            const out = cmp.buildComparison(pkgA, { ...pkgB, language: rust }, 'daily')
            expect(out.rows[0].label).toBe('Downloads, latest day')
            expect(out.rows[1].label).toBe('Change vs same day last week')
            expect(out.rows[0]).toMatchObject({ a: 200, b: 188 })
            expect(out.notes).toHaveLength(2)
            expect(out.notes[0]).toMatch(/^Daily numbers swing/)
            expect(out.notes[1]).toMatch(/^Each registry counts downloads differently/)
            expect(out.series.a).toHaveLength(89)
            expect(out.series.growthA.every((p) => p.index === 100)).toBe(true)
            expect(out.series.growthB[0].index).toBe(100)
        })

        it('11.7.5 monthly view uses 30-day blocks and labels', () => {
            const out = cmp.buildComparison(pkgA, pkgB, 'monthly')
            expect(out.rows[0]).toMatchObject({ label: 'Downloads, last 30 days', a: 6000 })
            expect(out.rows[1].label).toBe('Change vs previous 30 days')
            expect(out.series.a).toHaveLength(2)
            expect(typeof out.verdict).toBe('string')
        })

        it('11.7.6 handles packages with no overlapping days or language and ties', () => {
            const empty = { name: 'e', language: null, daily: [] }
            const out = cmp.buildComparison(empty, { ...empty, name: 'f', rank: undefined }, 'weekly')
            expect(out.from).toBeNull()
            expect(out.to).toBeNull()
            expect(out.rows.every((r) => r.win === null)).toBe(true) // all values null → no winner
            expect(out.sides[0]).toMatchObject({ size: null, averagePerDay: null, rank: null, trendLabel: 'Not enough data' })
            expect(out.notes).toHaveLength(1) // different/unknown language note
            // Current behaviour: with no data on either side the verdict still says "far more".
            // Worth a guard in verdictSentence if this case can reach the UI.
            expect(out.verdict).toBe("There isn't enough data yet to compare e and f.")
        })
    })
})

// ============================================================================
// 12. trendMath.js — daily cleaning, blocks and % change
// ============================================================================
describe('12. trending/math/trendMath.js', () => {
    it('12.1 WINDOW_DAYS / DAILY_COMPARE_BACK / FILL_MISSING_DAYS settings', () => {
        expect(tm.WINDOW_DAYS).toBe(89)
        expect(tm.DAILY_COMPARE_BACK).toBe(7)
        expect(tm.FILL_MISSING_DAYS).toBe(true)
    })

    it('12.2 keepLatestDays keeps the newest N days', () => {
        const days = makeDays('2026-01-01', 100, (i) => i)
        expect(tm.keepLatestDays(days)).toHaveLength(89)
        expect(tm.keepLatestDays(days)[0].downloads).toBe(11)
        expect(tm.keepLatestDays(days, 3).map((d) => d.downloads)).toEqual([97, 98, 99])
        expect(tm.keepLatestDays(days.slice(0, 2), 10)).toHaveLength(2)
    })

    it('12.3 addDays crosses month, year and leap-day boundaries', () => {
        expect(tm.addDays('2026-09-30', 1)).toBe('2026-10-01')
        expect(tm.addDays('2026-12-31', 1)).toBe('2027-01-01')
        expect(tm.addDays('2028-02-28', 1)).toBe('2028-02-29')
        expect(tm.addDays('2026-03-01', -1)).toBe('2026-02-28')
        expect(tm.addDays('2026-10-12', 0)).toBe('2026-10-12')
    })

    it('12.4 todayUTC and dropUnfinishedDays use the UTC date', () => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date('2026-10-15T23:30:00-05:00')) // already 16 Oct in UTC
        expect(tm.todayUTC()).toBe('2026-10-16')
        const days = makeDays('2026-10-14', 4, () => 1) // 14..17
        expect(tm.dropUnfinishedDays(days).map((d) => d.date)).toEqual(['2026-10-14', '2026-10-15'])
    })

    it('12.5 trimTrailingZeros only removes zeros at the end', () => {
        const d = (n) => ({ date: 'x', downloads: n })
        expect(tm.trimTrailingZeros([d(5), d(0), d(3), d(0), d(0)]).map((x) => x.downloads)).toEqual([5, 0, 3])
        expect(tm.trimTrailingZeros([d(0), d(0)])).toEqual([])
        expect(tm.trimTrailingZeros([])).toEqual([])
    })

    it('12.6 fillMissingDays estimates a 0 from the same weekday ±1/±2 weeks', () => {
        const days = makeDays('2026-09-01', 29, (i) => (i === 14 ? 0 : 1000 + i))
        const filled = tm.fillMissingDays(days)
        // neighbours: day 7 (1007), 21 (1021), 0 (1000), 28 (1028) → average 1014
        expect(filled[14]).toEqual({ date: days[14].date, downloads: 1014, estimated: true })
        expect(filled[13]).toBe(days[13]) // untouched days are the same objects
        expect(days[14].downloads).toBe(0) // the input is not mutated
    })

    it('12.7 fillMissingDays uses only neighbours that exist and are non-zero', () => {
        const days = makeDays('2026-09-01', 10, (i) => (i === 0 ? 0 : 500))
        expect(tm.fillMissingDays(days)[0]).toMatchObject({ downloads: 500, estimated: true }) // only day 7
        const lonely = makeDays('2026-09-01', 5, (i) => (i === 2 ? 0 : 500)) // no day ±7 exists
        expect(tm.fillMissingDays(lonely)[2]).toEqual(lonely[2])
    })

    it('12.8 fillMissingDays leaves tiny or empty packages alone', () => {
        const tiny = makeDays('2026-09-01', 15, (i) => (i === 7 ? 0 : 50)) // typical day < 100
        expect(tm.fillMissingDays(tiny)).toBe(tiny)
        const allZero = makeDays('2026-09-01', 5, () => 0)
        expect(tm.fillMissingDays(allZero)).toBe(allZero)
    })

    it('12.9 groupIntoBlocks counts back from the newest day and drops leftovers', () => {
        const days = makeDays('2026-10-01', 16, (i) => i + 1) // 1..16
        const blocks = tm.groupIntoBlocks(days, 7)
        expect(blocks).toEqual([
            { start: '2026-10-03', end: '2026-10-09', downloads: 3 + 4 + 5 + 6 + 7 + 8 + 9 },
            { start: '2026-10-10', end: '2026-10-16', downloads: 10 + 11 + 12 + 13 + 14 + 15 + 16 },
        ])
        expect(tm.groupIntoBlocks(days.slice(0, 6), 7)).toEqual([])
    })

    it('12.10 groupIntoBlocks counts estimated days in a block', () => {
        const days = makeDays('2026-10-01', 7, () => 1)
        days[2].estimated = true
        days[4].estimated = true
        expect(tm.groupIntoBlocks(days, 7)[0].estimatedDays).toBe(2)
    })

    it('12.11 percentChange compares the latest entry with one `back` entries before', () => {
        const list = [100, 110, 0, 120, 150].map((downloads) => ({ downloads }))
        expect(tm.percentChange(list)).toBe(25) // 150 vs 120
        expect(tm.percentChange(list, 4)).toBe(50) // 150 vs 100
        expect(tm.percentChange(list, 2)).toBeNull() // previous is 0
        expect(tm.percentChange(list, 5)).toBeNull() // not enough entries
        expect(tm.percentChange([{ downloads: 3 }, { downloads: 1 }])).toBe(-66.7) // rounded to 1 dp
        expect(tm.percentChange([])).toBeNull()
    })

    it('12.12 buildStats returns the same card shape for every registry', () => {
        const days = makeDays('2026-07-27', 89, (i) => (i < 59 ? 100 : 200))
        const card = tm.buildStats({ name: 'pkg', registry: 'npm' }, days)
        expect(card.name).toBe('pkg')
        expect(card.daily).toBe(days)
        expect(card.weekly).toHaveLength(12)
        expect(card.monthly).toHaveLength(2)
        expect(card.latest).toEqual({ daily: 200, weekly: 1400, monthly: 6000 })
        expect(card.changePercent).toEqual({ daily: 0, weekly: 0, monthly: 100 })
    })

    it('12.13 buildStats handles an empty history', () => {
        const card = tm.buildStats({ name: 'new' }, [])
        expect(card.latest).toEqual({ daily: null, weekly: null, monthly: null })
        expect(card.changePercent).toEqual({ daily: null, weekly: null, monthly: null })
    })

    it('12.14 alignEndDates cuts every list to the earliest last day', () => {
        const a = makeDays('2026-10-01', 12, () => 1) // ends 12 Oct
        const b = makeDays('2026-10-01', 11, () => 1) // ends 11 Oct
        const { dataUpTo, lists } = tm.alignEndDates([a, b, []])
        expect(dataUpTo).toBe('2026-10-11')
        expect(lists.map((l) => l.length)).toEqual([11, 11, 0])
        expect(tm.alignEndDates([]).dataUpTo).toBeUndefined()
    })
})
