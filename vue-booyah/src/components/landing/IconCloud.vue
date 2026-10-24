<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { isDark } from '@/composables/useTheme'
import { ICONS, iconImages } from './landingIcons'

const cv = ref(null)
let stop = null

onMounted(() => {
  const el = cv.value
  const cx = el.getContext('2d')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let size = 0, imgs = iconImages(isDark.value), raf = 0
  let rotX = 0.25, rotY = 0, vx = 0.0035, vy = 0.0012, drag = false, last = { x: 0, y: 0 }

  const n = ICONS.length
  const pts = ICONS.map((_, k) => {
    const phi = Math.acos(-1 + (2 * k + 1) / n), th = Math.sqrt(n * Math.PI) * phi
    return { x: Math.cos(th) * Math.sin(phi), y: Math.sin(th) * Math.sin(phi), z: Math.cos(phi) }
  })

  const resize = () => {
    const r = el.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2)
    size = r.width; el.width = r.width * d; el.height = r.height * d
    cx.setTransform(d, 0, 0, d, 0, 0)
  }
  const down = (e) => { drag = true; last = { x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId) }
  const move = (e) => { if (!drag) return; rotY += (e.clientX - last.x) * 0.008; rotX += (e.clientY - last.y) * 0.008; last = { x: e.clientX, y: e.clientY } }
  const up = () => (drag = false)

  const frame = () => {
    if (size !== el.getBoundingClientRect().width) resize() 
    cx.clearRect(0, 0, size, size)
    if (!drag && !reduced) { rotY += vx; rotX += vy; vy *= 0.995; if (Math.abs(vy) < 0.0006) vy = 0.0006 }
    const sX = Math.sin(rotX), cX = Math.cos(rotX), sY = Math.sin(rotY), cY = Math.cos(rotY), R = size * 0.38
    pts
      .map((p, i) => { const x1 = p.x * cY - p.z * sY, z1 = p.x * sY + p.z * cY; return { i, x: x1, y: p.y * cX - z1 * sX, z: p.y * sX + z1 * cX } })
      .sort((a, b) => a.z - b.z) 
      .forEach((it) => {
        const im = imgs[it.i]
        if (!im || !im.complete || !im.naturalWidth) return
        const depth = (it.z + 1) / 2, s = size * (0.085 + 0.07 * depth)
        cx.globalAlpha = 0.25 + 0.75 * depth
        cx.drawImage(im, size / 2 + it.x * R - s / 2, size / 2 + it.y * R - s / 2, s, s)
      })
    cx.globalAlpha = 1
    raf = requestAnimationFrame(frame)
  }

  resize()
  window.addEventListener('resize', resize)
  el.addEventListener('pointerdown', down)
  el.addEventListener('pointermove', move)
  el.addEventListener('pointerup', up)
  el.addEventListener('pointerleave', up)
  const unwatch = watch(isDark, (d) => (imgs = iconImages(d))) 
  frame()
  stop = () => {
    cancelAnimationFrame(raf); unwatch()
    window.removeEventListener('resize', resize)
  }
})
onBeforeUnmount(() => stop?.())
</script>

<template>
  <canvas ref="cv" class="cloud" aria-label="Logos of the tools Booyah tracks"></canvas>
</template>

<style scoped>
.cloud { display: block; width: 100%; aspect-ratio: 1; cursor: grab; touch-action: pan-y; }
.cloud:active { cursor: grabbing; }
</style>