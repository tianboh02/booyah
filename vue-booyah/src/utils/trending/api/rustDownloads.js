/**
 * src/utils/trending/api/rustDownloads.js
 *
 * What it does:  loads the Rust tab: the top 20 crates on crates.io and ~90 days of their downloads.
 *   Endpoint 1: /crates?sort=downloads&per_page=20  → the 20 most downloaded crates of all time
 *   Endpoint 2: /crates/<name>/downloads            → daily downloads for one crate (one request each)
 *   The daily numbers are then cleaned and turned into weekly/monthly totals by math/trendMath.js.
 * Receives:      nothing.
 * Gives back:    loadRustTrending() → { ecosystem, fetchedAt, dataUpTo, packages, failed }
 *                (the same shape as the npm and PHP loaders).
 * Used by:       languages.js (the Rust tab) and the tests in tests/trending/.
 */

import { buildStats, keepLatestDays } from '../math/trendMath.js'
import { getJson } from './http.js'

// ===========================================================================
// 1. SETTINGS
// ===========================================================================

const API_BASE = 'https://crates.io/api/v1'
const TOP_CRATES_URL = `${API_BASE}/crates?sort=downloads&per_page=20` // endpoint 1
const crateDownloadsUrl = (name) => `${API_BASE}/crates/${encodeURIComponent(name)}/downloads` // endpoint 2

// crates.io asks scripts to say who they are. Browsers send their own label
// and don't allow changing it, so we only add this when running in the terminal.
const IS_BROWSER = typeof window !== 'undefined'
const REQUEST_OPTIONS = IS_BROWSER
  ? {}
  : { headers: { 'User-Agent': 'booyah-student-project (testing)' } }

// ===========================================================================
// 2. FETCHING FROM CRATES.IO
// ===========================================================================

/** Endpoint 1: the top 20 crates by all-time downloads, keeping the fields Booyah shows. */
export async function fetchTopCrates() {
  const json = await getJson(TOP_CRATES_URL, REQUEST_OPTIONS)
  return json.crates.map((crate, index) => ({
    rank: index + 1, // 1 = most downloaded of all time
    name: crate.name,
    description: (crate.description || '').trim(),
    allTimeDownloads: crate.downloads,
    latestVersion: crate.max_stable_version || crate.default_version || null,
    lastUpdated: crate.updated_at ? crate.updated_at.slice(0, 10) : null,
    url: `https://crates.io/crates/${crate.name}`,
  }))
}

/** Endpoint 2: raw daily download data for one crate (about 90 days). */
export function fetchCrateDownloads(name) {
  return getJson(crateDownloadsUrl(name), REQUEST_OPTIONS)
}

// ===========================================================================
// 3. CLEANING THE DATA
// ===========================================================================

/**
 * Turns one crate's raw endpoint 2 response into a simple list:
 *   [{ date: '2026-07-09', downloads: 3227000 }, ...]   one entry per day, oldest first
 */
export function toDailyTotals(raw) {
  const totalsByDate = {}

  // a) Add up the downloads of every version listed for each date
  for (const entry of raw.version_downloads || []) {
    totalsByDate[entry.date] = (totalsByDate[entry.date] || 0) + entry.downloads
  }

  // b) Add the "all other versions" bucket for each date
  for (const entry of (raw.meta && raw.meta.extra_downloads) || []) {
    totalsByDate[entry.date] = (totalsByDate[entry.date] || 0) + entry.downloads
  }

  // c) Turn it into a list, oldest day first ('YYYY-MM-DD' text sorts in date order)
  const days = Object.keys(totalsByDate)
    .sort()
    .map((date) => ({ date, downloads: totalsByDate[date] }))

  // d) Drop the newest day: crates.io is still counting it, so its number is too low
  days.pop()

  return days
}

// ===========================================================================
// 4. MAIN FUNCTION
// ===========================================================================

/** Fetches, cleans and computes everything for the Rust trending view. */
export async function loadRustTrending() {
  // a) Endpoint 1: which 20 crates
  const topCrates = await fetchTopCrates()

  // b) Endpoint 2: all 20 requests at the same time; one failure doesn't stop the others
  const results = await Promise.allSettled(
    topCrates.map((crate) => fetchCrateDownloads(crate.name)),
  )

  const packages = []
  const failed = []
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      packages.push(buildStats(topCrates[i], keepLatestDays(toDailyTotals(result.value))))
    } else {
      failed.push({ name: topCrates[i].name, reason: result.reason.message })
    }
  })

  if (packages.length === 0) throw new Error('Could not load download data for any crate.')

  // c) Package everything into one object and return it
  return {
    ecosystem: 'rust',
    fetchedAt: new Date().toISOString(),
    dataUpTo: packages[0].daily[packages[0].daily.length - 1].date, // latest complete day
    packages,
    failed,
  }
}
