<script setup>
import { computed } from 'vue'
import { getLangColor } from '@/utils/langColors'
import { langOf, visibleProjects } from '@/utils/top5Categories'
import { vSpotlight, useCountUp } from '@/utils/motion'

const props = defineProps({
    category: { type: Object, required: true },
    selectedLang: { type: String, default: null },
    savedMap: { type: Object, default: () => ({}) },
    pendingLinks: { type: Object, default: () => new Set() },
    inRing: { type: Boolean, default: false }
})

const emit = defineEmits(['open', 'save', 'update:selectedLang'])

const isSaved = (project) => !!props.savedMap[project.ghUrl]
const isPending = (project) => props.pendingLinks.has(project.ghUrl)

const shortStars = (count) =>
    count >= 1000 ? `${Math.round(count / 100) / 10}k` : String(count)

// filter projects by language, then display the top projects for the category.
const rows = computed(() =>
    visibleProjects(props.category, props.selectedLang)
)

const builders = useCountUp(() => props.category.builders)

const toggleLang = (lang) => {
    emit(
        'update:selectedLang',
        props.selectedLang === lang ? null : lang
    )
}
</script>

<template>
    <section v-spotlight class="spot-card card h-100 p-3 rounded-3 shadow-sm" :style="{ '--accent': '#58a6ff' }"
        :aria-label="category.name">
        <header class="d-flex flex-wrap align-items-center justify-content-between gap-2 pb-2 mb-2 card-head">
            <div class="d-flex align-items-baseline gap-2 min-w-0">
                <span class="text-muted-github small font-monospace">
                    {{ String(category.rank).padStart(2, '0') }}
                </span>

                <h2 class="h6 fw-bold section-title mb-0">
                    {{ category.name }}
                </h2>
            </div>

            <span class="badge badge-github rounded-pill fw-normal px-2 py-1 text-nowrap">
                <span class="font-monospace">{{ builders }}</span>
                builders this month
            </span>
        </header>

        <ul v-if="rows.length" class="rows list-unstyled mb-0" :class="{ 'rows-scroll overflow-auto': inRing }">
            <li v-for="project in rows" :key="project.id" class="project-row position-relative d-grid align-items-center"
                :style="{ '--lang': getLangColor(langOf(project)) }">
                <span class="cell-name d-flex align-items-center gap-2 min-w-0">
                    <button type="button" class="project-link btn btn-link d-flex p-0 text-start font-monospace min-w-0"
                        :title="project.id" :aria-label="`Open details for ${project.id}`"
                        @click="emit('open', project)">
                        <span class="repo-owner text-muted-github text-truncate">{{ project.owner }}/</span>
                        <span class="repo-name text-truncate">{{ project.name }}</span>
                    </button>

                    <svg class="row-arrow flex-shrink-0" width="14" height="14" viewBox="0 0 16 16" fill="none"
                        stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
                        aria-hidden="true">
                        <path d="M5 11L11 5M6 5h5v5" />
                    </svg>
                </span>

                <span class="cell-lang min-w-0">
                    <button type="button" class="lang-link d-inline-flex align-items-center gap-1 rounded-2 small mw-100"
                        :class="{ 'is-selected': selectedLang === langOf(project) }"
                        :aria-pressed="selectedLang === langOf(project)" :title="selectedLang === langOf(project)
                                ? 'Clear filter'
                                : 'Filter by ' + langOf(project)
                            " @click="toggleLang(langOf(project))">
                        <span class="lang-dot rounded-circle d-inline-block flex-shrink-0"></span>
                        <span class="text-truncate">
                            {{ langOf(project) }}
                        </span>
                    </button>
                </span>

                <span
                    class="metric meta-hn d-inline-flex align-items-center justify-content-start gap-1 text-nowrap text-muted-github small font-monospace"
                    title="Show HN points">
                    <svg class="flex-shrink-0" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                        <path d="M8 3l6 10H2z" />
                    </svg>
                    <span class="text-end">{{ project.hnPoints }}</span>
                </span>

                <span
                    class="metric meta-star d-inline-flex align-items-center justify-content-start gap-1 text-nowrap text-muted-github small font-monospace"
                    title="GitHub stars">
                    <svg class="flex-shrink-0" width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                        <path
                            d="M8 .25l2.3 4.66 5.15.75-3.72 3.63.88 5.13L8 12.04l-4.61 2.38.88-5.13L.55 5.66l5.15-.75z" />
                    </svg>
                    <span class="text-end">{{ shortStars(project.stars) }}</span>
                </span>

                <button type="button" class="bookmark-btn btn btn-sm btn-link p-0 text-muted-github" :class="{
                    'is-saved': isSaved(project),
                    'is-pending': isPending(project)
                }" :aria-pressed="isSaved(project)" :aria-busy="isPending(project)" :aria-label="isSaved(project)
                            ? `Remove ${project.id} from saved`
                            : `Save ${project.id}`
                        " :title="isSaved(project)
                            ? 'Saved. Click to remove'
                            : 'Save project'
                        " @click="emit('save', project)">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"
                        stroke-linejoin="round" aria-hidden="true">
                        <path d="M3.5 2.5h9v11.2L8 10.6l-4.5 3.1z" />
                    </svg>
                </button>
            </li>
        </ul>

        <p v-else class="rows empty d-flex align-items-center justify-content-center text-muted-github small mb-0">
            {{
                selectedLang
                    ? `No ${selectedLang} projects in this category this month.`
                    : 'No projects in this category passed the checks this month.'
            }}
        </p>
    </section>
</template>

<style scoped>
.card-head {
    border-bottom: 1px solid var(--card-border);
}

.section-title,
.project-link {
    color: var(--app-text);
}

/* Custom grid keeps project metadata aligned across all rows. */
.project-row {
    grid-template-columns: minmax(0, 1fr) 7rem 3.5rem 3.5rem 1.5rem;
    column-gap: 0.75rem;
    height: 44px;
    padding: 0 0.5rem;
    border-radius: 0.4rem;
    transition: background-color 0.2s ease;
}

.rows {
    min-height: calc(5 * 44px);
}

/* Phones: the five columns don't fit, so each row becomes two lines:
   name + bookmark on top, language + HN points + stars underneath. */
@media (max-width: 575.98px) {
    .project-row {
        grid-template-columns: minmax(0, 1fr) auto auto 1.5rem;
        grid-template-areas:
            'name name name save'
            'lang hn star star';
        column-gap: 0.5rem;
        row-gap: 0.15rem;
        height: auto;
        padding: 0.4rem 0.5rem;
    }

    .rows {
        min-height: calc(5 * 58px);
    }

    /* in the carousel: two and a half rows show, the half row hinting that the rest scroll */
    .rows-scroll {
        min-height: 0;
        max-height: calc(2.5 * 58px);
    }

    .cell-name {
        grid-area: name;
    }

    .cell-lang {
        grid-area: lang;
    }

    .meta-hn {
        grid-area: hn;
    }

    .meta-star {
        grid-area: star;
    }

    .bookmark-btn {
        grid-area: save;
    }

    .metric span {
        min-width: 0;
    }
}

.project-row:hover {
    background-color: var(--badge-bg);
}

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

.repo-owner {
    flex: 0 8 auto;
    min-width: 3ch;
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
    transition:
        opacity 0.25s ease,
        transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.project-row:hover .row-arrow {
    opacity: 1;
    transform: translateX(0);
}

.lang-link {
    color: var(--text-muted-github);
    background: transparent;
    border: 1px solid transparent;
    padding: 0.1rem 0.4rem;
    margin-left: -0.4rem;
    cursor: pointer;
    transition:
        background-color 0.2s ease,
        border-color 0.2s ease,
        color 0.2s ease;
}

.lang-link:hover {
    color: var(--app-text);
    background-color: color-mix(in srgb, var(--lang) 16%, transparent);
    border-color: color-mix(in srgb, var(--lang) 55%, transparent);
}

/* Weight stays constant so the label width doesn't change when selected */
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
}

.metric span {
    min-width: 4ch;
}

.meta-hn svg {
    transition:
        transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
        color 0.2s ease,
        filter 0.2s ease;
}

.meta-hn svg:hover {
    color: #ff6600;
    transform: translateY(-2px);
    filter: drop-shadow(0 0 4px rgba(255, 102, 0, 0.7));
}

.meta-star svg {
    transition:
        transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
        color 0.2s ease,
        filter 0.2s ease;
}

.meta-star svg:hover {
    color: #e3b341;
    transform: rotate(72deg) scale(1.2);
    filter: drop-shadow(0 0 4px rgba(227, 179, 65, 0.7));
}

.bookmark-btn {
    transition:
        transform 0.15s ease,
        color 0.2s ease;
}

.bookmark-btn:hover {
    color: #58a6ff !important;
}

.bookmark-btn:active {
    transform: scale(0.85);
}

.bookmark-btn svg path {
    fill: transparent;
    transition: fill 0.25s ease;
}

.bookmark-btn.is-saved {
    color: #58a6ff !important;
}

.bookmark-btn.is-saved svg {
    animation: bookmark-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.bookmark-btn.is-saved svg path {
    fill: currentColor;
}

.bookmark-btn.is-pending {
    opacity: 0.6;
    pointer-events: none;
}

@keyframes bookmark-pop {
    0% {
        transform: scale(1) rotate(0deg);
    }

    40% {
        transform: scale(1.5) rotate(-12deg);
    }

    100% {
        transform: scale(1) rotate(0deg);
    }
}

@media (prefers-reduced-motion: reduce) {

    .project-row,
    .project-row::after,
    .project-link,
    .row-arrow,
    .meta-star svg,
    .meta-hn svg,
    .bookmark-btn {
        transition: none !important;
    }

    .bookmark-btn.is-saved svg {
        animation: none;
    }

    .meta-star svg:hover,
    .meta-hn svg:hover,
    .bookmark-btn:active {
        transform: none;
    }
}
</style>
