<script setup>
import { computed, ref } from 'vue'
import VChart from 'vue-echarts'
import { useChartTheme } from '@/utils/charts'

const props = defineProps({
    counts: { type: Object, default: () => ({}) }, // { remote, hybrid, onsite, mixed, unspecified }
    posts: { type: Number, default: 0 }
})

const MODES = [
    { key: 'remote', label: 'Remote', color: '#58a6ff' },
    { key: 'hybrid', label: 'Hybrid', color: '#a371f7' },
    { key: 'onsite', label: 'Onsite', color: '#3fb950' },
    { key: 'mixed', label: 'Mixed', color: '#e3b341' },
    { key: 'unspecified', label: 'Unspecified', color: '#6e7681' }
]

const t = useChartTheme()
const pct = (n) => (props.posts ? Math.round((100 * n) / props.posts) : 0)

// empty modes are left out so the ring only shows what's there
const slices = computed(() =>
    MODES.map((m) => ({ ...m, value: props.counts[m.key] ?? 0 })).filter((m) => m.value > 0)
)

// centre label follows the hovered slice, defaulting to the biggest one
const hovered = ref(null)
const centre = computed(() => hovered.value ?? [...slices.value].sort((a, b) => b.value - a.value)[0])

const option = computed(() => ({
    animation: t.value.animation,
    tooltip: { show: false },
    series: [{
        type: 'pie',
        radius: ['62%', '88%'],
        padAngle: 2,
        itemStyle: { borderRadius: 5 },
        label: { show: false },
        emphasis: { scale: true, scaleSize: 6, itemStyle: { shadowBlur: 14, shadowColor: 'rgba(0,0,0,0.35)' } },
        data: slices.value.map((m) => ({ name: m.label, value: m.value, itemStyle: { color: m.color } }))
    }]
}))

function onOver(e) {
    hovered.value = slices.value.find((m) => m.label === e.name) ?? null
}
</script>

<template>
    <div class="d-flex align-items-center gap-3">
        <div class="donut position-relative flex-shrink-0">
            <VChart class="w-100 h-100" :option="option" autoresize aria-label="Work mode split" @mouseover="onOver"
                @mouseout="hovered = null" />
            <div v-if="centre" class="centre position-absolute top-50 start-50 translate-middle text-center pe-none">
                <div class="centre-value font-monospace fw-bold">{{ pct(centre.value) }}%</div>
                <div class="centre-label">{{ centre.label }}</div>
            </div>
        </div>

        <ul class="legend list-unstyled mb-0 flex-grow-1">
            <li v-for="m in slices" :key="m.key" class="legend-row d-flex align-items-center gap-2 px-2 py-1 rounded-2"
                :class="{ 'is-on': centre?.key === m.key }" @mouseenter="hovered = m" @mouseleave="hovered = null">
                <i class="dot rounded-circle flex-shrink-0" :style="{ '--c': m.color }"></i>
                <span class="flex-grow-1 item-label">{{ m.label }}</span>
                <span class="font-monospace text-muted-github">{{ pct(m.value) }}%</span>
            </li>
        </ul>
    </div>
</template>

<style scoped>
/* sized to the shared chart height so it lines up with the other dialog charts */
.donut {
    width: min(var(--jobs-chart-h, 200px), 45%);
    aspect-ratio: 1;
}

.legend {
    font-size: 0.9rem;
}

.centre-value {
    font-size: 1.5rem;
    color: var(--app-text);
}

.centre-label {
    font-size: 0.85rem;
    color: var(--text-muted-github);
}

.legend-row {
    cursor: default;
    transition: background-color 0.2s ease;
}

.legend-row.is-on {
    background-color: var(--badge-bg);
}

.item-label {
    color: var(--app-text);
}

.dot {
    width: 9px;
    height: 9px;
    background: var(--c);
    box-shadow: 0 0 8px var(--c);
}
</style>
