<script setup>
import { computed, ref, watch } from 'vue'
import { getLangColor } from '@/utils/langColors'
import { vSpotlight, vTilt, useCountUp } from '@/utils/motion'

const props = defineProps({
    repoList: {
        type: Array,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    },
    // Shared with the repository list via v-model:selected-lang
    selectedLang: {
        type: String,
        default: null
    }
})

const emit = defineEmits(['update:selectedLang'])

const langOf = (repo) => repo.language || 'No language'

function toggleLang(name) {
    emit('update:selectedLang', props.selectedLang === name ? null : name)
}

function clearLang() {
    emit('update:selectedLang', null)
}

function scrollToList() {
    document.getElementById('repo-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const hasData = computed(() => props.repoList && props.repoList.length > 0)

// Repos the top stat cards describe: everything, or just the focused language.
const scopedRepos = computed(() =>
    props.selectedLang ? props.repoList.filter(r => langOf(r) === props.selectedLang) : props.repoList
)

const stats = computed(() => {
    if (!hasData.value) {
        return {
            totalRepos: 0,
            publicRepos: 0,
            privateRepos: 0,
            mostUsedLang: 'N/A',
            mostUsedPct: 0,
            totalStars: 0,
            sortedLangs: []
        }
    }

    const all = props.repoList
    const scoped = scopedRepos.value

    const total = scoped.length
    const privates = scoped.filter(r => r.private).length
    const publics = total - privates
    const stars = scoped.reduce((acc, r) => acc + (r.stargazers_count || 0), 0)

    // Language counts always use the full list so the charts never shrink.
    const langCounts = {}
    all.forEach(r => {
        const lang = langOf(r)
        langCounts[lang] = (langCounts[lang] || 0) + 1
    })

    const sortedLangs = Object.entries(langCounts).sort((a, b) => b[1] - a[1])

    // Headline language: the focused one, otherwise the top real language.
    let headline
    if (props.selectedLang && langCounts[props.selectedLang] !== undefined) {
        headline = [props.selectedLang, langCounts[props.selectedLang]]
    } else {
        headline = sortedLangs.find(([name]) => name !== 'No language') || sortedLangs[0]
    }
    const headLang = headline ? headline[0] : 'None'
    const headCount = headline ? headline[1] : 0
    const headPct = all.length > 0 ? Math.round((headCount / all.length) * 100) : 0

    return {
        totalRepos: total,
        publicRepos: publics,
        privateRepos: privates,
        mostUsedLang: headLang,
        mostUsedPct: headPct,
        totalStars: stars,
        sortedLangs
    }
})

const topLangColor = computed(() => getLangColor(stats.value.mostUsedLang))
const cardAccent = computed(() => (props.selectedLang ? topLangColor.value : '#58a6ff'))

// Animated numbers (they re-count whenever the focus changes)
const repoCount = useCountUp(() => stats.value.totalRepos)
const starCount = useCountUp(() => stats.value.totalStars)
const topPct = useCountUp(() => stats.value.mostUsedPct)

// Flips to true a couple of frames after data arrives so CSS transitions have a start state.
const ready = ref(false)
watch(
    hasData,
    (has) => {
        ready.value = false
        if (has) {
            requestAnimationFrame(() => requestAnimationFrame(() => (ready.value = true)))
        }
    },
    { immediate: true }
)

// Language share breakdown for legend
const langShareList = computed(() => {
    if (!hasData.value) return []

    const total = props.repoList.length
    return stats.value.sortedLangs.map(([name, count]) => ({
        name,
        percentage: Math.round((count / total) * 100),
        color: getLangColor(name)
    }))
})

// Donut: one SVG circle per language (pathLength = 100, so lengths are percentages)
const donutSegments = computed(() => {
    if (!hasData.value) return []
    const total = props.repoList.length
    let acc = 0
    return stats.value.sortedLangs.map(([name, count], idx) => {
        const len = (count / total) * 100
        const seg = {
            name,
            idx,
            color: getLangColor(name),
            pct: Math.round(len),
            dash: Math.max(len - 0.9, 0.1), // small visual gap between segments
            offset: acc + 0.45
        }
        acc += len
        return seg
    })
})

// Hovering previews a language in the donut centre without changing the filter.
const hoveredLang = ref(null)
const activeLang = computed(() => hoveredLang.value || props.selectedLang)
const centerPct = computed(() => {
    if (hoveredLang.value) {
        return donutSegments.value.find(s => s.name === hoveredLang.value)?.pct ?? 0
    }
    return topPct.value
})
const centerLabel = computed(() => hoveredLang.value || stats.value.mostUsedLang)
const glowColor = computed(() => (activeLang.value ? getLangColor(activeLang.value) : topLangColor.value))

// Repos by primary language bar chart
const reposByLangList = computed(() => {
    const sorted = stats.value.sortedLangs
    if (sorted.length === 0) return []

    const maxCount = Math.max(...sorted.map(([_, count]) => count), 1)

    return sorted.map(([name, count]) => ({
        name,
        count,
        color: getLangColor(name),
        barWidth: Math.max(Math.round((count / maxCount) * 100), 8)
    }))
})

const focusedCount = computed(() => scopedRepos.value.length)
</script>

<template>
    <div class="graph-body container my-4">

        <!-- Loading skeleton (Bootstrap placeholders) -->
        <div v-if="loading" class="row row-cols-1 row-cols-md-3 g-3 mb-4">
            <div v-for="n in 3" :key="n" class="col">
                <div class="card p-3 h-100 rounded-3 shadow-sm placeholder-glow">
                    <span class="placeholder col-4 mb-2 py-3 rounded"></span>
                    <span class="placeholder col-7 mb-1"></span>
                    <span class="placeholder col-5"></span>
                </div>
            </div>
        </div>

        <!-- Top Stats Cards Grid -->
        <div v-else-if="hasData" class="row row-cols-1 row-cols-md-3 g-3 mb-4">

            <!-- Number of Repositories Card -->
            <div class="col">
                <div v-tilt="5" v-spotlight class="card stat-card p-3 h-100 rounded-3 shadow-sm"
                    :class="{ 'is-in': ready, 'is-focused': selectedLang }"
                    :style="{ '--i': 0, '--accent': cardAccent }">
                    <span class="h3 fw-bold stat-value mb-1 font-monospace">{{ repoCount }}</span>
                    <span class="stat-label fw-semibold small text-truncate">
                        {{ selectedLang ? selectedLang + ' repositories' : 'Repositories' }}
                    </span>
                    <span class="text-muted-github small">{{ stats.publicRepos }} public · {{ stats.privateRepos }}
                        private</span>
                </div>
            </div>

            <!-- Most-used / Selected Language Card -->
            <div class="col">
                <div v-tilt="5" v-spotlight class="card stat-card p-3 h-100 rounded-3 shadow-sm"
                    :class="{ 'is-in': ready, 'is-focused': selectedLang }"
                    :style="{ '--i': 1, '--accent': topLangColor }">
                    <span class="h3 fw-bold stat-value mb-1 font-monospace text-truncate d-block">
                        <span class="lang-dot me-2"></span>{{ stats.mostUsedLang }}
                    </span>
                    <span class="stat-label fw-semibold small">
                        {{ selectedLang ? 'Selected language' : 'Most-used language' }}
                    </span>
                    <span class="text-muted-github small"><span class="font-monospace">{{ topPct }}%</span>
                        of your code</span>
                </div>
            </div>

            <!-- Total Stars Card -->
            <div class="col">
                <div v-tilt="5" v-spotlight class="card stat-card p-3 h-100 rounded-3 shadow-sm"
                    :class="{ 'is-in': ready, 'is-focused': selectedLang }"
                    :style="{ '--i': 2, '--accent': selectedLang ? topLangColor : '#e3b341' }">
                    <span class="h3 fw-bold stat-value mb-1 font-monospace">{{ starCount }}</span>
                    <span class="stat-label fw-semibold small">
                        {{ selectedLang ? 'Stars in ' + selectedLang : 'Total stars' }}
                    </span>
                    <span class="text-muted-github small">
                        {{ selectedLang ? 'Across ' + focusedCount + ' ' + (focusedCount === 1 ? 'repository' :
                            'repositories') : 'Across all repositories' }}
                    </span>
                </div>
            </div>

        </div>

        <!-- Empty State Fallback Card -->
        <div v-else class="card p-4 mb-4 rounded-3 shadow-sm text-muted-github text-center py-3">
            No repository data detected.
        </div>

        <!-- Bottom Stat Row -->
        <div class="row g-4">

            <!-- Language Share Chart Card -->
            <div class="col-lg-6">
                <div v-spotlight class="card panel p-4 h-100 rounded-3 shadow-sm">
                    <div class="d-flex align-items-start justify-content-between gap-3 flex-wrap mb-4">
                        <div>
                            <h2 class="h5 fw-bold section-title mb-1">Language share</h2>
                            <p class="text-muted-github small mb-0">
                                *This feature is currently under development for further implementation with ECharts.
                            </p>
                        </div>

                        <!-- Focus chip: shows what is selected and lets you jump to / clear it -->
                        <Transition name="chip">
                            <div v-if="selectedLang"
                                class="focus-chip d-flex align-items-center gap-2 rounded-pill ps-3 pe-1 py-1"
                                :style="{ '--c': topLangColor }">
                                <span class="chip-dot rounded-circle"></span>
                                <span class="small fw-semibold stat-label">{{ selectedLang }}</span>
                                <button type="button" class="chip-btn btn btn-sm rounded-pill px-2"
                                    @click="scrollToList">
                                    Show {{ focusedCount }} ↓
                                </button>
                                <button type="button" class="chip-close btn btn-sm rounded-circle p-0"
                                    aria-label="Clear language filter" @click="clearLang">✕</button>
                            </div>
                        </Transition>
                    </div>

                    <div v-if="langShareList.length > 0"
                        class="d-flex align-items-center gap-4 flex-wrap flex-sm-nowrap my-auto">

                        <!-- Donut Chart (click a segment to focus a language) -->
                        <div class="donut position-relative d-flex align-items-center justify-content-center flex-shrink-0 mx-auto mx-sm-0"
                            :class="{ 'is-in': ready, 'has-focus': activeLang }"
                            :style="{ width: '150px', height: '150px', '--glow': glowColor }">
                            <svg viewBox="-2 -2 46 46" class="donut-svg w-100 h-100" role="group"
                                aria-label="Language share chart">
                                <circle class="donut-track" cx="21" cy="21" r="16.5" fill="none" stroke-width="8" />
                                <g transform="rotate(-90 21 21)">
                                    <circle v-for="seg in donutSegments" :key="seg.name" class="donut-seg" :class="{
                                        'is-active': activeLang === seg.name,
                                        'is-selected': selectedLang === seg.name,
                                        'is-dim': activeLang && activeLang !== seg.name
                                    }" cx="21" cy="21" r="16.5" fill="none" pathLength="100" :stroke="seg.color"
                                        :stroke-width="activeLang === seg.name ? 9.5 : 8"
                                        :stroke-dasharray="ready ? seg.dash + ' ' + (100 - seg.dash) : '0 100'"
                                        :stroke-dashoffset="-seg.offset"
                                        :style="{ transitionDelay: seg.idx * 90 + 'ms, 0ms, 0ms' }" tabindex="0"
                                        role="button" :aria-label="seg.name + ' ' + seg.pct + '%'"
                                        :aria-pressed="selectedLang === seg.name" @click="toggleLang(seg.name)"
                                        @keydown.enter.prevent="toggleLang(seg.name)"
                                        @keydown.space.prevent="toggleLang(seg.name)"
                                        @mouseenter="hoveredLang = seg.name" @mouseleave="hoveredLang = null"
                                        @focus="hoveredLang = seg.name" @blur="hoveredLang = null" />
                                </g>
                            </svg>

                            <!-- Theme-Aware Center -->
                            <div class="donut-hole rounded-circle d-flex flex-column align-items-center justify-content-center text-center position-absolute pe-none"
                                style="width: 88px; height: 88px;">
                                <span class="h4 fw-bold stat-value mb-0 font-monospace">{{ centerPct }}%</span>
                                <span class="text-muted-github small text-truncate px-1" style="max-width: 80px;">{{
                                    centerLabel }}</span>
                            </div>
                        </div>

                        <!-- Language Legend Grid -->
                        <div class="row g-2 flex-grow-1">
                            <div v-for="(item, idx) in langShareList" :key="item.name" class="legend-item col-6"
                                :class="{ 'is-in': ready }" :style="{ '--i': idx }">
                                <button type="button"
                                    class="legend-btn d-flex align-items-center justify-content-between w-100 text-start rounded-2"
                                    :class="{
                                        'is-selected': selectedLang === item.name,
                                        'is-dim': selectedLang && selectedLang !== item.name
                                    }" :style="{ '--c': item.color }" :aria-pressed="selectedLang === item.name"
                                    @click="toggleLang(item.name)" @mouseenter="hoveredLang = item.name"
                                    @mouseleave="hoveredLang = null">
                                    <span class="d-flex align-items-center gap-2 text-truncate">
                                        <span class="legend-dot rounded-circle d-inline-block flex-shrink-0"
                                            :style="{ backgroundColor: item.color, width: '10px', height: '10px' }"></span>
                                        <span class="stat-label small text-truncate">{{ item.name }}</span>
                                    </span>
                                    <span class="text-muted-github small ms-1 font-monospace">{{ item.percentage
                                        }}%</span>
                                </button>
                            </div>
                        </div>

                    </div>

                    <div v-else class="text-muted-github text-center my-auto py-4">
                        No language data detected.
                    </div>

                    <p v-if="langShareList.length > 0 && !selectedLang" class="text-muted-github small mt-4 mb-0">
                        Click a language to filter your repositories.
                    </p>

                </div>
            </div>

            <!-- Repos by Primary Language Card -->
            <div class="col-lg-6">
                <div v-spotlight class="card panel p-4 h-100 rounded-3 shadow-sm">
                    <h2 class="h5 fw-bold section-title mb-4">Repos by primary language</h2>

                    <div v-if="reposByLangList.length > 0" class="d-flex flex-column gap-2">
                        <button v-for="(lang, idx) in reposByLangList" :key="lang.name" type="button"
                            class="bar-row d-flex align-items-center gap-3 w-100 text-start rounded-2" :class="{
                                'is-selected': selectedLang === lang.name,
                                'is-dim': selectedLang && selectedLang !== lang.name
                            }" :style="{ '--c': lang.color }" :aria-pressed="selectedLang === lang.name"
                            @click="toggleLang(lang.name)" @mouseenter="hoveredLang = lang.name"
                            @mouseleave="hoveredLang = null">
                            <span class="stat-label small flex-shrink-0 text-truncate" style="width: 100px;">{{
                                lang.name }}</span>

                            <!-- Progress Bar Track (Theme-aware) -->
                            <div class="progress flex-grow-1 rounded-pill progress-track" style="height: 12px;">
                                <div class="progress-bar bar-fill rounded-pill" role="progressbar" :style="{
                                    width: ready ? lang.barWidth + '%' : '0%',
                                    backgroundColor: lang.color,
                                    transitionDelay: idx * 90 + 'ms'
                                }"></div>
                            </div>

                            <span class="text-muted-github small flex-shrink-0 text-end font-monospace"
                                style="width: 30px;">
                                {{ lang.count }}
                            </span>
                        </button>
                    </div>

                    <div v-else class="text-muted-github text-center my-auto py-4">
                        No repository language data detected.
                    </div>

                </div>
            </div>

        </div>

    </div>
</template>

<style scoped>
.stat-value,
.stat-label,
.section-title {
    color: var(--app-text);
    transition: color 0.2s ease;
}

/* --- Cursor spotlight (shared by stat cards and panels) ------------------ */
.stat-card,
.panel {
    position: relative;
    overflow: hidden;
}

.stat-card::before,
.panel::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
    background: radial-gradient(260px circle at var(--mx, 50%) var(--my, 50%),
            color-mix(in srgb, var(--accent, #58a6ff) 20%, transparent),
            transparent 70%);
}

.stat-card:hover::before,
.panel:hover::before {
    opacity: 1;
}

.stat-card>*,
.panel>* {
    position: relative;
}

/* --- Stat cards ----------------------------------------------------------- */
.stat-card {
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

.stat-card:hover,
.stat-card.is-focused {
    border-color: color-mix(in srgb, var(--accent) 55%, var(--card-border));
    box-shadow: 0 10px 30px -12px color-mix(in srgb, var(--accent) 45%, transparent) !important;
}

/* Accent line that draws itself along the top edge */
.stat-card::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 2px;
    width: 100%;
    background: linear-gradient(90deg, var(--accent), transparent);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
    transition-delay: calc(var(--i) * 110ms + 300ms);
}

.stat-card.is-in::after {
    transform: scaleX(1);
}

.lang-dot {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: var(--accent);
    box-shadow: 0 0 12px var(--accent);
    transition: background-color 0.4s ease, box-shadow 0.4s ease;
}

/* --- Focus chip ------------------------------------------------------------ */
.focus-chip {
    background-color: color-mix(in srgb, var(--c) 14%, var(--card-bg));
    border: 1px solid color-mix(in srgb, var(--c) 55%, var(--card-border));
}

.chip-dot {
    width: 9px;
    height: 9px;
    background-color: var(--c);
    box-shadow: 0 0 8px var(--c);
}

.chip-btn {
    color: var(--app-text);
    font-size: 0.75rem;
    border: 0;
    background-color: color-mix(in srgb, var(--c) 22%, transparent);
}

.chip-btn:hover {
    background-color: color-mix(in srgb, var(--c) 40%, transparent);
    color: var(--app-text);
}

.chip-close {
    width: 24px;
    height: 24px;
    line-height: 1;
    font-size: 0.7rem;
    color: var(--app-text);
    border: 0;
}

.chip-close:hover {
    background-color: color-mix(in srgb, var(--c) 30%, transparent);
    color: var(--app-text);
}

.chip-enter-active,
.chip-leave-active {
    transition: opacity 0.25s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.chip-enter-from,
.chip-leave-to {
    opacity: 0;
    transform: scale(0.85) translateY(-4px);
}

/* --- Donut ----------------------------------------------------------------- */
.donut-svg {
    overflow: visible;
    filter: drop-shadow(0 0 10px color-mix(in srgb, var(--glow) 35%, transparent));
    transition: filter 0.4s ease;
}

.donut-track {
    stroke: var(--card-border);
    opacity: 0.5;
}

.donut-seg {
    cursor: pointer;
    outline: none;
    transition: stroke-dasharray 1.1s cubic-bezier(0.22, 1, 0.36, 1),
        stroke-width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
        opacity 0.3s ease;
}

.donut-seg.is-dim {
    opacity: 0.22;
}

.donut-seg:focus-visible {
    stroke-opacity: 0.8;
}

.donut-hole {
    background-color: var(--card-bg);
    transition: background-color 0.2s ease;
}

/* --- Legend ---------------------------------------------------------------- */
.legend-item {
    opacity: 0;
    translate: -8px 0;
    transition: opacity 0.5s ease, translate 0.5s ease;
    transition-delay: calc(var(--i) * 60ms + 500ms);
}

.legend-item.is-in {
    opacity: 1;
    translate: 0 0;
}

/* Shared look for every clickable language row (legend + bars) */
.legend-btn,
.bar-row {
    background: transparent;
    border: 1px solid transparent;
    padding: 0.3rem 0.5rem;
    color: inherit;
    cursor: pointer;
    transition: background-color 0.25s ease, border-color 0.25s ease, opacity 0.25s ease;
}

.legend-btn:hover,
.bar-row:hover {
    background-color: color-mix(in srgb, var(--c) 10%, transparent);
}

.legend-btn:focus-visible,
.bar-row:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4);
}

.legend-btn.is-selected,
.bar-row.is-selected {
    background-color: color-mix(in srgb, var(--c) 16%, transparent);
    border-color: color-mix(in srgb, var(--c) 60%, transparent);
}

.legend-btn.is-dim,
.bar-row.is-dim {
    opacity: 0.4;
}

.legend-btn.is-dim:hover,
.bar-row.is-dim:hover {
    opacity: 0.85;
}

.legend-dot {
    transition: box-shadow 0.25s ease, transform 0.25s ease;
}

.legend-btn:hover .legend-dot,
.legend-btn.is-selected .legend-dot {
    transform: scale(1.5);
    box-shadow: 0 0 10px var(--c);
}

/* --- Bars ------------------------------------------------------------------ */
.progress-track {
    background-color: var(--card-border) !important;
    transition: background-color 0.2s ease;
}

.bar-fill {
    position: relative;
    overflow: hidden;
    transition: width 1.1s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease;
}

.bar-row.is-selected .bar-fill {
    box-shadow: 0 0 12px var(--c);
}

/* Soft sheen that sweeps across once the bar has grown */
.bar-fill::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(100deg, transparent 30%, rgba(255, 255, 255, 0.35) 50%, transparent 70%);
    transform: translateX(-100%);
    animation: sheen 3.6s ease-in-out 1.4s infinite;
}

@keyframes sheen {

    0%,
    60% {
        transform: translateX(-100%);
    }

    100% {
        transform: translateX(100%);
    }
}

@media (prefers-reduced-motion: reduce) {

    .stat-card,
    .stat-card::after,
    .legend-item,
    .donut-seg,
    .bar-fill,
    .chip-enter-active,
    .chip-leave-active {
        transition: none !important;
    }

    .bar-fill::after {
        animation: none !important;
    }

    .stat-card,
    .legend-item {
        opacity: 1;
        translate: 0 0;
    }
}
</style>