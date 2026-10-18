/**
 * src/utils/trending/math/compareMath.js
 *
 * What it does:  works out everything the "compare two packages" popup shows: the six table rows
 *                (with ✓ for the better side), the one-sentence verdict, the notes, and the data
 *                for both chart lines. Works the same for JavaScript, PHP and Rust packages.
 * Receives:      buildComparison(a, b, period)
 *                  a, b    two package cards (from trendMath.buildStats), each with an extra
 *                          `language` field { id, name, registry, … } and its `displayRank`
 *                  period  'daily' | 'weekly' | 'monthly'
 * Gives back:    { from, to, sides: [A, B], rows, verdict, notes, series }
 * Used by:       compare/compareView.vue and tests/trending/testCompare.js.
 */

import { groupIntoBlocks, percentChange } from './trendMath.js'
import { pct, PERIOD_INFO } from '../helpers/format.js'

// ---------------------------------------------------------------------------
// Settings: change these to tune the verdict rules
// ---------------------------------------------------------------------------

const SAME_SIZE_RATIO = 1.2 // less than 1.2× bigger → "about the same amount"
const SIMILAR_CHANGE_POINTS = 1 // changes less than 1 percentage point apart → "similar pace"
const WEEKDAY_NOTE_POINTS = 10 // weekday shares 10+ points apart → add the weekend-use note
const TREND_THRESHOLD = 5 // 90-day trend: over +5% Growing, under −5% Declining, else Steady
const TREND_DAYS = 28 // the 90-day trend compares the first and last 28 days (see trend90)

// ---------------------------------------------------------------------------
// 1. Line both packages up to the same dates
// ---------------------------------------------------------------------------

/**
 * Different registries can end on different days (npm is often a few days behind).
 * Keeps only the dates BOTH packages have, so every number compares the same days.
 * Returns { a, b }: the two daily lists, trimmed to the shared dates.
 */
export function alignDays(dailyA, dailyB) {
  const datesB = new Set(dailyB.map((d) => d.date))
  const shared = new Set(dailyA.filter((d) => datesB.has(d.date)).map((d) => d.date))
  return {
    a: dailyA.filter((d) => shared.has(d.date)),
    b: dailyB.filter((d) => shared.has(d.date)),
  }
}

// ---------------------------------------------------------------------------
// 2. The numbers for one side
// ---------------------------------------------------------------------------

/** Adds up the downloads of a list of days. */
const sum = (days) => days.reduce((total, d) => total + d.downloads, 0)

/**
 * 90-day trend: the last 4 weeks vs the first 4 weeks, as a % (e.g. 23.2 = +23.2%).
 * Uses 28 days (4 whole weeks), not 30, so both ends contain the same number of weekends.
 * Otherwise a flat package could look like it's growing or shrinking.
 * Returns null when there aren't enough days.
 */
export function trend90(days) {
  if (days.length < TREND_DAYS * 2) return null
  const first = sum(days.slice(0, TREND_DAYS))
  const last = sum(days.slice(-TREND_DAYS))
  return first ? Math.round(((last - first) / first) * 1000) / 10 : null
}

/** Turns a 90-day trend % into a word: 'Growing', 'Declining', 'Steady' or 'Not enough data'. */
export function trendLabel(percent) {
  if (percent === null) return 'Not enough data'
  if (percent > TREND_THRESHOLD) return 'Growing'
  if (percent < -TREND_THRESHOLD) return 'Declining'
  return 'Steady'
}

/** The share of downloads that happen Monday–Friday, as a whole % (e.g. 83). */
export function weekdayShare(days) {
  const total = sum(days)
  if (!total) return null
  const weekdays = days.filter((d) => {
    const day = new Date(d.date + 'T00:00:00Z').getUTCDay() // 0 = Sunday, 6 = Saturday
    return day !== 0 && day !== 6
  })
  return Math.round((sum(weekdays) / total) * 100)
}

/** Every number for one side, worked out on the lined-up days. Returns one "side" object. */
function sideStats(pkg, days, period) {
  const blocks = period === 'daily' ? days : groupIntoBlocks(days, PERIOD_INFO[period].days)
  const latest = blocks.length ? blocks[blocks.length - 1].downloads : null
  const trend = trend90(days)
  return {
    name: pkg.name,
    language: pkg.language,
    size: latest,
    change: percentChange(blocks),
    averagePerDay: latest === null ? null : latest / PERIOD_INFO[period].days,
    trend,
    trendLabel: trendLabel(trend),
    weekdayShare: weekdayShare(days),
    rank: pkg.displayRank ?? pkg.rank ?? null,
  }
}

// ---------------------------------------------------------------------------
// 3. The verdict sentence
// ---------------------------------------------------------------------------

/** How many times bigger, as text: 6.04 → '6×', 1.47 → '1.5×'. */
function times(ratio) {
  return ratio < 2 ? `${ratio.toFixed(1)}×` : `${Math.round(ratio)}×`
}

/**
 * Writes the one-sentence summary at the bottom of the compare popup. It's built in 3 parts:
 *   1. Size:   "A is downloaded about 6× more than B"  (or "about the same amount" under 1.2×)
 *   2. Change: how their latest % changes compare. Changes less than 1 point apart count as
 *              "a similar pace"; otherwise it says who is growing faster (or shrinking less).
 *   3. Usage:  only if their weekday shares are 10+ points apart, a note that the one with
 *              more weekend downloads is used more for hobby and side projects.
 * Returns the sentence as a string.
 */
export function verdictSentence(A, B) {
  // Part 1: size
  const [big, small] = (A.size ?? 0) >= (B.size ?? 0) ? [A, B] : [B, A]
  const ratio = small.size ? big.size / small.size : Infinity
  const sameSize = ratio < SAME_SIZE_RATIO

  let text = sameSize
    ? `${A.name} and ${B.name} are downloaded about the same amount`
    : `${big.name} is downloaded about ${Number.isFinite(ratio) ? times(ratio) : 'far'} more than ${small.name}`

  // Part 2: change (skipped if either side has no % change)
  if (A.change !== null && B.change !== null) {
    const gap = Math.abs(A.change - B.change)
    const [fast, slow] = A.change >= B.change ? [A, B] : [B, A]
    const pair = `(${pct(fast.change)} vs ${pct(slow.change)})`

    if (gap < SIMILAR_CHANGE_POINTS) {
      text +=
        A.change >= 0 && B.change >= 0
          ? ', and both are growing at a similar pace'
          : A.change < 0 && B.change < 0
            ? ', and both are shrinking at a similar pace'
            : ', and both are roughly flat'
    } else if (A.change < 0 && B.change < 0) {
      text += `, but both are shrinking, ${fast.name} less so ${pair}`
    } else if (sameSize) {
      text += `, but ${fast.name} is growing faster ${pair}`
    } else if (fast === big) {
      text += `, and it's growing faster too ${pair}`
    } else {
      text += `, but ${fast.name} is growing faster ${pair}`
    }
  }
  text += '.'

  // Part 3: usage note (only when the weekday shares are clearly different)
  if (
    A.weekdayShare !== null &&
    B.weekdayShare !== null &&
    Math.abs(A.weekdayShare - B.weekdayShare) >= WEEKDAY_NOTE_POINTS
  ) {
    const hobby = A.weekdayShare < B.weekdayShare ? A : B
    text += ` ${hobby.name} gets more of its downloads at weekends, a sign of more hobby and side-project use.`
  }
  return text
}

// ---------------------------------------------------------------------------
// 4. Everything together
// ---------------------------------------------------------------------------

/** Which side "wins" a table row: 'a', 'b', or null (a tie, or a value is missing). */
function winner(x, y) {
  if (x === null || y === null || x === y) return null
  return x > y ? 'a' : 'b'
}

/**
 * Growth view data: each point as a % of the list's FIRST point, so both lines start at 100.
 * e.g. 112 means "12% higher than at the start". Returns the same list with an `index` added.
 */
export function toGrowth(blocks) {
  const base = blocks.length ? blocks[0].downloads : 0
  return blocks.map((block) => ({
    ...block,
    index: base ? Math.round((block.downloads / base) * 1000) / 10 : null,
  }))
}

/**
 * The main function: compares two packages for one period.
 * Returns { from, to, sides, rows, verdict, notes, series } (see the top of this file).
 */
export function buildComparison(a, b, period) {
  const { a: daysA, b: daysB } = alignDays(a.daily, b.daily)
  const A = sideStats(a, daysA, period)
  const B = sideStats(b, daysB, period)
  const words = PERIOD_INFO[period]
  const sameLanguage = a.language && b.language && a.language.id === b.language.id

  // The six rows. Only rows where "more" clearly means "better" get a winner (✓).
  const rows = [
    {
      key: 'size',
      label: `Downloads, ${words.latest}`,
      a: A.size,
      b: B.size,
      win: winner(A.size, B.size),
    },
    {
      key: 'change',
      label: `Change vs previous ${words.unit}`,
      a: A.change,
      b: B.change,
      win: winner(A.change, B.change),
    },
    {
      key: 'averagePerDay',
      label: 'Average per day',
      a: A.averagePerDay,
      b: B.averagePerDay,
      win: winner(A.averagePerDay, B.averagePerDay),
    },
    {
      key: 'trend',
      label: '90-day trend',
      a: A.trend,
      b: B.trend,
      aLabel: A.trendLabel,
      bLabel: B.trendLabel,
      win: winner(A.trend, B.trend),
    },
    {
      key: 'weekdayShare',
      label: 'Weekday share',
      a: A.weekdayShare,
      b: B.weekdayShare,
      win: null,
    },
    { key: 'rank', label: 'Rank in its language', a: A.rank, b: B.rank, win: null },
  ]

  // Small print under the verdict
  const notes = []
  if (period === 'daily')
    notes.push(
      'Daily numbers swing between weekdays and weekends; the weekly view is more reliable.',
    )
  if (!sameLanguage)
    notes.push(
      'Each registry counts downloads differently, so the growth comparison is the fairer one.',
    )

  // Chart data for both lines, on the same dates
  const blocksA = period === 'daily' ? daysA : groupIntoBlocks(daysA, PERIOD_INFO[period].days)
  const blocksB = period === 'daily' ? daysB : groupIntoBlocks(daysB, PERIOD_INFO[period].days)

  return {
    from: daysA.length ? daysA[0].date : null,
    to: daysA.length ? daysA[daysA.length - 1].date : null,
    sides: [A, B],
    rows,
    verdict: verdictSentence(A, B),
    notes,
    series: {
      a: blocksA,
      b: blocksB,
      growthA: toGrowth(blocksA),
      growthB: toGrowth(blocksB),
    },
  }
}
