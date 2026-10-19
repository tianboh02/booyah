import { ref, onBeforeUnmount } from 'vue'
import { useRafFn } from '@vueuse/core'

const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Ring tuning ported from Amber's archive.ts, measured in items instead of radians.
// `wheel`: items per pixel. `throw`: seconds of velocity added on release, capped at `max`.
// `bias` leans the snap toward the direction of travel. `glide` damps the snap, `track` the drag.
// `lean` tips the ring toward the cursor (visual only), `threshold` is the px before a drag starts.
const spin = {
    wheel: 0.0025,
    max: 1,
    throw: 0.2,
    min: 0.04,
    bias: 0.4,
    glide: 6,
    track: 12,
    lean: 0.05,
    leanDamp: 4,
    threshold: 6
}

// Wrap a number into [0, n).
const mod = (a, n) => ((a % n) + n) % n

// Slot to rest on. A short push advances instead of springing back.
function landing(target, velocity) {
    const bias = Math.abs(velocity) > spin.min ? Math.sign(velocity) * spin.bias : 0
    return Math.round(target + bias)
}

/**
 * useCardRing({ count, itemsPerPx, render, leanWhen })
 * Spin state for a ring of cards: drag with throw, horizontal / Shift wheel, arrow keys and
 * snapping. Animated values stay out of Vue's reactivity; `render()` is called every frame to
 * write transforms, and only the discrete `active` / `base` / `dragging` refs are reactive.
 * `leanWhen(event)` decides whether hovering tips the ring, e.g. not while over the front card.
 */
export function useCardRing({ count, itemsPerPx, render, leanWhen = () => true }) {
    const reduced = prefersReducedMotion()

    const active = ref(0)
    const base = ref(0)
    const dragging = ref(false)

    // `pos` is the item in front, as a continuous number. `intro` holds the caption on item 0
    // while the ring glides in on mount.
    const motion = {
        pos: reduced ? 0 : -1.5,
        target: 0,
        velocity: 0,
        lean: 0,
        leanTarget: 0,
        intro: !reduced
    }
    const pointer = { id: null, startX: 0, lastX: 0, lastT: 0, startTarget: 0, moved: false, suppressClick: false }
    let wheelTimer = 0

    // Shortest wrapped distance from the rendered position to item i, in [-n/2, n/2).
    function offsetOf(i, at = motion.pos + motion.lean) {
        const n = count()
        return n ? mod(i - at + n / 2, n) - n / 2 : 0
    }

    function sync() {
        const n = count()
        const rounded = Math.round(motion.pos)
        if (base.value !== rounded) base.value = rounded

        const front = n ? mod(motion.intro ? motion.target : rounded, n) : 0
        if (active.value !== front) active.value = front
    }

    // Frame loop: ease toward the target, then hand off to render(). Pauses once settled.
    const { pause, resume } = useRafFn(({ delta }) => {
        const dt = Math.min(delta / 1000, 0.05)
        const ease = (k) => (reduced ? 1 : 1 - Math.exp(-k * dt))

        motion.pos += (motion.target - motion.pos) * ease(dragging.value ? spin.track : spin.glide)
        motion.lean += (motion.leanTarget - motion.lean) * ease(spin.leanDamp)

        const settled =
            !dragging.value &&
            Math.abs(motion.target - motion.pos) < 0.0005 &&
            Math.abs(motion.leanTarget - motion.lean) < 0.0005

        if (settled) {
            motion.pos = motion.target
            motion.lean = motion.leanTarget
            motion.intro = false
        }

        sync()
        render()
        if (settled) pause()
    }, { immediate: false })

    function wake() {
        motion.intro = false
        resume()
    }

    function goTo(i) {
        if (count() < 2) return
        motion.target = Math.round(motion.target + offsetOf(i, motion.target))
        wake()
    }

    function next() {
        if (count() < 2) return
        motion.target = Math.round(motion.target) + 1
        wake()
    }

    function prev() {
        if (count() < 2) return
        motion.target = Math.round(motion.target) - 1
        wake()
    }

    // Put item i in front without spinning there, e.g. after the list is filtered.
    // `from` starts it slightly off-centre so it glides into place.
    function jumpTo(i, from = 0) {
        motion.target = i
        motion.pos = reduced ? i : i - from
        motion.velocity = 0
        motion.intro = false
        sync()
        render()
        resume()
    }

    // --- Pointer: drag with throw, plus hover lean for mice --------------------
    function onPointerDown(e) {
        pointer.suppressClick = false
        if (e.button !== 0 || count() < 2) return

        pointer.id = e.pointerId
        pointer.startX = pointer.lastX = e.clientX
        pointer.lastT = e.timeStamp
        pointer.startTarget = motion.target
        pointer.moved = false
        motion.velocity = 0
    }

    function onPointerMove(e) {
        if (pointer.id === null) {
            if (e.pointerType !== 'mouse' || reduced || count() < 2) return
            const r = e.currentTarget.getBoundingClientRect()
            const nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1))
            // Hold still while the pointer is on something it may want to click.
            motion.leanTarget = leanWhen(e) ? nx * spin.lean : 0
            resume()
            return
        }
        if (e.pointerId !== pointer.id) return

        const dx = e.clientX - pointer.startX
        if (!pointer.moved) {
            // Short moves stay clicks so the buttons inside the front card keep working.
            if (Math.abs(dx) < spin.threshold) return
            pointer.moved = true
            dragging.value = true
            motion.leanTarget = 0
            e.currentTarget.setPointerCapture(e.pointerId)
        }

        const perPx = itemsPerPx()
        const dt = Math.max((e.timeStamp - pointer.lastT) / 1000, 0.001)
        const moved = -(e.clientX - pointer.lastX) * perPx
        motion.velocity = motion.velocity * 0.8 + (moved / dt) * 0.2
        pointer.lastX = e.clientX
        pointer.lastT = e.timeStamp

        motion.target = pointer.startTarget - dx * perPx
        wake()
    }

    function onPointerUp(e) {
        if (e.pointerId !== pointer.id) return
        pointer.id = null
        if (!pointer.moved) return

        pointer.suppressClick = e.type === 'pointerup'
        dragging.value = false

        // Holding still before letting go means no throw.
        const velocity = e.timeStamp - pointer.lastT > 80 ? 0 : motion.velocity
        const thrown = motion.target + Math.max(-spin.max, Math.min(spin.max, velocity * spin.throw))
        motion.target = landing(thrown, velocity)
        wake()
    }

    function onPointerLeave() {
        if (pointer.id !== null) return
        motion.leanTarget = 0
        resume()
    }

    // The click that ends a drag must not open the link or button under the pointer.
    function onClickCapture(e) {
        if (!pointer.suppressClick) return
        pointer.suppressClick = false
        e.preventDefault()
        e.stopPropagation()
    }

    // --- Wheel: horizontal or Shift + wheel only, vertical keeps scrolling the page ---
    function onWheel(e) {
        if (count() < 2) return

        const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY)
        const delta = (horizontal ? e.deltaX : e.shiftKey ? e.deltaY : 0) * (e.deltaMode === 1 ? 16 : 1)
        if (!delta) return

        e.preventDefault()
        motion.target += delta * spin.wheel
        clearTimeout(wheelTimer)
        // No coasting: trackpads bring their own inertia. Snap once the wheel goes quiet.
        wheelTimer = setTimeout(() => {
            motion.target = landing(motion.target, Math.sign(delta))
            resume()
        }, 140)
        wake()
    }

    function onKeydown(e) {
        if (e.key === 'ArrowRight') {
            e.preventDefault()
            next()
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            prev()
        }
    }

    onBeforeUnmount(() => clearTimeout(wheelTimer))

    return {
        active,
        base,
        dragging,
        offsetOf,
        goTo,
        next,
        prev,
        jumpTo,
        start: resume,
        handlers: {
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onPointerLeave,
            onClickCapture,
            onWheel,
            onKeydown
        }
    }
}
