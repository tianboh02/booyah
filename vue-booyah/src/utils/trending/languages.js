/**
 * src/utils/trending/languages.js
 *
 * What it does:  the settings for the three languages on Trending → Languages
 *                (name, registry, accent colour, and which loader fetches its data),
 *                plus the helper that ranks a language's packages for a period.
 * Receives:      nothing to set up; rankPackages() receives a package list and a period.
 * Gives back:    LANGUAGES, languageById(), rankPackages().
 *                Every language's `load()` returns the same shape:
 *                { ecosystem, fetchedAt, dataUpTo, packages, failed }
 * Used by:       languages/languagesSection.vue.
 */

import { getLangColor } from '@/utils/langColors'
import { loadNpmTrending } from './api/npmDownloads.js'
import { loadPhpTrending } from './api/phpDownloads.js'
import { loadRustTrending } from './api/rustDownloads.js'

/**
 * Picks readable text for a coloured background: dark text on bright accents
 * (e.g. JavaScript's yellow), white text on dark ones (e.g. PHP's #4F5D95).
 * Uses the standard "relative luminance" formula; returns a hex colour.
 */
function textOn(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.45 ? '#0b0c0e' : '#ffffff'
}

// ---------------------------------------------------------------------------
// The three languages
// ---------------------------------------------------------------------------

/** Builds one language's settings object (adds `onAccent`, the text colour for its accent). */
function language(id, name, registry, accent, load) {
  return { id, name, registry, accent, onAccent: textOn(accent), load }
}

/** The tabs, in the order they appear on the page. */
export const LANGUAGES = [
  language('javascript', 'JavaScript', 'npm', getLangColor('JavaScript'), loadNpmTrending),
  language('php', 'PHP', 'Packagist', getLangColor('PHP'), loadPhpTrending),
  language('rust', 'Rust', 'crates.io', getLangColor('Rust'), loadRustTrending),
]

/** Finds a language's settings by its id, e.g. 'php'. */
export const languageById = (id) => LANGUAGES.find((l) => l.id === id)

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

/**
 * Orders the packages by their latest downloads for the chosen period (most first)
 * and gives each one a `displayRank` (1 = most downloaded). Returns a new list.
 */
export function rankPackages(packages, period) {
  return [...packages]
    .sort((a, b) => (b.latest[period] || 0) - (a.latest[period] || 0))
    .map((pkg, i) => ({ ...pkg, displayRank: i + 1 }))
}
