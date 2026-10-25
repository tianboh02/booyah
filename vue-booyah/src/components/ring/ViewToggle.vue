<script setup>
// Carousel / list switch: two icon buttons in one outlined pill, same look as the sort buttons.
// Hidden at 768px and below, where useViewMode always shows the list.
import { isSmallScreen } from '@/composables/useViewMode'

const view = defineModel({ type: String, default: 'list' })

const options = [
    { value: 'carousel', label: 'Carousel view' },
    { value: 'list', label: 'List view' }
]
</script>

<template>
    <div v-if="!isSmallScreen" class="view-toggle d-inline-flex rounded-pill p-1" role="group" aria-label="View">
        <button v-for="opt in options" :key="opt.value" type="button"
            class="toggle-btn d-inline-flex align-items-center justify-content-center rounded-pill"
            :class="{ active: view === opt.value }" :aria-pressed="view === opt.value" :aria-label="opt.label"
            :title="opt.label" @click="view = opt.value">
            <!-- Carousel: a front card with two cards peeking behind it -->
            <svg v-if="opt.value === 'carousel'" width="16" height="16" viewBox="0 0 16 16" fill="none"
                stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true">
                <rect x="4.5" y="3" width="7" height="10" rx="1.2" />
                <path d="M3 4.5v7M13 4.5v7M1 6v4M15 6v4" stroke-linecap="round" />
            </svg>

            <!-- List: stacked rows -->
            <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"
                stroke-linecap="round" aria-hidden="true">
                <path d="M5.5 4h8M5.5 8h8M5.5 12h8" />
                <circle cx="2.5" cy="4" r="0.6" fill="currentColor" />
                <circle cx="2.5" cy="8" r="0.6" fill="currentColor" />
                <circle cx="2.5" cy="12" r="0.6" fill="currentColor" />
            </svg>
        </button>
    </div>
</template>

<style scoped>
.view-toggle {
    gap: 0.15rem;
    border: 1px solid var(--card-border);
}

/* Transparent at rest; the active view gets the neutral fill used by the sort pills. */
.toggle-btn {
    width: 30px;
    height: 24px;
    padding: 0;
    color: var(--text-muted-github);
    background-color: transparent;
    border: 0;
    transition: background-color 0.2s ease, color 0.2s ease;
}

.toggle-btn:hover,
.toggle-btn.active {
    color: var(--app-text);
    background-color: var(--badge-bg);
}

.toggle-btn.active {
    box-shadow: inset 0 0 0 1px var(--card-border);
}

.toggle-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4);
}

@media (prefers-reduced-motion: reduce) {
    .toggle-btn {
        transition: none !important;
    }
}
</style>
