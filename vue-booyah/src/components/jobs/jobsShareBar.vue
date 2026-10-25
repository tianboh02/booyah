<script setup>
defineProps({
    label: { type: String, required: true },
    value: { type: Number, required: true }, // 0-100, drawn on the true scale
    count: { type: Number, default: null } // optional raw count, revealed on hover
})
</script>

<template>
    <div class="share-row mb-2 px-1 py-1 rounded-2">
        <div class="d-flex justify-content-between gap-2">
            <span class="item-label text-truncate">{{ label }}</span>
            <span class="font-monospace text-nowrap">
                <span v-if="count != null" class="row-meta text-muted-github">{{ count }} posts · </span>
                <span class="item-value fw-semibold">{{ value }}%</span>
            </span>
        </div>
        <div class="bar-track overflow-hidden mt-1" role="progressbar" :aria-valuenow="value" aria-valuemin="0" aria-valuemax="100"
            :aria-label="label">
            <div class="bar-fill h-100" :style="{ width: `${value}%` }"></div>
        </div>
    </div>
</template>

<style scoped>
.share-row {
    font-size: 0.9rem;
    transition: background-color 0.2s ease;
}

.share-row:hover {
    background-color: var(--badge-bg);
}

.item-label,
.item-value {
    color: var(--app-text);
    transition: color 0.2s ease;
}

.row-meta {
    opacity: 0;
    transition: opacity 0.2s ease;
}

.share-row:hover .row-meta {
    opacity: 1;
}

.bar-track {
    height: 7px;
    border-radius: 4px;
    background-color: var(--badge-bg);
}

.bar-fill {
    border-radius: 4px;
    background: linear-gradient(90deg, color-mix(in srgb, #58a6ff 45%, transparent), #58a6ff);
    box-shadow: 0 0 10px -1px color-mix(in srgb, #58a6ff 70%, transparent);
    transform-origin: left;
    animation: grow 0.8s cubic-bezier(0.22, 1, 0.36, 1) both;
    transition: filter 0.2s ease;
}

.share-row:hover .bar-fill {
    filter: brightness(1.2);
}

@keyframes grow {
    from {
        transform: scaleX(0);
    }
}

@media (prefers-reduced-motion: reduce) {
    .bar-fill {
        animation: none;
    }
}
</style>
