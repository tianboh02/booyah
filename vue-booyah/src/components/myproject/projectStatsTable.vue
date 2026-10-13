<script setup>
import { computed } from 'vue'
import { getLangColor } from '@/utils/langColors'

const props = defineProps({
    repoList: {
        type: Array,
        default: () => []
    }
})

const hasData = computed(() => props.repoList && props.repoList.length > 0)

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

    const total = props.repoList.length
    const privates = props.repoList.filter(r => r.private).length
    const publics = total - privates
    const stars = props.repoList.reduce((acc, r) => acc + (r.stargazers_count || 0), 0)

    const langCounts = {}
    props.repoList.forEach(r => {
        const lang = r.language || 'No language'
        langCounts[lang] = (langCounts[lang] || 0) + 1
    })

    const sortedLangs = Object.entries(langCounts).sort((a, b) => b[1] - a[1])

    // Pick top actual language for the headline stat (fallback to 'No language' if all are empty)
    const topActual = sortedLangs.find(([name]) => name !== 'No language') || sortedLangs[0]
    const topLang = topActual ? topActual[0] : 'None'
    const topLangCount = topActual ? topActual[1] : 0
    const topLangPct = total > 0 ? Math.round((topLangCount / total) * 100) : 0

    return {
        totalRepos: total,
        publicRepos: publics,
        privateRepos: privates,
        mostUsedLang: topLang,
        mostUsedPct: topLangPct,
        totalStars: stars,
        sortedLangs
    }
})

// Language share breakdown for legend and pie chart (100% total)
const langShareList = computed(() => {
    if (!hasData.value) return []

    const total = props.repoList.length
    return stats.value.sortedLangs.map(([name, count]) => ({
        name,
        percentage: Math.round((count / total) * 100),
        color: getLangColor(name)
    }))
})

// Exact CSS Conic Gradient string for Donut Chart (fills 100%)
const donutGradient = computed(() => {
    if (!hasData.value || langShareList.value.length === 0) return 'none'

    let currentPct = 0
    const stops = langShareList.value.map(item => {
        const start = currentPct
        currentPct += item.percentage
        return `${item.color} ${start}% ${currentPct}%`
    })

    return `conic-gradient(${stops.join(', ')})`
})

// Repos by primary language bar chart
const reposByLangList = computed(() => {
    const sorted = stats.value.sortedLangs
    if (sorted.length === 0) return []

    const maxCount = Math.max(...sorted.map(([_, count]) => count), 1)

    return sorted.map(([name, count]) => ({
        name,
        count,
        barWidth: Math.max(Math.round((count / maxCount) * 100), 8)
    }))
})
</script>

<template>
    <div class="graph-body container my-4">

        <!-- Top Stats Cards Grid -->
        <div v-if="hasData" class="row row-cols-1 row-cols-md-3 g-3 mb-4">

            <!-- Number of Repositories Card -->
            <div class="col">
                <div class="card p-3 h-100 rounded-3 shadow-sm text-white">
                    <span class="h3 fw-bold text-white mb-1 font-monospace">{{ stats.totalRepos }}</span>
                    <span class="text-white fw-semibold small">Repositories</span>
                    <span class="text-muted-github small">{{ stats.publicRepos }} public · {{ stats.privateRepos }}
                        private</span>
                </div>
            </div>

            <!-- Most-used Language Card -->
            <div class="col">
                <div class="card p-3 h-100 rounded-3 shadow-sm text-white">
                    <span class="h3 fw-bold text-white mb-1 font-monospace text-truncate d-block">{{ stats.mostUsedLang
                    }}</span>
                    <span class="text-white fw-semibold small">Most-used language</span>
                    <span class="text-muted-github small"><span class="font-monospace">{{ stats.mostUsedPct }}%</span>
                        of your code</span>
                </div>
            </div>

            <!-- Total Stars Card -->
            <div class="col">
                <div class="card p-3 h-100 rounded-3 shadow-sm text-white">
                    <span class="h3 fw-bold text-white mb-1 font-monospace">{{ stats.totalStars }}</span>
                    <span class="text-white fw-semibold small">Total stars</span>
                    <span class="text-muted-github small">Across all repositories</span>
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
                <div class="card p-4 h-100 rounded-3 shadow-sm">
                    <h2 class="h5 fw-bold text-white mb-1">Language share</h2>
                    <p class="text-muted-github small mb-4">
                        *This feature is currently under development for further implementation with ECharts.
                    </p>

                    <div v-if="langShareList.length > 0"
                        class="d-flex align-items-center gap-4 flex-wrap flex-sm-nowrap my-auto">
                        <!-- Donut Chart -->
                        <div class="position-relative d-flex align-items-center justify-content-center flex-shrink-0 mx-auto mx-sm-0"
                            style="width: 140px; height: 140px;">
                            <div class="rounded-circle w-100 h-100" :style="{ background: donutGradient }"></div>
                            <div class="rounded-circle d-flex flex-column align-items-center justify-content-center text-center"
                                style="width: 86px; height: 86px; background-color: #161b22; position: absolute;">
                                <span class="h4 fw-bold text-white mb-0 font-monospace">{{ stats.mostUsedPct }}%</span>
                                <span class="text-muted-github small text-truncate px-1" style="max-width: 80px;">{{
                                    stats.mostUsedLang }}</span>
                            </div>
                        </div>

                        <!-- Language Legend Grid -->
                        <div class="row g-2 flex-grow-1">
                            <div v-for="item in langShareList" :key="item.name"
                                class="col-6 d-flex align-items-center justify-content-between pe-2">
                                <div class="d-flex align-items-center gap-2 text-truncate">
                                    <span class="rounded-circle d-inline-block flex-shrink-0"
                                        :style="{ backgroundColor: item.color, width: '10px', height: '10px' }"></span>
                                    <span class="text-white small text-truncate">{{ item.name }}</span>
                                </div>
                                <span class="text-muted-github small ms-1 font-monospace">{{ item.percentage }}%</span>
                            </div>
                        </div>
                    </div>

                    <div v-else class="text-muted-github text-center my-auto py-4">
                        No language data detected.
                    </div>

                </div>
            </div>

            <!-- Repos by Primary Language Card -->
            <div class="col-lg-6">
                <div class="card p-4 h-100 rounded-3 shadow-sm">
                    <h2 class="h5 fw-bold text-white mb-4">Repos by primary language</h2>

                    <div v-if="reposByLangList.length > 0" class="d-flex flex-column gap-3">
                        <div v-for="lang in reposByLangList" :key="lang.name" class="d-flex align-items-center gap-3">
                            <span class="text-white small flex-shrink-0 text-truncate" style="width: 100px;">{{
                                lang.name }}</span>
                            <div class="progress flex-grow-1 rounded-pill"
                                style="height: 12px; background-color: #0d1117;">
                                <div class="progress-bar rounded-pill" role="progressbar"
                                    :style="{ width: lang.barWidth + '%', backgroundColor: '#80a5fe' }"></div>
                            </div>
                            <span class="text-muted-github small flex-shrink-0 text-end font-monospace"
                                style="width: 30px;">{{ lang.count }}</span>
                        </div>
                    </div>

                    <div v-else class="text-muted-github text-center my-auto py-4">
                        No repository language data detected.
                    </div>

                </div>
            </div>

        </div>

    </div>
</template>