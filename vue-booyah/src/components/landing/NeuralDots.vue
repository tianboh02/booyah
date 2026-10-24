<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { isDark } from '@/composables/useTheme'

const cv = ref(null)
let stop = null

onMounted(() => {
  const el = cv.value
  const cx = el.getContext('2d')
  const rnd = (a, b) => a + Math.random() * (b - a)
  const mouse = { x: -999, y: -999 }
  let W, H, dots = [], raf = 0

  const size = () => {
    const d = Math.min(window.devicePixelRatio || 1, 2)
    W = window.innerWidth; H = window.innerHeight
    el.width = W * d; el.height = H * d
    cx.setTransform(d, 0, 0, d, 0, 0)
    const n = Math.round((W * H) / 16000)
    dots = Array.from({ length: n }, () => ({ x: rnd(0, W), y: rnd(0, H), vx: rnd(-0.35, 0.35), vy: rnd(-0.35, 0.35), r: rnd(1.8, 3.8) }))
  }
  const onMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY }

  const frame = () => {
    cx.clearRect(0, 0, W, H)
    const d = isDark.value
    const dot = d ? '157,178,255' : '30,64,175'
    const line = d ? '107,138,255' : '30,58,138'
    const grab = d ? '138,164,255' : '30,58,138'
    for (const p of dots) {
      p.x += p.vx; p.y += p.vy
      if (p.x < 0 || p.x > W) p.vx *= -1
      if (p.y < 0 || p.y > H) p.vy *= -1
    }
    for (let i = 0; i < dots.length; i++) {
      const a = dots[i]
      for (let j = i + 1; j < dots.length; j++) { // dot to dot lines
        const b = dots[j], dx = a.x - b.x, dy = a.y - b.y, q = dx * dx + dy * dy
        if (q < 22500) {
          cx.strokeStyle = `rgba(${line},${(1 - Math.sqrt(q) / 150) * (d ? 0.5 : 0.6)})`
          cx.lineWidth = d ? 1.2 : 1.5
          cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke()
        }
      }
      const dx = a.x - mouse.x, dy = a.y - mouse.y, q = dx * dx + dy * dy // dot to mouse line
      if (q < 36100) {
        cx.strokeStyle = `rgba(${grab},${1 - Math.sqrt(q) / 190})`
        cx.lineWidth = 1.6
        cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(mouse.x, mouse.y); cx.stroke()
      }
      cx.fillStyle = `rgba(${dot},${d ? 0.85 : 0.9})`
      cx.beginPath(); cx.arc(a.x, a.y, a.r, 0, 7); cx.fill()
    }
    raf = requestAnimationFrame(frame)
  }

  size()
  window.addEventListener('resize', size)
  window.addEventListener('pointermove', onMove)
  frame()
  stop = () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', size)
    window.removeEventListener('pointermove', onMove)
  }
})
onBeforeUnmount(() => stop?.())
</script>

<template>
  <canvas ref="cv" class="neural" aria-hidden="true"></canvas>
</template>

<style scoped>
.neural { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }
</style>