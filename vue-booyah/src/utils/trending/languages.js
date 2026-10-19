/**
 * src/utils/trending/languages.js
 *
 * What it does:  the settings for the three languages on Trending → Languages
 *                (name, registry, accent colour, and which loader fetches its data),
 *                plus the helper that ranks a language's packages for a period.
 * Receives:      nothing to set up; rankPackages() receives a package list and a period.
 * Gives back:    LANGUAGES, languageById(), lineAccent(), rankPackages().
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

/** WCAG contrast of a colour ([r, g, b], 0–255) against white. */
function contrastOnWhite(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05)
}

/**
 * The accent darkened just enough to stand out on the light theme's white cards (3.5:1), for
 * lines, dots, borders and chart strokes. Bright accents need it (JavaScript's yellow is only
 * 1.35:1 on white); dark ones like PHP's already pass and come back unchanged.
 */
function inkOnLight(hex) {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  let mixed = rgb
  for (let black = 0.05; contrastOnWhite(mixed) < 3.5 && black <= 1; black += 0.05) {
    mixed = rgb.map((v) => v * (1 - black))
  }
  return '#' + mixed.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
}

// ---------------------------------------------------------------------------
// The three languages
// ---------------------------------------------------------------------------

/**
 * Builds one language's settings object. Adds `onAccent` (the text colour for its accent) and
 * `accentInk` (the accent for lines on the light theme, see inkOnLight()).
 */
function language(id, name, registry, accent, load) {
  return {
    id,
    name,
    registry,
    accent,
    accentInk: inkOnLight(accent),
    onAccent: textOn(accent),
    load,
  }
}

/** The tabs, in the order they appear on the page. */
export const LANGUAGES = [
  language('javascript', 'JavaScript', 'npm', getLangColor('JavaScript'), loadNpmTrending),
  language('php', 'PHP', 'Packagist', getLangColor('PHP'), loadPhpTrending),
  language('rust', 'Rust', 'crates.io', getLangColor('Rust'), loadRustTrending),
]

/** Finds a language's settings by its id, e.g. 'php'. */
export const languageById = (id) => LANGUAGES.find((l) => l.id === id)

/**
 * The colour to draw a language's lines, dots and chart strokes with: its accent on the dark
 * theme, `accentInk` on the light one. For D3 and inline styles, where CSS can't pick per theme.
 */
export const lineAccent = (lang, theme) => (theme === 'light' ? lang.accentInk : lang.accent)

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
