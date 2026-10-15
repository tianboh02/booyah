<script setup>
import { computed } from 'vue'

const props = defineProps({
    bands: { type: Array, default: () => [] }
})

// one dot per posted band, placed at its midpoint (USD k)
const mids = computed(() => props.bands.map((b) => (b.lo + b.hi) / 2))
const min = computed(() => Math.min(...mids.value))
const max = computed(() => Math.max(...mids.value))
const left = (v) => ((v - min.value) / (max.value - min.value || 1)) * 100
</script>

<template>
    <div>
        <div class="dot-track position-relative border rounded-3 mb-1">
            <span v-for="(m, i) in mids" :key="i"
                class="dot position-absolute translate-middle-x rounded-circle bg-primary"
                :style="{ left: `${left(m)}%`, top: `${8 + (i % 4) * 14}px` }"></span>
        </div>
        <div class="d-flex justify-content-between text-muted-github small font-monospace">
            <span>${{ min }}k</span>
            <span>${{ max }}k</span>
        </div>
    </div>
</template>

<style scoped>
.dot-track {
    height: 64px;
    margin: 0 0.4rem;
    background-color: var(--github-control-bg);
    border-color: var(--card-border) !important;
    transition: background-color 0.2s ease, border-color 0.2s ease;
}

.dot {
    width: 0.65rem;
    height: 0.65rem;
    opacity: 0.6;
}
</style>
