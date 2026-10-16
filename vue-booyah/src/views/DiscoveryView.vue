<script setup>
import { computed, onMounted, ref } from 'vue'
import { fetchDiscoveryData } from '@/utils/hackernewsDiscovery'
import { MIN_STARS, REPOS_PER_CATEGORY } from '@/utils/top5Categories'
import { getLangColor } from '@/utils/langColors'

import DiscoveryPageHeader from '@/components/discovery/discoveryPageHeader.vue'
import DiscoveryStats from '@/components/discovery/discoveryStats.vue'
import DiscoveryCategoryCard from '@/components/discovery/discoveryCategoryCard.vue'
import DiscoveryProjectDetail from '@/components/discovery/discoveryProjectDetail.vue'
import JobsLoadingSatellite from '@/components/jobs/jobsLoadingSatellite.vue'

const LANG_BUTTONS = 6 // most common languages offered as quick filters

const loading = ref(true)
const error = ref('')
const warning = ref('')
const progress = ref({ done: 0, total: 0 })

const categories = ref([])
const selectedProject = ref(null)
// The language in focus. The buttons below and each row's language label both read and write it.
const selectedLang = ref(null)

const langOf = (p) => p.language || 'No language'

// languages actually present in the data, most common first
const languages = computed(() => {
    const counts = {}
    for (const c of categories.value) for (const p of c.projects) counts[langOf(p)] = (counts[langOf(p)] ?? 0) + 1
    return Object.keys(counts)
        .sort((a, b) => counts[b] - counts[a] || a.localeCompare(b))
        .slice(0, LANG_BUTTONS)
})

// projects in the chosen language, and how many of them fit in the cards (top few per category)
const matches = computed(() =>
    categories.value.map((c) => c.projects.filter((p) => langOf(p) === selectedLang.value).length)
)
const matchTotal = computed(() => matches.value.reduce((sum, n) => sum + n, 0))
const shownTotal = computed(() => matches.value.reduce((sum, n) => sum + Math.min(n, REPOS_PER_CATEGORY), 0))

async function load() {
    loading.value = true
    error.value = ''
    warning.value = ''
    progress.value = { done: 0, total: 0 }
    selectedProject.value = null
    selectedLang.value = null
    try {
        const { data, warning: warnMsg } = await fetchDiscoveryData((done, total) => {
            progress.value = { done, total }
        })
        categories.value = data
        warning.value = warnMsg
    } catch (e) {
        console.error('DiscoveryView: could not load discovery data', e)
        error.value = 'Could not load projects from Hacker News and GitHub. Check your connection and try again.'
    } finally {
        loading.value = false
    }
}

function openProject(category, project) {
    selectedProject.value = { ...project, categoryName: category.name }
}

function saveProject() {
    // TODO: save to the backend (POST /createSave with userID, projectlink, category)
}

onMounted(load)
</script>

<template>
    <div class="container my-4">
        <DiscoveryPageHeader :categories="categories" :loading="loading" :error="!!error" />

        <JobsLoadingSatellite v-if="loading" :done="progress.done" :total="progress.total" />

        <template v-else>
            <div v-if="warning" class="alert alert-warning py-2 px-3 small mb-3" role="status">
                {{ warning }}
            </div>

            <div v-if="error" class="alert alert-danger d-flex align-items-center justify-content-between mb-3"
                role="alert">
                <span>{{ error }}</span>
                <button type="button" class="btn btn-sm btn-outline-danger" @click="load">Try again</button>
            </div>

            <template v-else>
                <DiscoveryStats v-if="categories.length" :categories="categories" :selected-lang="selectedLang" />

                <div class="alert badge-github text-muted-github border mb-3 small py-2 px-3" role="note">
                    💡 Categories are ranked by number of builders. Projects within a category are ranked by Show HN
                    points, not GitHub stars. Only repositories with at least {{ MIN_STARS }} stars are shown.
                </div>

                <!-- Language filter -->
                <div class="d-flex flex-wrap align-items-center gap-3 mb-3">
                    <div class="d-flex align-items-center gap-2 flex-wrap">
                        <span class="text-muted-github small text-nowrap">Language</span>
                        <div class="btn-group" role="group" aria-label="Filter by language">
                            <button type="button" class="btn btn-sm lang-btn" :class="{ active: !selectedLang }"
                                :aria-pressed="!selectedLang" @click="selectedLang = null">All</button>
                            <button v-for="l in languages" :key="l" type="button"
                                class="btn btn-sm lang-btn d-inline-flex align-items-center gap-2"
                                :class="{ active: selectedLang === l }" :aria-pressed="selectedLang === l"
                                @click="selectedLang = selectedLang === l ? null : l">
                                <span class="btn-dot rounded-circle" :style="{ '--c': getLangColor(l) }"></span>{{ l }}
                            </button>
                        </div>
                    </div>

                    <Transition name="chip">
                        <button v-if="selectedLang" type="button"
                            class="filter-chip d-inline-flex align-items-center gap-2 rounded-pill ps-3 pe-2 py-1"
                            :style="{ '--c': getLangColor(selectedLang) }" :aria-label="'Clear ' + selectedLang + ' filter'"
                            @click="selectedLang = null">
                            <span class="chip-dot rounded-circle"></span>
                            <span class="small fw-semibold">{{ selectedLang }}</span>
                            <span class="text-muted-github small font-monospace"
                                :title="`Top ${REPOS_PER_CATEGORY} per category shown`">{{ shownTotal }}/{{ matchTotal
                                }}</span>
                            <span
                                class="chip-x rounded-circle d-inline-flex align-items-center justify-content-center">✕</span>
                        </button>
                    </Transition>
                </div>

                <TransitionGroup name="cat" tag="div" appear class="row row-cols-1 row-cols-lg-2 g-3">
                    <div v-for="(c, i) in categories" :key="c.id" class="col" :style="{ '--i': i }">
                        <DiscoveryCategoryCard v-model:selected-lang="selectedLang" :category="c"
                            @open="openProject(c, $event)" @save="saveProject" />
                    </div>
                </TransitionGroup>
            </template>

            <DiscoveryProjectDetail v-if="selectedProject" :project="selectedProject" @close="selectedProject = null"
                @save="saveProject" />
        </template>
    </div>
</template>

<style scoped>
/* --- Language buttons + chip (same look as the My Project filters) -------- */
.lang-btn {
    color: var(--app-text);
    background-color: transparent;
    border: 1px solid var(--card-border);
    transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
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

.btn-dot {
    width: 8px;
    height: 8px;
    background-color: var(--c);
}

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

/* --- Category cards: staggered entrance ----------------------------------- */
.cat-enter-active {
    animation: cat-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: calc(var(--i) * 80ms);
}

@keyframes cat-in {
    from {
        opacity: 0;
        transform: translateY(18px) scale(0.98);
    }

    to {
        opacity: 1;
        transform: none;
    }
}

@media (prefers-reduced-motion: reduce) {

    .cat-enter-active,
    .chip-enter-active,
    .chip-leave-active,
    .lang-btn {
        animation: none !important;
        transition: none !important;
    }
}
</style>
