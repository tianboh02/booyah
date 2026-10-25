<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import Lenis from 'lenis'
import { gsap, ScrollTrigger } from '@/composables/useScrollScene'
import { initTheme } from '@/composables/useTheme'
import '@/assets/landing.css'
import { redirectToGitHub } from '@/composables/useGitHubLogin.js'
import { navHidden } from '@/composables/useLandingNav.js'

import NeuralDots from '@/components/landing/NeuralDots.vue'
import SceneHero from '@/components/landing/SceneHero.vue'
import SceneFeed from '@/components/landing/SceneFeed.vue'
import SceneClock from '@/components/landing/SceneClock.vue'
import SceneTiles from '@/components/landing/SceneTiles.vue'
import SceneStatement from '@/components/landing/SceneStatement.vue'
import SceneShowcase from '@/components/landing/SceneShowcase.vue'
import SceneFeatures from '@/components/landing/SceneFeatures.vue'
import SceneRing from '@/components/landing/SceneRing.vue'
import SceneCta from '@/components/landing/SceneCta.vue'
import SleekLineCursor from '@/components/ui/sleek-line-cursor/SleekLineCursor.vue'

let lenis = null, tick = null

const cursorOn = ref(true)

onMounted(() => {
  initTheme()

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    lenis = new Lenis({ lerp: 0.1 })
    lenis.on('scroll', ScrollTrigger.update)
    tick = (t) => lenis.raf(t * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
  }
    const updateCursor = () => {
        const cta = document.getElementById('cta')
        const ctaTop = cta ? cta.getBoundingClientRect().top + window.scrollY : Infinity
        cursorOn.value = window.scrollY < window.innerHeight * 0.7 * 0.85 || window.scrollY > ctaTop - window.innerHeight * 0.55
    }
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: updateCursor, onRefresh: updateCursor })
    updateCursor()

    ScrollTrigger.create({
    trigger: '#cta', start: 'top 55%',
    onEnter: () => (navHidden.value = true),
    onLeaveBack: () => (navHidden.value = false),
    })

    ScrollTrigger.refresh()
})
onBeforeUnmount(() => {
    navHidden.value = false
    if (tick) gsap.ticker.remove(tick)
    lenis?.destroy()
})
</script>

<template>
  <div class="landing">
    <NeuralDots />
    <Transition name="cur"><SleekLineCursor v-if="cursorOn" /></Transition>

    <SceneHero />
    <SceneFeed />
    <SceneClock />
    <SceneTiles />
    <SceneStatement />
    <SceneShowcase />
    <SceneFeatures />
    <SceneRing />
    <SceneCta @signin="redirectToGitHub" />
  </div>
</template>