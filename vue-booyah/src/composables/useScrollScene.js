import { onMounted, onBeforeUnmount } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)
export { gsap, ScrollTrigger }

export const vh = () => window.innerHeight / 100
export const tlm = () => gsap.timeline({ defaults: { ease: 'none' } })

let seed = 7
export const srand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }

export function pin(trigger, endVh, tl) {
  return ScrollTrigger.create({
    trigger,
    start: 'top top',
    end: () => '+=' + endVh * vh(),
    pin: true,
    scrub: 0.6,
    anticipatePin: 1,
    animation: tl,
    invalidateOnRefresh: true,
  })
}

export function useScene(rootRef, setup) {
  let ctx
  onMounted(() => {
    ctx = gsap.context(() => setup(gsap.utils.selector(rootRef.value), rootRef.value), rootRef.value)
  })
  onBeforeUnmount(() => ctx?.revert())
}