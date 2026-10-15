<script setup>
defineProps({
    label: { type: String, required: true },
    value: { type: Number, required: true }
})
</script>

<template>
    <div class="mb-2 small">
        <div class="d-flex justify-content-between">
            <span class="item-label">{{ label }}</span>
            <span class="font-monospace text-muted-github">{{ value }}%</span>
        </div>
        <div class="progress bar-track" role="progressbar" :aria-valuenow="value" aria-valuemin="0"
            aria-valuemax="100">
            <div class="progress-bar" :style="{ width: `${value}%` }"></div>
        </div>
    </div>
</template>

<style scoped>
.item-label {
    color: var(--app-text);
    transition: color 0.2s ease;
}

.bar-track {
    height: 6px;
}
</style>
