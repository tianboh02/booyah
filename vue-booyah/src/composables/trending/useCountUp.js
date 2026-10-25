/**
 * src/composables/trending/useCountUp.js
 *
 * What it does:  makes a number "count up" smoothly to its new value instead of jumping.
 *                When the source number changes, the shown number slides from the old value
 *                to the new one over `duration` ms. People who turn off animations in their
 *                system settings see the final number straight away.
 * Receives:      useCountUp(source, duration = 750)
 *                  source    a function returning the number to show (or null for "–")
 * Gives back:    a Vue ref holding the in-between number to display, e.g.
 *                  const shown = useCountUp(() => pkg.value.latest.weekly)
 *                  <span>{{ num(shown) }}</span>
 * Used by:       orbit/packageOrbit.vue (the orb total) and detail/packageDashboard.vue (the big number).
 *
 * (A "composable" is Vue's name for a reusable function that holds its own reactive state.)
 */
import { ref, watch, onBeforeUnmount } from 'vue'
import { prefersReducedMotion } from '@/utils/motion'

/** Returns a ref that eases towards whatever `source()` returns. */
export function useCountUp(source, duration = 750) {
  const shown = ref(0)
  const reduceMotion = prefersReducedMotion()
  let frame = 0

  watch(
    source,
    (target) => {
      cancelAnimationFrame(frame)
      if (target === null || target === undefined) {
        shown.value = null
        return
      }
      if (reduceMotion) {
        shown.value = target
        return
      }
      const from = shown.value || 0
      const start = performance.now()
      const step = (now) => {
        const progress = Math.min(1, (now - start) / duration)
        const eased = 1 - Math.pow(1 - progress, 3) // fast at first, gentle at the end
        shown.value = from + (target - from) * eased
        if (progress < 1) frame = requestAnimationFrame(step)
      }
      frame = requestAnimationFrame(step)
    },
    { immediate: true },
  )

  onBeforeUnmount(() => cancelAnimationFrame(frame))
  return shown
}
