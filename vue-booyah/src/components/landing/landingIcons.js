import {
  siGithub, siNpm, siPypi, siRust, siYcombinator, siReact, siVuedotjs, siTypescript, siPython,
  siNodedotjs, siDocker, siGo, siPostgresql, siNextdotjs, siTailwindcss, siVite, siSvelte,
  siKubernetes, siStackoverflow, siReddit, siDiscord, siJavascript, siRedis, siGit, siPhp,
  siComposer, siAngular, siLaravel,
} from 'simple-icons'

export const ICONS = [
  siGithub, siNpm, siPypi, siRust, siYcombinator, siReact, siVuedotjs, siTypescript, siPython,
  siNodedotjs, siDocker, siGo, siPostgresql, siNextdotjs, siTailwindcss, siVite, siSvelte,
  siKubernetes, siStackoverflow, siReddit, siDiscord, siJavascript, siRedis, siGit, siPhp,
  siComposer, siAngular, siLaravel,
]

const nearBlack = (hex) => parseInt(hex, 16) < 0x2a2a2a 

export function iconImages(dark) {
  return ICONS.map((ic) => {
    let col = ic.hex
    if (dark && nearBlack(ic.hex)) col = 'e5e7eb'          
    if (!dark && ic.hex === 'F7DF1E') col = 'c9a800'       
    const img = new Image()
    img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#${col}"><path d="${ic.path}"/></svg>`)
    return img
  })
}

export function iconUrls(dark) {
  return iconImages(dark).map((img) => img.src)
}