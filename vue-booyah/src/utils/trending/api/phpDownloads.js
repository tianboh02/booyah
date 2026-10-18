/**
 * src/utils/trending/api/phpDownloads.js
 *
 * What it does:  loads the PHP tab: the top 20 Packagist packages and ~90 days of their downloads.
 *   Endpoint 1: popular.json (3 pages of 100) → re-sorted by ALL-TIME downloads → top 20
 *               (Packagist sorts this list by last week's downloads, but each entry also
 *                carries its all-time total, which we sort by. See https://packagist.org/apidoc)
 *   Endpoint 3: stats/all.json?average=daily&from=<date>
 *               → daily downloads for one package (one request each)
 *   Endpoint 2 (stats.json) isn't needed: its all-time total is already in endpoint 1.
 * Receives:      nothing.
 * Gives back:    loadPhpTrending() → { ecosystem, fetchedAt, dataUpTo, packages, failed }
 *                (the same shape as the npm and Rust loaders).
 * Used by:       languages.js (the PHP tab) and the tests in tests/trending/.
 */

import {
  WINDOW_DAYS,
  addDays,
  todayUTC,
  dropUnfinishedDays,
  keepLatestDays,
  fillMissingDays,
  buildStats,
  alignEndDates,
} from '../math/trendMath.js'
import { getJson } from './http.js'

// ===========================================================================
// 1. SETTINGS
// ===========================================================================

const TOP_COUNT = 20

// endpoint 1. Packagist orders this list by LAST WEEK's downloads, so we take its top 300
// (3 pages of 100) and re-sort them by ALL-TIME downloads ourselves.
const POPULAR_PAGES = 3

// Packagist's CDN caches each reply for 15 minutes, including the CORS header naming the
// website that asked first. Without this, a page on another address (e.g. localhost:5173
// vs the live site) gets that cached reply and the browser blocks it. Adding our address
// to the URL gives every website its own cached copy. Packagist ignores the extra field.
const ORIGIN_TAG =
  typeof location !== 'undefined' ? `&origin=${encodeURIComponent(location.host)}` : ''

const popularUrl = (page) =>
  `https://packagist.org/explore/popular.json?page=${page}&per_page=100${ORIGIN_TAG}`
// endpoint 3. `from` keeps the reply small: without it, Packagist sends every day since 2012
const statsUrl = (name, from) =>
  `https://packagist.org/packages/${name}/stats/all.json?average=daily&from=${from}${ORIGIN_TAG}`

// ===========================================================================
// 2. FETCHING FROM PACKAGIST
// ===========================================================================

/**
 * Endpoint 1: the top 20 packages by ALL-TIME downloads.
 *  1. Fetch Packagist's 300 most popular packages (3 pages, sent at the same time)
 *  2. Sort them by their `downloads` field, which is the all-time total
 *  3. Keep the top 20
 * Any all-time giant is still downloaded heavily every week, so it will be inside the top 300.
 */
export async function fetchTopPhpPackages() {
  const pages = await Promise.allSettled(
    Array.from({ length: POPULAR_PAGES }, (_, i) => getJson(popularUrl(i + 1))),
  )
  const loaded = pages.filter((p) => p.status === 'fulfilled').map((p) => p.value.packages || [])
  if (loaded.length === 0) throw new Error('Could not load the Packagist popular list.')

  // Merge the pages, drop any duplicates, sort by all-time downloads (biggest first)
  const byName = new Map()
  loaded.flat().forEach((pkg) => byName.set(pkg.name, pkg))
  const sorted = [...byName.values()].sort((a, b) => b.downloads - a.downloads)

  return sorted.slice(0, TOP_COUNT).map((pkg, index) => ({
    rank: index + 1, // 1 = most downloaded of all time
    name: pkg.name, // e.g. 'monolog/monolog'
    description: (pkg.description || '').trim(),
    allTimeDownloads: pkg.downloads,
    url: pkg.url,
  }))
}

/** Endpoint 3: daily downloads for one package, starting from `from` */
export function fetchPhpDownloads(name, from) {
  return getJson(statsUrl(name, from))
}

// ===========================================================================
// 3. CLEANING THE DATA
// ===========================================================================

/**
 * Packagist keeps dates and numbers in two separate lists:
 *   { labels: ['2026-09-25', ...], values: { 'monolog/monolog': [856324, ...] } }
 * This pairs them up into our usual list:
 *   [{ date: '2026-09-25', downloads: 856324 }, ...]
 */
export function toPhpDailyTotals(raw, name) {
  const labels = raw.labels || []
  // The numbers are stored under the package's name; fall back to the first list if the key differs
  const values = (raw.values && (raw.values[name] || Object.values(raw.values)[0])) || []

  const days = labels
    .map((date, i) => ({ date, downloads: Number(values[i]) || 0 }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Keep finished days only, fill any gaps, then the standard 90-day window
  return keepLatestDays(fillMissingDays(dropUnfinishedDays(days)))
}

// ===========================================================================
// 4. MAIN FUNCTION
// ===========================================================================

/** Loads everything for the PHP tab. Throws if no package could be loaded at all. */
export async function loadPhpTrending() {
  // a) Endpoint 1: which 20 packages
  const top = await fetchTopPhpPackages()

  // b) Endpoint 3: all 20 at the same time, asking only for the last ~90 days (a few spare)
  const from = addDays(todayUTC(), -(WINDOW_DAYS + 4))
  const results = await Promise.allSettled(top.map((pkg) => fetchPhpDownloads(pkg.name, from)))

  const loaded = []
  const failed = []
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      loaded.push({ info: top[i], days: toPhpDailyTotals(result.value, top[i].name) })
    } else {
      failed.push({ name: top[i].name, reason: result.reason.message })
    }
  })
  if (loaded.length === 0) throw new Error('Could not load download data for any PHP package.')

  // c) Same last day for every package, then compute daily/weekly/monthly
  const { dataUpTo, lists } = alignEndDates(loaded.map((item) => item.days))
  const packages = loaded.map((item, i) => buildStats(item.info, lists[i]))

  return { ecosystem: 'php', fetchedAt: new Date().toISOString(), dataUpTo, packages, failed }
}
