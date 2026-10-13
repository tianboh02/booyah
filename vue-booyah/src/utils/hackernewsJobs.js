// src/utils/hnJobs.js

export const MIN_SALARY_BANDS = 10 // a role needs this many bands before its range is shown
export const DEMAND_MONTHS = 3 // role demand + posts per month use the latest 3 complete months
export const SALARY_MONTHS = 6 // salary bands use the latest 6
export const CACHE_KEY = 'jobs-view-v1' // bump when the regex/parsing logic changes
export const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours


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
const isDeadPost = (t) => /^\s*\[(flagged\vert{}dead)\]\s*$/i.test(t)
const isJobPost = (t) => !isSeeker(t) && !isDeadPost(t)
const rolesIn = (t) => Object.keys(ROLES).filter((r) => ROLES[r].test(t))


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
    const bands = []
    let posts = 0
    for (const c of item.children) {
        if (!c.text) continue
        const full = toText(c.text)
        if (!isJobPost(full)) continue
        posts++
        const postRoles = rolesIn(full)
        for (const r of postRoles) roleCounts[r] = (roleCounts[r] ?? 0) + 1
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
                for (const role of targets) bands.push({ author: c.author, role, lo: s.lo, hi: s.hi })
            }
        }
    }
    return { posts, roleCounts, bands }
}

const roleLabel = (r) => r.replace(/ \/ /g, '/')
const shortMonth = (m) => `${m.slice(0, 3)} ${m.slice(-4)}`

function buildResults(summaries) {
    const demand = summaries.slice(0, DEMAND_MONTHS).filter(Boolean)
    const total = demand.reduce((sum, s) => sum + s.posts, 0)

    const roleRows = Object.keys(ROLES)
        .map((r) => {
            const count = demand.reduce((sum, s) => sum + (s.roleCounts[r] ?? 0), 0)
            return { name: roleLabel(r), share: total ? Math.round((100 * count) / total) : 0 }
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
    const salaryList = Object.entries(byRole)
        .filter(([role]) => role !== '(Role unclear)')
        .map(([role, b]) => {
            const enough = b.length >= MIN_SALARY_BANDS
            return {
                role: roleLabel(role),
                low: enough ? Math.round(median(b.map((x) => x.lo)) / 1000) : null,
                high: enough ? Math.round(median(b.map((x) => x.hi)) / 1000) : null,
                n: b.length,
            }
        })
        .sort((a, b) => (b.high ?? -1) - (a.high ?? -1) || b.n - a.n)

    return {
        postsAnalysed: total,
        roles: roleRows,
        salaries: salaryList,
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
    } catch { }
}

export async function fetchHNJobsData() {
    const cached = readCache()
    if (cached) {
        return { data: cached, warning: '' }
    }

    const threads = await latestThreads(SALARY_MONTHS)
    if (!threads.length) throw new Error('no hiring threads found')

    const settled = await Promise.allSettled(
        threads.map(async (t) => ({
            month: monthOf(t),
            ...analyseThread(await getJSON(`${API}/items/${t.objectID}`)),
        })),
    )

    const summaries = settled.map((s) => (s.status === 'fulfilled' ? s.value : null))
    if (!summaries.some(Boolean)) throw new Error('every thread failed to load')

    const data = buildResults(summaries)
    const failed = threads.filter((_, i) => !summaries[i]).map(monthOf)
    let warning = ''

    if (failed.length) {
        warning = `Could not load ${failed.join(', ')}. The figures below leave ${failed.length > 1 ? 'those months' : 'that month'} out.`
    } else {
        writeCache(data)
    }

    return { data, warning }
}