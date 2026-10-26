// src/utils/hackernewsJobs.js

const MIN_SALARY_BANDS = 10 // a role needs this many bands before its range is shown
const DEMAND_MONTHS = 3 // role demand + posts per month use the latest 3 complete months
const SALARY_MONTHS = 6 // salary bands use the latest 6
const MIN_PLOT_BANDS = 5 // below this a role's bands are not shown at all (1-4 bands is one or two companies)
const MIN_ROLE_POSTS = 20 // below this work mode / tech are flagged as a low sample
const MIN_TREND_MONTHS = 3 // months that must load before a trend is shown
const TOP_N = 5 // how many technologies are listed per role
const CACHE_KEY = 'jobs-view-v4' // bump when the regex/parsing logic changes
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours


// ---------- HN fetching + text cleaning ----------
const API = 'https://hn.algolia.com/api/v1'

export const ROLES = {
    'Software Engineer': /\b(software|full[ -]?stack|back[ -]?end|front[ -]?end|product|mobile|ios|android|web|founding)\s+(engineer|developer)s?\b|\bmember of technical staff\b|\bswe\b/i,
    'AI / ML Engineer': /\b(ai|ml|machine[ -]learning|applied[ -]ai|llm|deep[ -]learning|computer[ -]vision|nlp|agentic)\s+(engineer|researcher|scientist)s?\b|\bresearch\s+(engineer|scientist)s?\b/i,
    'Forward Deployed Engineer': /\bforward[ -]deployed\b/i,
    'Data': /\bdata\s+(engineer|scientist|analyst)s?\b|\banalytics\s+engineer/i,
    'Infra / DevOps / SRE': /\b(devops|devsecops|sre|site[ -]reliability|platform|infrastructure|infra|cloud|mlops)\s+engineers?\b/i,
    'Security': /\b(security|appsec|application[ -]security|product[ -]security)\s+engineers?\b|\bsecurity\s+(researcher|architect)/i,
    'Embedded / Hardware / Robotics': /\b(embedded|firmware|hardware|robotics|mechanical|electrical)\s+engineers?\b/i,
    'Product Manager': /\b(product|program)\s+managers?\b/i,
    'Designer': /\b(product|ux|ui|brand|visual)\s+designers?\b/i,
    'Engineering Manager': /\b(engineering\s+managers?|head\s+of\s+engineering|(director|vp)\s+of\s+engineering)\b/i,
}

const TECH = {
    Python: /\bpython\b/i,
    TypeScript: /\btypescript\b/i,
    JavaScript: /\bjavascript\b/i,
    React: /\breact\b/i,
    'Node.js': /\bnode\.?js\b/i,
    Java: /\bjava\b/i,
    Go: /\bGo(lang)?\b/, // case-sensitive so the word "go" is ignored
    Rust: /\brust\b/i,
    'C++': /c\+\+/i,
    Swift: /\bSwift\b/,
    Kotlin: /\bkotlin\b/i,
    Ruby: /\bRuby\b/,
    SQL: /\bsql\b/i,
    PostgreSQL: /\bpostgres(ql)?\b/i,
    AWS: /\baws\b/i,
    Kubernetes: /\bkubernetes\b|\bk8s\b/i,
    Terraform: /\bterraform\b/i,
    PyTorch: /\bpytorch\b/i,
}
const NO_TECH_ROLES = ['Product Manager', 'Designer', 'Engineering Manager'] // a tech card says nothing for these

const DOLLAR_PREFIX = {
    US: 'USD', USD: 'USD', C: 'CAD', CA: 'CAD', CAD: 'CAD',
    A: 'AUD', AU: 'AUD', AUD: 'AUD', NZ: 'NZD', NZD: 'NZD',
    S: 'SGD', SG: 'SGD', SGD: 'SGD', HK: 'HKD', HKD: 'HKD',
}

const getJSON = async (url) => {
    const r = await fetch(url)
    if (!r.ok) throw new Error(`${r.status} ${url}`)
    return r.json()
}

// Latest complete "Who is hiring?" threads
async function latestThreads(months) {
    const { hits } = await getJSON(
        `${API}/search_by_date?tags=story,author_whoishiring&hitsPerPage=40`,
    )
    return hits.filter((h) => h.title.startsWith('Ask HN: Who is hiring?')).slice(1, 1 + months)
}

const monthOf = (thread) => thread.title.slice(24, -1)

const toText = (html) =>
    html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')

const isSeeker = (t) => /willing to relocate\s*:|r[ée]sum[ée]\s*\/\s*cv\s*:/i.test(t)
const isDeadPost = (t) => /^\s*\[(flagged|dead)\]\s*$/i.test(t)
const isJobPost = (t) => !isSeeker(t) && !isDeadPost(t)
const rolesIn = (t) => Object.keys(ROLES).filter((r) => ROLES[r].test(t))
const techIn = (t) => Object.keys(TECH).filter((n) => TECH[n].test(t))

const modeIn = (t) => {
    const remote = /\bremote\b/i.test(t) && !/\b(no|not|non)[- ]remote\b/i.test(t)
    const onsite = /\bon-?site\b|\bin[- ]office\b|\bin[- ]person\b/i.test(t)
    if (/\bhybrid\b/i.test(t)) return 'hybrid'
    if (remote && onsite) return 'mixed'
    return remote ? 'remote' : onsite ? 'onsite' : null
}


// ---------- Salary parsing ----------
const CUR = String.raw`(\$|€|£|USD|EUR|GBP|CAD|CHF)`
const NUM = String.raw`(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*([kK])?`
const RANGE = new RegExp(
    String.raw`${CUR}?\s*${NUM}\s*(?:-|–|—|to)\s*${CUR}?\s*${NUM}\s*${CUR}?`,
    'g',
)
const toNum = (s, k) => parseFloat(s.replace(/,/g, '')) * (k ? 1000 : 1)

function dollarCurrency(seg, idx, suffix) {
    const p = seg.slice(Math.max(0, idx - 4), idx).match(/(?:^|[^A-Za-z])([A-Za-z]{1,3})$/)
    return (p && DOLLAR_PREFIX[p[1].toUpperCase()]) || (suffix === 'CAD' ? 'CAD' : 'USD')
}

function findSalaries(seg) {
    const out = []
    for (const m of seg.matchAll(RANGE)) {
        const cur = m[1] || m[4] || m[7]
        if (!cur) continue
        const currency =
            cur === '$'
                ? m[1] === '$'
                    ? dollarCurrency(seg, m.index, m[7])
                    : m[7] === 'CAD'
                        ? 'CAD'
                        : 'USD'
                : { '€': 'EUR', '£': 'GBP' }[cur] || cur
        let lo = toNum(m[2], m[3])
        let hi = toNum(m[5], m[6])
        if (!m[3] && m[6] && lo < 1000) lo *= 1000
        if (lo > hi) [lo, hi] = [hi, lo]
        if (lo < 20000 || hi > 1000000) continue
        out.push({ currency, lo, hi })
    }
    return out
}

const median = (a) => {
    const s = [...a].sort((x, y) => x - y)
    const m = s.length >> 1
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// ---------- Analyse Thread ----------
function analyseThread(item) {
    const roleCounts = {}
    const detail = {} // per role: usable-salary posts, work-mode counts, tech counts
    const bands = []
    let posts = 0
    for (const c of item.children) {
        if (!c.text) continue
        const full = toText(c.text)
        if (!isJobPost(full)) continue
        posts++
        const postRoles = rolesIn(full)
        for (const r of postRoles) roleCounts[r] = (roleCounts[r] ?? 0) + 1
        // header line (before the first paragraph) is the most reliable place for work mode
        const mode = modeIn(toText(c.text.split(/<p>/i)[0])) ?? modeIn(full) ?? 'unspecified'
        const techs = techIn(full)
        for (const r of postRoles) {
            const d = (detail[r] ??= { techPosts: 0, modes: {}, tech: {} })
            d.modes[mode] = (d.modes[mode] ?? 0) + 1
            if (techs.length) d.techPosts++
            for (const t of techs) d.tech[t] = (d.tech[t] ?? 0) + 1
        }
        const segs = c.text.split(/<p>|<br\s*\/?>|\n/i).map(toText)
        const postBands = segs.flatMap(findSalaries).length
        for (const seg of segs) {
            const sals = findSalaries(seg)
            if (!sals.length) continue
            const segRoles = rolesIn(seg)
            const targets = segRoles.length
                ? segRoles
                : postRoles.length === 1 && postBands === 1
                    ? postRoles
                    : ['(Role unclear)']
            for (const s of sals) {
                if (s.currency !== 'USD') continue
                for (const role of targets) {
                    bands.push({ author: c.author, role, lo: s.lo, hi: s.hi })
                }
            }
        }
    }
    return { posts, roleCounts, detail, bands }
}

const roleLabel = (r) => r.replace(/ \/ /g, '/')
const shortMonth = (m) => `${m.slice(0, 3)} ${m.slice(-4)}`

// ---------- Role detail (shown when a role is selected) ----------
// Every block carries a status: 'ok' (render), 'thin' (render with a low-sample badge), 'none' (render `reason`).
const k = (v) => Math.round(v / 1000)
const pct = (n, total) => Math.round((100 * n) / total)
const volume = (posts) => (posts >= MIN_ROLE_POSTS ? 'ok' : 'thin')

const quantile = (a, q) => {
    const s = [...a].sort((x, y) => x - y)
    const i = (s.length - 1) * q
    const lo = Math.floor(i)
    return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo)
}

// most common $10k bucket (lower edge, in $k); ties go to the lower bucket
function modeBin(a) {
    const c = {}
    for (const v of a) {
        const b = Math.floor(v / 10000) * 10
        c[b] = (c[b] ?? 0) + 1
    }
    return +Object.keys(c).sort((x, y) => c[y] - c[x] || x - y)[0]
}

const sumCounts = (list) =>
    list.reduce((acc, o) => {
        for (const [key, v] of Object.entries(o)) acc[key] = (acc[key] ?? 0) + v
        return acc
    }, {})

function salaryDetail(bands) {
    const n = bands.length
    if (n < MIN_PLOT_BANDS) return { status: 'none', reason: n ? 'too-few' : 'no-bands', n }
    const out = { status: 'thin', n, bands: bands.map((b) => ({ lo: k(b.lo), hi: k(b.hi) })) }
    if (n < MIN_SALARY_BANDS) return out

    const mids = bands.map((b) => (b.lo + b.hi) / 2)
    return {
        ...out,
        status: 'ok',
        stats: {
            medianLo: k(median(bands.map((b) => b.lo))),
            medianHi: k(median(bands.map((b) => b.hi))),
            mean: k(mids.reduce((t, v) => t + v, 0) / n),
            p25: k(quantile(mids, 0.25)),
            p75: k(quantile(mids, 0.75)),
            min: k(Math.min(...bands.map((b) => b.lo))),
            max: k(Math.max(...bands.map((b) => b.hi))),
            mode: modeBin(mids),
        },
    }
}

// two-proportion check: only call a move "up"/"down" when it clears ~2 standard errors
function trendChange(a, b) {
    const p = (a.count + b.count) / (a.posts + b.posts)
    const se = Math.sqrt(p * (1 - p) * (1 / a.posts + 1 / b.posts))
    const d = b.count / b.posts - a.count / a.posts
    return a.count < 5 || b.count < 5 || Math.abs(d) < 2 * se ? 'steady' : d > 0 ? 'up' : 'down'
}

function roleDetail(role, summaries, months, bands) {
    const valid = summaries.filter(Boolean)
    const parts = valid.map((s) => s.detail[role] ?? {})
    const posts = valid.reduce((t, s) => t + (s.roleCounts[role] ?? 0), 0)
    const techPosts = parts.reduce((t, p) => t + (p.techPosts ?? 0), 0)

    // a failed month stays in place as a gap, never a 0
    const points = summaries
        .map((s, i) => {
            const month = shortMonth(months[i])
            if (!s) return { month, missing: true }
            const count = s.roleCounts[role] ?? 0
            return { month, share: pct(count, s.posts), count, posts: s.posts }
        })
        .reverse()
    const seen = points.filter((p) => !p.missing)

    return {
        posts,
        salary: salaryDetail(bands),
        trend:
            valid.length < MIN_TREND_MONTHS
                ? { status: 'none', reason: 'no-history' }
                : { status: 'ok', change: trendChange(seen[0], seen.at(-1)), points },
        workMode: { status: volume(posts), posts, counts: sumCounts(parts.map((p) => p.modes ?? {})) },
        tech: NO_TECH_ROLES.includes(role)
            ? { status: 'none', reason: 'not-applicable' }
            : {
                status: volume(posts),
                coverage: pct(techPosts, posts),
                top: Object.entries(sumCounts(parts.map((p) => p.tech ?? {})))
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, TOP_N)
                    .map(([name, count]) => ({ name, count, share: pct(count, posts) })),
            },
    }
}

function buildResults(summaries, months) {
    const demand = summaries.slice(0, DEMAND_MONTHS).filter(Boolean)
    const total = demand.reduce((sum, s) => sum + s.posts, 0)

    const roleRows = Object.keys(ROLES)
        .map((r) => {
            const count = demand.reduce((sum, s) => sum + (s.roleCounts[r] ?? 0), 0)
            return { name: roleLabel(r), count, share: total ? Math.round((100 * count) / total) : 0 }
        })
        .filter((r) => r.share > 0)
        .sort((a, b) => b.share - a.share)

    const seen = new Set()
    const byRole = {}
    for (const s of summaries.filter(Boolean)) {
        for (const b of s.bands) {
            const key = `${b.author}|${b.role}|${b.lo}|${b.hi}`
            if (seen.has(key)) continue
            seen.add(key)
                ; (byRole[b.role] ??= []).push(b)
        }
    }
    // deduped USD bands that could be tied to a role
    const salaryBands = Object.entries(byRole)
        .filter(([role]) => role !== '(Role unclear)')
        .reduce((sum, [, b]) => sum + b.length, 0)

    const rolesDetail = Object.fromEntries(
        Object.keys(ROLES)
            .filter((r) => roleRows.some((x) => x.name === roleLabel(r)))
            .map((r) => [roleLabel(r), roleDetail(r, summaries, months, byRole[r] ?? [])]),
    )

    return {
        postsAnalysed: total,
        roles: roleRows,
        salaryBands,
        rolesDetail,
        postsPerMonth: demand.map((s) => ({ month: shortMonth(s.month), count: s.posts })).reverse(),
    }
}

function readCache() {
    try {
        const c = JSON.parse(localStorage.getItem(CACHE_KEY))
        return c && Date.now() - c.savedAt < CACHE_TTL_MS ? c.data : null
    } catch {
        return null
    }
}

function writeCache(data) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }))
    } catch {
        // storage full or blocked: skip caching, the data still renders
    }
}

// onProgress(done, total) fires once for the thread list and once per thread, for the loader
export async function fetchHNJobsData(onProgress) {
    const cached = readCache()
    if (cached) {
        return { data: cached, warning: '' }
    }

    const threads = await latestThreads(SALARY_MONTHS)
    if (!threads.length) throw new Error('no hiring threads found')

    const total = threads.length + 1
    let done = 1
    onProgress?.(done, total)

    const settled = await Promise.allSettled(
        threads.map(async (t) => {
            const summary = { month: monthOf(t), ...analyseThread(await getJSON(`${API}/items/${t.objectID}`)) }
            onProgress?.(++done, total)
            return summary
        }),
    )

    const summaries = settled.map((s) => (s.status === 'fulfilled' ? s.value : null))
    if (!summaries.some(Boolean)) throw new Error('every thread failed to load')

    const data = buildResults(summaries, threads.map(monthOf))
    const failed = threads.filter((_, i) => !summaries[i]).map(monthOf)
    let warning = ''

    if (failed.length) {
        warning = `Could not load ${failed.join(', ')}. The figures below leave ${failed.length > 1 ? 'those months' : 'that month'} out.`
    } else {
        writeCache(data)
    }

    return { data, warning }
}
