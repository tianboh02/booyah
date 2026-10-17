<script setup>
import { getLangColor } from '@/utils/langColors'
import { categoryColor } from '@/utils/savedLibrary'

defineProps({
    shown: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
})

const search = defineModel('search', { type: String, default: '' })
const sortBy = defineModel('sortBy', { type: String, default: 'newest' })
const selectedCategory = defineModel('selectedCategory', { type: String, default: null })
const selectedLang = defineModel('selectedLang', { type: String, default: null })

const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'name', label: 'Name' },
    { value: 'stars', label: 'Stars' }
]
</script>

<template>
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div class="d-flex align-items-center gap-2 flex-wrap">
            <h3 class="h3 fw-bold section-title mb-0">Your bookmarks</h3>
            <span class="text-muted-github small font-monospace">{{ shown }}/{{ total }}</span>

            <!-- Active filters -->
            <TransitionGroup name="chip">
                <button v-if="selectedCategory" key="category" type="button"
                    class="filter-chip d-inline-flex align-items-center gap-2 rounded-pill ps-3 pe-2 py-1"
                    :style="{ '--c': categoryColor(selectedCategory) }" :aria-label="'Clear ' + selectedCategory + ' filter'"
                    @click="selectedCategory = null">
                    <span class="chip-dot rounded-circle"></span>
                    <span class="small fw-semibold">{{ selectedCategory }}</span>
                    <span class="chip-x rounded-circle d-inline-flex align-items-center justify-content-center">✕</span>
                </button>

                <button v-if="selectedLang" key="lang" type="button"
                    class="filter-chip d-inline-flex align-items-center gap-2 rounded-pill ps-3 pe-2 py-1"
                    :style="{ '--c': getLangColor(selectedLang) }" :aria-label="'Clear ' + selectedLang + ' filter'"
                    @click="selectedLang = null">
                    <span class="chip-dot rounded-circle"></span>
                    <span class="small fw-semibold">{{ selectedLang }}</span>
                    <span class="chip-x rounded-circle d-inline-flex align-items-center justify-content-center">✕</span>
                </button>
            </TransitionGroup>
        </div>

        <div class="d-flex align-items-center gap-3 flex-wrap">
            <!-- Search (grows on focus) -->
            <div class="search-wrap position-relative">
                <svg class="search-icon position-absolute top-50 start-0 translate-middle-y ms-2 pe-none" width="14"
                    height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"
                    stroke-linecap="round" aria-hidden="true">
                    <circle cx="7" cy="7" r="4.5" />
                    <path d="M10.5 10.5L14 14" />
                </svg>

                <input v-model="search" type="text" class="form-control form-control-sm github-control"
                    style="padding-left: 1.85rem;" placeholder="Search saved projects"
                    aria-label="Search saved projects" />
            </div>

            <!-- Sort: Bootstrap button group -->
            <div class="d-flex align-items-center gap-2">
                <span class="text-muted-github small text-nowrap">Sort by</span>
                <div class="btn-group" role="group" aria-label="Sort saved projects">
                    <button v-for="opt in sortOptions" :key="opt.value" type="button" class="btn btn-sm sort-btn"
                        :class="{ active: sortBy === opt.value }" :aria-pressed="sortBy === opt.value"
                        @click="sortBy = opt.value">
                        {{ opt.label }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.section-title {
    color: var(--app-text);
}

/* --- Filter chips ----------------------------------------------------------- */
.filter-chip {
    color: var(--app-text);
    background-color: color-mix(in srgb, var(--c) 14%, var(--card-bg));
    border: 1px solid color-mix(in srgb, var(--c) 55%, var(--card-border));
    transition: background-color 0.2s ease, border-color 0.2s ease;
}

.filter-chip:hover {
    background-color: color-mix(in srgb, var(--c) 26%, var(--card-bg));
}

.filter-chip:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4);
}

.chip-dot {
    width: 9px;
    height: 9px;
    background-color: var(--c);
    box-shadow: 0 0 8px var(--c);
}

.chip-x {
    width: 18px;
    height: 18px;
    font-size: 0.6rem;
    background-color: color-mix(in srgb, var(--c) 25%, transparent);
}

.chip-enter-active,
.chip-leave-active {
    transition: opacity 0.25s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.chip-enter-from,
.chip-leave-to {
    opacity: 0;
    transform: scale(0.85);
}

/* --- Controls --------------------------------------------------------------- */
.search-wrap {
    width: 240px;
    transition: width 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.search-wrap:focus-within {
    width: min(320px, 100%);
}

.search-icon {
    color: #8b949e;
    transition: color 0.2s ease;
}

.search-wrap:focus-within .search-icon {
    color: #58a6ff;
}

.github-control:focus {
    border-color: #58a6ff !important;
    box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.3);
}

.sort-btn {
    color: var(--app-text);
    background-color: transparent;
    border: 1px solid var(--card-border);
    transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.sort-btn:hover {
    background-color: color-mix(in srgb, #58a6ff 12%, transparent);
    color: var(--app-text);
}

.sort-btn.active {
    background-color: #58a6ff;
    border-color: #58a6ff;
    color: #0d1117;
    font-weight: 600;
}

.sort-btn:focus-visible {
    box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4);
}

@media (prefers-reduced-motion: reduce) {

    .chip-enter-active,
    .chip-leave-active,
    .search-wrap {
        transition: none !important;
    }
}
</style>
