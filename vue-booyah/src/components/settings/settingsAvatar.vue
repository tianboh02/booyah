<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
    src: { type: String, default: '' },
    initial: { type: String, default: '?' },
    size: { type: Number, default: 56 },
    ring: { type: Boolean, default: false },
    ringColor: { type: String, default: '#58a6ff' }
})

const failed = ref(false)
watch(() => props.src, () => (failed.value = false))
</script>

<template>
    <span class="avatar position-relative d-inline-flex flex-shrink-0" :class="{ 'has-ring': ring }"
        :style="{ '--size': size + 'px', '--ring': ringColor }">
        <span v-if="ring" class="ring-spin" aria-hidden="true"></span>
        <span class="face position-absolute d-flex align-items-center justify-content-center overflow-hidden rounded-circle">
            <img v-if="src && !failed" :src="src" alt="" class="w-100 h-100 rounded-circle" @error="failed = true" />
            <span v-else class="initial fw-bold lh-1">{{ initial }}</span>
        </span>
    </span>
</template>

<style scoped>
@property --angle {
    syntax: '<angle>';
    inherits: false;
    initial-value: 0deg;
}

.avatar {
    width: var(--size);
    height: var(--size);
}

.face {
    inset: 0;
    background-color: var(--card-border);
    border: 1px solid var(--card-border);
    color: var(--app-text);
    transition: background-color 0.2s ease;
}

.has-ring .face {
    inset: 4px;
}

.has-ring .ring-spin {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: conic-gradient(from var(--angle), var(--ring), transparent 35%, #6b8aff 60%, transparent 85%, var(--ring));
    -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px));
    mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px));
    animation: spin-angle 6s linear infinite;
}

@keyframes spin-angle {
    to {
        --angle: 360deg;
    }
}

.initial {
    font-size: calc(var(--size) * 0.42);
}

@media (prefers-reduced-motion: reduce) {
    .ring-spin {
        animation: none !important;
    }
}
</style>
