<script setup>
import { ref } from 'vue'
import { gsap, useScene } from '@/composables/useScrollScene'
import { cta as c } from '../../utils/landingContent'
import ShinyButton from './ShinyButton.vue'

defineEmits(['signin'])
const root = ref(null)
const marquee = 'Learn · Build · Prove · Learn · Build · Prove'

const colours = ['#8340f0', '#6b8aff', '#22d3ee', '#f0abfc', '#fbbf24']
const sparks = Array.from({ length: 22 }, (_, i) => {
  const a = (i / 22) * Math.PI * 2
  return { colour: colours[i % 5], x: Math.cos(a) * 220, y: Math.sin(a) * 120 }
})

useScene(root, (q) => {
  const scrub = { trigger: root.value, start: 'top bottom', end: 'bottom top', scrub: true }
  gsap.to(q('.o1'), { x: () => -window.innerWidth * 0.6, ease: 'none', scrollTrigger: scrub })
  gsap.fromTo(q('.o2'), { x: () => -window.innerWidth * 0.6 }, { x: 0, ease: 'none', scrollTrigger: scrub })

  const sp = q('.sp')
  gsap.timeline({ scrollTrigger: { trigger: root.value, start: 'top 60%' } })
    .from(q('.burst-word'), { scale: 0.3, opacity: 0, duration: 0.5, ease: 'back.out(2)' })
    .fromTo(sp, { x: 0, y: 0, opacity: 1, scale: 1 }, { x: (i) => sparks[i].x, y: (i) => sparks[i].y, opacity: 0, scale: 0.3, duration: 0.7, ease: 'power2.out', immediateRender: false }, '<')
    .from(q('.cta-up'), { opacity: 0, y: 40, stagger: 0.14, duration: 0.8, ease: 'power3.out' }, '-=.3')
})
</script>

<template>
  <section id="cta" ref="root" class="scene cta">
    <div class="blobs"><i class="blob a"></i><i class="blob b"></i></div>
    <div class="outline o1">{{ marquee }}</div>
    <div class="outline o2">{{ marquee }}</div>
    <div class="wrap">
      <div class="burst-wrap">
        <div class="burst-word grad">{{ c.word }}</div>
        <span v-for="(s, i) in sparks" :key="i" class="sp"
          :style="{ background: s.colour, boxShadow: '0 0 10px ' + s.colour }"></span>
      </div>
      <p class="cta-line cta-up">{{ c.before }}<span class="grad">{{ c.grad }}</span></p>
      <ShinyButton class="cta-up" @click="$emit('signin')" />
      <p class="fine cta-up">{{ c.fine }}</p>
    </div>
  </section>
</template>

<style scoped>
.scene.cta {
  padding-top: 56px;
}

.outline {
  position: absolute;
  left: 0;
  white-space: nowrap;
  font-size: clamp(6rem, 20vw, 16rem);
  font-weight: 800;
  letter-spacing: -0.05em;
  color: transparent;
  -webkit-text-stroke: 1.5px color-mix(in srgb, var(--text) 22%, transparent);
  will-change: transform;
  pointer-events: none;
  line-height: 1;
}

.outline.o1 {
  top: 12%;
}

.outline.o2 {
  bottom: 8%;
}

.burst-wrap {
  position: relative;
  display: inline-block;
}

.burst-word {
  font-size: clamp(3.4rem, 12vw, 7rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1.05;
  filter: drop-shadow(0 0 30px rgba(131, 64, 240, 0.6));
}

.sp {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 9px;
  height: 9px;
  margin: -4px 0 0 -4px;
  border-radius: 50%;
  opacity: 0;
}

.cta-line {
  font-size: clamp(1.6rem, 4vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-top: 0.5rem;
}

.fine {
  max-width: 560px;
  margin: 1.5rem auto 0;
  color: var(--muted);
  font-size: 0.85rem;
  line-height: 1.55;
}
</style>