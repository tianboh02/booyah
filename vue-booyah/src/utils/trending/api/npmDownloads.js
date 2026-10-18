/**
 * src/utils/trending/api/npmDownloads.js
 *
 * What it does:  loads the JavaScript tab: the top 20 npm packages and ~90 days of their downloads.
 *   Step 1: last week's downloads for the 60 candidate packages, in ONE bulk request
 *           → sort → keep the top 20
 *   Step 2: the last ~90 days of daily downloads for those 20, in ONE bulk request
 *           (endpoint: downloads/range/<start>:<end>/<pkg>,<pkg>,...)
 *   Step 3: description, latest version and licence for each (registry, one small request each)
 * Receives:      nothing (the candidate list comes from npmCandidates.js).
 * Gives back:    loadNpmTrending() → { ecosystem, fetchedAt, dataUpTo, packages, failed }
 *                (the same shape as the PHP and Rust loaders).
 * Used by:       languages.js (the JavaScript tab) and the tests in tests/trending/.
 */

import { NPM_CANDIDATES } from './npmCandidates.js'
import { getJson } from './http.js'
import {
  WINDOW_DAYS,
  addDays,
  todayUTC,
  dropUnfinishedDays,
  trimTrailingZeros,
  keepLatestDays,
  fillMissingDays,
  buildStats,
  alignEndDates,
} from '../math/trendMath.js'

// ===========================================================================
// 1. SETTINGS
// ===========================================================================

const TOP_COUNT = 20
const lastWeekUrl = (names) => `https://api.npmjs.org/downloads/point/last-week/${names.join(',')}`
// Ask for a few spare days at the start; the newest days may not be published yet
const rangeUrl = (names) => {
  const start = addDays(todayUTC(), -(WINDOW_DAYS + 5))
  const end = addDays(todayUTC(), -1)
  return `https://api.npmjs.org/downloads/range/${start}:${end}/${names.join(',')}`
}
const detailsUrl = (name) => `https://registry.npmjs.org/${name}/latest`

// ===========================================================================
// 2. STEP 1: which 20 packages (ranked by last week's downloads)
// ===========================================================================

/**
 * Bulk reply looks like:
 *   { react: { downloads: 187962192, package: 'react', start, end }, lodash: {...}, ... }
 * A package npm doesn't know comes back as null, so it's skipped.
 */
export async function fetchTopNpmPackages() {
  const json = await getJson(lastWeekUrl(NPM_CANDIDATES))
  return Object.values(json)
    .filter((entry) => entry && typeof entry.downloads === 'number')
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, TOP_COUNT)
    .map((entry, index) => ({ rank: index + 1, name: entry.package, lastWeek: entry.downloads }))
}

// ===========================================================================
// 3. STEP 2: daily history for the 20 (one bulk request)
// ===========================================================================

/**
 * Bulk reply looks like:
 *   { react: { start, end, package, downloads: [{ day: '2026-10-12', downloads: 34927798 }, ...] }, ... }
 * (If only one package is asked for, npm replies with that object directly, not keyed by name.)
 */
export async function fetchNpmHistory(names) {
  const json = await getJson(rangeUrl(names))
  return names.length === 1 ? { [names[0]]: json } : json
}

/**
 * One package's reply → [{ date, downloads }]:
 * finished days only, not-yet-published days removed, npm's missing days filled,
 * then the standard 90-day window.
 */
export function toNpmDailyTotals(entry) {
  const days = (entry && entry.downloads ? entry.downloads : [])
    .map((d) => ({ date: d.day, downloads: d.downloads || 0 }))
    .sort((a, b) => a.date.localeCompare(b.date))
  return keepLatestDays(fillMissingDays(trimTrailingZeros(dropUnfinishedDays(days))))
}

// ===========================================================================
// 4. STEP 3: description, version and licence (one small request per package)
// ===========================================================================

/** One package's description, latest version and licence from the npm registry. */
export async function fetchNpmDetails(name) {
  const json = await getJson(detailsUrl(name))
  const licence =
    typeof json.license === 'string' ? json.license : json.license && json.license.type
  return {
    description: (json.description || '').trim(),
    latestVersion: json.version || null,
    licence: licence || null,
  }
}

// ===========================================================================
// 5. MAIN FUNCTION
// ===========================================================================

/** Loads everything for the JavaScript tab. Throws if no package could be loaded at all. */
export async function loadNpmTrending() {
  // Step 1: which 20
  const top = await fetchTopNpmPackages()
  const names = top.map((pkg) => pkg.name)

  // Steps 2 and 3 at the same time: history (1 request) + details (20 requests)
  const [history, details] = await Promise.all([
    fetchNpmHistory(names),
    Promise.allSettled(names.map(fetchNpmDetails)),
  ])

  const loaded = []
  const failed = []
  top.forEach((pkg, i) => {
    const days = toNpmDailyTotals(history[pkg.name])
    if (days.length === 0) {
      failed.push({ name: pkg.name, reason: 'No download history returned' })
      return
    }
    const extra = details[i].status === 'fulfilled' ? details[i].value : { description: '' }
    loaded.push({
      info: {
        rank: pkg.rank,
        name: pkg.name,
        url: `https://www.npmjs.com/package/${pkg.name}`,
        ...extra,
      },
      days,
    })
  })
  if (loaded.length === 0) throw new Error('Could not load download data for any npm package.')

  // Same last day for every package, then compute daily/weekly/monthly
  const { dataUpTo, lists } = alignEndDates(loaded.map((item) => item.days))
  const packages = loaded.map((item, i) => buildStats(item.info, lists[i]))

  return {
    ecosystem: 'javascript',
    fetchedAt: new Date().toISOString(),
    dataUpTo,
    packages,
    failed,
  }
}
