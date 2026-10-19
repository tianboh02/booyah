// src/utils/hackernewsDiscovery.js

import {
    BUCKET_BY_ID,
    TOP_CATEGORIES,
    classify,
    extractRepo,
    passesHardChecks,
    rankCategories,
} from '@/utils/top5Categories'

export const CACHE_KEY = 'discovery-view-v5' // bump when the regex/parsing logic changes
export const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours
const HN_DAYS = 30 // Show HN window
const HN_MIN_POINTS = 10 // ignore posts nobody noticed
const HN_PAGE_SIZE = 100
const HN_MAX_PAGES = 10
const GITHUB_CONCURRENCY = 5

const HN_API = 'https://hn.algolia.com/api/v1'
const GH_API = 'https://api.github.com'

const getJSON = async (url, headers) => {
    const r = await fetch(url, { headers })
    if (!r.ok) throw new Error(`${r.status} ${url}`)
    return r.json()
}

// ---------- HN ----------
async function fetchShowHN() {
    const since = Math.floor(Date.now() / 1000) - HN_DAYS * 86400
    const hits = new Map() // objectID -> hit, so a post shifting between pages is only counted once
    let page = 0
    let nbPages = 1
    while (page < nbPages && page < HN_MAX_PAGES) {
        const qs = new URLSearchParams({
            tags: 'show_hn',
            numericFilters: `created_at_i>${since},points>=${HN_MIN_POINTS}`,
            hitsPerPage: String(HN_PAGE_SIZE),
            page: String(page),
        })
        const res = await getJSON(`${HN_API}/search_by_date?${qs}`)
        for (const h of res.hits) hits.set(h.objectID, h)
        nbPages = res.nbPages
        page++
    }
    return [...hits.values()].map((h) => ({
        objectID: h.objectID,
        title: h.title,
        points: h.points ?? 0,
        author: h.author || null,
        repo: extractRepo(h.url),
        bucket: classify(h.title),
    }))
}

// ---------- GitHub ----------
async function mapLimit(items, limit, fn) {
    const out = new Array(items.length)
    let i = 0
    await Promise.all(
        Array.from({ length: Math.min(limit, items.length) }, async () => {
            while (i < items.length) {
                const idx = i++
                out[idx] = await fn(items[idx])
            }
        }),
    )
    return out
}

// Resolves to the repo, null for 404 (deleted / private: expected), and throws for anything else.
async function fetchRepo({ owner, name }, headers) {
    const r = await fetch(`${GH_API}/repos/${owner}/${name}`, { headers })
    if (r.status === 404) return null
    if (!r.ok) throw new Error(`${r.status} ${owner}/${name}`)
    return r.json()
}

// ---------- Build ----------
const toProject = (gh, post) => ({
    id: gh.full_name,
    owner: gh.owner.login,
    name: gh.name,
    description: gh.description || 'No description',
    language: gh.language || null,
    stars: gh.stargazers_count,
    hnPoints: post.points,
    hnUrl: `https://news.ycombinator.com/item?id=${post.objectID}`,
    ghUrl: gh.html_url,
})

function buildCategories(topCats, candidates) {
    const taken = new Set() // a repo only appears in the highest-ranked category that claims it
    return topCats.map((cat, i) => {
        const projects = []
        const pool = candidates
            .filter((c) => c.post.bucket === cat.id && c.gh)
            .sort((a, b) => b.post.points - a.post.points || b.gh.stargazers_count - a.gh.stargazers_count)
        // keep every survivor: the card slices to REPOS_PER_CATEGORY after the language filter
        for (const c of pool) {
            const key = c.gh.full_name.toLowerCase()
            if (taken.has(key)) continue
            taken.add(key)
            projects.push(toProject(c.gh, c.post))
        }
        return { id: cat.id, name: BUCKET_BY_ID[cat.id].label, rank: i + 1, builders: cat.builders, projects }
    })
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
        // storage full or blocked: the page works without the cache
    }
}

// onProgress(done, total) fires once after the HN fetch and once per GitHub request, for the loader
export async function fetchDiscoveryData(onProgress) {
    const cached = readCache()
    if (cached) return { data: cached, warning: '' }

    const posts = await fetchShowHN()
    const topCats = rankCategories(posts).slice(0, TOP_CATEGORIES)
    if (!topCats.length) throw new Error('no Show HN software posts found')

    // one candidate per bucket + repo, keeping the post with the most points
    const topIds = new Set(topCats.map((c) => c.id))
    const best = new Map()
    for (const p of posts) {
        if (!p.repo || !topIds.has(p.bucket)) continue
        const k = `${p.bucket}|${p.repo.key}`
        if (!best.has(k) || best.get(k).post.points < p.points) best.set(k, { repo: p.repo, post: p })
    }
    const candidates = [...best.values()]

    const total = candidates.length + 1
    let done = 1
    onProgress?.(done, total)

    const headers = {
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        'X-GitHub-Api-Version': '2022-11-28',
        Accept: 'application/vnd.github+json',
    }
    let failed = 0
    await mapLimit(candidates, GITHUB_CONCURRENCY, async (c) => {
        try {
            const gh = await fetchRepo(c.repo, headers)
            c.gh = gh && passesHardChecks(gh) ? gh : null
        } catch (e) {
            console.error('Discovery: could not load repo', e)
            failed++
        }
        onProgress?.(++done, total)
    })

    const data = buildCategories(topCats, candidates)
    let warning = ''
    if (failed) {
        warning = `Could not check ${failed} ${failed > 1 ? 'repositories' : 'repository'} on GitHub, so some projects may be missing.`
    } else {
        writeCache(data)
    }
    return { data, warning }
}
