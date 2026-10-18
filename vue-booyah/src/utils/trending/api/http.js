/**
 * src/utils/trending/api/http.js
 *
 * What it does:  the one shared "fetch this URL as JSON" helper for the three registry loaders.
 * Receives:      a URL (and optional fetch options).
 * Gives back:    the parsed JSON, or throws an Error like "HTTP 404".
 * Used by:       api/npmDownloads.js, api/phpDownloads.js, api/rustDownloads.js.
 */

/**
 * Fetches a URL and returns its JSON.
 * Throws an error like "HTTP 404" if the server answers with an error code,
 * so the caller can show "Couldn't load…" instead of using bad data.
 * `options` is passed straight to fetch() (only crates.io uses it, for its User-Agent).
 */
export async function getJson(url, options = {}) {
  const response = await fetch(url, options)
  if (!response.ok) throw new Error(`HTTP ${response.status}`) // e.g. 404 = not found, 429 = too many requests
  return response.json()
}
