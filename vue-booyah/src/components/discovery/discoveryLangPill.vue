<script setup>
import { getLangColor } from '@/utils/langColors'

// Language dot + label, used in the filter row. The weight stays constant when active so the row doesn't reflow.
defineProps({
    lang: { type: String, required: true },
    active: { type: Boolean, default: false },
    // Draw a resting border (filter row). Card rows stay borderless until hover.
    outlined: { type: Boolean, default: false },
    dot: { type: Boolean, default: true },
    // A plain label instead of a button, for places where the language isn't clickable.
    static: { type: Boolean, default: false }
})
</script>

<template>
    <component :is="static ? 'span' : 'button'" :type="static ? undefined : 'button'"
        class="lang-pill d-inline-flex align-items-center gap-1 rounded-pill small mw-100"
        :class="{ 'is-active': active, 'is-outlined': outlined, 'is-static': static }"
        :style="{ '--lang': getLangColor(lang) }" :aria-pressed="static ? undefined : active">
        <span v-if="dot" class="lang-dot rounded-circle d-inline-block flex-shrink-0"></span>
        <span class="text-truncate">{{ lang }}</span>
    </component>
</template>

<style scoped>
.lang-pill {
    color: var(--text-muted-github);
    background: transparent;
    border: 1px solid transparent;
    padding: 0.15rem 0.55rem;
    cursor: pointer;
    transition:
        background-color 0.2s ease,
        border-color 0.2s ease,
        color 0.2s ease;
}

.lang-pill.is-outlined {
    border-color: var(--card-border);
}

.lang-pill.is-static {
    cursor: default;
}

.lang-pill:not(.is-static):hover {
    color: var(--app-text);
    background-color: color-mix(in srgb, var(--lang) 14%, transparent);
    border-color: color-mix(in srgb, var(--lang) 50%, transparent);
}

.lang-pill.is-active {
    color: var(--app-text);
    background-color: color-mix(in srgb, var(--lang) 18%, transparent);
    border-color: color-mix(in srgb, var(--lang) 65%, transparent);
}

.lang-pill:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4);
}

.lang-dot {
    width: 8px;
    height: 8px;
    background-color: var(--lang);
}

@media (prefers-reduced-motion: reduce) {
    .lang-pill {
        transition: none !important;
    }
}
</style>
