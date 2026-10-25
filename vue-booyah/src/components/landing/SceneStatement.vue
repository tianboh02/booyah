<script setup>
import { ref } from 'vue'
import { gsap, tlm, pin, useScene } from '@/composables/useScrollScene'
import { paced } from '@/composables/useLandingPace'
import { statement as s } from '../../utils/landingContent'
import IconCloud from '@/components/ui/icon-cloud/IconCloud.vue'
import { isDark } from '@/composables/useTheme'
import { iconUrls } from '../../utils/landingIcons'

const root = ref(null)
const words = s.words.map((w) => ({ text: w.replace('*', ''), hl: w.startsWith('*') }))

useScene(root, (q) => {
  gsap.set(q('.eyebrow'), { opacity: 0 })
  const tl = tlm()
  tl.to(q('.eyebrow'), { opacity: 1, duration: 0.3 }, 0)
    .from(q('.sw'), { opacity: 0.14, stagger: 0.09, duration: 0.2 }, 0)
    .from(q('.cloud-wrap'), { opacity: 0, scale: 0.6, rotate: -12, duration: 0.8, ease: 'power3.out' }, 0.2)
    .to({}, { duration: 0.8 })
  pin(root.value, paced(220), tl)
})
</script>

<template>
  <section id="pipe" ref="root" class="scene">
    <div class="wrap">
      <p class="eyebrow">{{ s.eyebrow }}</p>
      <p class="statement"><span v-for="(w, i) in words" :key="i" class="sw" :class="{ hl: w.hl }">{{ w.text }}</span>
      </p>
      <div class="cloud-wrap">
        <IconCloud :key="String(isDark)" :images="iconUrls(isDark)" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.statement {
  font-size: clamp(1.3rem, 2.5vw, 2.1rem);
  font-weight: 750;
  letter-spacing: -0.025em;
  line-height: 1.25;
  max-width: 920px;
  margin: 0.8rem auto 0;
}

.sw {
  display: inline-block;
  margin-right: 0.26em;
}

.sw.hl {
  background: linear-gradient(90deg, var(--g1), var(--g2), var(--g3));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.cloud-wrap {
  width: min(54vh, 500px);
  margin: 0.6rem auto 0;
}
</style>