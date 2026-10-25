<script setup>
import { vSpotlight } from '@/utils/motion'

// A selectable card for the Learn path: a category, a suggested language or a next language.
// Lift + cursor spotlight come from the shared .spot-card (main.css), tinted by `color`.
defineProps({
    label: { type: String, required: true },
    sub: { type: String, default: '' },
    color: { type: String, default: 'var(--brand-blue)' },
    active: { type: Boolean, default: false }
})

defineEmits(['select'])
</script>

<template>
    <button v-spotlight type="button" class="choice spot-card card w-100 h-100 text-start p-3 rounded-3 shadow-sm"
        :class="{ 'is-active': active }" :style="{ '--accent': color }" :aria-pressed="active"
        @click="$emit('select')">
        <span class="d-flex align-items-center gap-2 fw-semibold">
            <span class="choice-dot rounded-circle flex-shrink-0"></span>
            <span class="text-truncate">{{ label }}</span>
        </span>
        <span v-if="sub" class="d-block text-muted-github small mt-1">{{ sub }}</span>
    </button>
</template>

<style scoped>
.choice {
    color: var(--app-text);
}

.choice.is-active {
    border-color: var(--accent) !important;
    background-color: color-mix(in srgb, var(--accent) 12%, var(--card-bg)) !important;
}

.choice:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4);
}

.choice-dot {
    width: 10px;
    height: 10px;
    background-color: var(--accent);
}
</style>
