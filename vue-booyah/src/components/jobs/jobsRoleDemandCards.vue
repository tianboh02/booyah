<script setup>
import { computed, ref } from 'vue'
import { TOP_N } from '@/utils/hackernewsJobs'
import { vSpotlight } from '@/utils/motion'

const props = defineProps({
    roles: { type: Array, default: () => [] },
    postsPerMonth: { type: Array, default: () => [] }
})

defineEmits(['select'])

const showAll = ref(false)
const visibleRoles = computed(() => (showAll.value ? props.roles : props.roles.slice(0, TOP_N)))

// bars are scaled to the biggest value so the top row fills the track
const topShare = computed(() => Math.max(...props.roles.map((r) => r.share), 1))
const topCount = computed(() => Math.max(...props.postsPerMonth.map((p) => p.count), 1))
</script>

<template>
    <section class="mb-4">
        <div class="mb-3">
            <h2 class="h3 fw-bold section-title mb-1">Role demand</h2>
            <p class="text-muted-github small mb-0">
                Share of job posts mentioning each role, last 3 months. Select a role for details.
            </p>
        </div>

        <div class="row g-3">
            <!-- Left Card: Roles -->
            <div class="col-md-6">
                <div v-spotlight class="panel card p-3 h-100 rounded-3 shadow-sm">
                    <h3 class="h6 fw-bold section-title pb-2 mb-2 panel-head">Roles</h3>
                    <ul class="list-unstyled mb-0">
                        <li v-for="(r, i) in visibleRoles" :key="r.name" :style="{ '--i': i }" class="role-item">
                            <button type="button" class="role-row w-100 text-start" @click="$emit('select', r.name)">
                                <span class="d-flex align-items-center gap-2 small">
                                    <span class="role-name flex-grow-1 text-truncate">{{ r.name }}</span>
                                    <svg class="row-arrow flex-shrink-0" width="14" height="14" viewBox="0 0 16 16"
                                        fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
                                        stroke-linejoin="round" aria-hidden="true">
                                        <path d="M5 11L11 5M6 5h5v5" />
                                    </svg>
                                    <span class="font-monospace text-muted-github">{{ r.share }}%</span>
                                </span>
                                <span class="bar-track d-block mt-1">
                                    <span class="bar-fill d-block" :style="{ width: `${(r.share / topShare) * 100}%` }"></span>
                                </span>
                            </button>
                        </li>
                    </ul>
                    <button v-if="roles.length > TOP_N" type="button"
                        class="btn btn-link btn-sm align-self-start px-0 mt-2" @click="showAll = !showAll">
                        {{ showAll ? `Show top ${TOP_N}` : `Show all ${roles.length}` }}
                    </button>
                </div>
            </div>

            <!-- Right Card: Posts Per Month -->
            <div class="col-md-6">
                <div v-spotlight class="panel card p-3 h-100 rounded-3 shadow-sm">
                    <h3 class="h6 fw-bold section-title pb-2 mb-2 panel-head">Posts per month</h3>
                    <ul class="list-unstyled mb-0">
                        <li v-for="(p, i) in postsPerMonth" :key="p.month" :style="{ '--i': i }"
                            class="role-item month-row">
                            <span class="d-flex justify-content-between small">
                                <span class="role-name">{{ p.month }}</span>
                                <span class="font-monospace text-muted-github">{{ p.count }}</span>
                            </span>
                            <span class="bar-track d-block mt-1">
                                <span class="bar-fill d-block" :style="{ width: `${(p.count / topCount) * 100}%` }"></span>
                            </span>
                        </li>
                    </ul>
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

/* --- Panels: lift + cursor spotlight (same recipe as the My Project and Discovery cards) -- */
.panel {
    position: relative;
    overflow: hidden;
    isolation: isolate;
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.25s ease, box-shadow 0.25s ease;
}

.panel::before {
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

.panel>* {
    position: relative;
}

.panel:hover {
    transform: translateY(-3px);
    border-color: color-mix(in srgb, #58a6ff 50%, var(--card-border)) !important;
    box-shadow: 0 14px 30px -16px color-mix(in srgb, #58a6ff 55%, transparent) !important;
}

.panel:hover::before {
    opacity: 1;
}

.panel-head {
    border-bottom: 1px solid var(--card-border);
}

/* --- Rows ------------------------------------------------------------------ */
.role-item {
    animation: row-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: calc(var(--i) * 50ms);
}

.role-row,
.month-row {
    position: relative;
    display: block;
    padding: 0.5rem;
    border: 0;
    border-radius: 0.4rem;
    background: transparent;
    transition: background-color 0.2s ease;
}

.role-row:hover {
    background-color: var(--badge-bg);
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

.row-arrow {
    color: #58a6ff;
    opacity: 0;
    transform: translateX(-8px);
    transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.role-row:hover .row-arrow {
    opacity: 1;
    transform: translateX(0);
}

/* Share bars */
.bar-track {
    height: 4px;
    border-radius: 2px;
    background-color: var(--badge-bg);
    overflow: hidden;
}

.bar-fill {
    height: 100%;
    border-radius: 2px;
    background: linear-gradient(90deg, color-mix(in srgb, #58a6ff 55%, transparent), #58a6ff);
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

    .panel,
    .panel::before,
    .role-row,
    .role-row::after,
    .row-arrow {
        transition: none !important;
    }

    .role-item,
    .bar-fill {
        animation: none !important;
    }

    .panel:hover {
        transform: none;
    }
}
</style>
