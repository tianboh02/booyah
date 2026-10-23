/**
 * src/utils/trending/api/http.js
 *
 * What it does:  the one shared "get this URL as JSON" helper for the three registry loaders.
 * Receives:      a URL (and optional axios options).
 * Gives back:    the parsed JSON, or throws an Error like "HTTP 404".
 * Used by:       api/npmDownloads.js, api/phpDownloads.js, api/rustDownloads.js.
 */

import axios from 'axios'

/**
 * Gets a URL and returns its JSON.
 * Throws an error like "HTTP 404" if the server answers with an error code,
 * so the caller can show "Couldn't load…" instead of using bad data.
 * `options` is passed straight to axios.get() (only crates.io uses it, for its User-Agent).
 * Uses plain axios, not the API instance in src/api.js: that one is set up for our own backend.
 */
export async function getJson(url, options = {}) {
  try {
    const response = await axios.get(url, options)
    return response.data
  } catch (error) {
    // axios says "Request failed with status code 404"; keep our shorter "HTTP 404"
    if (error.response) throw new Error(`HTTP ${error.response.status}`, { cause: error }) // e.g. 404 = not found, 429 = too many requests
    throw error
  }
}
