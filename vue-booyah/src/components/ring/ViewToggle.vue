<script setup>
import { isSmallScreen } from '@/composables/useViewMode'

const view = defineModel({ type: String, default: 'list' })

const options = [
    { value: 'carousel', label: 'Cards view' },
    { value: 'list', label: 'List view' }
]
</script>

<template>
    <div v-if="!isSmallScreen" class="view-toggle d-inline-flex align-items-center gap-1 p-1 rounded-pill" role="group"
        aria-label="View mode">
        <button v-for="opt in options" :key="opt.value" type="button"
            class="toggle-btn d-inline-flex align-items-center justify-content-center rounded-circle border-0"
            :class="{ active: view === opt.value }" :aria-pressed="view === opt.value" :aria-label="opt.label"
            :title="opt.label" @click="view = opt.value">

            <!-- Carousel Icon -->
            <svg v-if="opt.value === 'carousel'" width="14" height="14" viewBox="0 0 16 16" fill="none"
                stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">
                <rect x="4.5" y="3" width="7" height="10" rx="1.2" />
                <path d="M3 4.5v7M13 4.5v7M1 6v4M15 6v4" stroke-linecap="round" />
            </svg>

            <!-- List Icon -->
            <svg v-else width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"
                stroke-linecap="round" aria-hidden="true">
                <path d="M5.5 4h8M5.5 8h8M5.5 12h8" />
                <circle cx="2.5" cy="4" r="0.75" fill="currentColor" />
                <circle cx="2.5" cy="8" r="0.75" fill="currentColor" />
                <circle cx="2.5" cy="12" r="0.75" fill="currentColor" />
            </svg>
        </button>
    </div>
</template>

<style scoped>
.view-toggle {
    background-color: color-mix(in srgb, var(--card-bg) 90%, black);
    border: 1px solid color-mix(in srgb, #58a6ff 50%, var(--card-border));
    box-shadow: 0 0 12px rgba(88, 166, 255, 0.2);
    transition: all 0.2s ease;
}

.view-toggle:hover {
    border-color: #58a6ff;
    box-shadow: 0 0 16px rgba(88, 166, 255, 0.35);
}

.toggle-btn {
    width: 28px;
    height: 28px;
    color: var(--text-muted-github);
    background-color: transparent;
    cursor: pointer;
    transition: all 0.15s ease;
}

.toggle-btn:hover {
    color: var(--app-text);
    background-color: color-mix(in srgb, var(--app-text) 12%, transparent);
}

.toggle-btn.active {
    color: #ffffff;
    background-color: #58a6ff;
    box-shadow: 0 0 10px rgba(88, 166, 255, 0.6);
}

.toggle-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.5);
}

@media (prefers-reduced-motion: reduce) {

    .toggle-btn,
    .view-toggle {
        transition: none !important;
    }
}
</style>