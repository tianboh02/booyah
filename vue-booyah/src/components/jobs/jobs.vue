<script setup>
import { computed, ref } from 'vue'

// TODO: replace the placeholder values below with API calls once the endpoints exist.
// Each ref is shaped like the data we expect back, so only the assignment needs to change.
const loading = ref(false)

// Job posts analysed
const postsAnalysed = ref(939)

// Types of roles: share of job posts mentioning each role (%)
const roles = ref([
    { name: 'Software Engineer', share: 58 },
    { name: 'AI/ML Engineer', share: 24 },
    { name: 'Infra/DevOps/SRE', share: 14 },
    { name: 'Data', share: 12 },
    { name: 'Product Manager', share: 7 },
])

// Salary: median posted band per role in USD $k per year, n = number of salary bands
const salaries = ref([
    { role: 'AI/ML Engineer', low: 175, high: 220, n: 72 },
    { role: 'Software Engineer', low: 150, high: 210, n: 141 },
    { role: 'Infra/DevOps/SRE', low: 155, high: 205, n: 28 },
    { role: 'Security', low: null, high: null, n: 6 },
    { role: 'Designer', low: null, high: null, n: 2 },
])

// Posts per month
const postsPerMonth = ref([
    { month: 'Jul 2026', count: 331 },
    { month: 'Aug 2026', count: 312 },
    { month: 'Sep 2026', count: 296 },
])

const MIN_SALARY_BANDS = 10 // a role needs this many bands before its range is shown

const usd = (v) => `$${v}k`

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
                Salary figures come mainly from US and global startup postings and may not reflect
                Singapore pay.
            </div>

            <!-- Loading skeleton -->
            <div v-if="loading" class="stack" aria-hidden="true">
                <div class="strip">
                    <div v-for="n in 4" :key="n" class="strip-cell"><span class="sk sk-value"></span></div>
                </div>
                <div class="card"><span v-for="n in 5" :key="n" class="sk sk-row"></span></div>
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
    font-family: 'Geist', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
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

.sample-tag {
    display: inline-flex;
    align-items: center;
    height: 22px;
    padding: 0 8px;
    border-radius: 6px;
    background: var(--jobs-surface-2);
    border: 1px solid var(--jobs-border);
    color: var(--jobs-text-3);
    font-size: 12px;
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
