<script setup>
import { ref } from 'vue'
import { gsap, tlm, pin, useScene } from '@/composables/useScrollScene'
import { paced } from '@/composables/useLandingPace'
import { hero as h } from '../../utils/landingContent'

const root = ref(null)
const flip = ref(null)
const loop = [...h.words, h.words[0]]

useScene(root, (q) => {
  const all = [...flip.value.children]
  const tl = gsap.timeline({ repeat: -1 })
  for (let i = 1; i <= h.words.length; i++) tl.to(all, { yPercent: -100 * i, duration: 0.6, ease: 'power3.inOut' }, '+=1.6')
  tl.set(all, { yPercent: 0 })

  gsap.from(q('.hero-in > *'), { opacity: 0, y: 30, stagger: 0.12, duration: 0.9, ease: 'power3.out', delay: 0.2 })
  gsap.from(q('.scroll-cue > *'), { opacity: 0, duration: 0.9, ease: 'power3.out', delay: 1 })

  pin(
    root.value,
    paced(70),
    tlm()
      .to(q('.hero-in'), { scale: 3.4, filter: 'blur(14px)', opacity: 0, duration: 1, ease: 'power2.in' })
      .to(q('.blobs'), { scale: 1.4, opacity: 0.5, duration: 1 }, 0)
      .to(q('.scroll-cue'), { opacity: 0, duration: 0.25 }, 0)
  )
})
</script>

<template>
  <section id="hero" ref="root" class="scene">
    <div class="blobs"><i class="blob a"></i><i class="blob b"></i><i class="blob c"></i></div>
    <div class="wrap hero-in">
      <p class="eyebrow">{{ h.eyebrow }}</p>
      <h1 style="margin-top: 1rem">
        {{ h.before }}<span class="grad">{{ h.grad }}</span>{{ h.after }}<span ref="flip" class="flip"><span
            v-for="(w, i) in loop" :key="i" class="grad">{{ w }}</span></span>
      </h1>
      <p class="sub" style="margin-top: 1.1rem">{{ h.welcome }}</p>
    </div>
    <div class="scroll-cue" aria-hidden="true">
      <span class="cue-text">Scroll</span>
      <i class="drip"></i>
    </div>
  </section>
</template>

<style scoped>
.flip {
  display: inline-block;
  height: 1.12em;
  overflow: hidden;
  vertical-align: bottom;
}

.flip>span {
  display: block;
  height: 1.12em;
}

.hero-in {
  will-change: transform, filter;
}

.scroll-cue {
  position: absolute;
  left: 0;
  right: 0;
  width: max-content;
  margin: 0 auto;
  bottom: clamp(18px, 5vh, 44px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  pointer-events: none;
}

.cue-text {
  font: 800 0.95rem system-ui, -apple-system, 'Segoe UI', sans-serif;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  padding-left: 0.28em;
  background: linear-gradient(90deg, var(--g1), var(--g2), var(--g3));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.drip {
  display: block;
  width: 1px;
  height: 34px;
  background: linear-gradient(var(--text), transparent);
  animation: bl-drip 1.8s infinite;
}

@keyframes bl-drip {
  0% {
    transform: scaleY(0);
    transform-origin: top;
  }

  50% {
    transform: scaleY(1);
    transform-origin: top;
  }

  51% {
    transform-origin: bottom;
  }

  100% {
    transform: scaleY(0);
    transform-origin: bottom;
  }
}

@media (max-height: 520px) {
  .drip {
    display: none;
  }

  .cue-text {
    font-size: 0.8rem;
  }
}
</style>