<script setup>
import { ref } from 'vue'
import { gsap, tlm, pin, useScene } from '@/composables/useScrollScene'
import { paced } from '@/composables/useLandingPace'
import { showcase, demand, trendingRows, steps } from '../../utils/landingContent'

const root = ref(null)
const urls = ['trending', 'demand', 'plan']

useScene(root, (q) => {
  const wins = q('.win'), items = q('.rail-item'), dots = q('.rdots i')
  const pos = [
    { x: 0, y: 0, scale: 1, opacity: 1, rotateY: 0, zIndex: 3 },
    { x: 36, y: -32, scale: 0.95, opacity: 0.55, rotateY: -4, zIndex: 2 },
    { x: 72, y: -64, scale: 0.9, opacity: 0.28, rotateY: -8, zIndex: 1 },
  ]
  wins.forEach((w, i) => gsap.set(w, pos[i]))
  gsap.set(items.slice(1), { opacity: 0, y: 20 })
  gsap.set(q('.spark'), { clipPath: 'inset(-10% 100% -10% 0)' })
  gsap.set(q('.df'), { scaleX: 0 })
  gsap.set(q('.prow'), { opacity: 0, x: -14 })

  const tl = tlm()
  const enter = (i) => {
    if (i === 0) tl.to(q('.spark'), { clipPath: 'inset(-10% 0% -10% 0)', duration: 0.7 }, '<')
    if (i === 1) tl.to(q('.df'), { scaleX: 1, duration: 0.5, stagger: 0.08 }, '<')
    if (i === 2) tl.to(q('.prow'), { opacity: 1, x: 0, duration: 0.4, stagger: 0.1 }, '<')
  }

  tl.from(wins, { opacity: 0, y: 60, stagger: 0.15, duration: 0.5 }, 0)
  enter(0)
  tl.to({}, { duration: 0.6 })
  for (let s = 1; s < 3; s++) {
    tl.to(wins[s - 1], { x: -160, y: 50, rotate: -7, opacity: 0, duration: 0.5, ease: 'power2.in' }, '+=0')
      .to(items[s - 1], { opacity: 0, y: -20, duration: 0.3 }, '<')
      .to(items[s], { opacity: 1, y: 0, duration: 0.4 }, '<+=.25')
      .call(() => dots.forEach((d, k) => d.classList.toggle('on', k === s)), null, '<')
    for (let k = s; k < 3; k++) tl.to(wins[k], { ...pos[k - s], duration: 0.5, ease: 'power2.out' }, '<')
    enter(s)
    tl.to({}, { duration: 0.7 })
  }
  pin(root.value, paced(300), tl)
})
</script>

<template>
  <section id="show" ref="root" class="scene">
    <div class="showc">
      <div class="rail">
        <div class="rail-box">
          <div v-for="(s, i) in showcase" :key="i" class="rail-item">
            <span class="num">0{{ i + 1 }}</span>
            <h2>{{ s.title }}</h2>
            <p>{{ s.body }}</p>
          </div>
        </div>
        <div class="rdots"><i class="on"></i><i></i><i></i></div>
      </div>

      <div class="stack">
        <!-- window 1: trending -->
        <div class="win">
          <div class="wbar"><i></i><i></i><i></i><span>booyah.app/{{ urls[0] }}</span></div>
          <div class="wbody">
            <h4>Trending</h4>
            <svg class="spark" viewBox="0 0 320 110" preserveAspectRatio="none">
              <path d="M10 82 C60 80 90 74 130 66 S190 40 230 30 S280 22 310 18" stroke="#67d4f0" />
              <path d="M10 70 C70 72 120 66 170 62 S250 50 310 44" stroke="#8b5cf6" />
              <path d="M10 48 C80 52 160 60 310 70" style="stroke: color-mix(in srgb, var(--text) 35%, transparent)" />
            </svg>
            <div v-for="r in trendingRows" :key="r[0]" class="wrow"><span>{{ r[0] }}</span><span class="up">{{ r[1]
            }}</span></div>
          </div>
        </div>
        <!-- window 2: demand -->
        <div class="win">
          <div class="wbar"><i></i><i></i><i></i><span>booyah.app/{{ urls[1] }}</span></div>
          <div class="wbody">
            <h4>What jobs ask for</h4>
            <div v-for="d in demand" :key="d[0]" class="drow">
              <span>{{ d[0] }}</span>
              <span class="dt"><span class="df" :style="{ width: d[1] * 3 + '%' }"></span></span>
              <span class="mono">{{ d[1] }}%</span>
            </div>
          </div>
        </div>
        <!-- window 3: plan -->
        <div class="win">
          <div class="wbar"><i></i><i></i><i></i><span>booyah.app/{{ urls[2] }}</span></div>
          <div class="wbody">
            <h4 class="ctr">Your next 3 steps</h4>
            <div class="psteps">
              <div v-for="(s, i) in steps" :key="i" class="prow"><span class="pd">{{ i + 1 }}</span><b>{{ s[0]
              }}</b><small>{{ s[1] }}</small></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.showc {
  display: grid;
  grid-template-columns: minmax(220px, 340px) minmax(0, 560px);
  gap: clamp(24px, 5vw, 80px);
  align-items: center;
  justify-content: center;
  width: min(1060px, 100%);
  padding: 0 clamp(16px, 4vw, 32px);
  text-align: left;
}

.rail {
  position: relative;
}

.rail-box {
  position: relative;
  height: 230px;
}

.rail-item {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}

.num {
  font: 0.85rem var(--mono);
  color: var(--g2);
}

.rail h2 {
  font-size: clamp(1.8rem, 3.6vw, 2.8rem);
  margin: 6px 0 10px;
}

.rail p {
  color: var(--muted);
  font-size: clamp(0.95rem, 1.4vw, 1.1rem);
}

.rdots {
  display: flex;
  gap: 8px;
  margin-top: 20px;
}

.rdots i {
  width: 28px;
  height: 4px;
  border-radius: 4px;
  background: var(--line);
  transition: background 0.3s;
}

.rdots i.on {
  background: linear-gradient(90deg, var(--g1), var(--g2));
}

.stack {
  position: relative;
  height: min(50vh, 400px);
  perspective: 1400px;
}

.win {
  position: absolute;
  inset: 0;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: var(--card);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  will-change: transform;
}

.wbar {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 10px 14px;
  background: var(--card2);
  border-radius: 16px 16px 0 0;
  border-bottom: 1px solid var(--line);
}

.wbar i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--text) 25%, transparent);
}

.wbar span {
  margin-left: 10px;
  font: 0.7rem var(--mono);
  color: var(--muted);
  padding: 0.1em 0.8em;
  border-radius: 99px;
  background: color-mix(in srgb, var(--text) 7%, transparent);
}

.wbody {
  flex: 1;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.wbody h4 {
  font-size: 1rem;
  margin-bottom: 10px;
  letter-spacing: 0;
}

.spark {
  flex: 1;
  min-height: 60px;
  width: 100%;
  margin-bottom: 8px;
}

.spark path {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
}

.wrow {
  display: flex;
  justify-content: space-between;
  padding: 0.55rem 0;
  border-top: 1px solid var(--line);
  font-size: 0.92rem;
}

.wrow .up {
  color: var(--amber);
}

.drow {
  display: grid;
  grid-template-columns: 5.5em 1fr 2.6em;
  gap: 0.8em;
  align-items: center;
  margin: 0.5em 0;
  font-size: 0.9rem;
}

.dt {
  height: 8px;
  border-radius: 9px;
  background: var(--line);
  overflow: hidden;
}

.df {
  display: block;
  height: 100%;
  border-radius: 9px;
  background: linear-gradient(90deg, var(--g1), var(--g2));
  transform-origin: left;
}

.ctr {
  text-align: center;
}

.psteps {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  align-items: center;
}

.prow {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.35em;
}

.pd {
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.85rem;
  color: #fff;
  background: linear-gradient(135deg, var(--g1), var(--g3));
}

.prow b {
  font-size: 1.05rem;
}

.prow small {
  display: block;
  color: var(--muted);
  font-size: 0.86rem;
  line-height: 1.35;
}

@media (max-width: 820px) {
  .showc {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 18px;
  }

  .rail-box {
    height: 150px;
  }

  .rdots {
    justify-content: center;
  }

  .stack {
    height: min(40vh, 300px);
  }
}
</style>