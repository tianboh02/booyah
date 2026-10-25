// src/utils/learnResources.js
// Learning links for each language shown on the Learn page.
// Keys match GitHub's language names (repo.language), so Discovery, Trending and My Projects all line up.
// Every link was checked when added; videos are freeCodeCamp full courses and Fireship "in 100 Seconds".

// Videos are stored as YouTube ids; resourcesFor() turns them into a link and a thumbnail.
const RESOURCES = {
    Python: {
        docs: 'https://docs.python.org/3/tutorial/',
        roadmap: 'https://roadmap.sh/python',
        exercism: 'https://exercism.org/tracks/python',
        videos: [
            { title: 'Python in 100 Seconds', by: 'Fireship', id: 'x7X9w_GIm1s' },
            { title: 'Learn Python - Full Course for Beginners', by: 'freeCodeCamp', id: 'rfscVS0vtbw' }
        ]
    },
    JavaScript: {
        docs: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting',
        roadmap: 'https://roadmap.sh/javascript',
        exercism: 'https://exercism.org/tracks/javascript',
        videos: [
            { title: 'JavaScript in 100 Seconds', by: 'Fireship', id: 'DHjqpvDnNGE' },
            { title: 'Learn JavaScript - Full Course for Beginners', by: 'freeCodeCamp', id: 'PkZNo7MFNFg' }
        ]
    },
    TypeScript: {
        docs: 'https://www.typescriptlang.org/docs/handbook/intro.html',
        roadmap: 'https://roadmap.sh/typescript',
        exercism: 'https://exercism.org/tracks/typescript',
        videos: [{ title: 'TypeScript in 100 Seconds', by: 'Fireship', id: 'zQnBQ4tB3ZA' }]
    },
    Go: {
        docs: 'https://go.dev/tour/',
        roadmap: 'https://roadmap.sh/golang',
        exercism: 'https://exercism.org/tracks/go',
        videos: [{ title: 'Go in 100 Seconds', by: 'Fireship', id: '446E-r0rXHI' }]
    },
    Rust: {
        docs: 'https://doc.rust-lang.org/book/',
        roadmap: 'https://roadmap.sh/rust',
        exercism: 'https://exercism.org/tracks/rust',
        videos: [{ title: 'Rust in 100 Seconds', by: 'Fireship', id: '5C_HPTJg5ek' }]
    },
    Java: {
        docs: 'https://dev.java/learn/',
        roadmap: 'https://roadmap.sh/java',
        exercism: 'https://exercism.org/tracks/java',
        videos: [{ title: 'Java in 100 Seconds', by: 'Fireship', id: 'l9AzO1FMgM8' }]
    },
    Kotlin: {
        docs: 'https://kotlinlang.org/docs/getting-started.html',
        roadmap: 'https://roadmap.sh/kotlin',
        exercism: 'https://exercism.org/tracks/kotlin',
        videos: [{ title: 'Kotlin in 100 Seconds', by: 'Fireship', id: 'xT8oP0wy-A0' }]
    },
    'C++': {
        docs: 'https://www.learncpp.com/',
        roadmap: 'https://roadmap.sh/cpp',
        exercism: 'https://exercism.org/tracks/cpp',
        videos: [{ title: 'C++ in 100 Seconds', by: 'Fireship', id: 'MNeX4EGtR5Y' }]
    },
    C: {
        docs: 'https://en.cppreference.com/w/c',
        roadmap: null,
        exercism: 'https://exercism.org/tracks/c',
        videos: [{ title: 'C in 100 Seconds', by: 'Fireship', id: 'U3aXWizDbQ4' }]
    },
    'C#': {
        docs: 'https://learn.microsoft.com/en-us/dotnet/csharp/',
        roadmap: 'https://roadmap.sh/aspnet-core',
        exercism: 'https://exercism.org/tracks/csharp',
        videos: [{ title: 'C# in 100 Seconds', by: 'Fireship', id: 'ravLFzIguCM' }]
    },
    Swift: {
        docs: 'https://docs.swift.org/swift-book/',
        roadmap: 'https://roadmap.sh/swift-ui',
        exercism: 'https://exercism.org/tracks/swift',
        videos: [{ title: 'Swift in 100 Seconds', by: 'Fireship', id: 'nAchMctX4YA' }]
    },
    Ruby: {
        docs: 'https://www.ruby-lang.org/en/documentation/quickstart/',
        roadmap: 'https://roadmap.sh/ruby',
        exercism: 'https://exercism.org/tracks/ruby',
        videos: [{ title: 'Ruby in 100 Seconds', by: 'Fireship', id: 'UYm0kfnRTJk' }]
    },
    PHP: {
        docs: 'https://www.php.net/manual/en/tutorial.php',
        roadmap: 'https://roadmap.sh/php',
        exercism: 'https://exercism.org/tracks/php',
        videos: [{ title: 'PHP in 100 Seconds', by: 'Fireship', id: 'a7_WFUlFS94' }]
    },
    Dart: {
        docs: 'https://dart.dev/language',
        roadmap: 'https://roadmap.sh/flutter',
        exercism: 'https://exercism.org/tracks/dart',
        videos: [{ title: 'Dart in 100 Seconds', by: 'Fireship', id: 'NrO0CJCbYLA' }]
    },
    Shell: {
        docs: 'https://www.gnu.org/software/bash/manual/bash.html',
        roadmap: 'https://roadmap.sh/shell-bash',
        exercism: 'https://exercism.org/tracks/bash',
        videos: [{ title: 'Bash in 100 Seconds', by: 'Fireship', id: 'I4EWvMFj37g' }]
    }
}

export const isKnownLanguage = (lang) => Object.hasOwn(RESOURCES, lang)

const toVideo = ({ title, by, id }) => ({
    title,
    by,
    url: `https://www.youtube.com/watch?v=${id}`,
    thumb: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`
})

// Ready to show: videos come back as { title, by, url, thumb }.
// Languages without a curated entry still get somewhere to start: a video search and the GitHub topic.
export function resourcesFor(lang) {
    if (isKnownLanguage(lang)) {
        const r = RESOURCES[lang]
        return { ...r, videos: r.videos.map(toVideo) }
    }
    const q = encodeURIComponent(lang)
    return {
        docs: `https://github.com/topics/${q.toLowerCase()}`,
        roadmap: null,
        exercism: null,
        videos: [{
            title: `Learn ${lang} on YouTube`,
            by: 'YouTube search',
            url: `https://www.youtube.com/results?search_query=learn+${q}`,
            thumb: null
        }]
    }
}
