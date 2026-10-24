<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { isDark } from '@/composables/useTheme'

defineProps({ visible: Boolean })
const cv = ref(null)
let stop = null

onMounted(() => {
  
  if (window.matchMedia('(pointer: coarse), (prefers-reduced-motion: reduce)').matches) return
  const el = cv.value
  const cx = el.getContext('2d')
  const P = { trails: 20, size: 50, friction: 0.5, dampening: 0.25, tension: 0.98 }
  const pos = { x: 0, y: 0 }
  let lines = [], running = false, raf = 0, phase = Math.random() * Math.PI * 2

  const resize = () => { el.width = window.innerWidth; el.height = window.innerHeight }
  const makeLine = (i) => ({
    spring: 0.45 + (i / P.trails) * 0.025,
    friction: P.friction + 0.01 * Math.random(),
    nodes: Array.from({ length: P.size }, () => ({ x: pos.x, y: pos.y, vx: 0, vy: 0 })),
  })
  const update = (l) => {
    let e = l.spring, t = l.nodes[0]
    t.vx += (pos.x - t.x) * e; t.vy += (pos.y - t.y) * e
    for (let n = 0; n < l.nodes.length; n++) {
      t = l.nodes[n]
      if (n > 0) {
        const p = l.nodes[n - 1]
        t.vx += (p.x - t.x) * e; t.vy += (p.y - t.y) * e
        t.vx += p.vx * P.dampening; t.vy += p.vy * P.dampening
      }
      t.vx *= l.friction; t.vy *= l.friction
      t.x += t.vx; t.y += t.vy
      e *= P.tension
    }
  }
  const draw = (l) => {
    const n = l.nodes
    cx.beginPath(); cx.moveTo(n[0].x, n[0].y)
    for (let i = 1; i < n.length - 2; i++) {
      const a = n[i], b = n[i + 1]
      cx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2)
    }
    cx.stroke()
  }
  const frame = () => {
    cx.globalCompositeOperation = 'source-over'
    cx.clearRect(0, 0, el.width, el.height)
    phase += 0.015
    const hue = 250 + Math.sin(phase) * 35, d = isDark.value
    cx.globalCompositeOperation = d ? 'lighter' : 'source-over'
    cx.strokeStyle = d ? `hsla(${hue},90%,65%,.32)` : `hsla(${hue},85%,38%,.4)`
    cx.lineWidth = 1.1
    for (const l of lines) { update(l); draw(l) }
    raf = requestAnimationFrame(frame)
  }
  const onMove = (e) => {
    pos.x = e.clientX; pos.y = e.clientY
    if (!running) { lines = Array.from({ length: P.trails }, (_, i) => makeLine(i)); running = true; raf = requestAnimationFrame(frame) }
  }

  resize()
  window.addEventListener('resize', resize)
  window.addEventListener('mousemove', onMove, { passive: true })
  stop = () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    window.removeEventListener('mousemove', onMove)
  }
})
onBeforeUnmount(() => stop?.())
</script>

<template>
  <canvas ref="cv" class="trail" :class="{ on: visible }" aria-hidden="true"></canvas>
</template>

<style scoped>
.trail { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 1500; pointer-events: none; opacity: 0; transition: opacity 0.45s; }
.trail.on { opacity: 1; }
</style>