<script setup>
import { computed, ref, watch } from 'vue'
import { vSpotlight } from '@/utils/motion'

const props = defineProps({
    title: { type: String, required: true },
    // [{ name, count, color }]
    rows: { type: Array, default: () => [] },
    selected: { type: String, default: null },
    // true while there is nothing to show yet but data is on its way
    loading: { type: Boolean, default: false },
    emptyText: { type: String, default: 'Nothing to show yet.' },
    hint: { type: String, default: '' }
})

const emit = defineEmits(['toggle'])

const maxCount = computed(() => Math.max(...props.rows.map(r => r.count), 1))
const bars = computed(() =>
    props.rows.map(r => ({ ...r, width: Math.max(Math.round((r.count / maxCount.value) * 100), 8) }))
)

// bars start at 0 width and grow a couple of frames after the rows arrive
const ready = ref(false)
watch(
    () => props.rows.length > 0,
    (has) => {
        ready.value = false
        if (has) requestAnimationFrame(() => requestAnimationFrame(() => (ready.value = true)))
    },
    { immediate: true }
)
</script>

<template>
    <div v-spotlight class="panel card p-4 h-100 rounded-3 shadow-sm">
        <div class="d-flex align-items-baseline justify-content-between gap-2 mb-1">
            <h2 class="h5 fw-bold section-title mb-0">{{ title }}</h2>
            <span v-if="selected" class="text-muted-github small">Click again to clear</span>
        </div>
        <p v-if="hint" class="text-muted-github small mb-3">{{ hint }}</p>
        <div v-else class="mb-3"></div>

        <!-- Loading: Bootstrap placeholders -->
        <div v-if="loading && !bars.length" class="placeholder-glow d-flex flex-column gap-3">
            <span v-for="n in 4" :key="n" class="placeholder rounded-pill col-12"></span>
        </div>

        <div v-else-if="bars.length" class="d-flex flex-column gap-2">
            <button v-for="(b, idx) in bars" :key="b.name" type="button" :title="b.name"
                class="bar-row d-flex flex-column w-100 text-start rounded-2" :class="{
                    'is-selected': selected === b.name,
                    'is-dim': selected && selected !== b.name
                }" :style="{ '--c': b.color }" :aria-pressed="selected === b.name" @click="emit('toggle', b.name)">
                <span class="d-flex align-items-baseline justify-content-between gap-3 mb-1">
                    <span class="stat-label bar-name small text-truncate">{{ b.name }}</span>
                    <span class="text-muted-github small flex-shrink-0 font-monospace">{{ b.count }}</span>
                </span>

                <div class="progress rounded-pill progress-track" style="height: 12px;">
                    <div class="progress-bar bar-fill rounded-pill" role="progressbar" :style="{
                        width: ready ? b.width + '%' : '0%',
                        backgroundColor: b.color,
                        transitionDelay: idx * 90 + 'ms'
                    }"></div>
                </div>
            </button>
        </div>

        <div v-else class="text-muted-github text-center my-auto py-4 small">{{ emptyText }}</div>
    </div>
</template>

<style scoped>
.section-title,
.stat-label {
    color: var(--app-text);
}

.panel {
    position: relative;
    overflow: hidden;
    isolation: isolate;
}

.panel::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
    background: radial-gradient(260px circle at var(--mx, 50%) var(--my, 50%),
            color-mix(in srgb, #58a6ff 18%, transparent),
            transparent 70%);
}

.panel:hover::before {
    opacity: 1;
}

.bar-row {
    background: transparent;
    border: 1px solid transparent;
    padding: 0.3rem 0.5rem;
    color: inherit;
    cursor: pointer;
    transition: background-color 0.25s ease, border-color 0.25s ease, opacity 0.25s ease;
}

.bar-row:hover {
    background-color: color-mix(in srgb, var(--c) 10%, transparent);
}

.bar-row:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4);
}

.bar-row.is-selected {
    background-color: color-mix(in srgb, var(--c) 16%, transparent);
    border-color: color-mix(in srgb, var(--c) 60%, transparent);
}

.bar-row.is-dim {
    opacity: 0.4;
}

.bar-row.is-dim:hover {
    opacity: 0.85;
}

.progress-track {
    background-color: var(--card-border) !important;
}

.bar-fill {
    position: relative;
    overflow: hidden;
    transition: width 1.1s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease;
}

.bar-row.is-selected .bar-fill {
    box-shadow: 0 0 12px var(--c);
}

.bar-fill::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(100deg, transparent 30%, rgba(255, 255, 255, 0.35) 50%, transparent 70%);
    transform: translateX(-100%);
    animation: sheen 3.6s ease-in-out 1.4s infinite;
}

.bar-name {
    min-width: 0;
}

@keyframes sheen {

    0%,
    60% {
        transform: translateX(-100%);
    }

    100% {
        transform: translateX(100%);
    }
}

@media (prefers-reduced-motion: reduce) {

    .bar-fill,
    .bar-row {
        transition: none !important;
    }

    .bar-fill::after {
        animation: none !important;
    }
}
</style>
