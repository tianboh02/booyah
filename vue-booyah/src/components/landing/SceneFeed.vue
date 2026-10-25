<script setup>
import { ref } from 'vue'
import { gsap, tlm, pin, srand, useScene } from '@/composables/useScrollScene'
import { paced } from '@/composables/useLandingPace'
import { noise as n } from '../../utils/landingContent'

const root = ref(null)
const cols = Array.from({ length: 4 }, () => {
  const c = [...n.cards].sort(() => srand() - 0.5)
  return [...c, ...c]
})

useScene(root, (q) => {
  gsap.fromTo(q('.wall-fade, .feed-text'), { opacity: 0 }, {
    opacity: 1, ease: 'none',
    scrollTrigger: { trigger: root.value, start: 'top 100%', end: 'top 15%', scrub: true },
  })

  const colsIn = q('.col-in')
  gsap.set(colsIn, { yPercent: (i) => (i % 2 ? -42 : -4) })
  gsap.set(q('.feed-cap'), { opacity: 0, scale: 0.9 })

  const tl = tlm()
  tl.to(colsIn, { yPercent: (i) => (i % 2 ? -6 : -40), duration: 3 })
    .to(q('.wall'), { rotate: -5, scale: 1.12, duration: 3 }, 0)
    .to(q('.feed-intro'), { opacity: 0, y: -30, duration: 0.5 }, 0.5)
    .to(q('.wall'), { filter: 'blur(7px)', opacity: 0.3, duration: 0.8 }, 0.9)
    .to(q('.feed-veil'), { opacity: 0.9, duration: 0.8 }, 0.9)
    .to(q('.feed-cap'), { opacity: 1, scale: 1, duration: 0.6, ease: 'power2.out' }, 1.3)
    .to({}, { duration: 0.7 })
  pin(root.value, paced(260), tl)
})
</script>

<template>
  <section id="feed" ref="root" class="scene feed">
    <div class="wall-fade">
      <div class="wall">
        <div v-for="(col, c) in cols" :key="c" class="wcol">
          <div class="col-in">
            <div v-for="(k, i) in col" :key="i" class="ncard" :style="{ '--tone': k.tone }">
              <small>{{ k.src }}</small><b>{{ k.text }}</b>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="feed-veil"></div>
    <div class="feed-text">
      <div class="feed-intro">{{ n.intro }}</div>
      <div class="feed-cap"><span v-for="(t, i) in n.caption" :key="t" :class="{ grad: i }">{{ t }}</span></div>
    </div>
  </section>
</template>

<style scoped>
.scene.feed {
  padding-top: 0;
}

.wall-fade {
  position: absolute;
  inset: 0;
}

.wall {
  position: absolute;
  inset: -25% -15%;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  transform: rotate(-9deg);
  will-change: transform, filter, opacity;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 34%, #000 66%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0, #000 34%, #000 66%, transparent 100%);
}

.col-in {
  display: flex;
  flex-direction: column;
  gap: 18px;
  will-change: transform;
}

.ncard {
  border: 1px solid var(--line);
  border-left: 4px solid var(--tone);
  background: var(--card);
  border-radius: 14px;
  padding: 14px 16px;
  text-align: left;
}

.ncard small {
  display: block;
  font: 0.7rem var(--mono);
  color: var(--muted);
  margin-bottom: 6px;
}

.ncard b {
  font-size: 0.98rem;
  line-height: 1.3;
  font-weight: 600;
}

.feed-text {
  position: absolute;
  inset: 56px 0 0;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 0 5vw;
  pointer-events: none;
}

.feed-text>div {
  grid-area: 1 / 1;
}

.feed-intro {
  font-size: clamp(2rem, 6vw, 4.6rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  text-shadow: 0 0 40px var(--bg), 0 0 12px var(--bg);
}

.feed-cap {
  font-size: clamp(1.7rem, 4.6vw, 3.6rem);
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.1;
}

.feed-cap span {
  display: block;
}

.feed-veil {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, var(--bg) 20%, transparent 75%);
  opacity: 0;
}

@media (max-width: 820px) {
  .wall {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>