<script setup>
import { computed, ref } from 'vue'
import {
    MIN_STARS,
    REPOS_PER_CATEGORY,
    langOf,
    visibleProjects
} from '@/utils/top5Categories'
import DiscoveryLangPill from '@/components/discovery/discoveryLangPill.vue'

const LANG_BUTTONS = 6

const props = defineProps({
    categories: { type: Array, default: () => [] }
})

const selectedLang = defineModel('selectedLang', {
    type: String,
    default: null
})

// languages present in the data, ordered by count
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

// total projects matching the selected language
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

// Info pop: opens on hover, focus or click
const infoOpen = ref(false)

const note = `Categories are ranked by number of builders. Projects within a category are ranked by Show HN points, not GitHub stars. Only repositories with at least ${MIN_STARS} stars are shown.`
</script>

<template>
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div class="d-flex align-items-center gap-2 position-relative">
            <h2 class="h4 fw-bold section-title mb-0">
                Top categories
            </h2>

            <div class="info d-inline-flex" @mouseenter="infoOpen = true"
                @mouseleave="infoOpen = false" @focusout="infoOpen = false" @keydown.esc="infoOpen = false">
                <button type="button" class="info-btn d-inline-flex align-items-center justify-content-center rounded-circle p-0"
                    aria-label="How categories and projects are ranked" :aria-expanded="infoOpen"
                    aria-controls="discovery-info" @click="infoOpen = true">
                    i
                </button>

                <div v-if="infoOpen" id="discovery-info" class="info-pop position-absolute top-100 start-0 pt-2" role="note">
                    <p class="info-box small lh-base mb-0 rounded-3 shadow p-3">
                        {{ note }}
                    </p>
                </div>
            </div>

            <span class="text-muted-github small font-monospace" :class="{ invisible: !selectedLang }"
                :aria-hidden="!selectedLang" :title="`Top ${REPOS_PER_CATEGORY} per category shown`">
                {{ shownTotal }}/{{ matchTotal }}
            </span>
        </div>

        <div class="d-flex align-items-center gap-1 flex-wrap" role="group" aria-label="Filter by language">
            <button type="button" class="all-pill rounded-pill small" :class="{ 'is-active': !selectedLang }"
                :aria-pressed="!selectedLang" @click="selectedLang = null">
                All
            </button>

            <DiscoveryLangPill v-for="lang in languages" :key="lang" outlined :lang="lang"
                :active="selectedLang === lang" @click="toggle(lang)" />
        </div>
    </div>
</template>

<style scoped>
.section-title {
    color: var(--app-text);
}

.info-btn {
    width: 22px;
    height: 22px;
    color: #58a6ff;
    background-color: color-mix(in srgb, #58a6ff 14%, transparent);
    border: 1.5px solid color-mix(in srgb, #58a6ff 60%, transparent);
    font: italic 700 0.85rem/1 Georgia, serif;
    cursor: pointer;
    transition:
        background-color 0.2s ease,
        color 0.2s ease;
}

.info-btn:hover,
.info-btn[aria-expanded='true'] {
    color: #0d1117;
    background-color: #58a6ff;
}

.info-pop {
    z-index: 20;
    width: min(320px, 85vw);
}

.info-box {
    color: var(--app-text);
    background-color: var(--card-bg);
    border: 1px solid var(--card-border);
}

.info-btn:focus-visible,
.all-pill:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4);
}

.all-pill {
    color: var(--text-muted-github);
    background: transparent;
    border: 1px solid var(--card-border);
    padding: 0.15rem 0.7rem;
    transition:
        background-color 0.2s ease,
        color 0.2s ease;
}

.all-pill:hover,
.all-pill.is-active {
    color: var(--app-text);
    background-color: var(--badge-bg);
}

@media (prefers-reduced-motion: reduce) {
    .all-pill,
    .info-btn {
        transition: none !important;
    }
}
</style>
