/**
 * src/utils/trending/helpers/packageLinks.js
 *
 * What it does:  builds the link to a package's page on its registry website
 *                (where people can read how to install and use it).
 * Receives:      a language id ('javascript' | 'php' | 'rust') and a package name.
 * Gives back:    the full URL, or null if either is missing (the Explore button then hides).
 * Used by:       detail/packageDashboard.vue (the "Explore ↗" button).
 */

// Each registry's package pages start the same way; only the name changes at the end.
// PHP names already include the vendor ("psr/log"), so they're added as they are.
const REGISTRY_PAGES = {
  javascript: 'https://www.npmjs.com/package/',
  rust: 'https://crates.io/crates/',
  php: 'https://packagist.org/packages/',
}

/** The package's page on its registry, e.g. ('rust', 'syn') → 'https://crates.io/crates/syn'. */
export function packagePageUrl(language, name) {
  const start = REGISTRY_PAGES[language]
  if (!start || !name) return null
  return start + name
}
