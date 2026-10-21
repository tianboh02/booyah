<script setup>
defineProps({
    // [{ value, label }]
    options: { type: Array, required: true },
    label: { type: String, default: 'Sort by' },
    ariaLabel: { type: String, default: 'Sort' }
})

const model = defineModel({ type: String })
</script>

<template>
    <div class="d-flex align-items-center gap-2">
        <span class="text-muted-github small text-nowrap">{{ label }}</span>
        <div class="d-flex flex-wrap gap-1" role="group" :aria-label="ariaLabel">
            <button v-for="opt in options" :key="opt.value" type="button"
                class="sort-btn rounded-pill small text-nowrap" :class="{ active: model === opt.value }"
                :aria-pressed="model === opt.value" @click="model = opt.value">
                {{ opt.label }}
            </button>
        </div>
    </div>
</template>

<style scoped>
.sort-btn {
    color: var(--text-muted-github, #8b949e);
    background-color: transparent;
    border: 1px solid var(--card-border);
    padding: 0.15rem 0.7rem;
    transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.sort-btn:hover,
.sort-btn.active {
    color: var(--app-text);
    background-color: var(--badge-bg);
}

/* active gets a faint accent outline so it still reads clearly without a loud fill */
.sort-btn.active {
    font-weight: 600;
    border-color: color-mix(in srgb, #58a6ff 55%, var(--card-border));
}

.sort-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4);
}

@media (prefers-reduced-motion: reduce) {
    .sort-btn {
        transition: none !important;
    }
}
</style>