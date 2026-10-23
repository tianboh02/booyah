<script setup>
// "Sort by" pill: a thumb slides behind the chosen option (same look as Trending's periodToggle.vue).
import { computed } from 'vue'

const props = defineProps({
    // [{ value, label }]
    options: { type: Array, required: true },
    label: { type: String, default: 'Sort by' },
    ariaLabel: { type: String, default: 'Sort' }
})

const model = defineModel({ type: String })

// Position of the chosen option; the thumb's CSS slides by this many widths
const index = computed(() => Math.max(0, props.options.findIndex((o) => o.value === model.value)))

// ← → move the choice and keep keyboard focus on it (standard radio-group behaviour)
function onKey(event) {
    const count = props.options.length
    let next
    if (event.key === 'ArrowRight') next = (index.value + 1) % count
    else if (event.key === 'ArrowLeft') next = (index.value - 1 + count) % count
    else return
    event.preventDefault()
    model.value = props.options[next].value
    const buttons = event.currentTarget.querySelectorAll('button')
    if (buttons[next]) buttons[next].focus()
}
</script>

<template>
    <div class="d-flex align-items-center gap-2">
        <span class="text-muted-github small text-nowrap">{{ label }}</span>
        <div class="segmented" role="radiogroup" :aria-label="ariaLabel"
            :style="{ '--count': options.length, '--index': index }" @keydown="onKey">
            <span class="thumb"></span>
            <button v-for="opt in options" :key="opt.value" type="button" role="radio" class="text-nowrap"
                :aria-checked="model === opt.value" :tabindex="model === opt.value ? 0 : -1"
                :class="{ active: model === opt.value }" @click="model = opt.value">
                {{ opt.label }}
            </button>
        </div>
    </div>
</template>

<style scoped>
/* main.css's theme colours, so the pill looks the same on every page */
.segmented {
    --pill-ink: var(--app-text);
    --pill-ink-2: var(--text-muted-github, #8b949e);
    --pill-accent: var(--brand-blue, #58a6ff);
    --pill-ease: cubic-bezier(0.22, 1, 0.36, 1);

    position: relative;
    display: grid;
    grid-template-columns: repeat(var(--count), 1fr);
    padding: 3px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--pill-ink) 4%, transparent);
    border: 1px solid var(--card-border);
}

/* the thumb is one column wide and slides --index columns to the right */
.thumb {
    position: absolute;
    top: 3px;
    bottom: 3px;
    left: 3px;
    width: calc((100% - 6px) / var(--count));
    border-radius: 999px;
    background: color-mix(in srgb, var(--pill-accent) 22%, color-mix(in srgb, var(--pill-ink) 4%, transparent));
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pill-accent) 55%, transparent);
    transform: translateX(calc(var(--index) * 100%));
    transition: transform 350ms var(--pill-ease), background-color 400ms var(--pill-ease);
}

/* light theme: a stronger tint of the accent (the faint one barely shows on white) */
:root[data-bs-theme='light'] .thumb {
    background: color-mix(in srgb, var(--pill-accent) 32%, color-mix(in srgb, var(--pill-ink) 4%, transparent));
}

button {
    position: relative;
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
    outline: 2px solid var(--pill-accent);
    outline-offset: 2px;
    border-radius: 999px;
}

/* a little less side padding on phones */
@media (max-width: 575.98px) {
    button {
        padding: 7px 10px;
    }
}

@media (prefers-reduced-motion: reduce) {
    .thumb {
        transition: none;
    }
}
</style>
