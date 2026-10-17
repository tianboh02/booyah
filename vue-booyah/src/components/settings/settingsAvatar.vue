<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
    src: { type: String, default: '' },
    initial: { type: String, default: '?' },
    size: { type: Number, default: 56 },
    // slow spinning gradient ring around the avatar
    ring: { type: Boolean, default: false },
    ringColor: { type: String, default: '#58a6ff' }
})

// If the image fails to load, fall back to the initial
const failed = ref(false)
watch(() => props.src, () => (failed.value = false))
</script>

<template>
    <span class="avatar" :class="{ 'has-ring': ring }" :style="{ '--size': size + 'px', '--ring': ringColor }">
        <span v-if="ring" class="ring-spin" aria-hidden="true"></span>
        <span class="face rounded-circle">
            <img v-if="src && !failed" :src="src" alt="" class="w-100 h-100 rounded-circle" @error="failed = true" />
            <span v-else class="initial fw-bold">{{ initial }}</span>
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
    position: relative;
    display: inline-flex;
    flex-shrink: 0;
    width: var(--size);
    height: var(--size);
}

.face {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
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
    line-height: 1;
}

@media (prefers-reduced-motion: reduce) {
    .ring-spin {
        animation: none !important;
    }
}
</style>
