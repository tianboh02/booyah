<script setup>
import { ref, computed } from 'vue'
import { getLangColor } from '@/utils/langColors'
import { vSpotlight } from '@/utils/motion'
import CardRing from '@/components/ring/CardRing.vue'
import RingCaption from '@/components/ring/RingCaption.vue'

const props = defineProps({
    repoList: {
        type: Array,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    },
    selectedLang: {
        type: String,
        default: null
    }
})

const emit = defineEmits(['update:selectedLang'])

const searchQuery = ref('')
const sortBy = ref('updated')

const sortOptions = [
    { value: 'updated', label: 'Last updated' },
    { value: 'name', label: 'Name' },
    { value: 'stars', label: 'Stars' }
]

const langOf = (repo) => repo.language || 'No language'

function toggleLang(name) {
    emit('update:selectedLang', props.selectedLang === name ? null : name)
}

function clearLang() {
    emit('update:selectedLang', null)
}

const selectedColor = computed(() => (props.selectedLang ? getLangColor(props.selectedLang) : '#58a6ff'))

const filteredAndSortedRepos = computed(() => {
    let list = [...props.repoList]

    if (props.selectedLang) {
        list = list.filter(repo => langOf(repo) === props.selectedLang)
    }

    if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase()
        list = list.filter(repo => {
            const nameMatch = repo.name?.toLowerCase().includes(query)
            const descMatch = repo.description?.toLowerCase().includes(query)
            return nameMatch || descMatch
        })
    }

    list.sort((a, b) => {
        if (sortBy.value === 'name') {
            return a.name.localeCompare(b.name)
        } else if (sortBy.value === 'stars') {
            return (b.stargazers_count || 0) - (a.stargazers_count || 0)
        } else {
            return new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
        }
    })

    return list
})

function timeAgo(isoString) {
    if (!isoString) return ''
    const now = new Date()
    const past = new Date(isoString)
    const diffInSeconds = Math.floor((now - past) / 1000)

    if (diffInSeconds < 60) return 'just now'
    const minutes = Math.floor(diffInSeconds / 60)
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
    const months = Math.floor(days / 30)
    if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`
    const years = Math.floor(days / 365)
    return `${years} year${years > 1 ? 's' : ''} ago`
}

const pad = (n) => String(n).padStart(2, '0')
</script>

<template>
    <div id="repo-list" class="container my-4">
        <!-- Controls Header Row -->
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
            <div class="d-flex align-items-center gap-2 flex-wrap">
                <h3 class="h3 fw-bold section-title mb-0">Repositories</h3>
                <span v-if="!loading && repoList.length" class="text-muted-github small font-monospace">
                    {{ filteredAndSortedRepos.length }}/{{ repoList.length }}
                </span>

                <!-- Active language filter -->
                <Transition name="chip">
                    <button v-if="selectedLang" type="button"
                        class="filter-chip d-inline-flex align-items-center gap-2 rounded-pill ps-3 pe-2 py-1"
                        :style="{ '--c': selectedColor }" :aria-label="`Clear ${selectedLang} filter`"
                        @click="clearLang">
                        <span class="chip-dot rounded-circle d-inline-block"></span>
                        <span class="small fw-semibold">{{ selectedLang }}</span>
                        <span
                            class="chip-x rounded-circle d-inline-flex align-items-center justify-content-center">✕</span>
                    </button>
                </Transition>
            </div>

            <div class="d-flex align-items-center gap-3 flex-wrap">
                <!-- Search Input -->
                <div class="search-wrap position-relative">
                    <svg class="search-icon position-absolute top-50 start-0 translate-middle-y ms-2 pe-none" width="14"
                        height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"
                        stroke-linecap="round" aria-hidden="true">
                        <circle cx="7" cy="7" r="4.5" />
                        <path d="M10.5 10.5L14 14" />
                    </svg>

                    <input v-model="searchQuery" type="text" class="form-control form-control-sm github-control"
                        style="padding-left: 1.85rem;" placeholder="Search repositories"
                        aria-label="Search repositories" />
                </div>

                <!-- Sort Button Group -->
                <div class="d-flex align-items-center gap-2">
                    <span class="text-muted-github small text-nowrap">Sort by</span>
                    <div class="d-flex flex-wrap gap-1" role="group" aria-label="Sort repositories">
                        <button v-for="opt in sortOptions" :key="opt.value" type="button" class="sort-btn rounded-pill small"
                            :class="{ active: sortBy === opt.value }" :aria-pressed="sortBy === opt.value"
                            @click="sortBy = opt.value">
                            {{ opt.label }}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Loading skeleton -->
        <div v-if="loading">
            <div v-for="n in 4" :key="n" class="card mb-3 p-3 rounded-3 shadow-sm placeholder-glow">
                <span class="placeholder col-3 mb-2"></span>
                <span class="placeholder col-8 mb-3"></span>
                <span class="placeholder col-5"></span>
            </div>
        </div>

        <!-- Repository Cards Ring -->
        <CardRing v-else-if="filteredAndSortedRepos.length > 0" :items="filteredAndSortedRepos" item-key="id"
            item-label="name" card-width="min(440px, 86vw)" label="Repositories">
            <template #card="{ item: repo }">
                <div v-spotlight class="repo-card card h-100 p-3 rounded-3 shadow-sm"
                    :style="{ '--lang': getLangColor(langOf(repo)) }">
                    <div class="d-flex align-items-center gap-2 mb-2">
                        <h5 class="card-title h6 fw-bold mb-0">
                            <a :href="repo.html_url" target="_blank" rel="noopener noreferrer"
                                class="repo-link stretched-link">
                                {{ repo.name }}
                                <span class="visually-hidden">(opens on GitHub)</span>
                            </a>
                        </h5>
                        <span class="badge badge-github rounded-pill text-capitalize fw-normal px-2 py-1">
                            {{ repo.private ? "Private" : "Public" }}
                        </span>
                        <svg class="repo-arrow ms-auto" width="16" height="16" viewBox="0 0 16 16" fill="none"
                            stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
                            aria-hidden="true">
                            <path d="M5 11L11 5M6 5h5v5" />
                        </svg>
                    </div>

                    <p class="card-text text-muted-github small mb-3">
                        {{ repo.description || "No description" }}
                    </p>

                    <!-- Metadata Row -->
                    <div class="d-flex align-items-center gap-3 text-muted-github small flex-wrap">
                        <button type="button" class="lang-link d-flex align-items-center gap-1 rounded-2"
                            :class="{ 'is-selected': selectedLang === langOf(repo) }"
                            :title="selectedLang === langOf(repo) ? 'Clear filter' : 'Filter by ' + langOf(repo)"
                            @click="toggleLang(langOf(repo))">
                            <span class="lang-dot rounded-circle d-inline-block flex-shrink-0"></span>
                            <span>{{ langOf(repo) }}</span>
                        </button>

                        <span class="meta-star d-inline-flex align-items-center gap-1">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                <path
                                    d="M8 .25l2.3 4.66 5.15.75-3.72 3.63.88 5.13L8 12.04l-4.61 2.38.88-5.13L.55 5.66l5.15-.75z" />
                            </svg>
                            <span class="font-monospace">{{ repo.stargazers_count }}</span>
                        </span>

                        <span class="d-inline-flex align-items-center gap-1">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                                stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
                                <circle cx="4" cy="3" r="1.6" />
                                <circle cx="12" cy="3" r="1.6" />
                                <circle cx="8" cy="13" r="1.6" />
                                <path d="M4 4.6v1.2c0 1 .8 1.7 1.7 1.7h4.6c.9 0 1.7-.7 1.7-1.7V4.6M8 7.5v4" />
                            </svg>
                            <span class="font-monospace">{{ repo.forks_count }}</span>
                        </span>

                        <span>Updated {{ timeAgo(repo.updated_at) }}</span>
                    </div>
                </div>
            </template>

            <template #caption="{ item: repo, index, total }">
                <RingCaption :title="repo.name" :index="pad(index + 1)" :accent="getLangColor(langOf(repo))"
                    :subtitle="`${langOf(repo)} · ★ ${repo.stargazers_count}`"
                    :meta="`Repo ${pad(index + 1)} / ${pad(total)} — Updated ${timeAgo(repo.updated_at)}`" />
            </template>
        </CardRing>

        <!-- Empty Filter/Repository Message -->
        <div v-else class="text-center py-5 text-muted-github card p-4 rounded-3 shadow-sm">
            <span v-if="searchQuery.trim() && selectedLang">
                No {{ selectedLang }} repositories match "{{ searchQuery }}".
            </span>
            <span v-else-if="searchQuery.trim()">
                No repositories found matching "{{ searchQuery }}". Try a shorter search.
            </span>
            <span v-else-if="selectedLang">
                No {{ selectedLang }} repositories found.
            </span>
            <span v-else>
                No repositories found.
            </span>
            <div v-if="selectedLang" class="mt-3">
                <button type="button" class="btn btn-sm sort-btn" @click="clearLang">Show all languages</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.section-title,
.card-title {
    color: var(--app-text);
}

/* --- Filter chip ---------------------------------------------------------- */
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

/* --- Controls ------------------------------------------------------------- */
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

/* Outlined pill; active is a neutral fill (same as the Discovery language pills). */
.sort-btn {
    color: var(--text-muted-github);
    background-color: transparent;
    border: 1px solid var(--card-border);
    padding: 0.15rem 0.7rem;
    transition: background-color 0.2s ease, color 0.2s ease;
}

.sort-btn:hover,
.sort-btn.active {
    color: var(--app-text);
    background-color: var(--badge-bg);
}

.sort-btn.active {
    font-weight: 600;
}

.sort-btn:focus-visible {
    box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4);
}

/* --- Repo cards ----------------------------------------------------------- */
.repo-card {
    position: relative;
    overflow: hidden;
    isolation: isolate;
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.25s ease, box-shadow 0.25s ease;
}

.repo-card::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
    background: radial-gradient(320px circle at var(--mx, 50%) var(--my, 50%),
            color-mix(in srgb, var(--lang) 18%, transparent),
            transparent 70%);
}

.repo-card::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--lang);
    transform: scaleY(0);
    transform-origin: top;
    transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.repo-card:hover {
    transform: translateY(-3px);
    border-color: color-mix(in srgb, var(--lang) 50%, var(--card-border));
    box-shadow: 0 14px 30px -16px color-mix(in srgb, var(--lang) 55%, transparent) !important;
}

.repo-card:hover::before {
    opacity: 1;
}

.repo-card:hover::after {
    transform: scaleY(1);
}

.repo-link {
    color: var(--app-text);
    text-decoration: none;
    text-decoration-thickness: 2px;
    text-underline-offset: 4px;
    text-decoration-color: transparent;
    transition: text-decoration-color 0.25s ease;
}

.repo-card:hover .repo-link {
    text-decoration: underline;
    text-decoration-color: var(--lang);
}

.repo-link:focus-visible {
    outline: none;
}

.repo-card:has(.repo-link:focus-visible) {
    border-color: #58a6ff;
    box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4) !important;
}

.lang-dot {
    width: 10px;
    height: 10px;
    background-color: var(--lang);
    box-shadow: 0 0 8px color-mix(in srgb, var(--lang) 70%, transparent);
}

.lang-link {
    color: inherit;
    background: transparent;
    border: 1px solid transparent;
    padding: 0.1rem 0.4rem;
    margin-left: -0.4rem;
    position: relative;
    z-index: 2;
    cursor: pointer;
    transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.lang-link:hover,
.lang-link.is-selected {
    color: var(--app-text);
    background-color: color-mix(in srgb, var(--lang) 16%, transparent);
    border-color: color-mix(in srgb, var(--lang) 55%, transparent);
}

.lang-link:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4);
}

.repo-arrow {
    color: var(--lang);
    opacity: 0;
    transform: translateX(-8px);
    transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.repo-card:hover .repo-arrow {
    opacity: 1;
    transform: translateX(0);
}

.meta-star svg {
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s ease;
}

.repo-card:hover .meta-star svg {
    color: #e3b341;
    transform: rotate(72deg) scale(1.2);
}

@media (prefers-reduced-motion: reduce) {

    .chip-enter-active,
    .chip-leave-active {
        animation: none !important;
        transition: none !important;
    }

    .repo-card,
    .repo-arrow,
    .meta-star svg {
        transition: none !important;
    }
}
</style>