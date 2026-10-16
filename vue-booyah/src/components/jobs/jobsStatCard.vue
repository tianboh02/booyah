<script setup>
// One stat card: tilt, cursor spotlight, count-up number, accent line that draws itself, staggered entrance.
// Same look as the My Projects and Discovery stat cards.
import { onMounted, ref } from 'vue'
import { vSpotlight, vTilt, useCountUp } from '@/utils/motion'

const props = defineProps({
    value: { type: Number, required: true },
    label: { type: String, required: true },
    hint: { type: String, default: '' },
    accent: { type: String, default: '#58a6ff' },
    index: { type: Number, default: 0 } // position in the row, staggers the entrance
})

const count = useCountUp(() => props.value)

// flips on the next frame so the card animates in from its resting state
const ready = ref(false)
onMounted(() => requestAnimationFrame(() => (ready.value = true)))
</script>

<template>
    <div v-tilt="5" v-spotlight class="card stat-card p-3 h-100 rounded-3 shadow-sm" :class="{ 'is-in': ready }"
        :style="{ '--i': index, '--accent': accent }">
        <span class="h3 fw-bold stat-value mb-1 font-monospace">{{ count }}</span>
        <span class="stat-label fw-semibold small">{{ label }}</span>
        <span v-if="hint" class="text-muted-github small">{{ hint }}</span>
    </div>
</template>

<style scoped>
.stat-value,
.stat-label {
    color: var(--app-text);
    transition: color 0.2s ease;
}

.stat-card {
    position: relative;
    overflow: hidden;
    transform: perspective(700px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
    transition: transform 0.2s ease-out, border-color 0.3s ease, box-shadow 0.3s ease,
        opacity 0.6s ease, translate 0.7s cubic-bezier(0.22, 1, 0.36, 1);
    opacity: 0;
    translate: 0 18px;
    transition-delay: 0s, 0s, 0s, calc(var(--i) * 110ms), calc(var(--i) * 110ms);
}

.stat-card.is-in {
    opacity: 1;
    translate: 0 0;
}

.stat-card>* {
    position: relative;
}

/* Cursor spotlight */
.stat-card::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
    background: radial-gradient(260px circle at var(--mx, 50%) var(--my, 50%),
            color-mix(in srgb, var(--accent) 20%, transparent),
            transparent 70%);
}

.stat-card:hover::before {
    opacity: 1;
}

.stat-card:hover {
    border-color: color-mix(in srgb, var(--accent) 55%, var(--card-border));
    box-shadow: 0 10px 30px -12px color-mix(in srgb, var(--accent) 45%, transparent) !important;
}

/* Accent line along the top edge: fades in from the left, peaks in the middle, fades out to the right */
.stat-card::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent) 50%, transparent);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
    transition-delay: calc(var(--i) * 110ms + 300ms);
}

.stat-card.is-in::after {
    transform: scaleX(1);
}

@media (prefers-reduced-motion: reduce) {

    .stat-card,
    .stat-card::after {
        transition: none !important;
    }

    .stat-card {
        opacity: 1;
        translate: none;
        transform: none;
    }

    .stat-card::after {
        transform: scaleX(1);
    }
}
</style>
