<script setup>
// "Sort by" pill: a thumb slides behind the chosen option (same look as Trending's periodToggle.vue).
//
// The thumb is sized from the real buttons, so options with different label lengths line up.
// If the control is wider than the screen it wraps under its label, and if it is still too wide
// it scrolls sideways inside its own pill instead of spilling out of the page.
import { computed, nextTick, onBeforeUnmount, onBeforeUpdate, onMounted, ref, watch } from 'vue'

const props = defineProps({
    // [{ value, label }]
    options: { type: Array, required: true },
    label: { type: String, default: 'Sort by' },
    ariaLabel: { type: String, default: 'Sort' }
})

const model = defineModel({ type: String })

// Position of the chosen option in the list
const index = computed(() => Math.max(0, props.options.findIndex((o) => o.value === model.value)))

const scroller = ref(null)
const buttons = [] // the real <button> elements, in the same order as options
const ready = ref(false) // false until the first measurement, so the thumb does not slide in from the left
const thumb = ref({ x: 0, w: 0 })
const fadeLeft = ref(false)
const fadeRight = ref(false)

// Vue refills this on every render, so start from empty to avoid stale buttons
onBeforeUpdate(() => {
    buttons.length = 0
})

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Put the thumb exactly behind the chosen button, whatever its width
function measure() {
    const el = buttons[index.value]
    if (!el) return
    thumb.value = { x: el.offsetLeft, w: el.offsetWidth }
    updateEdges()
}

// Soft fade on whichever side still has hidden options
function updateEdges() {
    const s = scroller.value
    if (!s) return
    const hidden = s.scrollWidth - s.clientWidth
    fadeLeft.value = hidden > 2 && s.scrollLeft > 2
    fadeRight.value = hidden > 2 && hidden - s.scrollLeft > 2
}

// When the pill scrolls, keep the chosen option in view
function revealActive(smooth = true) {
    const s = scroller.value
    const el = buttons[index.value]
    if (!s || !el || s.scrollWidth <= s.clientWidth) return
    const left = Math.max(0, el.offsetLeft - (s.clientWidth - el.offsetWidth) / 2)
    s.scrollTo({ left, behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto' })
}

// Re-measure whenever the pill or any button changes size (rotation, font loading, new labels)
let observer = null
function observeAll() {
    if (!observer || !scroller.value) return
    observer.disconnect()
    observer.observe(scroller.value)
    buttons.forEach((b) => observer.observe(b))
}

watch(
    [index, () => props.options],
    async () => {
        await nextTick()
        observeAll()
        measure()
        revealActive()
    },
    { deep: true }
)

onMounted(async () => {
    await nextTick()
    observer = new ResizeObserver(measure)
    observeAll()
    measure()
    revealActive(false)
    // turn the slide animation on only after the first measurement is painted
    requestAnimationFrame(() => (ready.value = true))
    document.fonts?.ready.then(measure)
})

onBeforeUnmount(() => observer?.disconnect())

// ← → move the choice and keep keyboard focus on it (standard radio-group behaviour)
function onKey(event) {
    const count = props.options.length
    let next
    if (event.key === 'ArrowRight') next = (index.value + 1) % count
    else if (event.key === 'ArrowLeft') next = (index.value - 1 + count) % count
    else return
    event.preventDefault()
    model.value = props.options[next].value
    if (buttons[next]) buttons[next].focus({ preventScroll: true })
}
</script>

<template>
    <div class="sort-pills d-flex flex-wrap align-items-center">
        <span class="text-muted-github small text-nowrap">{{ label }}</span>

        <div class="segmented" :class="{ 'is-ready': ready }">
            <div ref="scroller" class="scroller" role="radiogroup" :aria-label="ariaLabel"
                :style="{ '--x': thumb.x + 'px', '--w': thumb.w + 'px', '--fade-l': fadeLeft ? '18px' : '0px', '--fade-r': fadeRight ? '18px' : '0px' }"
                @keydown="onKey" @scroll.passive="updateEdges">
                <span class="thumb" aria-hidden="true"></span>
                <button v-for="(opt, i) in options" :key="opt.value" :ref="(el) => { if (el) buttons[i] = el }"
                    type="button" role="radio" class="text-nowrap" :aria-checked="model === opt.value"
                    :tabindex="model === opt.value ? 0 : -1" :class="{ active: model === opt.value }"
                    @click="model = opt.value">
                    {{ opt.label }}
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* main.css's theme colours, so the pill looks the same on every page */
.sort-pills {
    min-width: 0;
    max-width: 100%;
    /* if the label and the pill do not fit side by side, the pill drops under the label */
    gap: 0.25rem 0.5rem;
}

.segmented {
    --pill-ink: var(--app-text);
    --pill-ink-2: var(--text-muted-github, #8b949e);
    --pill-accent: var(--brand-blue, #58a6ff);
    --pill-ease: cubic-bezier(0.22, 1, 0.36, 1);

    display: inline-flex;
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    border-radius: 999px;
    background: color-mix(in srgb, var(--pill-ink) 4%, transparent);
    border: 1px solid var(--card-border);
}

/* The row of options. It scrolls sideways only if the screen is too narrow for all of them. */
.scroller {
    position: relative;
    display: flex;
    min-width: 0;
    padding: 3px 0;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    -webkit-mask-image: linear-gradient(to right, transparent 0, #000 var(--fade-l, 0px), #000 calc(100% - var(--fade-r, 0px)), transparent 100%);
    mask-image: linear-gradient(to right, transparent 0, #000 var(--fade-l, 0px), #000 calc(100% - var(--fade-r, 0px)), transparent 100%);
}

.scroller::-webkit-scrollbar {
    display: none;
}

/* margins (not padding) so the first and last option keep their 3px at the scroll ends */
.scroller button:first-of-type {
    margin-left: 3px;
}

.scroller button:last-of-type {
    margin-right: 3px;
}

/* The thumb takes the exact left edge and width of the chosen button (set from the script) */
.thumb {
    position: absolute;
    top: 3px;
    bottom: 3px;
    left: 0;
    width: var(--w, 0px);
    transform: translateX(var(--x, 0px));
    border-radius: 999px;
    background: color-mix(in srgb, var(--pill-accent) 22%, color-mix(in srgb, var(--pill-ink) 4%, transparent));
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pill-accent) 55%, transparent);
}

.is-ready .thumb {
    transition: transform 350ms var(--pill-ease), width 350ms var(--pill-ease), background-color 400ms var(--pill-ease);
}

/* light theme: a stronger tint of the accent (the faint one barely shows on white) */
:root[data-bs-theme='light'] .thumb {
    background: color-mix(in srgb, var(--pill-accent) 32%, color-mix(in srgb, var(--pill-ink) 4%, transparent));
}

button {
    position: relative;
    flex: 0 0 auto;
    padding: 7px 16px;
    border: 0;
    background: none;
    color: var(--pill-ink-2);
    font-size: 0.86rem;
    font-weight: 600;
    cursor: pointer;
    transition: color 250ms var(--pill-ease);
}

button.active {
    color: var(--pill-ink);
}

button:focus-visible {
    /* drawn inside the button so the scrolling row cannot clip it */
    outline: 2px solid var(--pill-accent);
    outline-offset: -2px;
    border-radius: 999px;
}

/* tighter on phones so more options fit before the pill has to scroll */
@media (max-width: 575.98px) {
    button {
        padding: 6px 10px;
        font-size: 0.82rem;
    }
}

@media (prefers-reduced-motion: reduce) {
    .is-ready .thumb {
        transition: none;
    }
}
</style>