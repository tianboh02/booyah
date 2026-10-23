/**
 * src/utils/trending/github/githubTrending.js
 *
 * What it does:  loads the data for Trending → Top Repositories and Trending → Top Developers
 *                from the GitHub REST API (https://api.github.com).
 *                GitHub has no "trending" endpoint, so we build our own lists with the search API,
 *                using the rules in RULES below (change them there; nothing else needs to change).
 *
 *   Top Repositories   GET /search/repositories   public repos created in the last day / 7 / 30 days,
 *                                                 most stars first, 20 of them
 *                      GET /repos/{owner}/{repo}/languages   each repo's language composition
 *   Top Developers     GET /search/users          users with the most followers, 20 of them
 *                      GET /users/{username}      each developer's profile (name, bio, followers…)
 *                      GET /users/{username}/repos   their recently pushed repos → main language
 *
 * Token:         every request sends the signed-in user's GitHub token (localStorage 'auth_token',
 *                the same one My Projects and the router use), so the user's own rate limit applies.
 *                No token is written into the code. Without one, requests still work at GitHub's
 *                lower anonymous limits.
 * Gives back:    fetchTopRepos(timeframe, onProgress) → { repos, totalCount, since, fetchedAt }
 *                fetchTopDevelopers(onProgress)        → { developers, totalCount, fetchedAt, failed }
 *                Both cache results for CACHE_MINUTES, so switching tabs doesn't call GitHub again.
 *                Errors are thrown as GithubError with a message that can be shown to the user.
 * Used by:       components/trending/repositories/repositoriesSection.vue,
 *                components/trending/developers/developersSection.vue.
 */

import axios from 'axios'
import { getLangColor } from '@/utils/langColors'

// ===========================================================================
// 1. SETTINGS
// ===========================================================================

/**
 * The rules for both lists, in one place. The doc's "rules will be defined later" goes here.
 *   repos.query       extra search qualifiers, added after the created:> date
 *   repos.sort        'stars' | 'forks' | 'updated'
 *   developers.query  search qualifiers for users
 *   developers.sort   'followers' | 'repositories' | 'joined'
 */
export const RULES = {
  limit: 20, // "simulate top 20 for more data"
  repos: { query: 'is:public', sort: 'stars' },
  developers: { query: 'type:user followers:>1000', sort: 'followers' },
}

/** Repo timeframes: how far back "created" reaches. Keys match the toggle on the page. */
export const TIMEFRAMES = {
  daily: { label: 'Today', days: 1, words: 'in the last 24 hours' },
  weekly: { label: 'This week', days: 7, words: 'in the last 7 days' },
  monthly: { label: 'This month', days: 30, words: 'in the last 30 days' },
}

// The GitHub REST API version, the same one the router and My Projects use
const API_VERSION = '2022-11-28'
const CACHE_MINUTES = 10
// How many recently pushed repos to look at when working out a developer's main language
const REPOS_FOR_LANGUAGE = 30

// ===========================================================================
// 2. THE GITHUB CLIENT
// ===========================================================================

const github = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': API_VERSION,
  },
})

// Adds the signed-in user's token to every request (read fresh each time, so a new sign-in is used)
github.interceptors.request.use((config) => {
  let token = null
  try {
    token = localStorage.getItem('auth_token')
  } catch {
    token = null
  }
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/** An error whose message is safe and helpful to show on the page. */
export class GithubError extends Error {
  constructor(message, { rateLimited = false, resetAt = null } = {}) {
    super(message)
    this.name = 'GithubError'
    this.rateLimited = rateLimited
    this.resetAt = resetAt // Date when GitHub's limit resets (rate limits only)
  }
}

/** Turns an axios error into a GithubError with a plain-English message. */
function toGithubError(error) {
  const res = error.response
  if (!res) return new GithubError("Couldn't reach GitHub. Check your connection and try again.")

  const remaining = res.headers?.['x-ratelimit-remaining']
  const reset = Number(res.headers?.['x-ratelimit-reset'])
  if ((res.status === 403 || res.status === 429) && (remaining === '0' || res.status === 429)) {
    const resetAt = reset ? new Date(reset * 1000) : null
    const minutes = resetAt ? Math.max(1, Math.ceil((resetAt - Date.now()) / 60000)) : null
    return new GithubError(
      `GitHub's request limit has been reached${minutes ? `. Try again in about ${minutes} minute${minutes > 1 ? 's' : ''}` : '. Try again in a few minutes'}.`,
      { rateLimited: true, resetAt },
    )
  }
  if (res.status === 401) {
    return new GithubError('Your GitHub sign-in has expired. Sign in again to load this list.')
  }
  if (res.status === 422) {
    return new GithubError("GitHub didn't accept the search. Check RULES in githubTrending.js.")
  }
  return new GithubError(`GitHub answered with an error (${res.status}). Try again in a moment.`)
}

/** GET a path from the GitHub API and return its JSON, or throw a GithubError. */
async function get(path, params) {
  try {
    const { data } = await github.get(path, { params })
    return data
  } catch (error) {
    throw toGithubError(error)
  }
}

// ===========================================================================
// 3. CACHE (per list, so switching tabs or timeframes back and forth is instant)
// ===========================================================================

const cache = new Map() // key → { at, promise }

/** Runs `load` once per key every CACHE_MINUTES; callers in between share the same result. */
function cached(key, load, force) {
  const hit = cache.get(key)
  if (!force && hit && Date.now() - hit.at < CACHE_MINUTES * 60000) return hit.promise
  const promise = load().catch((error) => {
    cache.delete(key) // don't keep failures; the next try calls GitHub again
    throw error
  })
  cache.set(key, { at: Date.now(), promise })
  return promise
}

// ===========================================================================
// 4. HELPERS
// ===========================================================================

/** 'YYYY-MM-DD' for `days` days ago, in UTC (GitHub's search dates are UTC). */
function daysAgo(days) {
  const date = new Date(Date.now() - days * 86400000)
  return date.toISOString().slice(0, 10)
}

/**
 * {"TypeScript": 51200, "CSS": 1200} (bytes per language) → the shares, biggest first:
 * [{ name, pct, color }]. Languages under 1% are grouped as "Other".
 */
function toComposition(bytesByLanguage) {
  const entries = Object.entries(bytesByLanguage || {})
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0)
  if (!total) return []
  const shares = entries
    .map(([name, bytes]) => ({ name, pct: (bytes / total) * 100, color: getLangColor(name) }))
    .sort((a, b) => b.pct - a.pct)
  const main = shares.filter((s) => s.pct >= 1)
  const rest = shares.filter((s) => s.pct < 1).reduce((sum, s) => sum + s.pct, 0)
  if (rest > 0) main.push({ name: 'Other', pct: rest, color: '#8b949e' })
  return main
}

/** The most common language among a user's repos (forks left out), or null. */
function mainLanguage(repos) {
  const counts = {}
  for (const repo of repos || []) {
    if (repo.fork || !repo.language) continue
    counts[repo.language] = (counts[repo.language] || 0) + 1
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return best ? best[0] : null
}

/**
 * Runs `task` on every item, a few at a time, calling onStep after each one.
 * Returns Promise.allSettled-style results, in the same order as `items`.
 */
async function eachLimited(items, task, onStep, concurrency = 6) {
  const results = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      try {
        results[i] = { status: 'fulfilled', value: await task(items[i], i) }
      } catch (reason) {
        results[i] = { status: 'rejected', reason }
      }
      onStep()
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return results
}

// ===========================================================================
// 5. TOP REPOSITORIES
// ===========================================================================

/** One search result → the fields the page shows. */
function toRepo(item, index) {
  return {
    id: item.id,
    rank: index + 1,
    name: item.name,
    fullName: item.full_name,
    owner: item.owner?.login || '',
    ownerAvatar: item.owner?.avatar_url || '',
    ownerType: item.owner?.type || 'User', // 'User' or 'Organization'
    htmlUrl: item.html_url,
    description: item.description || '',
    language: item.language || null,
    stars: item.stargazers_count || 0,
    forks: item.forks_count || 0,
    openIssues: item.open_issues_count || 0,
    topics: item.topics || [],
    license: item.license?.spdx_id && item.license.spdx_id !== 'NOASSERTION' ? item.license.spdx_id : null,
    createdAt: item.created_at,
    pushedAt: item.pushed_at,
    composition: [], // filled in from /languages below
  }
}

/**
 * The top public repositories created within `timeframe` ('daily' | 'weekly' | 'monthly'),
 * most stars first. onProgress(done, total) is called as each repo's languages arrive.
 */
export function fetchTopRepos(timeframe = 'weekly', onProgress = () => {}, { force = false } = {}) {
  const frame = TIMEFRAMES[timeframe] || TIMEFRAMES.weekly
  return cached(
    `repos:${timeframe}`,
    async () => {
      const since = daysAgo(frame.days)
      const search = await get('/search/repositories', {
        q: `created:>${since} ${RULES.repos.query}`.trim(),
        sort: RULES.repos.sort,
        order: 'desc',
        per_page: RULES.limit,
      })
      const repos = (search.items || []).filter((item) => !item.private).map(toRepo)

      // Language composition for each repo (a failed one just shows no bar)
      let done = 0
      onProgress(done, repos.length)
      const results = await eachLimited(
        repos,
        (repo) => get(`/repos/${repo.owner}/${repo.name}/languages`),
        () => onProgress(++done, repos.length),
      )
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') repos[i].composition = toComposition(result.value)
      })

      return {
        repos,
        totalCount: search.total_count || 0,
        since,
        fetchedAt: new Date().toISOString(),
      }
    },
    force,
  )
}

// ===========================================================================
// 6. TOP DEVELOPERS
// ===========================================================================

/**
 * The developers with the most followers (see RULES.developers), with their profiles and
 * main language. onProgress(done, total) is called as each developer's details arrive.
 */
export function fetchTopDevelopers(onProgress = () => {}, { force = false } = {}) {
  return cached(
    'developers',
    async () => {
      const search = await get('/search/users', {
        q: RULES.developers.query,
        sort: RULES.developers.sort,
        order: 'desc',
        per_page: RULES.limit,
      })
      const found = search.items || []

      // Two calls per developer: their profile and their recent repos (for the main language)
      let done = 0
      const total = found.length * 2
      onProgress(done, total)
      const step = () => onProgress(++done, total)
      const [profiles, repoLists] = await Promise.all([
        eachLimited(found, (user) => get(`/users/${user.login}`), step),
        eachLimited(
          found,
          (user) =>
            get(`/users/${user.login}/repos`, {
              sort: 'pushed',
              per_page: REPOS_FOR_LANGUAGE,
              type: 'owner',
            }),
          step,
        ),
      ])

      // A missing profile still shows the developer, just with fewer details
      const failed = []
      const developers = found.map((user, i) => {
        const profile = profiles[i].status === 'fulfilled' ? profiles[i].value : null
        const repos = repoLists[i].status === 'fulfilled' ? repoLists[i].value : null
        if (!profile) failed.push(user.login)
        return {
          id: user.id,
          rank: i + 1,
          login: user.login,
          name: profile?.name || '',
          avatar: user.avatar_url,
          htmlUrl: user.html_url,
          bio: profile?.bio || '',
          company: profile?.company || '',
          location: profile?.location || '',
          followers: profile?.followers ?? null,
          publicRepos: profile?.public_repos ?? null,
          joined: profile?.created_at || null,
          language: mainLanguage(repos),
        }
      })

      return {
        developers,
        totalCount: search.total_count || 0,
        fetchedAt: new Date().toISOString(),
        failed,
      }
    },
    force,
  )
}
