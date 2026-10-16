<script setup>
import { computed } from 'vue'
import { getLangColor } from '@/utils/langColors'
import { REPOS_PER_CATEGORY } from '@/utils/top5Categories'
import { vSpotlight, useCountUp } from '@/utils/motion'

const props = defineProps({
    category: { type: Object, required: true },
    selectedLang: { type: String, default: null }
})

const emit = defineEmits(['open', 'save', 'update:selectedLang'])

const langOf = (p) => p.language || 'No language'
const shortStars = (n) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n))

// the category holds every project that passed the checks; filter first, then keep the top few
const rows = computed(() =>
    props.category.projects.filter((p) => !props.selectedLang || langOf(p) === props.selectedLang).slice(0, REPOS_PER_CATEGORY)
)

const builders = useCountUp(() => props.category.builders)

const toggleLang = (lang) => emit('update:selectedLang', props.selectedLang === lang ? null : lang)
</script>

<template>
    <section v-spotlight class="cat-card card h-100 p-3 rounded-3 shadow-sm" :aria-label="category.name">
        <header class="d-flex align-items-center justify-content-between gap-2 pb-2 mb-2 card-head">
            <div class="d-flex align-items-baseline gap-2 min-w-0">
                <span class="text-muted-github small font-monospace">{{ String(category.rank).padStart(2, '0') }}</span>
                <h2 class="h6 fw-bold section-title mb-0">{{ category.name }}</h2>
            </div>
            <span class="badge badge-github rounded-pill fw-normal px-2 py-1 text-nowrap">
                <span class="font-monospace">{{ builders }}</span> builders this month
            </span>
        </header>

        <ul v-if="rows.length" class="list-unstyled mb-0">
            <li v-for="p in rows" :key="p.id" class="project-row d-flex align-items-center gap-3 px-2"
                :style="{ '--lang': getLangColor(langOf(p)) }">
                <span class="d-flex align-items-center gap-2 flex-grow-1 min-w-0">
                    <button type="button" class="project-link btn btn-link p-0 text-start font-monospace text-truncate"
                        :aria-label="`Open details for ${p.id}`" @click="$emit('open', p)">
                        <span class="text-muted-github">{{ p.owner }}/</span>{{ p.name }}
                    </button>
                    <svg class="row-arrow flex-shrink-0" width="14" height="14" viewBox="0 0 16 16" fill="none"
                        stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
                        aria-hidden="true">
                        <path d="M5 11L11 5M6 5h5v5" />
                    </svg>
                </span>

                <!-- Clicking the language filters every category by it -->
                <span class="lang-col">
                    <button type="button" class="lang-link d-inline-flex align-items-center gap-1 rounded-2 small"
                        :class="{ 'is-selected': selectedLang === langOf(p) }" :aria-pressed="selectedLang === langOf(p)"
                        :title="selectedLang === langOf(p) ? 'Clear filter' : 'Filter by ' + langOf(p)"
                        @click="toggleLang(langOf(p))">
                        <span class="lang-dot rounded-circle d-inline-block flex-shrink-0"></span>
                        <span class="text-truncate">{{ langOf(p) }}</span>
                    </button>
                </span>

                <span class="metric text-muted-github small font-monospace points-col" title="Show HN points">▲ {{ p.hnPoints
                    }}</span>

                <span class="metric meta-star text-muted-github small font-monospace stars-col" title="GitHub stars">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                        <path d="M8 .25l2.3 4.66 5.15.75-3.72 3.63.88 5.13L8 12.04l-4.61 2.38.88-5.13L.55 5.66l5.15-.75z" />
                    </svg>
                    {{ shortStars(p.stars) }}
                </span>

                <button type="button" class="bookmark-btn btn btn-sm btn-link p-0 text-muted-github"
                    :aria-label="`Save ${p.id}`" @click="$emit('save', p)">🔖</button>
            </li>
        </ul>
        <p v-else-if="selectedLang" class="text-muted-github small text-center py-4 mb-0">
            No {{ selectedLang }} projects in this category this month.
        </p>
        <p v-else class="text-muted-github small text-center py-4 mb-0">
            No projects in this category passed the checks this month.
        </p>
    </section>
</template>

<style scoped>
.min-w-0 {
    min-width: 0;
}

/* --- Card: lift + cursor spotlight (same recipe as the My Project cards) -- */
.cat-card {
    position: relative;
    overflow: hidden;
    isolation: isolate;
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.25s ease, box-shadow 0.25s ease;
}

.cat-card::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
    background: radial-gradient(300px circle at var(--mx, 50%) var(--my, 50%),
            color-mix(in srgb, #58a6ff 18%, transparent),
            transparent 70%);
}

.cat-card>* {
    position: relative;
}

.cat-card:hover {
    transform: translateY(-3px);
    border-color: color-mix(in srgb, #58a6ff 50%, var(--card-border)) !important;
    box-shadow: 0 14px 30px -16px color-mix(in srgb, #58a6ff 55%, transparent) !important;
}

.cat-card:hover::before {
    opacity: 1;
}

.card-head {
    border-bottom: 1px solid var(--card-border);
}

.section-title,
.project-link {
    color: var(--app-text);
}

/* --- Rows ------------------------------------------------------------------ */
.project-row {
    position: relative;
    min-height: 44px;
    border-radius: 0.4rem;
    transition: background-color 0.2s ease;
}

.project-row:hover {
    background-color: var(--badge-bg);
}

/* Language-coloured edge that grows in on hover */
.project-row::after {
    content: '';
    position: absolute;
    left: 0;
    top: 6px;
    bottom: 6px;
    width: 3px;
    border-radius: 2px;
    background: var(--lang);
    transform: scaleY(0);
    transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.project-row:hover::after {
    transform: scaleY(1);
}

.project-link {
    font-size: 0.9rem;
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 4px;
    text-decoration-color: transparent;
    transition: text-decoration-color 0.25s ease;
}

.project-row:hover .project-link {
    text-decoration-color: var(--lang);
}

.row-arrow {
    color: var(--lang);
    opacity: 0;
    transform: translateX(-8px);
    transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.project-row:hover .row-arrow {
    opacity: 1;
    transform: translateX(0);
}

.lang-col {
    width: 7rem;
    flex: none;
}

.lang-link {
    max-width: 100%;
    color: var(--text-muted-github);
    background: transparent;
    border: 1px solid transparent;
    padding: 0.1rem 0.4rem;
    margin-left: -0.4rem;
    cursor: pointer;
    transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.lang-link:hover,
.lang-link.is-selected {
    color: var(--app-text);
    background-color: color-mix(in srgb, var(--lang) 16%, transparent);
    border-color: color-mix(in srgb, var(--lang) 55%, transparent);
}

.lang-link:focus-visible,
.project-link:focus-visible,
.bookmark-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4);
}

.lang-dot {
    width: 8px;
    height: 8px;
    background-color: var(--lang);
    box-shadow: 0 0 8px color-mix(in srgb, var(--lang) 70%, transparent);
}

/* HN points first (it is the sort key), then stars */
.metric {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.25rem;
    white-space: nowrap;
}

.points-col {
    width: 4rem;
}

.stars-col {
    width: 4.5rem;
}

.meta-star svg {
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s ease;
}

.project-row:hover .meta-star svg {
    color: #e3b341;
    transform: rotate(72deg) scale(1.2);
}

.bookmark-btn {
    transition: transform 0.15s ease, color 0.2s ease;
}

.bookmark-btn:hover {
    color: #58a6ff !important;
}

.bookmark-btn:active {
    transform: scale(0.85);
}

@media (prefers-reduced-motion: reduce) {

    .cat-card,
    .cat-card::before,
    .project-row,
    .project-row::after,
    .project-link,
    .row-arrow,
    .meta-star svg,
    .bookmark-btn {
        transition: none !important;
    }

    .cat-card:hover,
    .project-row:hover .meta-star svg,
    .bookmark-btn:active {
        transform: none;
    }
}
</style>
