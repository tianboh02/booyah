// src/utils/learnPath.js
// Pure logic for the Learn page: which language to suggest, which projects to learn from,
// and how a practitioner's own repos measure up against Discovery's categories and rules.
// Inputs are the shapes the other pages already load (Discovery categories, Trending repos, Jobs rolesDetail, /user/repos).

import { isKnownLanguage } from '@/utils/learnResources'
import { MIN_STARS, classify, hardCheckFailures } from '@/utils/top5Categories'

const SUGGESTIONS = 3 // languages suggested per step
const PROJECTS_SHOWN = 3 // projects listed per path
const REPOS_TO_EXTEND = 3 // your repos shown when some fall in the category
const RECENT_FALLBACK = 2 // your most recent repos shown when none do

// A natural next language for someone who already uses the key. Used alongside Trending and Jobs.
const NEXT_LANGUAGE = {
    JavaScript: ['TypeScript', 'Go'],
    TypeScript: ['Go', 'Rust'],
    Python: ['Go', 'Rust'],
    Java: ['Kotlin', 'Go'],
    Kotlin: ['Swift', 'Go'],
    C: ['Rust', 'C++'],
    'C++': ['Rust', 'Go'],
    'C#': ['TypeScript', 'Go'],
    PHP: ['TypeScript', 'Go'],
    Ruby: ['Go', 'TypeScript'],
    Go: ['Rust', 'TypeScript'],
    Rust: ['Go', 'TypeScript'],
    Swift: ['Kotlin', 'Rust'],
    Dart: ['Kotlin', 'Swift'],
    Shell: ['Python', 'Go']
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

// ['Go', null, 'Go', 'Rust'] -> { Go: 2, Rust: 1 }
export function languageCounts(langs) {
    const counts = {}
    for (const l of langs) if (l) counts[l] = (counts[l] ?? 0) + 1
    return counts
}

// Newcomer: the languages a category is built in, most used first, Trending as the tie-break.
export function suggestLanguages(category, trendingCounts = {}) {
    const counts = languageCounts(category.projects.map((p) => p.language))
    const total = category.projects.length
    return Object.entries(counts)
        .sort(([a, x], [b, y]) => y - x || (trendingCounts[b] ?? 0) - (trendingCounts[a] ?? 0))
        .slice(0, SUGGESTIONS)
        .map(([lang, n]) => {
            const t = trendingCounts[lang] ?? 0
            const why = [`${n} of ${plural(total, 'project')}`]
            if (t) why.push(`${plural(t, 'trending repo')} this week`)
            return { lang, why: why.join(' · ') }
        })
}

// Newcomer: smallest projects first, they are the easiest to read through.
export function starterProjects(category, lang) {
    return category.projects
        .filter((p) => p.language === lang)
        .sort((a, b) => a.stars - b.stars)
        .slice(0, PROJECTS_SHOWN)
}

// Practitioner: projects in the chosen language, or the category's top projects when there are none.
export function recommendedProjects(category, lang) {
    const inLang = category.projects.filter((p) => p.language === lang)
    return (inLang.length ? inLang : category.projects).slice(0, PROJECTS_SHOWN)
}

// Jobs rolesDetail -> { tech: summed share across roles }, the same reduction as the Jobs header.
export function jobDemand(rolesDetail = {}) {
    const totals = {}
    for (const d of Object.values(rolesDetail)) {
        for (const t of d.tech?.top ?? []) totals[t.name] = (totals[t.name] ?? 0) + t.share
    }
    return totals
}

// Practitioner: languages they don't use yet, scored on Trending + Jobs, with a nudge for natural next steps.
export function nextLanguages(userLangs, trendingCounts = {}, demand = {}) {
    const known = new Set(userLangs)
    const pairedWith = {}
    for (const l of userLangs) {
        for (const next of NEXT_LANGUAGE[l] ?? []) pairedWith[next] ??= l
    }

    const candidates = new Set([...Object.keys(pairedWith), ...Object.keys(trendingCounts), ...Object.keys(demand)])
    const pool = [...candidates].filter((l) => isKnownLanguage(l) && !known.has(l))

    const maxTrend = Math.max(1, ...pool.map((l) => trendingCounts[l] ?? 0))
    const maxDemand = Math.max(1, ...pool.map((l) => demand[l] ?? 0))
    const demandRank = Object.keys(demand)
        .filter(isKnownLanguage)
        .sort((a, b) => demand[b] - demand[a])

    return pool
        .map((lang) => ({
            lang,
            score: (trendingCounts[lang] ?? 0) / maxTrend + (demand[lang] ?? 0) / maxDemand + (pairedWith[lang] ? 0.5 : 0)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, SUGGESTIONS)
        .map(({ lang }) => {
            const why = []
            if (pairedWith[lang]) why.push(`pairs with ${pairedWith[lang]}`)
            if (trendingCounts[lang]) why.push(`${plural(trendingCounts[lang], 'trending repo')} this week`)
            const rank = demandRank.indexOf(lang)
            if (rank !== -1) why.push(`#${rank + 1} language in job posts`)
            return { lang, why: why.join(' · ') }
        })
}

// Opens the repo in github.dev (VS Code in the browser), to read the code without cloning it.
export const readCodeUrl = (ghUrl) => ghUrl.replace('://github.com/', '://github.dev/')

// ---------- Your repos vs Discovery ----------
// A /user/repos item as text Discovery's classifier understands: "my-cli-tool" reads as "my cli tool".
const repoText = (repo) => [repo.name.replace(/[-_.]/g, ' '), repo.description, ...(repo.topics ?? [])].join(' ')

// The Discovery bucket a repo of yours would land in.
const classifyRepo = (repo) => classify(repoText(repo))

const words = (text) => new Set((text || '').toLowerCase().match(/[a-z]{4,}/g) ?? [])

// The recommended project closest to your repo: most shared words, then same language, then the category's top one.
function similarProject(repo, category) {
    const mine = words(repoText(repo))
    let best = null
    let bestShared = 0
    for (const p of category.projects) {
        const shared = [...words(`${p.name} ${p.description}`)].filter((w) => mine.has(w)).length
        if (shared > bestShared) [best, bestShared] = [p, shared]
    }
    return best ?? category.projects.find((p) => p.language === repo.language) ?? category.projects[0] ?? null
}

const byPushed = (a, b) => new Date(b.pushed_at ?? 0) - new Date(a.pushed_at ?? 0)

// Your own repos that fall in the category. When none do, your most recent ones, so there is always something to extend.
export function reposToExtend(repos, categoryId) {
    const own = repos.filter((r) => !r.fork).sort(byPushed)
    const inCategory = own.filter((r) => classifyRepo(r) === categoryId)
    return inCategory.length
        ? { matched: true, repos: inCategory.slice(0, REPOS_TO_EXTEND) }
        : { matched: false, repos: own.slice(0, RECENT_FALLBACK) }
}

// Concrete next steps for one of your repos: practise the new language on it, learn from a similar project,
// and close the gaps Discovery's own rules would flag.
export function extendIdeas(repo, category, nextLang) {
    const ideas = []
    if (nextLang && repo.language !== nextLang) {
        ideas.push({ text: `Rewrite one module of ${repo.name} in ${nextLang}, practising on code you already know` })
    }

    const similar = similarProject(repo, category)
    if (similar) {
        const lang = similar.language ? ` in ${similar.language}` : ''
        ideas.push({ text: `Compare with ${similar.name}: similar work${lang}. Borrow one feature.`, url: similar.ghUrl })
    }

    const failures = hardCheckFailures(repo)
    if (failures.includes('archived')) ideas.push({ text: 'Archived. Unarchive it to keep building' })
    if (!repo.description) ideas.push({ text: 'Add a description so people (and Discovery) know what it does' })
    if (failures.includes('stars')) {
        const toGo = MIN_STARS - (repo.stargazers_count ?? 0)
        ideas.push({ text: `${plural(toGo, 'more star')} and Discovery would list it` })
    }
    return ideas.slice(0, 4)
}
