<script setup>
import { computed, onMounted, ref } from 'vue'
import { getLangColor } from '@/utils/langColors'
import { langOf, visibleProjects } from '@/utils/top5Categories'
import { vSpotlight, vTilt, useCountUp } from '@/utils/motion'

const props = defineProps({
    categories: { type: Array, default: () => [] },
    selectedLang: { type: String, default: null }
})

const shown = (lang) => props.categories.flatMap((c) => visibleProjects(c, lang))
const allShown = computed(() => shown(null))
const focused = computed(() => shown(props.selectedLang))

const stats = computed(() => {
    const counts = {}
    for (const p of allShown.value) counts[langOf(p)] = (counts[langOf(p)] || 0) + 1
    const lang = props.selectedLang || Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b))[0] || '-'
    return {
        projects: focused.value.length,
        stars: focused.value.reduce((sum, p) => sum + p.stars, 0),
        lang,
        langPct: allShown.value.length ? Math.round(((counts[lang] || 0) / allShown.value.length) * 100) : 0
    }
})

const projectCount = useCountUp(() => stats.value.projects)
const starCount = useCountUp(() => stats.value.stars)
const langPct = useCountUp(() => stats.value.langPct)

const langColor = computed(() => getLangColor(stats.value.lang))

const ready = ref(false)
onMounted(() => requestAnimationFrame(() => (ready.value = true)))
</script>

<template>
    <div class="row row-cols-1 row-cols-md-3 g-3 mb-4">
        <div class="col">
            <div v-tilt="5" v-spotlight class="card stat-card p-3 h-100 rounded-3 shadow-sm"
                :class="{ 'is-in': ready, 'is-focused': selectedLang }" :style="{ '--i': 0, '--accent': '#58a6ff' }">
                <span class="h3 fw-bold stat-value mb-1 font-monospace">{{ projectCount }}</span>
                <span class="stat-label fw-semibold small text-truncate"
                    :title="selectedLang ? selectedLang + ' projects' : 'Projects'">
                    {{ selectedLang ? selectedLang + ' projects' : 'Projects' }}
                </span>
                <span class="text-muted-github small">across {{ categories.length }} categories</span>
            </div>
        </div>

        <div class="col">
            <div v-tilt="5" v-spotlight class="card stat-card p-3 h-100 rounded-3 shadow-sm"
                :class="{ 'is-in': ready, 'is-focused': selectedLang }" :style="{ '--i': 1, '--accent': langColor }">
                <span class="h3 fw-bold stat-value mb-1 font-monospace d-flex align-items-center gap-2 min-w-0">
                    <span class="lang-dot d-inline-block rounded-circle flex-shrink-0"></span>
                    <span class="text-truncate" :title="stats.lang">{{ stats.lang }}</span>
                </span>
                <span class="stat-label fw-semibold small text-truncate">
                    {{ selectedLang ? 'Selected language' : 'Most-used language' }}
                </span>
                <span class="text-muted-github small">
                    <span class="font-monospace">{{ langPct }}%</span> of the projects shown
                </span>
            </div>
        </div>

        <div class="col">
            <div v-tilt="5" v-spotlight class="card stat-card p-3 h-100 rounded-3 shadow-sm"
                :class="{ 'is-in': ready, 'is-focused': selectedLang }"
                :style="{ '--i': 2, '--accent': selectedLang ? langColor : '#e3b341' }">
                <span class="h3 fw-bold stat-value mb-1 font-monospace">{{ starCount }}</span>
                <span class="stat-label fw-semibold small text-truncate"
                    :title="selectedLang ? 'Stars in ' + selectedLang : 'Total stars'">
                    {{ selectedLang ? 'Stars in ' + selectedLang : 'Total stars' }}
                </span>
                <span class="text-muted-github small">GitHub stars on the projects shown</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.stat-value,
.stat-label {
    color: var(--app-text);
    transition: color 0.2s ease;
}

.stat-card {
    position: relative;
    overflow: hidden;
    transform: perspective(700px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
    transition: transform 0.2s ease-out, border-color 0.3s ease, box-shadow 0.3s ease,
        opacity 0.6s ease, translate 0.7s cubic-bezier(0.22, 1, 0.36, 1);
    opacity: 0;
    translate: 0 18px;
    transition-delay: 0s, 0s, 0s, calc(var(--i) * 110ms), calc(var(--i) * 110ms);
}

.stat-card.is-in {
    opacity: 1;
    translate: 0 0;
}

.stat-card>* {
    position: relative;
}

/* Cursor spotlight */
.stat-card::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
    background: radial-gradient(260px circle at var(--mx, 50%) var(--my, 50%),
            color-mix(in srgb, var(--accent) 20%, transparent),
            transparent 70%);
}

.stat-card:hover::before {
    opacity: 1;
}

.stat-card:hover,
.stat-card.is-focused {
    border-color: color-mix(in srgb, var(--accent) 55%, var(--card-border));
    box-shadow: 0 10px 30px -12px color-mix(in srgb, var(--accent) 45%, transparent) !important;
}

/* Top accent line */
.stat-card::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent) 50%, transparent);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
    transition-delay: calc(var(--i) * 110ms + 300ms);
}

.stat-card.is-in::after {
    transform: scaleX(1);
}

.lang-dot {
    width: 12px;
    height: 12px;
    background-color: var(--accent);
    box-shadow: 0 0 6px color-mix(in srgb, var(--accent) 70%, transparent),
        0 0 18px 4px color-mix(in srgb, var(--accent) 30%, transparent);
    transition: background-color 0.4s ease, box-shadow 0.4s ease;
}

.min-w-0 {
    min-width: 0;
}

@media (prefers-reduced-motion: reduce) {

    .stat-card,
    .stat-card::after,
    .lang-dot {
        transition: none !important;
    }

    .stat-card {
        opacity: 1;
        translate: none;
        transform: none;
    }

    .stat-card::after {
        transform: scaleX(1);
    }
}
</style>