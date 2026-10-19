// src/utils/top5Categories.js
// Pure logic for Discovery: classify Show HN titles into buckets, rank the software buckets, filter repos.

export const TOP_CATEGORIES = 5 // categories shown
export const REPOS_PER_CATEGORY = 5 // repos shown per category
export const MIN_STARS = 50 // repos below this are dropped

// ---------- Category dictionary ----------
// strong term = 3 pts, weak term = 1 pt. Highest score wins; a tie goes to the bucket listed first.
// Terms are regex fragments wrapped in \b...\b and matched against the title (without the "Show HN:" prefix).
// ranked: false buckets exist only to absorb non-software posts so they never pad a software bucket.
const BUCKETS = [
    {
        id: 'hn_meta', label: 'HN meta', ranked: false,
        strong: ['hacker news', 'hn'], weak: []
    },
    {
        id: 'agents', label: 'AI agents and agent tooling', ranked: true,
        strong: ['agents?', 'agentic', 'mcp', 'claude code', 'codex', 'harness(?:es)?', 'ai setup', 'orchestrat\\w*', 'swarm'],
        weak: ['autonomous', 'copilot', 'assistant', 'skills?', 'tool calling']
    },
    {
        id: 'models', label: 'AI models, inference and evals', ranked: true,
        strong: ['llms?', 'vram', 'gpu', 'inference', 'quantiz\\w*', 'fine-?tun\\w*', 'embeddings?', 'diffusion', 'gguf', 'llama\\w*', 'language models?', 'evals?', 'benchmarks?'],
        weak: ['models?', 'ai', 'training', 'transformers?', 'whisper', 'tts', 'speech', 'on-device', 'rag']
    },
    {
        id: 'devtools', label: 'Developer tools and languages', ranked: true,
        strong: ['cli', 'tui', 'ide', 'editors?', 'compilers?', 'linters?', 'parsers?', 'debuggers?', 'sdk', 'frameworks?', 'librar(?:y|ies)', 'diagram language', 'programming languages?', 'query language', 'dsl', 'dev ?tools?', 'package manager', 'vs ?code', 'neovim', 'build tool', 'code review', 'terminal'],
        weak: ['languages?', 'api', 'git', 'github', 'rust', 'python', 'testing', 'static analysis']
    },
    {
        id: 'systems', label: 'Systems, infra and security', ranked: true,
        strong: ['sandbox(?:es)?', 'rootless', 'linux', 'kernel', 'gvisor', 'containers?', 'docker', 'kubernetes', 'k8s', 'security', 'vulnerabilit\\w*', 'exploits?', 'malware', 'stuxnet', 'encrypt\\w*', 'databases?', 'postgres\\w*', 'sqlite', 'distributed', 'ebpf', 'vpn', 'firewall', 'self-?hosted', 'observability', 'reverse engineer\\w*', 'zero-?trust', 'infra\\w*'],
        weak: ['network\\w*', 'server', 'cloud', 'cloudflare', 'cache', 'proxy', 'dns']
    },
    {
        id: 'hardware', label: 'Hardware, embedded and e-ink', ranked: true,
        strong: ['e-?ink', 'esp32', 'arduino', 'raspberry pi', 'pcb', 'firmware', 'embedded', 'microcontrollers?', '3d[- ]print\\w*', 'sensors?', 'hardware', 'fpga', 'rp2040', 'iot', 'bike computer', 'soldering'],
        weak: ['device', 'battery', 'display', 'led', 'camera', 'smart home']
    },
    {
        id: 'business', label: 'Business, finance and civic data', ranked: true,
        strong: ['helpdesk', 'crm', 'invoic\\w*', 'accounting', 'finance', 'financial', 'fintech', 'payments?', 'billing', 'erp', 'saas', 'civic', 'government', 'budget\\w*', 'tax\\w*', 'bank\\w*', 'trading', 'procurement'],
        weak: ['workflows?', 'customers?', 'startup', 'sales', 'business', 'compliance']
    },
    {
        id: 'consumer', label: 'Consumer and productivity apps', ranked: true,
        strong: ['ios', 'android', 'habit tracker', 'trackers?', 'to-?do', 'note-?taking', 'notes', 'browser extension', 'chrome extension', 'mobile app', 'iphone', 'calendar', 'journal'],
        weak: ['app', 'apps', 'alternative', 'meetup', 'personal', 'productivity', 'photos', 'recipes']
    },
    {
        id: 'games', label: 'Games, art and creative toys', ranked: false,
        strong: ['games?', 'puzzle', 'roguelike', 'flight simulator', 'simulator', 'pok[eé]mon', 'chess', 'wordle', 'fonts?', 'cursed', 'pixel', 'arcade', 'text adventure'],
        weak: ['fun', 'toy', 'art', 'creative', 'music', 'drawing']
    },
    {
        id: 'explainers', label: 'Interactive explainers and data viz', ranked: false,
        strong: ['what if', 'visuali[sz]\\w*', 'explorable', 'interactive', 'explained', 'explainer', 'solar system', 'asteroids?', 'simulation', 'map of', 'history of', 'atlas'],
        weak: ['real-?time', 'data', 'science', 'physics', 'chart']
    },
]

const compile = (terms) => terms.map((t) => new RegExp(`\\b(?:${t})\\b`, 'i'))
for (const b of BUCKETS) {
    b.strongRx = compile(b.strong)
    b.weakRx = compile(b.weak)
}

export const BUCKET_BY_ID = Object.fromEntries(BUCKETS.map((b) => [b.id, b]))

export const normalizeTitle = (t) => (t || '').replace(/^\s*show hn:?\s*/i, '').trim()

// Returns the id of the best-scoring bucket, or 'unclassified'.
export function classify(title) {
    const t = normalizeTitle(title)
    let best = { id: 'unclassified', score: 0 }
    for (const b of BUCKETS) {
        const score =
            3 * b.strongRx.filter((rx) => rx.test(t)).length + b.weakRx.filter((rx) => rx.test(t)).length
        if (score > best.score) best = { id: b.id, score } // strict ">" keeps the first-listed bucket on a tie
    }
    return best.id
}

// ---------- Repo links ----------
const RESERVED_OWNERS = new Set(['orgs', 'sponsors', 'topics', 'features', 'marketplace', 'about', 'settings', 'pricing', 'collections', 'trending', 'explore', 'login', 'signup', 'apps', 'enterprise', 'security', 'readme', 'users'])

export function extractRepo(url) {
    if (!url) return null
    const m = url.match(/^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i)
    if (!m) return null
    const owner = m[1]
    const name = m[2].replace(/\.git$/i, '')
    if (!name || RESERVED_OWNERS.has(owner.toLowerCase())) return null
    return { owner, name, key: `${owner}/${name}`.toLowerCase() }
}

// ---------- Ranking ----------
// Builder volume: distinct HN authors per software bucket. A post with no author counts as its own author.
// Ties fall to post count, then bucket id, so reruns give the same list.
export function rankCategories(posts) {
    const agg = new Map()
    for (const p of posts) {
        if (!BUCKET_BY_ID[p.bucket]?.ranked) continue
        const a = agg.get(p.bucket) ?? { id: p.bucket, posts: 0, authors: new Set() }
        a.posts += 1
        a.authors.add(p.author ?? `post:${p.objectID}`)
        agg.set(p.bucket, a)
    }
    return [...agg.values()]
        .map(({ id, posts, authors }) => ({ id, posts, builders: authors.size }))
        .sort((a, b) => b.builders - a.builders || b.posts - a.posts || a.id.localeCompare(b.id))
}

// ---------- Repo filters ----------
const BLOCKLIST_RX = /\b(nsfw|porn\w*|hentai|xxx|onlyfans|erotic\w*)\b/i
const LISTY_DESC_RX = /\bcurated list\b|\bawesome[- ]list\b/i
const DOCSY_DESC_RX = /\b(tutorials?|cheat ?sheets?|roadmap|interview questions|course|book|notes|resources)\b/i

function isNotSoftware(repo) {
    const topics = repo.topics ?? []
    if (/^awesome\b/i.test(repo.name ?? '')) return true
    if (topics.some((t) => /^awesome(-list)?$/.test(t))) return true
    if (LISTY_DESC_RX.test(repo.description ?? '')) return true
    return !repo.language && DOCSY_DESC_RX.test(repo.description ?? '')
}

// True when a GitHub repo response is fit to show.
export function passesHardChecks(repo) {
    return !repo.fork
        && !repo.archived
        && !BLOCKLIST_RX.test([repo.name, repo.description, ...(repo.topics ?? [])].join(' '))
        && !isNotSoftware(repo)
        && (repo.stargazers_count ?? 0) >= MIN_STARS
}


// ---------- Display helpers (shared by the Discovery components) ----------
export const langOf = (project) => project.language || 'No language'

// what a category card shows: its projects in the chosen language (or all), capped at REPOS_PER_CATEGORY
export const visibleProjects = (category, lang) =>
    category.projects.filter((p) => !lang || langOf(p) === lang).slice(0, REPOS_PER_CATEGORY)
