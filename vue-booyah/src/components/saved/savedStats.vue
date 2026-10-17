<script setup>
import { computed, ref, watch } from 'vue'
import { getLangColor } from '@/utils/langColors'
import { categoryColor, itemCategory, itemLang } from '@/utils/savedLibrary'
import { vSpotlight, vTilt, useCountUp } from '@/utils/motion'
import SavedBarPanel from '@/components/saved/savedBarPanel.vue'

const props = defineProps({
    // every saved project (the charts always show all of them)
    items: { type: Array, default: () => [] },
    // the projects the top cards describe: everything, or just the focused category / language
    scoped: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false }
})

// Shared with the toolbar and the list through SavedView
const selectedCategory = defineModel('selectedCategory', { type: String, default: null })
const selectedLang = defineModel('selectedLang', { type: String, default: null })

const toggleCategory = (name) => (selectedCategory.value = selectedCategory.value === name ? null : name)
const toggleLang = (name) => (selectedLang.value = selectedLang.value === name ? null : name)

function tally(list, keyFn) {
    const map = {}
    list.forEach(i => {
        const k = keyFn(i)
        map[k] = (map[k] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
}

const categoryRows = computed(() =>
    tally(props.items, itemCategory).map(([name, count]) => ({ name, count, color: categoryColor(name) }))
)

// language comes from GitHub, so only count the projects whose details have arrived
const langRows = computed(() =>
    tally(props.items.filter(i => i.status === 'ok'), itemLang).map(([name, count]) => ({
        name,
        count,
        color: getLangColor(name)
    }))
)

const detailsLoading = computed(() => props.items.some(i => i.status === 'loading'))

// --- Top cards --------------------------------------------------------------
const savedCount = computed(() => props.scoped.length)
const categoryCount = computed(() => categoryRows.value.length)

const headline = computed(() => {
    if (selectedCategory.value) {
        const row = categoryRows.value.find(r => r.name === selectedCategory.value)
        return { name: selectedCategory.value, count: row ? row.count : 0 }
    }
    const top = tally(props.scoped, itemCategory)[0]
    return top ? { name: top[0], count: top[1] } : { name: 'None', count: 0 }
})
const headlineColor = computed(() => categoryColor(headline.value.name))

const totalStars = computed(() => props.scoped.reduce((acc, i) => acc + (i.stars || 0), 0))
const starsLoading = computed(() => props.scoped.some(i => i.status === 'loading'))

const countUp = useCountUp(() => savedCount.value)
const headlineUp = useCountUp(() => headline.value.count)
const starsUp = useCountUp(() => totalStars.value)

const focused = computed(() => !!(selectedCategory.value || selectedLang.value))
const accent = computed(() => {
    if (selectedCategory.value) return categoryColor(selectedCategory.value)
    if (selectedLang.value) return getLangColor(selectedLang.value)
    return '#58a6ff'
})

// cards slide in a couple of frames after they are on screen
const ready = ref(false)
watch(
    () => props.loading,
    (isLoading) => {
        ready.value = false
        if (!isLoading) requestAnimationFrame(() => requestAnimationFrame(() => (ready.value = true)))
    },
    { immediate: true }
)
</script>

<template>
    <div class="stats-body my-4">

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

        <template v-else>
            <div class="row row-cols-1 row-cols-md-3 g-3 mb-4">

                <!-- Saved count -->
                <div class="col">
                    <div v-tilt="5" v-spotlight class="card stat-card p-3 h-100 rounded-3 shadow-sm"
                        :class="{ 'is-in': ready, 'is-focused': focused }"
                        :style="{ '--i': 0, '--accent': accent }">
                        <span class="h3 fw-bold stat-value mb-1 font-monospace">{{ countUp }}</span>
                        <span class="stat-label fw-semibold small">{{ focused ? 'Matching projects' : 'Saved projects' }}</span>
                        <span class="text-muted-github small">
                            across {{ categoryCount }} {{ categoryCount === 1 ? 'category' : 'categories' }}
                        </span>
                    </div>
                </div>

                <!-- Top / selected category -->
                <div class="col">
                    <div v-tilt="5" v-spotlight class="card stat-card p-3 h-100 rounded-3 shadow-sm"
                        :class="{ 'is-in': ready, 'is-focused': selectedCategory }"
                        :style="{ '--i': 1, '--accent': headlineColor }">
                        <span class="h3 fw-bold stat-value mb-1 font-monospace text-truncate d-block">
                            <span class="accent-dot me-2"></span>{{ headline.name }}
                        </span>
                        <span class="stat-label fw-semibold small">{{ selectedCategory ? 'Selected category' : 'Top category' }}</span>
                        <span class="text-muted-github small">
                            <span class="font-monospace">{{ headlineUp }}</span> saved
                        </span>
                    </div>
                </div>

                <!-- Stars -->
                <div class="col">
                    <div v-tilt="5" v-spotlight class="card stat-card p-3 h-100 rounded-3 shadow-sm"
                        :class="{ 'is-in': ready, 'is-focused': focused }"
                        :style="{ '--i': 2, '--accent': focused ? accent : '#e3b341' }">
                        <span class="h3 fw-bold stat-value mb-1 font-monospace">{{ starsUp.toLocaleString('en-US') }}</span>
                        <span class="stat-label fw-semibold small">Combined stars</span>
                        <span class="text-muted-github small">
                            {{ starsLoading ? 'Still fetching from GitHub…' : 'Across these repositories' }}
                        </span>
                    </div>
                </div>

            </div>

            <!-- Click a bar to filter the list below -->
            <div class="row g-4">
                <div class="col-lg-6">
                    <SavedBarPanel title="By category" hint="Click a category to filter your saved projects."
                        :rows="categoryRows" :selected="selectedCategory" empty-text="No categories yet."
                        @toggle="toggleCategory" />
                </div>
                <div class="col-lg-6">
                    <SavedBarPanel title="By language"
                        :hint="detailsLoading ? 'Fetching languages from GitHub…' : 'Click a language to filter your saved projects.'"
                        :rows="langRows" :selected="selectedLang" :loading="detailsLoading"
                        empty-text="No language data available." @toggle="toggleLang" />
                </div>
            </div>
        </template>
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
    isolation: isolate;
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

.stat-card::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
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
    transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1), background 0.4s ease;
    transition-delay: calc(var(--i) * 110ms + 300ms);
}

.stat-card.is-in::after {
    transform: scaleX(1);
}

.accent-dot {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: var(--accent);
    box-shadow: 0 0 12px var(--accent);
    transition: background-color 0.4s ease, box-shadow 0.4s ease;
}

@media (prefers-reduced-motion: reduce) {

    .stat-card,
    .stat-card::after {
        transition: none !important;
    }

    .stat-card {
        opacity: 1;
        translate: 0 0;
    }
}
</style>
