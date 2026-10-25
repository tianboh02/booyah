<script setup>
import { computed, ref } from 'vue'
import { vSpotlight } from '@/utils/motion'
import SegmentedToggle from '@/components/shared/SegmentedToggle.vue'
import JobsMonthChart from '@/components/jobs/jobsMonthChart.vue'

const props = defineProps({
    roles: { type: Array, default: () => [] },
    postsPerMonth: { type: Array, default: () => [] }
})

defineEmits(['select'])

const TOP_N = 5
const roleView = ref('top')
const monthView = ref('bar')

// bars use the true 0-100% scale, so 59% fills 59% of the track
const visibleRoles = computed(() => (roleView.value === 'top' ? props.roles.slice(0, TOP_N) : props.roles))
const postsLabel = (r) => (r.count != null ? `${r.count.toLocaleString()} posts` : '')
</script>

<template>
    <section class="mb-4">
        <div class="mb-3">
            <h2 class="h3 fw-bold section-title mb-1">Role demand</h2>
            <p class="text-muted-github small mb-0">
                Share of job posts mentioning each role, last 3 months. Click a role to see salaries, trend and
                tech stack.
            </p>
        </div>

        <div class="row g-3">
            <!-- Left Card: Roles -->
            <div class="col-md-6">
                <div v-spotlight class="spot-card card p-3 h-100 rounded-3 shadow-sm" :style="{ '--accent': '#58a6ff' }">
                    <div class="d-flex align-items-center justify-content-between gap-2 pb-2 mb-2 panel-head">
                        <h3 class="panel-title fw-bold section-title mb-0">Roles</h3>
                        <SegmentedToggle v-if="roles.length > TOP_N" v-model="roleView" label="Roles shown"
                            :options="[{ value: 'top', label: `Top ${TOP_N}` }, { value: 'all', label: 'All' }]" />
                    </div>
                    <!-- fixed at five rows tall, so switching to All scrolls instead of resizing the card -->
                    <ul class="roles-list list-unstyled mb-0" :class="{ 'is-scrolling': roleView === 'all' }">
                        <li v-for="(r, i) in visibleRoles" :key="r.name" :style="{ '--i': i }" class="role-item">
                            <button type="button"
                                class="role-row position-relative d-flex flex-column justify-content-center fs-6 border-0 w-100 text-start"
                                :aria-label="`${r.name}: ${r.share}% of posts. View details`"
                                @click="$emit('select', r.name)">
                                <span class="d-flex align-items-center gap-2">
                                    <span class="role-name fw-semibold flex-grow-1 text-truncate">{{ r.name }}</span>
                                    <span v-if="postsLabel(r)" class="row-meta font-monospace text-muted-github text-nowrap">
                                        {{ postsLabel(r) }} ·
                                    </span>
                                    <span class="share font-monospace fw-bold text-end">{{ r.share }}%</span>
                                    <!-- round chevron at rest, slides open to "Details" on hover/focus -->
                                    <span
                                        class="details-cta d-inline-flex align-items-center justify-content-end overflow-hidden rounded-pill fw-semibold text-nowrap"
                                        aria-hidden="true">
                                        <span class="cta-label">Details</span>
                                        <svg class="cta-chevron flex-shrink-0" width="14" height="14" viewBox="0 0 16 16"
                                            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                            stroke-linejoin="round">
                                            <path d="M6 3.5L10.5 8 6 12.5" />
                                        </svg>
                                    </span>
                                </span>
                                <span class="bar-track position-relative overflow-hidden d-block mt-2">
                                    <span class="bar-fill d-block h-100" :style="{ width: `${r.share}%` }"></span>
                                </span>
                            </button>
                        </li>
                    </ul>
                    <div class="scale d-flex justify-content-between overflow-hidden font-monospace text-muted-github mt-1"
                        aria-hidden="true">
                        <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                    </div>
                </div>
            </div>

            <!-- Right Card: Posts Per Month -->
            <div class="col-md-6">
                <div v-spotlight class="spot-card card p-3 h-100 rounded-3 shadow-sm d-flex flex-column"
                    :style="{ '--accent': '#58a6ff' }">
                    <div class="d-flex align-items-center justify-content-between gap-2 pb-2 mb-2 panel-head">
                        <h3 class="panel-title fw-bold section-title mb-0">Posts per month</h3>
                        <SegmentedToggle v-model="monthView" label="Chart type"
                            :options="[{ value: 'bar', label: 'Columns' }, { value: 'line', label: 'Line' }]" />
                    </div>
                    <JobsMonthChart class="flex-grow-1" :points="postsPerMonth" :view="monthView" />
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.section-title,
.role-name {
    color: var(--app-text);
    transition: color 0.2s ease;
}

/* --- Panels: lift + cursor spotlight come from main.css (.spot-card), tinted blue by --accent -- */
.panel-head {
    border-bottom: 1px solid var(--card-border);
}

.panel-title {
    font-size: 1.05rem;
}

/* --- Roles list ------------------------------------------------------------- */
/* Always five rows tall. Top 5 fills it exactly; All scrolls inside it, so the card never resizes.
   The scrollbar gutter is reserved in both modes so rows don't shift sideways when toggling. */
.roles-list {
    --row-h: 3.75rem;
    height: calc(5 * var(--row-h));
    overflow-y: hidden;
    scrollbar-gutter: stable;
    scrollbar-width: thin;
    scrollbar-color: color-mix(in srgb, var(--text-muted-github) 45%, transparent) transparent;
}

.roles-list.is-scrolling {
    overflow-y: auto;
}

.roles-list:hover {
    scrollbar-color: #58a6ff transparent;
}

/* Fallback for browsers without scrollbar-color */
@supports not (scrollbar-color: auto) {
    .roles-list::-webkit-scrollbar {
        width: 6px;
    }

    .roles-list::-webkit-scrollbar-thumb {
        border-radius: 999px;
        background: color-mix(in srgb, var(--text-muted-github) 45%, transparent);
    }

    .roles-list:hover::-webkit-scrollbar-thumb {
        background: #58a6ff;
    }
}

/* --- Rows ------------------------------------------------------------------ */
.role-item {
    animation: row-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: calc(var(--i) * 50ms);
}

.role-row {
    height: var(--row-h);
    padding: 0 0.6rem;
    border-radius: 0.4rem;
    background: transparent;
    transition: background-color 0.2s ease;
}

.role-row:hover {
    background-color: var(--badge-bg);
}

.role-row:hover .bar-fill {
    filter: brightness(1.2);
}

/* Accent edge that grows in on hover */
.role-row::after {
    content: '';
    position: absolute;
    left: 0;
    top: 6px;
    bottom: 6px;
    width: 3px;
    border-radius: 2px;
    background: #58a6ff;
    transform: scaleY(0);
    transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.role-row:hover::after {
    transform: scaleY(1);
}

.role-row:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4);
}

.share {
    color: var(--app-text);
    min-width: 3rem;
}

/* Post count slides in on hover, so the resting list stays uncluttered */
.row-meta {
    font-size: 0.85rem;
    opacity: 0;
    transform: translateX(6px);
    transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.role-row:hover .row-meta,
.role-row:focus-visible .row-meta {
    opacity: 1;
    transform: none;
}

/* CTA: a round chevron at rest that slides open to "Details" on hover/focus.
   It is anchored to the right, so it grows leftward into the hover-only post count's space. */
.details-cta {
    height: 26px;
    max-width: 26px;
    padding: 0 6px;
    gap: 2px;
    font-size: 0.78rem;
    color: #58a6ff;
    background: color-mix(in srgb, #58a6ff 14%, transparent);
    border: 1px solid color-mix(in srgb, #58a6ff 35%, transparent);
    transition: max-width 0.3s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.2s ease, color 0.2s ease,
        box-shadow 0.2s ease;
}

.cta-label {
    opacity: 0;
    padding-left: 4px;
    transition: opacity 0.2s ease;
}

.role-row:hover .details-cta,
.role-row:focus-visible .details-cta {
    max-width: 90px;
    color: #fff;
    background: #58a6ff;
    box-shadow: 0 4px 14px -4px rgba(88, 166, 255, 0.8);
}

.role-row:hover .cta-label,
.role-row:focus-visible .cta-label {
    opacity: 1;
}

/* Share bars: true 0-100% scale, with quarter ticks so the scale is readable */
.bar-track {
    height: 8px;
    border-radius: 4px;
    background-color: var(--badge-bg);
    background-image: linear-gradient(90deg, transparent calc(25% - 1px), var(--card-border) calc(25% - 1px) 25%,
            transparent 25% calc(50% - 1px), var(--card-border) calc(50% - 1px) 50%,
            transparent 50% calc(75% - 1px), var(--card-border) calc(75% - 1px) 75%, transparent 75%);
}

/* same side padding and scrollbar gutter as the rows, so the ticks line up with the bars */
.scale {
    padding: 0 0.6rem;
    scrollbar-gutter: stable;
    scrollbar-width: thin;
    font-size: 0.72rem;
    opacity: 0.7;
}

.bar-fill {
    border-radius: 4px;
    box-shadow: 0 0 10px -1px color-mix(in srgb, #58a6ff 70%, transparent);
    transition: filter 0.2s ease;
    background: linear-gradient(90deg, color-mix(in srgb, #58a6ff 45%, transparent), #58a6ff);
    transform-origin: left;
    animation: bar-grow 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: calc(var(--i) * 50ms + 150ms);
}

@keyframes row-in {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: none;
    }
}

@keyframes bar-grow {
    from {
        transform: scaleX(0);
    }

    to {
        transform: scaleX(1);
    }
}

@media (prefers-reduced-motion: reduce) {

    .role-row,
    .role-row::after,
    .row-meta,
    .details-cta,
    .cta-label {
        transition: none !important;
    }

    .role-item,
    .bar-fill {
        animation: none !important;
    }
}
</style>
