<script setup>
import { ref } from 'vue'
import { gsap, tlm, pin, useScene } from '@/composables/useScrollScene'
import { paced } from '@/composables/useLandingPace'
import { ring as r, steps } from '../../utils/landingContent'

const root = ref(null)
const count = ref(null)

useScene(root, (q) => {
  const C = 2 * Math.PI * 110
  const num = { v: 0 }
  const tl = tlm()
  tl.from(q('h2'), { opacity: 0, y: 30, duration: 0.4 })
    .fromTo(q('.ring-fg'), { strokeDashoffset: C }, { strokeDashoffset: 0, duration: 1.5 }, '<+=.1')
    .to(num, { v: 100, duration: 1.5, onUpdate: () => (count.value.textContent = Math.round(num.v)) }, '<')
    .from(q('.step-chip'), { opacity: 0, y: 16, stagger: 0.5, duration: 0.3 }, '<+=.2')
    .to({}, { duration: 0.5 })
  pin(root.value, paced(200), tl)
})
</script>

<template>
  <section id="rings" ref="root" class="scene">
    <div class="wrap">
      <h2>{{ r.title }}<span class="grad">{{ r.grad }}</span></h2>
      <div class="ring-wrap">
        <svg class="ring-svg" viewBox="0 0 260 260" aria-hidden="true">
          <defs>
            <linearGradient id="bl-ring-grad" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stop-color="#7c3aed" />
              <stop offset="100%" stop-color="#38bdf8" />
            </linearGradient>
          </defs>
          <circle class="ring-bg" cx="130" cy="130" r="110" />
          <circle class="ring-fg" cx="130" cy="130" r="110" stroke-dasharray="691.15" stroke-dashoffset="0"
            transform="rotate(-90 130 130)" />
        </svg>
        <div class="ring-center">
          <div class="ring-value"><span ref="count" class="mono">100</span><small>%</small></div>
        </div>
      </div>
      <div class="chips"><span v-for="s in steps" :key="s[0]" class="step-chip">{{ s[0] }} ✓</span></div>
    </div>
  </section>
</template>

<style scoped>
.ring-wrap {
  position: relative;
  width: min(300px, 38vh);
  margin: 1.6rem auto 0;
}

.ring-svg {
  width: 100%;
  display: block;
  filter: drop-shadow(0 0 16px rgba(124, 58, 237, 0.5));
}

.ring-bg {
  fill: none;
  stroke: var(--line);
  stroke-width: 14;
}

.ring-fg {
  fill: none;
  stroke: url(#bl-ring-grad);
  stroke-width: 14;
  stroke-linecap: round;
}

.ring-center {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  text-align: center;
}

.ring-value {
  font-size: clamp(2.6rem, 6vh, 3.6rem);
  font-weight: 700;
  line-height: 1;
}

.ring-value small {
  font-size: 0.45em;
  color: var(--muted);
  margin-left: 2px;
}

.chips {
  display: flex;
  justify-content: center;
  gap: 0.6rem;
  margin-top: 1.6rem;
  flex-wrap: wrap;
}

.step-chip {
  padding: 0.4rem 1rem;
  border-radius: 999px;
  font-weight: 600;
  color: #4ade80;
  border: 1px solid rgba(74, 222, 128, 0.5);
  background: rgba(74, 222, 128, 0.1);
}

[data-bs-theme='light'] .step-chip {
  color: #1a7f37;
  border-color: rgba(26, 127, 55, 0.45);
  background: rgba(26, 127, 55, 0.08);
}
</style>