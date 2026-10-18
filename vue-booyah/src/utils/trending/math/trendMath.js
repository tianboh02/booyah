/**
 * src/utils/trending/math/trendMath.js
 *
 * What it does:  the maths shared by all three language loaders (npm, Packagist, crates.io):
 *                cleaning daily numbers, grouping them into weeks/months, and working out % change.
 * Receives:      a daily list, the same simple shape for every registry:
 *                  [{ date: '2026-10-12', downloads: 5121642 }, ...]   one entry per day, oldest first
 * Gives back:    buildStats() turns that list into one "package card":
 *                  { ...info, daily, weekly, monthly, latest: {…}, changePercent: {…} }
 *                so all three languages end up in exactly the same shape.
 * Used by:       api/npmDownloads.js, api/phpDownloads.js, api/rustDownloads.js,
 *                math/compareMath.js and tests/trending/testAllDownloads.js.
 *
 * The order each loader uses:  drop unfinished days → (npm) trim trailing zeros → fill missing days
 *                              → keep the latest 89 days → line up end dates → buildStats()
 */

/** The last item of a list, or null if the list is empty. */
const lastOf = (list) => (list.length ? list[list.length - 1] : null)

// ---------------------------------------------------------------------------
// The standard window: every language keeps the same number of days
// ---------------------------------------------------------------------------

/**
 * 89 finished days ≈ 90 days. It's the most crates.io gives (90 days, minus today's
 * unfinished one), so all three languages use it and line up for comparisons.
 * Gives 12 weekly blocks and 2 monthly (30-day) blocks.
 */
export const WINDOW_DAYS = 89

/** Keeps only the most recent `count` days (oldest first) */
export function keepLatestDays(days, count = WINDOW_DAYS) {
  return days.slice(-count)
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** Adds days to a date string. addDays('2026-09-30', 1) → '2026-10-01' */
export function addDays(dateString, days) {
  const date = new Date(dateString + 'T00:00:00Z')
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Today's date in UTC, e.g. '2026-10-15' (the registries all count days in UTC) */
export function todayUTC() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Removes today (and anything later), because today's count isn't finished yet.
 * npm and Packagist normally only publish finished days; this is a safety net.
 */
export function dropUnfinishedDays(days) {
  const today = todayUTC()
  return days.filter((day) => day.date < today)
}

/**
 * Removes 0-download days at the very END of the list.
 * npm returns 0 for days it hasn't published yet, so these aren't real data.
 */
export function trimTrailingZeros(days) {
  let end = days.length
  while (end > 0 && days[end - 1].downloads === 0) end--
  return days.slice(0, end)
}

// ---------------------------------------------------------------------------
// Missing days ("the npm missing-day fix")
// npm sometimes records 0 downloads for a whole day by mistake (a gap in its logs, not real).
// A 0 in the middle of a busy package's history would make that week look like a crash,
// so we replace it with an estimate and mark it, and the chart's hover box says "Estimated".
// ---------------------------------------------------------------------------

/** Set to false to show npm's missing days as 0 instead of filling them in */
export const FILL_MISSING_DAYS = true

/**
 * Fills days that show 0 downloads for a package that is normally downloaded every day.
 * The estimate = average of the same weekday 1 and 2 weeks before and after.
 * Filled days get `estimated: true`, so the chart can say so.
 */
export function fillMissingDays(days) {
  if (!FILL_MISSING_DAYS) return days

  // "Normal" volume: the middle value of all non-zero days
  const nonZero = days
    .map((d) => d.downloads)
    .filter((n) => n > 0)
    .sort((a, b) => a - b)
  if (nonZero.length === 0) return days
  const typical = nonZero[Math.floor(nonZero.length / 2)]
  if (typical < 100) return days // tiny packages can really have 0-download days

  return days.map((day, i) => {
    if (day.downloads > 0) return day
    const neighbours = [i - 7, i + 7, i - 14, i + 14]
      .filter((j) => j >= 0 && j < days.length && days[j].downloads > 0)
      .map((j) => days[j].downloads)
    if (neighbours.length === 0) return day
    const estimate = Math.round(neighbours.reduce((a, b) => a + b, 0) / neighbours.length)
    return { ...day, downloads: estimate, estimated: true }
  })
}

// ---------------------------------------------------------------------------
// Weekly, monthly and % change
// ---------------------------------------------------------------------------

/**
 * Groups daily data into blocks of `size` days and adds each block up.
 * Counts back from the newest day, so the last block always ends on the latest day.
 * Leftover days at the oldest end that can't fill a whole block are left out.
 *   [{ start: '2026-09-29', end: '2026-10-05', downloads: 25000000 }, ...]   oldest first
 */
export function groupIntoBlocks(days, size) {
  const blocks = []
  for (let end = days.length; end - size >= 0; end -= size) {
    const block = days.slice(end - size, end)
    const entry = {
      start: block[0].date,
      end: block[block.length - 1].date,
      downloads: block.reduce((sum, day) => sum + day.downloads, 0),
    }
    const estimated = block.filter((day) => day.estimated).length
    if (estimated) entry.estimatedDays = estimated // only added when a block contains filled-in days
    blocks.unshift(entry)
  }
  return blocks
}

/**
 * % change between the latest entry in a list and the one before it.
 * Returns e.g. 4.2 (= +4.2%), rounded to 1 decimal place, or null if it can't be worked out.
 */
export function percentChange(list) {
  if (list.length < 2) return null
  const latest = list[list.length - 1].downloads
  const previous = list[list.length - 2].downloads
  if (previous === 0) return null
  return Math.round(((latest - previous) / previous) * 1000) / 10
}

/**
 * Builds one package card from its basic info and its daily list.
 * Same shape for every language:
 *   { ...info, daily, weekly, monthly, latest: {daily, weekly, monthly}, changePercent: {...} }
 */
export function buildStats(info, days) {
  const weekly = groupIntoBlocks(days, 7)
  const monthly = groupIntoBlocks(days, 30)
  return {
    ...info,
    daily: days,
    weekly,
    monthly,
    latest: {
      daily: lastOf(days) ? lastOf(days).downloads : null,
      weekly: lastOf(weekly) ? lastOf(weekly).downloads : null,
      monthly: lastOf(monthly) ? lastOf(monthly).downloads : null,
    },
    changePercent: {
      daily: percentChange(days),
      weekly: percentChange(weekly),
      monthly: percentChange(monthly),
    },
  }
}

// ---------------------------------------------------------------------------
// Lining up dates
// ---------------------------------------------------------------------------

/**
 * Lines every package up to the same last day (the earliest last day among them),
 * so "last 7 days" means the same 7 days for every package in a language.
 * Example: if 19 packages end on 12 Oct and one ends on 11 Oct, all 20 are cut to 11 Oct.
 * Returns { dataUpTo, lists } where lists are the trimmed daily lists.
 */
export function alignEndDates(dailyLists) {
  const ends = dailyLists
    .map((days) => lastOf(days))
    .filter(Boolean)
    .map((d) => d.date)
  const dataUpTo = ends.sort()[0]
  return { dataUpTo, lists: dailyLists.map((days) => days.filter((d) => d.date <= dataUpTo)) }
}
