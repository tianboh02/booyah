import {
  siGithub, siNpm, siPypi, siRust, siYcombinator, siReact, siVuedotjs, siTypescript, siPython,
  siNodedotjs, siDocker, siGo, siPostgresql, siNextdotjs, siTailwindcss, siVite, siSvelte,
  siKubernetes, siStackoverflow, siReddit, siDiscord, siJavascript, siRedis, siGit, siPhp,
  siComposer, siAngular, siLaravel,
} from 'simple-icons'

const ICONS = [
  siGithub, siNpm, siPypi, siRust, siYcombinator, siReact, siVuedotjs, siTypescript, siPython,
  siNodedotjs, siDocker, siGo, siPostgresql, siNextdotjs, siTailwindcss, siVite, siSvelte,
  siKubernetes, siStackoverflow, siReddit, siDiscord, siJavascript, siRedis, siGit, siPhp,
  siComposer, siAngular, siLaravel,
]

const nearBlack = (hex) => parseInt(hex, 16) < 0x2a2a2a

// SVG data URLs for the icon cloud, recoloured so they stay visible in each theme
export function iconUrls(dark) {
  return ICONS.map((ic) => {
    let col = ic.hex
    if (dark && nearBlack(ic.hex)) col = 'e5e7eb'
    if (!dark && ic.hex === 'F7DF1E') col = 'c9a800'
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#${col}"><path d="${ic.path}"/></svg>`)
  })
}
