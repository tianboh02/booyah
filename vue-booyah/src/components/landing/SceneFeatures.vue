<script setup>
import { ref } from 'vue'
import { gsap, tlm, pin, useScene } from '@/composables/useScrollScene'
import { features } from './landingContent'

const root = ref(null)
const bars = features.map((_, i) => Array.from({ length: 14 }, (_, k) => 30 + Math.abs(Math.sin(k * 0.7 + i * 2)) * 70))

function spotlight(e) {
  const el = e.currentTarget, r = el.getBoundingClientRect()
  el.style.setProperty('--mx', e.clientX - r.left + 'px')
  el.style.setProperty('--my', e.clientY - r.top + 'px')
}

useScene(root, (q) => {
  const ps = q('.panel'), full = q('.p-full'), short = q('.p-short')
  gsap.set(full, { opacity: 0 })
  gsap.set(short, { opacity: 1 })
  gsap.set(q('.viz i'), { scaleY: 0 })

  const tl = tlm()
  const focus = (a) => {
    ps.forEach((p, i) => {
      tl.to(p, { flexGrow: i === a ? 4 : 1, duration: 0.6, ease: 'power2.inOut' }, i ? '<' : '>')
      tl.to(full[i], { opacity: i === a ? 1 : 0, duration: 0.35 }, '<' + (i === a ? '+=.2' : ''))
      tl.to(short[i], { opacity: i === a ? 0 : 1, duration: 0.3 }, '<')
    })
    tl.to(ps[a].querySelectorAll('.viz i'), { scaleY: 1, duration: 0.5, stagger: 0.03, ease: 'power2.out' }, '<+=.2')
  }
  tl.from(ps, { opacity: 0, y: 50, stagger: 0.12, duration: 0.4 }, 0)
  focus(0); tl.to({}, { duration: 0.5 })
  focus(1); tl.to({}, { duration: 0.5 })
  focus(2); tl.to({}, { duration: 0.6 })
  pin(root.value, 280, tl)
})
</script>

<template>
  <section id="feat" ref="root" class="scene">
    <div class="wrap">
      <div class="panels">
        <div v-for="(f, i) in features" :key="i" class="panel" @pointermove="spotlight">
          <div class="p-ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b8aff" stroke-width="2" v-html="f.icon"></svg></div>
          <div class="p-short">{{ f.title }}</div>
          <div class="p-full">
            <h3>{{ f.title }}</h3>
            <p>{{ f.body }}</p>
            <div v-if="f.badges.length" class="badges"><span v-for="b in f.badges" :key="b">{{ b }}</span></div>
            <div class="viz"><i v-for="(h, k) in bars[i]" :key="k" :style="{ height: h + '%' }"></i></div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.panels { display: flex; gap: 14px; height: min(58vh, 470px); width: 100%; text-align: left; }
.panel { position: relative; flex: 1 1 0; min-width: 0; border: 1px solid var(--line); border-radius: 22px; background: var(--card); overflow: hidden; padding: 22px; --mx: 50%; --my: 50%; }
.panel::before { content: ''; position: absolute; inset: 0; background: radial-gradient(420px circle at var(--mx) var(--my), color-mix(in srgb, var(--g2) 26%, transparent), transparent 60%); opacity: 0; transition: opacity 0.3s; pointer-events: none; }
.panel:hover::before { opacity: 1; }
.p-ico { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: var(--card2); border: 1px solid var(--line); margin-bottom: 14px; }
.p-short { position: absolute; left: 22px; bottom: 22px; writing-mode: vertical-rl; transform: rotate(180deg); font-weight: 700; font-size: 1.15rem; letter-spacing: -0.01em; white-space: nowrap; }
.p-full { position: absolute; left: 22px; right: 22px; top: 76px; bottom: 22px; display: flex; flex-direction: column; min-width: min(420px, 60vw); }
.p-full h3 { font-size: clamp(1.3rem, 2.2vw, 1.8rem); letter-spacing: -0.02em; margin-bottom: 10px; }
.p-full p { color: var(--muted); font-size: 0.95rem; line-height: 1.5; }
.badges { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
.badges span { font: 0.74rem var(--mono); padding: 0.25rem 0.65rem; border-radius: 99px; border: 1px solid var(--line); background: var(--card2); }
.viz { margin-top: auto; height: 90px; display: flex; align-items: flex-end; gap: 6px; }
.viz i { flex: 1; border-radius: 5px 5px 0 0; background: linear-gradient(180deg, var(--g2), var(--g1)); transform-origin: bottom; }
@media (max-width: 820px) {
  .panels { flex-direction: column; height: 62vh; }
  .p-short { writing-mode: horizontal-tb; transform: none; bottom: auto; top: 30px; left: 76px; font-size: 1rem; }
  .p-full { min-width: 0; top: 70px; }
  .viz { height: 44px; }
}
</style>