export const langColors = {
    JavaScript: '#f1e05a',
    Python: '#3572A5',
    TypeScript: '#3178c6',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Vue: '#41b883',
    Java: '#b07219',
    C: '#555555',
    'C++': '#f34b7d',
    'C#': '#178600',
    Go: '#00ADD8',
    Dart: '#00B4AB',
    Ruby: '#701516',
    PHP: '#4F5D95',
    Swift: '#F05138',
    Rust: '#484f58',
    Shell: '#21262d',
    'No language': '#6e7681'
}

export function getLangColor(lang) {
    return langColors[lang] || '#6e7681'
}