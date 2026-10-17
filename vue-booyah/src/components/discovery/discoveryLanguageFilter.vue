<script setup>
import { computed } from 'vue'
import { getLangColor } from '@/utils/langColors'
import {
    MIN_STARS,
    REPOS_PER_CATEGORY,
    langOf,
    visibleProjects
} from '@/utils/top5Categories'

const LANG_BUTTONS = 6

const props = defineProps({
    categories: { type: Array, default: () => [] }
})

// Shared with stat cards and category cards through v-model:selected-lang.
const selectedLang = defineModel('selectedLang', {
    type: String,
    default: null
})

// Languages present in the data, ordered by frequency.
const languages = computed(() => {
    const counts = {}

    for (const category of props.categories) {
        for (const project of category.projects) {
            const lang = langOf(project)
            counts[lang] = (counts[lang] ?? 0) + 1
        }
    }

    return Object.keys(counts)
        .sort((a, b) => counts[b] - counts[a] || a.localeCompare(b))
        .slice(0, LANG_BUTTONS)
})

// Total projects matching the selected language.
const matchTotal = computed(() =>
    props.categories.reduce(
        (sum, category) =>
            sum +
            category.projects.filter(
                (project) => langOf(project) === selectedLang.value
            ).length,
        0
    )
)

// Projects actually displayed after the per-category limit is applied.
const shownTotal = computed(() =>
    props.categories.reduce(
        (sum, category) =>
            sum + visibleProjects(category, selectedLang.value).length,
        0
    )
)

const toggle = (lang) => {
    selectedLang.value = selectedLang.value === lang ? null : lang
}
</script>

<template>
    <div>
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-2">
            <div class="d-flex align-items-center gap-2 flex-wrap">
                <h2 class="h3 fw-bold section-title mb-0">
                    Top categories
                </h2>

                <span v-if="selectedLang" class="text-muted-github small font-monospace"
                    :title="`Top ${REPOS_PER_CATEGORY} per category shown`">
                    {{ shownTotal }}/{{ matchTotal }}
                </span>

                <Transition name="chip">
                    <button v-if="selectedLang" type="button"
                        class="filter-chip d-inline-flex align-items-center gap-2 rounded-pill ps-3 pe-2 py-1"
                        :style="{ '--c': getLangColor(selectedLang) }" :aria-label="`Clear ${selectedLang} filter`"
                        @click="selectedLang = null">
                        <span class="chip-dot rounded-circle d-inline-block"></span>

                        <span class="small fw-semibold">
                            {{ selectedLang }}
                        </span>

                        <span class="chip-x rounded-circle d-inline-flex align-items-center justify-content-center">
                            ✕
                        </span>
                    </button>
                </Transition>
            </div>

            <div class="d-flex align-items-center gap-2 flex-wrap">
                <span class="text-muted-github small text-nowrap">
                    Language
                </span>

                <div class="btn-group flex-wrap" role="group" aria-label="Filter by language">
                    <button type="button" class="btn btn-sm lang-btn" :class="{ active: !selectedLang }"
                        :aria-pressed="!selectedLang" @click="selectedLang = null">
                        All
                    </button>

                    <button v-for="lang in languages" :key="lang" type="button" class="btn btn-sm lang-btn"
                        :class="{ active: selectedLang === lang }" :aria-pressed="selectedLang === lang"
                        @click="toggle(lang)">
                        {{ lang }}
                    </button>
                </div>
            </div>
        </div>

        <p class="text-muted-github small mb-3" role="note">
            Categories are ranked by number of builders. Projects within a
            category are ranked by Show HN points, not GitHub stars. Only
            repositories with at least {{ MIN_STARS }} stars are shown.
        </p>
    </div>
</template>

<style scoped>
.section-title {
    color: var(--app-text);
}

/* Language filter buttons */
.lang-btn {
    color: var(--app-text);
    background-color: transparent;
    border: 1px solid var(--card-border);
    transition:
        background-color 0.2s ease,
        color 0.2s ease,
        border-color 0.2s ease;
}

.lang-btn:hover {
    background-color: color-mix(in srgb, #58a6ff 12%, transparent);
    color: var(--app-text);
}

.lang-btn.active {
    background-color: #58a6ff;
    border-color: #58a6ff;
    color: #0d1117;
    font-weight: 600;
}

.lang-btn:focus-visible {
    box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4);
}

/* Selected language chip */
.filter-chip {
    color: var(--app-text);
    background-color: color-mix(in srgb, var(--c) 14%, var(--card-bg));
    border: 1px solid color-mix(in srgb, var(--c) 55%, var(--card-border));
    transition:
        background-color 0.2s ease,
        border-color 0.2s ease;
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

/* Selected chip transition */
.chip-enter-active,
.chip-leave-active {
    transition:
        opacity 0.25s ease,
        transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.chip-enter-from,
.chip-leave-to {
    opacity: 0;
    transform: scale(0.85);
}

@media (prefers-reduced-motion: reduce) {

    .chip-enter-active,
    .chip-leave-active,
    .lang-btn {
        transition: none !important;
    }
}
</style>