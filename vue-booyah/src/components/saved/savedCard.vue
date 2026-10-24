<script setup>
import { getLangColor } from '@/utils/langColors'
import { categoryColor, itemCategory, itemLang } from '@/utils/savedLibrary'
import { vSpotlight } from '@/utils/motion'

defineProps({
    item: { type: Object, required: true },
    selectedCategory: { type: String, default: null },
    selectedLang: { type: String, default: null }
})

defineEmits(['remove', 'toggle-category', 'toggle-lang'])

const shortStars = (n) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n))

function timeAgo(isoString) {
    if (!isoString) return ''
    const diffInSeconds = Math.floor((new Date() - new Date(isoString)) / 1000)

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
</script>

<template>
    <article v-spotlight class="saved-card card mb-3 p-3 rounded-3 shadow-sm"
        :style="{ '--lang': getLangColor(itemLang(item)) }">

        <div class="card-head d-flex flex-wrap align-items-center gap-2 mb-2">
            <!-- The name wraps onto more lines if it has to, instead of being cut off with "…" -->
            <h5 class="repo-name card-title h6 fw-bold font-monospace mb-0">
                <a :href="item.link" target="_blank" rel="noopener noreferrer" class="repo-link stretched-link">
                    <span v-if="item.owner" class="text-muted-github">{{ item.owner }}/</span><wbr>{{ item.name }}<span
                        class="visually-hidden"> (opens on GitHub)</span>
                </a>
            </h5>

            <!-- Category: click to filter -->
            <button type="button" class="cat-badge badge rounded-pill fw-normal px-2 py-1"
                :class="{ 'is-selected': selectedCategory === itemCategory(item) }"
                :style="{ '--c': categoryColor(itemCategory(item)) }"
                :title="selectedCategory === itemCategory(item) ? 'Clear filter: ' + itemCategory(item) : 'Filter by ' + itemCategory(item)"
                @click="$emit('toggle-category', itemCategory(item))">
                <span class="cat-text">{{ itemCategory(item) }}</span>
            </button>

            <!-- phones only: forces the category onto its own line under the name -->
            <span class="head-break" aria-hidden="true"></span>

            <svg class="repo-arrow flex-shrink-0 ms-auto" width="16" height="16" viewBox="0 0 16 16" fill="none"
                stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
                aria-hidden="true">
                <path d="M5 11L11 5M6 5h5v5" />
            </svg>

            <!-- The bookmark is checked because it is saved. Clicking it removes the save. -->
            <button type="button" class="bookmark-btn btn btn-sm btn-link p-0 flex-shrink-0"
                :aria-label="`Remove ${item.name} from saved`" title="Saved. Click to remove"
                @click="$emit('remove', item)">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"
                    stroke-linejoin="round" aria-hidden="true">
                    <path d="M3.5 2.5h9v11.2L8 10.6l-4.5 3.1z" />
                </svg>
            </button>
        </div>

        <!-- Details still loading from GitHub -->
        <div v-if="item.status === 'loading'" class="placeholder-glow">
            <span class="placeholder col-9 mb-3 d-block"></span>
            <span class="placeholder col-4"></span>
        </div>

        <template v-else>
            <p class="card-text text-muted-github small mb-3">
                <template v-if="item.status === 'error'">
                    Details are not available right now. The repository may be private, moved, or GitHub is rate
                    limiting requests.
                </template>
                <template v-else>{{ item.description || 'No description' }}</template>
            </p>

            <div v-if="item.status === 'ok'" class="d-flex align-items-center gap-3 text-muted-github small flex-wrap">
                <button type="button" class="lang-link d-flex align-items-center gap-1 rounded-2"
                    :class="{ 'is-selected': selectedLang === itemLang(item) }"
                    :title="selectedLang === itemLang(item) ? 'Clear filter' : 'Filter by ' + itemLang(item)"
                    @click="$emit('toggle-lang', itemLang(item))">
                    <span class="lang-dot rounded-circle d-inline-block flex-shrink-0"></span>
                    <span>{{ itemLang(item) }}</span>
                </button>

                <span class="meta-star d-inline-flex align-items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                        <path
                            d="M8 .25l2.3 4.66 5.15.75-3.72 3.63.88 5.13L8 12.04l-4.61 2.38.88-5.13L.55 5.66l5.15-.75z" />
                    </svg>
                    <span class="font-monospace">{{ shortStars(item.stars) }}</span>
                </span>

                <span class="d-inline-flex align-items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"
                        stroke-linecap="round" aria-hidden="true">
                        <circle cx="4" cy="3" r="1.6" />
                        <circle cx="12" cy="3" r="1.6" />
                        <circle cx="8" cy="13" r="1.6" />
                        <path d="M4 4.6v1.2c0 1 .8 1.7 1.7 1.7h4.6c.9 0 1.7-.7 1.7-1.7V4.6M8 7.5v4" />
                    </svg>
                    <span class="font-monospace">{{ item.forks }}</span>
                </span>

                <span v-if="item.updatedAt">Updated {{ timeAgo(item.updatedAt) }}</span>
            </div>
        </template>
    </article>
</template>

<style scoped>
.card-title {
    color: var(--app-text);
}

.saved-card {
    position: relative;
    overflow: hidden;
    isolation: isolate;
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.25s ease,
        box-shadow 0.25s ease;
}

/* Cursor spotlight tinted by the repo's language */
.saved-card::before {
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

/* Colored edge that grows in on hover */
.saved-card::after {
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

.saved-card:hover {
    transform: translateY(-3px);
    border-color: color-mix(in srgb, var(--lang) 50%, var(--card-border)) !important;
    box-shadow: 0 14px 30px -16px color-mix(in srgb, var(--lang) 55%, transparent) !important;
}

.saved-card:hover::before {
    opacity: 1;
}

.saved-card:hover::after {
    transform: scaleY(1);
}

/* Repo name is the card's link (Bootstrap stretched-link covers the whole card) */
.repo-link {
    color: var(--app-text);
    text-decoration: none;
    text-decoration-thickness: 2px;
    text-underline-offset: 4px;
    text-decoration-color: transparent;
    transition: text-decoration-color 0.25s ease;
}

.saved-card:hover .repo-link {
    text-decoration: underline;
    text-decoration-color: var(--lang);
}

.repo-link:focus-visible {
    outline: none;
}

.saved-card:has(.repo-link:focus-visible) {
    border-color: #58a6ff;
    box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4) !important;
}

/* Everything clickable must sit above the stretched link */
.card-head {
    row-gap: 0.4rem;
}

/* The repo name is the most important text on the card: it may wrap, it is never cut with "…" */
.repo-name {
    flex: 0 1 auto;
    min-width: 0;
    line-height: 1.35;
    overflow-wrap: anywhere;
}

.head-break {
    display: none;
}

/* The category can shrink and shows "…" only if it is longer than the whole card.
   The full name is in the tooltip. */
.cat-badge {
    flex: 0 1 auto;
    min-width: 0;
    max-width: 100%;
}

.cat-text {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* Phones and small tablets: name + bookmark on the first line, category underneath */
@media (max-width: 767.98px) {
    .repo-name {
        flex: 1 1 0;
        order: 1;
    }

    .bookmark-btn {
        order: 2;
    }

    .head-break {
        display: block;
        flex-basis: 100%;
        height: 0;
        order: 3;
    }

    .cat-badge {
        order: 4;
    }

    /* the hover arrow does nothing on a touch screen */
    .repo-arrow {
        display: none;
    }
}

.cat-badge,
.lang-link,
.bookmark-btn {
    position: relative;
    z-index: 2;
}

.cat-badge {
    color: var(--app-text);
    background-color: color-mix(in srgb, var(--c) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--c) 45%, transparent);
    cursor: pointer;
    transition: background-color 0.2s ease, border-color 0.2s ease;
}

.cat-badge:hover,
.cat-badge.is-selected {
    background-color: color-mix(in srgb, var(--c) 28%, transparent);
    border-color: var(--c);
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
    cursor: pointer;
    transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.lang-link:hover,
.lang-link.is-selected {
    color: var(--app-text);
    background-color: color-mix(in srgb, var(--lang) 16%, transparent);
    border-color: color-mix(in srgb, var(--lang) 55%, transparent);
}

.cat-badge:focus-visible,
.lang-link:focus-visible,
.bookmark-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4);
}

.repo-arrow {
    color: var(--lang);
    opacity: 0;
    transform: translateX(-8px);
    transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.saved-card:hover .repo-arrow {
    opacity: 1;
    transform: translateX(0);
}

/* Filled bookmark = saved. On hover it turns into a "remove" cue. */
.bookmark-btn {
    color: #58a6ff;
    transition: transform 0.15s ease, color 0.2s ease;
}

.bookmark-btn svg path {
    fill: currentColor;
    transition: fill 0.25s ease;
}

.bookmark-btn:hover {
    color: #f85149;
}

.bookmark-btn:hover svg path {
    fill: transparent;
}

.bookmark-btn:active {
    transform: scale(0.8);
}

.meta-star svg {
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s ease;
}

.saved-card:hover .meta-star svg {
    color: #e3b341;
    transform: rotate(72deg) scale(1.2);
}

@media (prefers-reduced-motion: reduce) {

    .saved-card,
    .saved-card::after,
    .repo-arrow,
    .meta-star svg,
    .bookmark-btn {
        transition: none !important;
    }

    .saved-card:hover,
    .saved-card:hover .meta-star svg,
    .bookmark-btn:active {
        transform: none;
    }
}
</style>