<script setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { ACCENT, hexAlpha, tipRow, useChartTheme } from '@/utils/charts'

const props = defineProps({
    bands: { type: Array, default: () => [] }, // posted salary bands, USD $k: [{ lo, hi }]
    stats: { type: Object, default: null } // { p25, p75, medianLo, medianHi, ... } in $k
})

const t = useChartTheme()

// one dot per band at its midpoint; a stable jitter spreads overlapping dots vertically
const dots = computed(() =>
    props.bands.map((b, i) => [(b.lo + b.hi) / 2, ((i * 37) % 100) / 100, b.lo, b.hi])
)

const option = computed(() => {
    const th = t.value
    const s = props.stats
    const median = s ? (s.medianLo + s.medianHi) / 2 : null
    return {
        animation: th.animation,
        grid: { left: 8, right: 14, top: 22, bottom: 4, containLabel: true },
        tooltip: {
            ...th.tooltip,
            trigger: 'item',
            formatter: (p) => tipRow('Posted band', `$${p.data[2]}k – $${p.data[3]}k`) +
                tipRow('Midpoint', `$${Math.round(p.data[0])}k`)
        },
        xAxis: {
            type: 'value',
            scale: true,
            splitNumber: 4,
            axisLabel: { ...th.axisLabel, formatter: '${value}k' },
            axisLine: { show: false },
            splitLine: th.splitLine
        },
        yAxis: { type: 'value', min: -0.15, max: 1.15, show: false },
        series: [{
            type: 'scatter',
            data: dots.value,
            symbolSize: 10,
            itemStyle: {
                color: hexAlpha(ACCENT, 0.55),
                borderColor: ACCENT,
                borderWidth: 1
            },
            emphasis: {
                scale: 1.5,
                itemStyle: { color: ACCENT, shadowBlur: 12, shadowColor: ACCENT }
            },
            // middle 50% shaded, median marked
            markArea: s && {
                silent: true,
                itemStyle: { color: hexAlpha(ACCENT, 0.1) },
                data: [[{ xAxis: s.p25 }, { xAxis: s.p75 }]]
            },
            markLine: median != null && {
                silent: true,
                symbol: 'none',
                lineStyle: { color: '#3fb950', width: 2, type: 'solid' },
                label: { color: '#3fb950', fontSize: 10, formatter: `median $${Math.round(median)}k` },
                data: [{ xAxis: median }]
            }
        }]
    }
})
</script>

<template>
    <div>
        <VChart class="salary-strip w-100" :option="option" autoresize aria-label="Salary bands, one dot per post" />
        <p v-if="stats" class="key small text-muted-github mb-0 d-flex flex-wrap gap-3">
            <span><i class="swatch band d-inline-block"></i>Typical range (middle 50%)</span>
            <span><i class="swatch median d-inline-block"></i>Median</span>
            <span><i class="swatch dot d-inline-block rounded-circle"></i>One posted band</span>
        </p>
    </div>
</template>

<style scoped>
.salary-strip {
    height: var(--jobs-chart-h, 200px);
}

.key {
    font-size: 0.8rem;
}

.swatch {
    width: 10px;
    height: 10px;
    margin-right: 5px;
    vertical-align: -1px;
}

.swatch.band {
    border-radius: 2px;
    background: rgba(88, 166, 255, 0.25);
}

.swatch.median {
    width: 3px;
    background: #3fb950;
}

.swatch.dot {
    background: rgba(88, 166, 255, 0.55);
    border: 1px solid #58a6ff;
}
</style>
