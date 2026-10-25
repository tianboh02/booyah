<script setup>
import { computed, onMounted, onUpdated, ref, watch } from 'vue'
import { useEventListener, useResizeObserver } from '@vueuse/core'
import { useCardRing } from '@/composables/useCardRing'

const props = defineProps({
    items: { type: Array, default: () => [] },
    // property name or function returning a unique key per item
    itemKey: { type: [String, Function], default: 'id' },
    // property name or function for the hover callout on back cards; falls back to the key
    itemLabel: { type: [String, Function], default: null },
    // most cards on the ring at once; longer lists cycle through this window
    slots: { type: Number, default: 7 },
    cardWidth: { type: String, default: 'min(360px, 86vw)' },
    // ring radius as a multiple of the card width; wide enough that the front card stands apart
    radius: { type: Number, default: 1.3 },
    // how far side cards turn toward their angle on the ring, in degrees
    turn: { type: Number, default: 38 },
    label: { type: String, default: 'Cards' }
})

const activeModel = defineModel('active', { type: Number, default: 0 })

// Must match `perspective` on .ring-platform.
const PERSPECTIVE = 1600
// How far back the ring reaches, as a multiple of the radius.
const DEPTH = 1.6
// Room above the highest card for its hover callout, in px.
const CALLOUT_ROOM = 70
// The camera looks down on the ring by this many degrees, so the far side rises and shrinks.
const TILT = 10
const COS = Math.cos((TILT * Math.PI) / 180)
const SIN = Math.sin((TILT * Math.PI) / 180)
// How far the back of the ring is lifted, as a share of the card height (on top of the tilt).
const LIFT_RATIO = 0.2
// The highest back cards may poke this far above the stage, where the top fade clips them.
const TRIM_TOP = 50
const TOP_FADE = 50

const root = ref(null)
const platform = ref(null)
let cardPx = 360
let cardH = 240
// The far side of the ring sits higher, as if seen from slightly above.
let lift = 48

const pickKey = (item, key) => (typeof key === 'function' ? key(item) : item?.[key])
const keyOf = (item) => pickKey(item, props.itemKey)
const labelOf = (item) => pickKey(item, props.itemLabel ?? props.itemKey)

const pad = (n) => String(n).padStart(2, '0')
const mod = (a, n) => ((a % n) + n) % n

// Every item gets a slot while it fits; longer lists share a fixed ring.
const ringSize = computed(() => Math.max(Math.min(props.items.length, props.slots), 1))
const step = computed(() => (Math.PI * 2) / ringSize.value)
const radiusPx = () => cardPx * props.radius

const ring = useCardRing({
    count: () => props.items.length,
    // Near the front a card moves R * step px per item, so the card stays under the pointer.
    itemsPerPx: () => 1 / (radiusPx() * step.value),
    render,
    // The front card holds still so its buttons and hover effects stay under the pointer.
    leanWhen: (e) => !e.target.closest('.is-front')
})

const { active, base, dragging, goTo, next, prev, handlers } = ring

// Indices to render: all of them, or the window around the front card.
const visible = computed(() => {
    const n = props.items.length
    if (n <= props.slots) return props.items.map((_, i) => i)

    const half = Math.ceil(props.slots / 2)
    const list = new Set()
    for (let k = -half; k <= half; k++) list.add(mod(base.value + k, n))
    return [...list]
})

// Where a card sits vertically and in depth: lifted and pushed back by how far round the ring it is,
// then the whole ring is tilted about the front card's centre. Cards themselves stay upright.
function tilted(depth, R) {
    const y0 = -lift * depth
    const z0 = -R * DEPTH * depth
    return { y: y0 * COS + z0 * SIN, z: -y0 * SIN + z0 * COS }
}

// Cards slide around the ring, turned slightly toward their angle so they read as 3D.
function place(el, i) {
    const off = ring.offsetOf(i)
    const a = off * step.value
    const depth = (1 - Math.cos(a)) / 2 // 0 at the front, 1 at the back
    const R = radiusPx()

    // In a windowed ring, cards fade out before they reach the back and get swapped.
    const fade = props.items.length > props.slots
        ? Math.min(1, Math.max(0, props.slots / 2 - Math.abs(off)))
        : 1

    const { y, z } = tilted(depth, R)
    el.style.transform =
        `translate3d(${R * Math.sin(a)}px, ${y}px, ${z}px) ` +
        `rotateY(${(Math.sin(a) * props.turn).toFixed(2)}deg)`
    // How present a card is: 1 at the front, dropping quickly toward the back. The CSS turns
    // it into opacity, blur, greyscale and dimming, with values tuned per theme.
    el.style.setProperty('--vis', ((1 - depth) ** 1.5).toFixed(3))
    el.style.setProperty('--blur', (Math.max(0, depth - 0.2) * 4).toFixed(2))
    el.style.setProperty('--fade', fade.toFixed(3))
    el.style.zIndex = String(Math.round((1 - depth) * 100) + 1)
    el.style.visibility = fade > 0 ? 'visible' : 'hidden'
}

function render() {
    if (!platform.value) return
    for (const el of platform.value.children) {
        if (el.dataset.index !== undefined) place(el, Number(el.dataset.index))
    }
}

// Card size drives the lift, the stage padding, the arrow height and the platform disc.
// The disc follows the same perspective projection the cards use.
function measure() {
    const slot = platform.value?.querySelector('.ring-slot')
    if (!slot || !root.value) return

    cardPx = slot.offsetWidth || cardPx
    cardH = slot.offsetHeight || cardH
    lift = Math.round(cardH * LIFT_RATIO)

    const R = radiusPx()
    const cy = cardH / 2
    // Perspective scale and vertical offset of a card at this depth, after the tilt.
    const at = (depth) => {
        const { y, z } = tilted(depth, R)
        return { y, s: PERSPECTIVE / (PERSPECTIVE - z) }
    }
    const back = at(1)
    const side = at(0.5).s

    // Highest point any card on the ring reaches. A ring with an odd count has no card dead at the back.
    let backTop = Infinity
    for (let k = 0; k < ringSize.value; k++) {
        const { y, s } = at((1 - Math.cos(k * step.value)) / 2)
        backTop = Math.min(backTop, cy * (1 - s) + y * s)
    }
    // Room for the callout above it, less what the top fade is allowed to clip.
    const padTop = Math.round(Math.max(0, Math.max(0, -backTop) + CALLOUT_ROOM - TRIM_TOP))

    // Disc spans from under the back card's feet to just past the front card's.
    const backBottom = cy + (cy + back.y) * back.s
    const halfH = (cardH - backBottom) / 2 + 28
    const halfW = R * side + cardPx * 0.2

    const s = root.value.style
    s.setProperty('--pad-top', `${padTop}px`)
    s.setProperty('--top-fade', `${TOP_FADE}px`)
    s.setProperty('--front-mid', `${padTop + cardH / 2}px`)
    s.setProperty('--floor-top', `${(cardH + backBottom) / 2 - halfH}px`)
    s.setProperty('--floor-w', `${halfW * 2}px`)
    s.setProperty('--floor-h', `${halfH * 2}px`)
    s.setProperty('--floor-ratio', String(halfH / halfW))
}

// Keep the same card in front when the list is filtered, sorted or shrinks.
watch(
    () => props.items.map(keyOf),
    (keys, oldKeys) => {
        const same = oldKeys && keys.length === oldKeys.length && keys.every((k, i) => k === oldKeys[i])
        if (!keys.length || same) return
        const kept = keys.indexOf(oldKeys?.[active.value])
        ring.jumpTo(kept >= 0 ? kept : Math.min(active.value, keys.length - 1), kept >= 0 ? 0 : 0.6)
    }
)

watch(active, (i) => {
    activeModel.value = i
})

watch(activeModel, (i) => {
    if (i !== active.value) goTo(i)
})

useEventListener(window, 'resize', () => {
    measure()
    render()
})

// A card that changes height (a filter, a wrapped line, a late font) re-fits the stage instead of leaving it stale.
useResizeObserver(platform, () => {
    measure()
    render()
})

onMounted(() => {
    measure()
    render()
    ring.start()
})

// New slots from the moving window get placed before the browser paints them.
onUpdated(() => {
    measure()
    render()
})
</script>

<template>
    <section ref="root" class="card-ring" role="region" aria-roledescription="carousel" :aria-label="label"
        :style="{ '--card-w': cardWidth }">
        <div class="ring-body position-relative">
            <!-- Stage: drag, Shift + wheel or arrow keys spin the ring -->
            <div class="ring-stage" :class="{ 'is-dragging': dragging }" tabindex="0"
                @pointerdown="handlers.onPointerDown" @pointermove="handlers.onPointerMove"
                @pointerup="handlers.onPointerUp" @pointercancel="handlers.onPointerUp"
                @pointerleave="handlers.onPointerLeave" @click.capture="handlers.onClickCapture"
                @wheel="handlers.onWheel" @keydown="handlers.onKeydown" @dragstart.prevent>
                <div ref="platform" class="ring-platform">
                    <!-- Platform disc the cards stand on -->
                    <div class="ring-floor" aria-hidden="true"></div>

                    <div v-for="i in visible" :key="keyOf(items[i])" class="ring-slot"
                        :class="{ 'is-front': i === active }" :data-index="i" role="group"
                        aria-roledescription="slide" :aria-label="`${i + 1} of ${items.length}`"
                        @click="i !== active && goTo(i)">
                        <!-- Hover callout on back cards: leader line + number + name -->
                        <div class="ring-callout" aria-hidden="true">
                            <svg class="co-line" width="160" height="56" viewBox="0 0 160 56" fill="none">
                                <polyline points="0,56 60,0 160,0" stroke="currentColor" stroke-width="1.5" />
                                <circle cx="0" cy="56" r="4" fill="currentColor" />
                            </svg>
                            <span class="co-text font-monospace text-end">
                                <span class="co-num d-block">{{ pad(i + 1) }}</span>
                                <span class="co-name d-block text-truncate">{{ labelOf(items[i]) }}</span>
                            </span>
                        </div>

                        <!-- Only the front card can be clicked or focused. -->
                        <div class="ring-card h-100" :inert="i !== active">
                            <slot name="card" :item="items[i]" :index="i" :front="i === active" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Arrows pinned to the ring's sides -->
            <button type="button"
                class="ring-arrow is-prev d-none d-sm-inline-flex align-items-center justify-content-center rounded-circle"
                aria-label="Previous card" :disabled="items.length < 2" @click="prev">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"
                    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M10 3L5 8l5 5" />
                </svg>
            </button>
            <button type="button"
                class="ring-arrow is-next d-none d-sm-inline-flex align-items-center justify-content-center rounded-circle"
                aria-label="Next card" :disabled="items.length < 2" @click="next">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"
                    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M6 3l5 5-5 5" />
                </svg>
            </button>
        </div>

        <!-- Caption for the front card; re-keyed so its entrance replays -->
        <div class="ring-caption-wrap" aria-live="polite">
            <div v-if="items[active]" :key="keyOf(items[active])">
                <slot name="caption" :item="items[active]" :index="active" :total="items.length" />
            </div>
        </div>

        <!-- Pager -->
        <div class="ring-controls d-flex align-items-center justify-content-center mt-3">
            <div v-if="items.length <= 12" class="d-flex gap-2">
                <button v-for="(item, i) in items" :key="keyOf(item)" type="button" class="pager-bar"
                    :class="{ 'is-active': i === active }" :aria-label="`Show ${i + 1} of ${items.length}`"
                    :aria-current="i === active" @click="goTo(i)"></button>
            </div>

            <div v-else class="d-flex align-items-center gap-2">
                <span class="pager-track d-block">
                    <span class="pager-thumb d-block"
                        :style="{ width: `${100 / items.length}%`, transform: `translateX(${active * 100}%)` }"></span>
                </span>
                <span class="text-muted-github small font-monospace">{{ pad(active + 1) }} / {{ pad(items.length) }}</span>
            </div>
        </div>
    </section>
</template>

<style scoped>
/* --- Theme: how far back cards recede and how much the front card pops ------- */
/* Dark: back cards dim toward black; the front card gets an accent glow. */
.card-ring {
    --ring-accent: #58a6ff;
    --ring-min-op: 0.5;
    --ring-dim: 0.2;
    --ring-gray: 0.35;
    --ring-front-shadow:
        0 0 0 1px color-mix(in srgb, var(--ring-accent) 60%, transparent),
        0 0 56px -12px color-mix(in srgb, var(--ring-accent) 55%, transparent),
        0 32px 64px -24px rgba(0, 0, 0, 0.9);
    --ring-pool: color-mix(in srgb, var(--ring-accent) 28%, transparent);
}

/* Light: back cards wash out toward white; the front card lifts on a crisp shadow. */
[data-bs-theme='light'] .card-ring {
    --ring-accent: #0969da;
    --ring-min-op: 0.4;
    --ring-dim: 0;
    --ring-gray: 0.6;
    --ring-front-shadow:
        0 0 0 1px color-mix(in srgb, var(--ring-accent) 45%, transparent),
        0 30px 56px -20px rgba(31, 35, 40, 0.4),
        0 10px 20px -10px rgba(31, 35, 40, 0.25);
    --ring-pool: color-mix(in srgb, var(--ring-accent) 16%, transparent);
}

/* --- Stage ---------------------------------------------------------------- */
/* Room above for the lifted far side; the mask fades cards out at the container edges. */
.ring-stage {
    /* how much of each side fades out; none on phones, where the front card spans the screen */
    --edge-fade: 7%;
    position: relative;
    padding: var(--pad-top, 8rem) 0 3rem;
    overflow-x: clip;
    touch-action: pan-y;
    user-select: none;
    cursor: grab;
    outline: none;
    /* Sides fade out, and so does the top, where the highest back cards are clipped. */
    -webkit-mask-image:
        linear-gradient(90deg, transparent, #000 var(--edge-fade), #000 calc(100% - var(--edge-fade)), transparent),
        linear-gradient(180deg, transparent 0, #000 var(--top-fade, 0px));
    mask-image:
        linear-gradient(90deg, transparent, #000 var(--edge-fade), #000 calc(100% - var(--edge-fade)), transparent),
        linear-gradient(180deg, transparent 0, #000 var(--top-fade, 0px));
    -webkit-mask-composite: source-in;
    mask-composite: intersect;
}

/* The front card uses normal cursors, so the hand never covers its small icons. */
.ring-slot.is-front .ring-card {
    cursor: auto;
}

.ring-stage.is-dragging,
.ring-stage.is-dragging * {
    cursor: grabbing !important;
}

.ring-stage:focus-visible {
    border-radius: 0.75rem;
    box-shadow: inset 0 0 0 2px rgba(56, 139, 253, 0.5);
}

/* All slots share one grid cell, so the stage is as tall as the tallest card. */
.ring-platform {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr); /* the column never grows past the stage, so max-width below works */
    justify-items: center;
    perspective: 1600px;
}

/* --vis / --blur / --fade come from place(); hovering a back card brings most of it back. */
.ring-slot {
    --v: max(var(--vis, 1), var(--hover, 0) * 0.85);
    position: relative;
    grid-area: 1 / 1;
    width: var(--card-w);
    /* --card-w is usually in vw, which is wider than the container on small phones */
    max-width: 100%;
    opacity: calc((var(--ring-min-op) + (1 - var(--ring-min-op)) * var(--v)) * var(--fade, 1));
    filter: blur(calc(var(--blur, 0) * (1 - var(--hover, 0)) * 1px)) grayscale(calc((1 - var(--v)) * var(--ring-gray))) brightness(calc(1 - (1 - var(--v)) * var(--ring-dim)));
    will-change: transform, opacity, filter;
}

.ring-slot:not(.is-front) {
    cursor: pointer;
}

.ring-slot:not(.is-front):hover {
    --hover: 1;
}

/* The front card is never filtered, so its text stays sharp. */
.ring-slot.is-front {
    filter: none;
}

/* Front card: accent ring + glow (dark) or lifted shadow (light). */
.ring-card {
    border-radius: var(--bs-border-radius-lg);
    transition: box-shadow 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.ring-slot.is-front .ring-card {
    box-shadow: var(--ring-front-shadow);
}

/* --- Platform disc ---------------------------------------------------------- */
.ring-floor {
    position: absolute;
    left: 50%;
    top: var(--floor-top, 60%);
    width: var(--floor-w, 100%);
    height: var(--floor-h, 40%);
    transform: translateX(-50%);
    border-radius: 50%;
    overflow: hidden;
    pointer-events: none;
    /* A pool of light under the front card, then the rim shading, then the disc colour. */
    background:
        radial-gradient(ellipse 30% 42% at 50% 82%, var(--ring-pool), transparent 70%),
        radial-gradient(closest-side, transparent 55%, color-mix(in srgb, var(--card-border) 45%, transparent)),
        color-mix(in srgb, var(--card-bg) 75%, var(--app-bg));
    border: 1px solid var(--card-border);
    box-shadow:
        0 12px 0 color-mix(in srgb, var(--card-border) 65%, var(--app-bg)),
        0 34px 60px -24px rgba(0, 0, 0, 0.45);
}

/* Square grid squashed into the ellipse, so it reads as a floor in perspective. */
.ring-floor::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: var(--floor-w, 100%);
    transform: scaleY(var(--floor-ratio, 0.3));
    transform-origin: top;
    background-image:
        repeating-linear-gradient(0deg, color-mix(in srgb, var(--card-border) 70%, transparent) 0 1px, transparent 1px 32px),
        repeating-linear-gradient(90deg, color-mix(in srgb, var(--card-border) 70%, transparent) 0 1px, transparent 1px 32px);
    -webkit-mask-image: radial-gradient(closest-side, #000 30%, transparent);
    mask-image: radial-gradient(closest-side, #000 30%, transparent);
    opacity: 0.7;
}

/* --- Hover callout on back cards ------------------------------------------- */
.ring-callout {
    position: absolute;
    left: 28%;
    bottom: calc(100% - 22px);
    width: 160px;
    height: 56px;
    color: var(--app-text);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.25s ease;
}

.co-line {
    position: absolute;
    left: 0;
    bottom: 0;
    overflow: visible;
}

.co-line polyline {
    stroke-dasharray: 200;
    stroke-dashoffset: 200;
    transition: stroke-dashoffset 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.co-text {
    position: absolute;
    right: 0;
    bottom: calc(100% + 6px);
    max-width: 220px;
    line-height: 1.1;
    text-transform: uppercase;
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 0.3s ease 0.15s, transform 0.35s cubic-bezier(0.22, 1, 0.36, 1) 0.15s;
}

.co-num {
    font-size: 1.35rem;
    font-weight: 700;
}

.co-name {
    font-size: 0.8rem;
    letter-spacing: 0.08em;
}

.ring-slot:not(.is-front):hover .ring-callout {
    opacity: 1;
}

.ring-slot:not(.is-front):hover .co-line polyline {
    stroke-dashoffset: 0;
}

.ring-slot:not(.is-front):hover .co-text {
    opacity: 1;
    transform: none;
}

.ring-slot.is-front .ring-callout,
.is-dragging .ring-callout {
    display: none;
}

/* --- Side arrows ------------------------------------------------------------ */
.ring-arrow {
    position: absolute;
    top: var(--front-mid, 50%);
    z-index: 2;
    width: 44px;
    height: 44px;
    transform: translateY(-50%);
    color: var(--app-text);
    background-color: var(--card-bg);
    border: 1px solid var(--card-border);
    box-shadow: 0 8px 20px -12px rgba(0, 0, 0, 0.5);
    transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
}

.ring-arrow.is-prev {
    left: 0;
}

.ring-arrow.is-next {
    right: 0;
}

.ring-arrow:hover:not(:disabled) {
    background-color: var(--badge-bg);
    border-color: color-mix(in srgb, #58a6ff 50%, var(--card-border));
}

.ring-arrow:active:not(:disabled) {
    transform: translateY(-50%) scale(0.9);
}

.ring-arrow:disabled {
    opacity: 0.4;
}

@media (max-width: 575.98px) {
    .ring-stage {
        --edge-fade: 0%;
    }

    .ring-arrow {
        width: 36px;
        height: 36px;
    }
}

/* --- Caption -------------------------------------------------------------- */
.ring-caption-wrap {
    min-height: 7rem;
}

/* --- Pager: Amber's thin bars, the active one filled ------------------------ */
.pager-bar {
    position: relative;
    width: 20px;
    height: 16px;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
}

.pager-bar::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 7px;
    height: 2px;
    background-color: var(--card-border);
    transition: background-color 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.pager-bar:hover::before {
    background-color: var(--text-muted-github);
}

.pager-bar.is-active::before {
    background-color: var(--app-text);
}

.pager-track {
    width: 140px;
    height: 2px;
    background-color: var(--card-border);
    overflow: hidden;
}

.pager-thumb {
    height: 100%;
    background-color: var(--app-text);
    transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.ring-arrow:focus-visible,
.pager-bar:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4);
}

@media (prefers-reduced-motion: reduce) {

    .ring-arrow,
    .ring-card,
    .pager-bar::before,
    .pager-thumb,
    .ring-callout,
    .co-line polyline,
    .co-text {
        transition: none !important;
    }
}
</style>
