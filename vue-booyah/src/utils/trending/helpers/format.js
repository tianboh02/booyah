/**
 * src/utils/trending/helpers/format.js
 *
 * What it does:  small helpers that turn raw numbers and dates into the text you see on the page,
 *                plus the wording for each period (Daily / Weekly / Monthly).
 *                They only change how things LOOK; the stored data always stays as plain numbers.
 * Receives:      numbers, % changes and 'YYYY-MM-DD' date strings.
 * Gives back:    strings ready to show, e.g. '72.4M', '+5.3%', '12 Oct'.
 * Used by:       nearly every Trending component, plus math/compareMath.js and the tests.
 */

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

/** Full number with commas: 72371526 → '72,371,526'. Missing values show as '–'. */
export function num(n) {
  return n === null || n === undefined ? '–' : Math.round(n).toLocaleString('en-US')
}

/** Short number: 72371526 → '72.4M', 5200 → '5.2K'. Missing values show as '–'. */
export function compact(n) {
  if (n === null || n === undefined) return '–'
  const abs = Math.abs(n)
  const short = (value) => String(Number(value.toFixed(1))) // 40.0 → '40', 37.25 → '37.3'
  if (abs >= 1e9) return short(n / 1e9) + 'B'
  if (abs >= 1e6) return short(n / 1e6) + 'M'
  if (abs >= 1e3) return short(n / 1e3) + 'K'
  return String(Math.round(n))
}

/** A % change as text: 5.3 → '+5.3%', -2.1 → '−2.1%' (a real minus sign). Missing → '–'. */
export function pct(p) {
  if (p === null || p === undefined) return '–'
  const sign = p > 0 ? '+' : p < 0 ? '−' : ''
  return `${sign}${Math.abs(p).toFixed(1)}%`
}

/** A % change → the CSS class that colours it: 'up' (green), 'down' (red) or 'flat' (grey). */
export function trendClass(change) {
  return change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
}

/** A % change → the arrow shown next to it: ▲ up, ▼ down, • no change. */
export function trendArrow(change) {
  return change > 0 ? '▲' : change < 0 ? '▼' : '•'
}

/** A position as words: 1 → '1st', 2 → '2nd', 3 → '3rd', 11 → '11th'. */
export function ordinal(n) {
  const rest = n % 100
  if (rest >= 11 && rest <= 13) return `${n}th` // 11th, 12th, 13th are the exceptions
  return n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th')
}

// ---------------------------------------------------------------------------
// Dates (always read in UTC, because the registries count days in UTC)
// ---------------------------------------------------------------------------

/** '2026-10-12' → '12 Oct' */
export function shortDate(dateString) {
  return new Date(dateString + 'T00:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

/** '2026-10-12' → '12 Oct 2026' */
export function longDate(dateString) {
  return new Date(dateString + 'T00:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** A chart point's label: a daily item → '12 Oct'; a weekly/monthly block → '6 Oct – 12 Oct'. */
export function itemLabel(item) {
  return item.date ? shortDate(item.date) : `${shortDate(item.start)} – ${shortDate(item.end)}`
}

/** '2026-07-13', '2026-10-13' → '13 Jul – 13 Oct 2026' (the year is shown once when both match). */
export function dateRange(from, to) {
  if (!from || !to) return ''
  const sameYear = from.slice(0, 4) === to.slice(0, 4)
  return `${sameYear ? shortDate(from) : longDate(from)} – ${longDate(to)}`
}

// ---------------------------------------------------------------------------
// Periods
// ---------------------------------------------------------------------------

/** The three periods, in the order the toggle shows them. */
export const PERIODS = ['daily', 'weekly', 'monthly']

/**
 * Everything each period needs, in one place:
 *   label     the toggle text
 *   latest    how the newest block is described ("last 7 days")
 *   previous  how the block before it is described
 *   unit      used in "vs previous week"
 *   days      how many days one block covers
 */
export const PERIOD_INFO = {
  // daily compares with the same weekday a week earlier (see DAILY_COMPARE_BACK in math/trendMath.js)
  daily: {
    label: 'Daily',
    latest: 'latest day',
    previous: 'the same day last week',
    unit: 'day',
    days: 1,
  },
  weekly: {
    label: 'Weekly',
    latest: 'last 7 days',
    previous: 'the 7 days before',
    unit: 'week',
    days: 7,
  },
  monthly: {
    label: 'Monthly',
    latest: 'last 30 days',
    previous: 'the 30 days before',
    unit: '30 days',
    days: 30,
  },
}
