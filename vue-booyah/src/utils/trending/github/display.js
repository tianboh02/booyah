/**
 * src/utils/trending/github/display.js
 *
 * What it does:  small helpers that turn GitHub numbers and dates into the text on the
 *                Top Repositories and Top Developers tabs.
 * Gives back:    timeAgo(), shortCount(), pad2(), mostCommon(), toPillLabels(), toLegend(),
 *                MEDALS, OTHER_COLOR.
 * Used by:       components/trending/repositories/*, components/trending/developers/*.
 */

/** '2026-10-14T09:00:00Z' → '5 days ago' (same wording as My Projects). */
export function timeAgo(isoString) {
  if (!isoString) return ''
  const seconds = Math.floor((Date.now() - new Date(isoString)) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`
  const years = Math.floor(days / 365)
  return `${years} year${years > 1 ? 's' : ''} ago`
}

/** 1234 → '1.2k', 254000 → '254k', 1500000 → '1.5M', null → '–'. */
export function shortCount(n) {
  if (n === null || n === undefined) return '–'
  if (n >= 1e6) return `${Number((n / 1e6).toFixed(1))}M`
  if (n >= 1e3) return `${Number((n / 1e3).toFixed(n >= 1e5 ? 0 : 1))}k`
  return String(n)
}

/** 3 → '03' (the rank numbers, like Discovery's). */
export const pad2 = (n) => String(n).padStart(2, '0')

/**
 * The most common value of `pick(item)` in a list (empty values skipped):
 * → { value, count } or null.
 */
export function mostCommon(list, pick) {
  const counts = {}
  for (const item of list) {
    const value = pick(item)
    if (value) counts[value] = (counts[value] || 0) + 1
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return best ? { value: best[0], count: best[1] } : null
}

/** Gold, silver and bronze for the top 3 rank badges (readable in both themes). */
export const MEDALS = ['#d4a72c', '#8c959f', '#c26c2b']

/** Colour of the "Other" share in a repo's language composition. */
export const OTHER_COLOR = '#8b949e'

/**
 * A repo's composition [{ name, pct, color }] (biggest first) → the legend under its bar:
 * the top `max` languages, with everything after them summed into one "Other".
 */
export function toLegend(composition, max = 3) {
  if (composition.length <= max + 1) return composition
  const rest = composition.slice(max).reduce((sum, part) => sum + part.pct, 0)
  return [...composition.slice(0, max), { name: 'Other', pct: rest, color: OTHER_COLOR }]
}

/**
 * [{ value, label }] → what periodToggle.vue's pill reads: { values: [...], labels: { value: { label } } }.
 */
export function toPillLabels(options) {
  return {
    values: options.map((o) => o.value),
    labels: Object.fromEntries(options.map((o) => [o.value, { label: o.label }])),
  }
}
