// Language colors for the languages GitHub shows on repositories.
//
// Every color is picked to be easy to tell apart from the others, and to stay visible on both the
// dark and the light theme. The most common languages (the first group) are the furthest apart.
// Where a language has a familiar color (Vue green, JavaScript yellow, Go cyan...) the color stays close to it.
export const langColors = {
    // --- Most used on GitHub -----------------------------------------
    JavaScript: '#f1e05a',
    Python: '#4584c9',
    TypeScript: '#5a70f5',
    Java: '#b66b30',
    'C#': '#159b05',
    'C++': '#f14e7b',
    C: '#e781fe',
    PHP: '#915ce5',
    Go: '#00ADD8',
    Rust: '#ff8a4c', // (was grey #484f58 originally, swap back if you prefer)
    Ruby: '#bb5f72',
    Swift: '#d17563',
    Kotlin: '#8582f0',
    Dart: '#32c9c7',
    HTML: '#e34c26',
    CSS: '#ca40a1',
    Vue: '#41b883',
    Shell: '#36d261',

    // --- Popular -----------------------------------------------------
    'Jupyter Notebook': '#da7306',
    SCSS: '#d63a80',
    Lua: '#0c7cf4',
    R: '#1f98ed',
    Scala: '#dd3956',
    'Objective-C': '#75a2ec',
    Perl: '#0baa92',
    Haskell: '#7d73c3',
    Elixir: '#a963a0',
    Clojure: '#f5746b',
    MATLAB: '#d78f4c',
    PowerShell: '#089772',
    Svelte: '#ff609c',
    Julia: '#a97cc9',
    Groovy: '#66baf7',
    Dockerfile: '#a2a8fc',
    Makefile: '#718c33',
    CMake: '#d664a3',
    TeX: '#a07a0c',
    Assembly: '#ad8f2a',
    Zig: '#f49191',
    Solidity: '#dc80a4',
    GDScript: '#a9be31',
    Astro: '#d7a94f',
    Nix: '#ae6bf3',
    OCaml: '#9bab4f',
    'F#': '#ad50cf',

    // --- Also common -------------------------------------------------
    Erlang: '#db57bc',
    CoffeeScript: '#6f8fdc',
    Elm: '#06b7bf',
    Crystal: '#61bc20',
    Nim: '#f49923',
    Fortran: '#c85fd9',
    Pascal: '#85c814',
    'Visual Basic .NET': '#be75b0',
    Batchfile: '#84c47d',
    'Vim Script': '#07b03a',
    'Emacs Lisp': '#cb76fa',
    'Common Lisp': '#5aa667',
    Racket: '#9b96e9',
    Scheme: '#21abfc',
    Cuda: '#10d095',
    Verilog: '#d996da',
    SQL: '#bf9e3d',
    PLpgSQL: '#cf7187',
    TSQL: '#f45152',
    Apex: '#b287f5',
    Less: '#67a634',
    Sass: '#f165c4',
    HCL: '#d17cd9',
    Hack: '#fc78e1',
    Raku: '#cd93ff',
    Mojo: '#fb83bf',

    'No language': '#6e7681'
}

// Other names GitHub or other tools use for the same language
const aliases = {
    TSX: 'TypeScript',
    JSX: 'JavaScript',
    'Vim script': 'Vim Script',
    'Visual Basic': 'Visual Basic .NET',
    'Objective-C++': 'Objective-C',
    'Literate Haskell': 'Haskell',
    'Vim Snippet': 'Vim Script'
}

// Lowercase lookup so "typescript", "TYPESCRIPT" and "TypeScript" all resolve.
const lowerCaseColors = Object.fromEntries(
    Object.entries(langColors).map(([name, color]) => [name.toLowerCase(), color])
)

function hslToHex(h, s, l) {
    s /= 100
    l /= 100
    const k = (n) => (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, '0')
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}

// A language that is not in the list still gets its own color, and always the same one,
// so two unknown languages do not end up looking identical.
function generatedColor(name) {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = (hash * 31 + name.charCodeAt(i)) >>> 0
    }
    return hslToHex(hash % 360, 62, 60)
}

export function getLangColor(lang) {
    if (!lang) return langColors['No language']
    const name = aliases[lang] || lang
    return langColors[name] || lowerCaseColors[String(name).toLowerCase()] || generatedColor(String(name))
}