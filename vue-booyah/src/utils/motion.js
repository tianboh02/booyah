import { ref, watch, onBeforeUnmount } from 'vue'

const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * v-spotlight
 * Writes the cursor position into --mx / --my on the element so CSS can
 * paint a soft light that follows the mouse.
 */
export const vSpotlight = {
    mounted(el) {
        el._spotMove = (e) => {
            const r = el.getBoundingClientRect()
            el.style.setProperty('--mx', `${e.clientX - r.left}px`)
            el.style.setProperty('--my', `${e.clientY - r.top}px`)
        }
        el.addEventListener('pointermove', el._spotMove)
    },
    unmounted(el) {
        if (el._spotMove) el.removeEventListener('pointermove', el._spotMove)
    }
}

/**
 * v-tilt="6"
 * Gentle 3D tilt toward the cursor. The value is the max angle in degrees.
 * Skipped on touch devices and when the user prefers reduced motion.
 */
export const vTilt = {
    mounted(el, binding) {
        if (prefersReducedMotion() || window.matchMedia('(pointer: coarse)').matches) return

        const max = binding.value ?? 6
        el._tiltMove = (e) => {
            const r = el.getBoundingClientRect()
            const px = (e.clientX - r.left) / r.width
            const py = (e.clientY - r.top) / r.height
            el.style.setProperty('--ry', `${(px - 0.5) * max * 2}deg`)
            el.style.setProperty('--rx', `${-(py - 0.5) * max * 2}deg`)
        }
        el._tiltLeave = () => {
            el.style.setProperty('--rx', '0deg')
            el.style.setProperty('--ry', '0deg')
        }
        el.addEventListener('pointermove', el._tiltMove)
        el.addEventListener('pointerleave', el._tiltLeave)
    },
    unmounted(el) {
        if (el._tiltMove) el.removeEventListener('pointermove', el._tiltMove)
        if (el._tiltLeave) el.removeEventListener('pointerleave', el._tiltLeave)
    }
}

/**
 * useCountUp(() => number)
 * Returns a ref that eases from its current value to the target.
 */
export function useCountUp(getTarget, duration = 1300) {
    const display = ref(0)
    let raf = 0

    watch(
        getTarget,
        (to) => {
            cancelAnimationFrame(raf)
            if (prefersReducedMotion()) {
                display.value = to
                return
            }
            const from = display.value
            const start = performance.now()
            const tick = (now) => {
                const t = Math.min((now - start) / duration, 1)
                const eased = 1 - Math.pow(1 - t, 4) // easeOutQuart
                display.value = Math.round(from + (to - from) * eased)
                if (t < 1) raf = requestAnimationFrame(tick)
            }
            raf = requestAnimationFrame(tick)
        },
        { immediate: true }
    )

    onBeforeUnmount(() => cancelAnimationFrame(raf))
    return display
}
