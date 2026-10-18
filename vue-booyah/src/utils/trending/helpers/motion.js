/**
 * src/utils/trending/helpers/motion.js
 *
 * What it does:  one place to ask "has this person turned off animations in their system settings?"
 * Receives:      nothing.
 * Gives back:    prefersReducedMotion() → true or false.
 * Used by:       charts/trendChart.vue, charts/compareChart.vue, orbit/packageOrbit.vue
 *                and composables/trending/useCountUp.js.
 */

/** true when the system "reduce motion" setting is on, so animations should be skipped */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
