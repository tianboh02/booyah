/**
 * src/utils/trending/api/npmCandidates.js
 *
 * What it does:  the list of 60 npm packages the JavaScript tab chooses its top 20 from.
 *                npm has no "most downloaded packages" API, so we start from a published list.
 * Gives back:    NPM_CANDIDATES (an array of package names).
 * Used by:       api/npmDownloads.js.
 *
 * Source: the `npm-high-impact` package by Titus Wormer (wooorm), version 1.13.0 (June 2026),
 * list `npmTopDownloads` (packages sorted by downloads, most first).
 * https://github.com/wooorm/npm-high-impact
 *
 * These are its top 60 unscoped names. (npm's bulk download API doesn't accept
 * scoped names like @types/node, so those are left out.)
 * npmDownloads.js re-ranks them with LIVE last-week downloads and keeps the top 20,
 * so the order on the page is always current even if this list ages.
 *
 * To refresh: npm install npm-high-impact, then
 *   node -e "import('npm-high-impact').then(m => console.log(JSON.stringify(m.npmTopDownloads.filter(n => !n.startsWith('@')).slice(0, 60))))"
 */
export const NPM_CANDIDATES = [
  'semver',
  'minimatch',
  'debug',
  'ansi-styles',
  'brace-expansion',
  'strip-ansi',
  'ansi-regex',
  'ms',
  'supports-color',
  'chalk',
  'commander',
  'lru-cache',
  'string-width',
  'wrap-ansi',
  'tslib',
  'picomatch',
  'emoji-regex',
  'glob',
  'type-fest',
  'color-name',
  'eslint-visitor-keys',
  'color-convert',
  'ajv',
  'minipass',
  'source-map',
  'balanced-match',
  'readable-stream',
  'which',
  'glob-parent',
  'escape-string-regexp',
  'has-flag',
  'find-up',
  'locate-path',
  'json-schema-traverse',
  'p-limit',
  'yallist',
  'safe-buffer',
  'uuid',
  'p-locate',
  'undici-types',
  'ignore',
  'iconv-lite',
  'signal-exit',
  'esbuild',
  'is-fullwidth-code-point',
  'js-yaml',
  'entities',
  'globals',
  'postcss',
  'isexe',
  'isarray',
  'path-key',
  'string_decoder',
  'argparse',
  'ws',
  'mime-db',
  'resolve',
  'agent-base',
  'yargs-parser',
  'mime-types',
]
