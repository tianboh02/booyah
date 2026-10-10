<script setup>
import { computed, onMounted, ref } from 'vue'

// Data comes live from the HN Algolia API on page load
const loading = ref(true)
const error = ref('')
const warning = ref('')

// Job posts analysed
const postsAnalysed = ref(0)
// Types of roles: share of job posts mentioning each role (%)
const roles = ref([])
// Salary: median posted band per role in USD $k per year, n = number of salary bands
const salaries = ref([])
// Posts per month, oldest first
const postsPerMonth = ref([])

const MIN_SALARY_BANDS = 10 // a role needs this many bands before its range is shown
const DEMAND_MONTHS = 3 // role demand + posts per month use the latest 3 complete months
const SALARY_MONTHS = 6 // salary bands use the latest 6
const CACHE_KEY = 'jobs-view-v1' // bump when the regex/parsing logic changes
const CACHE_TTL_MS = 6 * 60 * 60 * 1000

// ---------- HN fetching + text cleaning ----------
const API = 'https://hn.algolia.com/api/v1'
// regex implemented here - X factor
const ROLES = {
    'Software Engineer':
        /\b(software|full[- ]?stack|back[- ]?end|front[- ]?end|product|mobile|ios|android|web|founding)\s+(engineer|developer)s?\b|\bmember of technical staff\b|\bswe\b/i,
    'AI / ML Engineer':
        /\b(ai|ml|machine[- ]learning|applied[- ]ai|llm|deep[- ]learning|computer[- ]vision|nlp|agentic)\s+(engineer|researcher|scientist)s?\b|\bresearch\s+(engineer|scientist)s?\b/i,
    'Forward Deployed Engineer': /\bforward[- ]deployed\b/i,
    Data: /\bdata\s+(engineer|scientist|analyst)s?\b|\banalytics\s+engineer/i,
    'Infra / DevOps / SRE':
        /\b(devops|devsecops|sre|site[- ]reliability|platform|infrastructure|infra|cloud|mlops)\s+engineers?\b/i,
    Security:
        /\b(security|appsec|application[- ]security|product[- ]security)\s+engineers?\b|\bsecurity\s+(researcher|architect)/i,
    'Embedded / Hardware / Robotics':
        /\b(embedded|firmware|hardware|robotics|mechanical|electrical)\s+engineers?\b/i,
    'Product Manager': /\b(product|program)\s+managers?\b/i,
    Designer: /\b(product|ux|ui|brand|visual)\s+designers?\b/i,
    // Explicit management titles only ("tech lead" removed)
    'Engineering Manager':
        /\b(engineering\s+managers?|head\s+of\s+engineering|(director|vp)\s+of\s+engineering)\b/i,
}

const getJSON = async (url) => {
    const r = await fetch(url)
    if (!r.ok) throw new Error(`${r.status} ${url}`)
    return r.json()
}

// Latest complete "Who is hiring?" threads (skips index 0, the current month, still live)
async function latestThreads(months) {
    const { hits } = await getJSON(
        `${API}/search_by_date?tags=story,author_whoishiring&hitsPerPage=40`,
    )
    return hits.filter((h) => h.title.startsWith('Ask HN: Who is hiring?')).slice(1, 1 + months)
}
const monthOf = (thread) => thread.title.slice(24, -1) // "September 2026"

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
// Moderated comments come back as the literal text "[flagged]" / "[dead]"; they are not job posts
const isDeadPost = (t) => /^\s*\[(flagged|dead)\]\s*$/i.test(t)
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

// "AU$120k", "C$", "CA$", "S$" ...: the letters in front of a "$" say which dollar it is
const DOLLAR_PREFIX = {
    US: 'USD',
    USD: 'USD',
    C: 'CAD',
    CA: 'CAD',
    CAD: 'CAD',
    A: 'AUD',
    AU: 'AUD',
    AUD: 'AUD',
    NZ: 'NZD',
    NZD: 'NZD',
    S: 'SGD',
    SG: 'SGD',
    SGD: 'SGD',
    HK: 'HKD',
    HKD: 'HKD',
}
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
        // Annual pay only: hourly rates ("$50-80/hr") fall below 20k and are dropped here
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

// ---------- One thread -> small summary (raw comments are discarded straight away) ----------
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
        // Split on paragraphs, line breaks and newlines so each listed role is its own segment
        const segs = c.text.split(/<p>|<br\s*\/?>|\n/i).map(toText)
        const postBands = segs.flatMap(findSalaries).length
        for (const seg of segs) {
            const sals = findSalaries(seg)
            if (!sals.length) continue
            const segRoles = rolesIn(seg)
            // Fall back to the post's single role only when pay sits in the header line
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

// ---------- Summaries (newest month first, null = failed to load) -> the four refs ----------
const roleLabel = (r) => r.replace(/ \/ /g, '/') // "AI / ML Engineer" -> "AI/ML Engineer"
const shortMonth = (m) => `${m.slice(0, 3)} ${m.slice(-4)}` // "September 2026" -> "Sep 2026"

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

    // Same poster + role + band is counted once across all months
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
        // oldest first
        postsPerMonth: demand.map((s) => ({ month: shortMonth(s.month), count: s.posts })).reverse(),
    }
}

function apply(data) {
    postsAnalysed.value = data.postsAnalysed
    roles.value = data.roles
    salaries.value = data.salaries
    postsPerMonth.value = data.postsPerMonth
}

// ---------- Cache the finished numbers (a few KB) so reloads don't re-download ~3 MB ----------
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
        /* storage unavailable: fine, just refetch next time */
    }
}

async function load() {
    loading.value = true
    error.value = ''
    warning.value = ''
    try {
        const cached = readCache()
        if (cached) {
            apply(cached)
            return
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
        apply(data)
        const failed = threads.filter((_, i) => !summaries[i]).map(monthOf)
        settled.forEach((s, i) => {
            if (s.status === 'rejected')
                console.warn(`JobsView: ${monthOf(threads[i])} failed to load`, s.reason)
        })
        if (failed.length) {
            warning.value = `Could not load ${failed.join(', ')}. The figures below leave ${failed.length > 1 ? 'those months' : 'that month'} out.`
        } else {
            writeCache(data) // only cache a complete result
        }
    } catch (e) {
        console.error('JobsView: could not load job data', e) // the real reason; the page shows the friendly message below
        error.value = 'Could not load job data from Hacker News. Check your connection and try again.'
    } finally {
        loading.value = false
    }
}

onMounted(load)

// ---------- Display helpers for the template ----------
const usd = (v) => `$${v}k` // 175 -> "$175k"

const stats = computed(() => [
    { label: 'Job posts analysed', value: postsAnalysed.value },
    { label: 'Salary bands used', value: salaries.value.reduce((sum, s) => sum + s.n, 0) },
    { label: 'Role families tracked', value: roles.value.length },
    { label: 'Months covered', value: postsPerMonth.value.length },
])

const salaryRows = computed(() =>
    salaries.value.filter((s) => s.n >= MIN_SALARY_BANDS && s.low !== null),
)

const thinRoles = computed(() => salaries.value.filter((s) => s.n < MIN_SALARY_BANDS))
</script>

<template>
    <div class="jobs-view">
        <div class="jobs-inner">
            <!-- Title + subtitle belong to the shared page shell once it exists; remove them then. -->
            <header class="page-head">
                <h1>Jobs</h1>
                <p>
                    Which roles companies are hiring for and what they post as pay, from Hacker News Who is
                    Hiring threads.
                </p>
            </header>

            <div class="banner" role="note">
                Salary figures come from US and global postings
            </div>

            <!-- Some months failed to load but others did -->
            <div v-if="warning" class="banner banner-warn" role="status">{{ warning }}</div>

            <!-- Loading skeleton -->
            <div v-if="loading" class="stack" aria-hidden="true">
                <div class="strip">
                    <div v-for="n in 4" :key="n" class="strip-cell"><span class="sk sk-value"></span></div>
                </div>
                <div class="card"><span v-for="n in 5" :key="n" class="sk sk-row"></span></div>
            </div>

            <!-- Nothing could be loaded -->
            <div v-else-if="error" class="banner banner-error" role="alert">
                <span>{{ error }}</span>
                <button type="button" class="retry" @click="load">Try again</button>
            </div>

            <template v-else>
                <!-- Stat strip -->
                <div class="strip">
                    <div v-for="s in stats" :key="s.label" class="strip-cell">
                        <span class="strip-value mono">{{ s.value }}</span>
                        <span class="strip-label">{{ s.label }}</span>
                    </div>
                </div>

                <!-- Role demand -->
                <section class="block" aria-labelledby="dem-h">
                    <div class="block-head">
                        <h2 id="dem-h">Role demand</h2>
                        <p>Share of job posts mentioning each role, last 3 months</p>
                    </div>

                    <div class="split">
                        <div class="card">
                            <!-- TODO: horizontal bar chart goes here -->
                            <div class="chart-placeholder">Role demand chart coming soon</div>
                            <ul class="data-list">
                                <li v-for="r in roles" :key="r.name">
                                    <span>{{ r.name }}</span>
                                    <span class="mono">{{ r.share }}%</span>
                                </li>
                            </ul>
                        </div>

                        <div class="card">
                            <h3>Posts per month</h3>
                            <!-- TODO: column chart goes here -->
                            <div class="chart-placeholder">Posts per month chart coming soon</div>
                            <ul class="data-list">
                                <li v-for="p in postsPerMonth" :key="p.month">
                                    <span>{{ p.month }}</span>
                                    <span class="mono">{{ p.count }}</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                <!-- Posted salary bands -->
                <section class="block" aria-labelledby="sal-h">
                    <div class="block-head">
                        <h2 id="sal-h">Posted salary bands</h2>
                        <p>Median posted range per role, last 6 months, USD per year</p>
                    </div>

                    <div class="card">
                        <!-- TODO: range-bar chart goes here -->
                        <div class="chart-placeholder">Salary range chart coming soon</div>

                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th scope="col">Role</th>
                                    <th scope="col">Median range</th>
                                    <th scope="col">Salary bands</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="s in salaryRows" :key="s.role">
                                    <td>{{ s.role }}</td>
                                    <td class="mono">{{ usd(s.low) }} to {{ usd(s.high) }}</td>
                                    <td class="mono">n = {{ s.n }}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div v-if="thinRoles.length" class="thin">
                            <h3>Not enough salary data yet</h3>
                            <ul>
                                <li v-for="t in thinRoles" :key="t.role" class="chip">
                                    {{ t.role }} · <span class="mono">n = {{ t.n }}</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <p class="footnote">
                        Medians are used so a few extreme salaries can't skew the range. Duplicate postings
                        across months are counted once.
                    </p>
                </section>
            </template>
        </div>
    </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap');

/* ---------- Page wrapper + theme tokens ----------
   Self-contained so it doesn't depend on App.vue / main.css / base.css.
   When the shared shell exists, move the tokens to the global stylesheet and drop
   grid-column / min-height / background from here. */
.jobs-view {
    --jobs-bg: #0a0a0c;
    --jobs-surface: #111114;
    --jobs-surface-2: #16161a;
    --jobs-border: #222228;
    --jobs-text: #ededf0;
    --jobs-text-2: #a9a9b3;
    --jobs-text-3: #8c8c97;
    --jobs-accent: #8eaeff;

    grid-column: 1 / -1;
    /* span both columns of the template's #app grid */
    width: 100%;
    min-height: 100vh;
    box-sizing: border-box;
    padding: 40px 32px 96px;
    background: var(--jobs-bg);
    color: var(--jobs-text);
    font-family:
        'Geist',
        ui-sans-serif,
        system-ui,
        -apple-system,
        'Segoe UI',
        sans-serif;
    -webkit-font-smoothing: antialiased;
}

.jobs-view :is(h1, h2, h3, p, ul) {
    margin: 0;
}

.jobs-inner {
    max-width: 1120px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.mono {
    font-family: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
}

/* ---------- Page header (move to shared shell) ---------- */
.page-head {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
}

.page-head h1 {
    font-size: 30px;
    font-weight: 600;
    letter-spacing: -0.02em;
}

.page-head p {
    font-size: 15px;
    color: var(--jobs-text-2);
}

/* ---------- Shared building blocks (candidates for the shared stylesheet) ---------- */
.card {
    background: var(--jobs-surface);
    border: 1px solid var(--jobs-border);
    border-radius: 12px;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
}

.card h3 {
    font-size: 14px;
    font-weight: 600;
}

.banner {
    padding: 14px 16px;
    border-radius: 12px;
    background: #121726;
    border: 1px solid #2a3452;
    color: #c9d2e8;
    font-size: 14px;
    line-height: 1.5;
}

.banner-warn {
    background: #241d10;
    border-color: #52411a;
    color: #e8d6a8;
}

.banner-error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: #261417;
    border-color: #5a2a30;
    color: #f0c4c8;
}

.retry {
    flex-shrink: 0;
    height: 30px;
    padding: 0 12px;
    border-radius: 6px;
    background: var(--jobs-surface-2);
    border: 1px solid var(--jobs-border);
    color: var(--jobs-text);
    font: inherit;
    font-size: 13px;
    cursor: pointer;
}

.retry:hover {
    border-color: var(--jobs-accent);
}

.strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
    gap: 1px;
    background: var(--jobs-border);
    border: 1px solid var(--jobs-border);
    border-radius: 12px;
    overflow: hidden;
}

.strip-cell {
    background: var(--jobs-surface);
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
}

.strip-value {
    font-size: 24px;
    font-weight: 500;
}

.strip-label {
    font-size: 13px;
    color: var(--jobs-text-2);
}

.chip {
    display: inline-flex;
    align-items: center;
    height: 26px;
    padding: 0 8px;
    border-radius: 6px;
    background: var(--jobs-surface-2);
    border: 1px solid var(--jobs-border);
    color: var(--jobs-text-2);
    font-size: 13px;
    list-style: none;
}

/* ---------- Jobs layout ---------- */
.stack,
.block {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.block {
    margin-top: 8px;
}

.block-head {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.block-head h2 {
    font-size: 18px;
    font-weight: 600;
}

.block-head p {
    font-size: 14px;
    color: var(--jobs-text-2);
}

.split {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(360px, 100%), 1fr));
    gap: 16px;
    align-items: stretch;
}

.chart-placeholder {
    min-height: 140px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px dashed var(--jobs-border);
    border-radius: 8px;
    color: var(--jobs-text-3);
    font-size: 13px;
    text-align: center;
}

.data-list {
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
}

.data-list li {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 8px 0;
    border-bottom: 1px solid var(--jobs-border);
    font-size: 14px;
}

.data-list li:last-child {
    border-bottom: 0;
}

.data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.data-table th,
.data-table td {
    padding: 10px 8px;
    text-align: left;
    border-bottom: 1px solid var(--jobs-border);
}

.data-table th {
    font-size: 12px;
    font-weight: 500;
    color: var(--jobs-text-3);
}

.thin {
    padding-top: 14px;
    border-top: 1px solid var(--jobs-border);
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.thin h3 {
    font-weight: 500;
    color: var(--jobs-text-2);
}

.thin ul {
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.footnote {
    font-size: 13px;
    color: var(--jobs-text-3);
}

/* ---------- Loading skeleton ---------- */
.sk {
    display: block;
    background: #1d1d22;
    border-radius: 6px;
    animation: jobs-pulse 1s ease-in-out infinite;
}

.sk-value {
    height: 22px;
    width: 64px;
}

.sk-row {
    height: 12px;
    width: 60%;
}

@keyframes jobs-pulse {
    50% {
        opacity: 0.5;
    }
}
</style>
