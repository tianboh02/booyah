<script setup>
import { computed } from 'vue'
import { getLangColor } from '@/utils/langColors'
import { langOf, visibleProjects } from '@/utils/top5Categories'
import { vSpotlight, useCountUp } from '@/utils/motion'

const props = defineProps({
    category: { type: Object, required: true },
    selectedLang: { type: String, default: null },
    // { [ghUrl]: saveId } and the set of ghUrls with a request in flight
    savedMap: { type: Object, default: () => ({}) },
    pendingLinks: { type: Object, default: () => new Set() }
})

const emit = defineEmits(['open', 'save', 'update:selectedLang'])

const isSaved = (project) => !!props.savedMap[project.ghUrl]
const isPending = (project) => props.pendingLinks.has(project.ghUrl)

const shortStars = (count) =>
    count >= 1000 ? `${Math.round(count / 100) / 10}k` : String(count)

// Filter projects by language, then display the top projects for the category.
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
    <section v-spotlight class="cat-card card h-100 p-3 rounded-3 shadow-sm" :aria-label="category.name">
        <header class="d-flex align-items-center justify-content-between gap-2 pb-2 mb-2 card-head">
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

        <ul v-if="rows.length" class="rows list-unstyled mb-0">
            <li v-for="project in rows" :key="project.id" class="project-row"
                :style="{ '--lang': getLangColor(langOf(project)) }">
                <span class="d-flex align-items-center gap-2 min-w-0">
                    <button type="button" class="project-link btn btn-link p-0 text-start font-monospace text-truncate"
                        :aria-label="`Open details for ${project.id}`" @click="emit('open', project)">
                        <span class="text-muted-github">
                            {{ project.owner }}/
                        </span>{{ project.name }}
                    </button>

                    <svg class="row-arrow flex-shrink-0" width="14" height="14" viewBox="0 0 16 16" fill="none"
                        stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
                        aria-hidden="true">
                        <path d="M5 11L11 5M6 5h5v5" />
                    </svg>
                </span>

                <!-- Clicking a language filters every category by that language. -->
                <span class="min-w-0">
                    <button type="button" class="lang-link d-inline-flex align-items-center gap-1 rounded-2 small"
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

                <span class="metric text-muted-github small font-monospace" title="Show HN points">
                    ▲ {{ project.hnPoints }}
                </span>

                <span class="metric meta-star text-muted-github small font-monospace" title="GitHub stars">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                        <path
                            d="M8 .25l2.3 4.66 5.15.75-3.72 3.63.88 5.13L8 12.04l-4.61 2.38.88-5.13L.55 5.66l5.15-.75z" />
                    </svg>
                    {{ shortStars(project.stars) }}
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
.min-w-0 {
    min-width: 0;
}

/* Card spotlight and hover effect */
.cat-card {
    position: relative;
    overflow: hidden;
    isolation: isolate;
    transition:
        transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
        border-color 0.25s ease,
        box-shadow 0.25s ease;
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
    border-color: color-mix(in srgb,
            #58a6ff 50%,
            var(--card-border)) !important;
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

/* Custom grid keeps project metadata aligned across all rows. */
.project-row {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 6rem 3.75rem 4rem 1.5rem;
    align-items: center;
    column-gap: 0.75rem;
    height: 44px;
    padding: 0 0.5rem;
    border-radius: 0.4rem;
    transition: background-color 0.2s ease;
}

/* Keep card height stable when filtering projects. */
.rows {
    min-height: calc(5 * 44px);
}

.project-row:hover {
    background-color: var(--badge-bg);
}

/* Language-colored edge appears on hover. */
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
    transition:
        opacity 0.25s ease,
        transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.project-row:hover .row-arrow {
    opacity: 1;
    transform: translateX(0);
}

.lang-link {
    max-width: 100%;
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

.lang-link.is-selected {
    color: var(--app-text);
    font-weight: 600;
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

.metric {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.25rem;
    white-space: nowrap;
}

.meta-star svg {
    transition:
        transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
        color 0.2s ease;
}

.project-row:hover .meta-star svg {
    color: #e3b341;
    transform: rotate(72deg) scale(1.2);
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

/* Saved bookmark fills and animates. */
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

/* Indicate an in-flight save request. */
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

    .bookmark-btn.is-saved svg {
        animation: none;
    }

    .cat-card:hover,
    .project-row:hover .meta-star svg,
    .bookmark-btn:active {
        transform: none;
    }
}
</style>
