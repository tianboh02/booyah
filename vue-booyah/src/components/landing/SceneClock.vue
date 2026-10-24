<script setup>
import { ref } from 'vue'
import { gsap, tlm, pin, useScene } from '@/composables/useScrollScene'
import { stat1 as s } from './landingContent'

const root = ref(null)
const counter = ref(null)

const people = Array.from({ length: s.n }, (_, i) => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / s.n
  return { left: 50 + Math.cos(a) * 39 + '%', top: 50 + Math.sin(a) * 39 + '%' }
})

useScene(root, (q) => {
  const ps = q('.person')
  const hot = ps[s.hot]
  const step = 0.3, n = ps.length, num = { v: 1 }
  gsap.set(ps, { scale: 0, opacity: 0 })
  gsap.set(q('.stat-copy'), { opacity: 0, y: 20 })

  const tl = tlm()
  tl.to(q('.hand'), { rotation: 180 + 360, duration: step * n }, 0)                
    .to(ps, { scale: 1, opacity: 1, duration: 0.25, stagger: step, ease: 'back.out(2)' }, 0) 
    .to(num, { v: n, duration: step * (n - 1), onUpdate: () => (counter.value.textContent = Math.round(num.v)) }, 0)
    .to(q('.hand'), { opacity: 0, duration: 0.3 }, step * n)
    .to(ps.filter((p) => p !== hot), { opacity: 0.3, scale: 0.85, duration: 0.5 }, step * n + 0.1) 
    .to(hot, { scale: 1.5, duration: 0.5, ease: 'back.out(2)' }, step * n + 0.1)                  
    .to(q('.stat-copy'), { opacity: 1, y: 0, duration: 0.5 }, step * n + 0.5)
    .to({}, { duration: 0.6 })
  tl.eventCallback('onUpdate', () => hot.classList.toggle('hot', tl.time() > step * n + 0.15)) 
  pin(root.value, 240, tl)
})
</script>

<template>
  <section id="clock" ref="root" class="scene">
    <div class="wrap">
      <div class="clock">
        <div class="face"></div>
        <div class="hand"></div>
        <div v-for="(p, i) in people" :key="i" class="person" :style="{ left: p.left, top: p.top }">
          <svg viewBox="0 0 40 52"><circle cx="20" cy="11" r="10" /><path d="M1 52c0-17 8-26 19-26s19 9 19 26z" /></svg>
        </div>
        <div class="clock-num"><span><span>1</span> in <span ref="counter">1</span></span></div>
      </div>
      <p class="stat-copy">{{ s.before }}<strong>{{ s.strong }}</strong>{{ s.after }}</p>
    </div>
  </section>
</template>

<style scoped>
.clock { position: relative; width: min(46vh, 430px); aspect-ratio: 1; margin: 0 auto; }
.face { position: absolute; inset: 0; border-radius: 50%; border: 1px solid var(--line); background: radial-gradient(circle, color-mix(in srgb, var(--g1) 10%, transparent), transparent 70%); }
.hand { position: absolute; left: 50%; top: 50%; width: 2px; height: 46%; margin-left: -1px; transform-origin: 50% 0; background: linear-gradient(var(--g2), transparent); transform: rotate(180deg); }
.person { position: absolute; width: 14%; aspect-ratio: 40 / 52; margin: -7% 0 0 -7%; }
.person svg { width: 100%; height: 100%; display: block; fill: var(--muted); }
.person.hot svg { fill: var(--red); filter: drop-shadow(0 0 14px var(--red)); }
.clock-num { position: absolute; inset: 0; display: grid; place-items: center; font-size: clamp(2.6rem, 8vh, 4.6rem); font-weight: 800; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; line-height: 1; }
</style>