<script setup>
import { ref } from 'vue'
import { gsap, tlm, pin, srand, useScene } from '@/composables/useScrollScene'
import { stat2 as s } from './landingContent'

const root = ref(null)
const stage = ref(null)

const G3 = ['11110', '00011', '00011', '01110', '00011', '00011', '11110']
const G9 = ['01110', '11011', '11011', '01111', '00011', '00011', '01110']
const GP = ['11001', '11010', '00010', '00100', '01000', '01011', '10011']
// turn [glyph, firstColumn] pairs into a list of [column, row] cells
const cellsOf = (list) => list.flatMap(([g, c0]) => g.flatMap((row, r) => [...row].flatMap((v, c) => (v === '1' ? [[c0 + c, r]] : []))))
const COLS = 17 

useScene(root, (q) => {
  const ts = q('.tile')

  const idx = [...ts.keys()]
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(srand() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]] }
  const cellsD = cellsOf([[G3, 0], [G9, 6]])
  const cellsP = cellsOf([[GP, 12]])
  const xD = cellsD.length - 39
  const deadIdx = idx.slice(0, 39)
  const extraIdx = idx.slice(39, 39 + xD)
  const pctIdx = idx.slice(39 + xD, 54 + xD)
  const dead = deadIdx.map((i) => ts[i])
  const pcts = extraIdx.concat(pctIdx).map((i) => ts[i])
  const fade = idx.slice(54 + xD).map((i) => ts[i])

  const S = () => stage.value.clientWidth
  const Q = () => S() / COLS                
  const oy = () => (S() - 7 * Q()) / 2     

  const target = new Map()
  const pair = (ids, cells) => {
    const order = ids.slice().sort((a, b) => (a % 10) - (b % 10) || Math.floor(a / 10) - Math.floor(b / 10))
    const cs = cells.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
    order.forEach((ti, k) => target.set(ts[ti], cs[k]))
  }
  pair(deadIdx.concat(extraIdx), cellsD)
  pair(pctIdx, cellsP)

  const cx = (t) => t.offsetLeft + t.offsetWidth / 2
  const cy = (t) => t.offsetTop + t.offsetHeight / 2
  const tx = (t) => (target.get(t)[0] + 0.5) * Q() - cx(t)
  const ty = (t) => oy() + (target.get(t)[1] + 0.5) * Q() - cy(t)
  const sc = (t) => (Q() * 0.9) / t.offsetWidth
  const RED = { backgroundImage: 'linear-gradient(135deg,#ff5d5d,#ff9a5d)', boxShadow: '0 0 16px rgba(255,93,93,.55)', duration: 0.2 }

  gsap.set(q('.stat-copy, .src'), { opacity: 0, y: 16 })
  const tl = tlm()
  tl.from(ts, { scale: 0, opacity: 0, duration: 0.3, stagger: { each: 0.012, from: 'center', grid: [10, 10] } }, 0) 
    .to(dead, { ...RED, stagger: 0.03 }, 1.4)                                       
    .to(pcts, { ...RED, stagger: 0.03 }, 2.6)                                      
    .to(fade, { opacity: 0, scale: 0.5, duration: 0.5, stagger: { each: 0.01, from: 'random' } }, 2.9) 
    .to(dead.concat(pcts), { x: (i, t) => tx(t), y: (i, t) => ty(t), scale: (i, t) => sc(t), duration: 0.9, ease: 'power3.inOut', stagger: { each: 0.01, from: 'random' } }, 3.3) 
    .to(stage.value, { marginTop: () => -Math.round(oy()), marginBottom: () => -Math.round(oy()), duration: 0.9, ease: 'power3.inOut' }, 3.3) 
    .to(q('.stat-copy, .src'), { opacity: 1, y: 0, duration: 0.4, stagger: 0.1 }, 4.4)
    .to({}, { duration: 0.7 })
  pin(root.value, 300, tl)
})
</script>

<template>
  <section id="decay" ref="root" class="scene">
    <div class="wrap">
      <div class="tstage" ref="stage"><div class="tiles"><i v-for="n in 100" :key="n" class="tile"></i></div></div>
      <p class="stat-copy">{{ s.before }}<strong>{{ s.strong }}</strong>{{ s.after }}</p>
      <p class="src">{{ s.src }}</p>
    </div>
  </section>
</template>

<style scoped>
.tstage { --S: min(40vh, 380px); position: relative; width: var(--S); aspect-ratio: 1; margin: 0 auto; }
.tiles { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(10, 1fr); gap: 5px; }
.tile { aspect-ratio: 1; border-radius: 6px; background: linear-gradient(135deg, var(--g1), var(--g2)); will-change: transform; }
.src { font: 0.72rem var(--mono); color: var(--muted); margin-top: 8px; }
</style>