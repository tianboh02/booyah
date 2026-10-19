<script setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { ACCENT, fade, tipRow, useChartTheme } from '@/utils/charts'

const props = defineProps({
    points: { type: Array, default: () => [] }, // [{ month, count }]
    view: { type: String, default: 'bar' } // 'bar' | 'line'
})

const t = useChartTheme()

const option = computed(() => {
    const th = t.value
    const isBar = props.view === 'bar'
    return {
        animation: th.animation,
        animationDuration: 700,
        grid: { left: 4, right: 8, top: 16, bottom: 4, containLabel: true },
        tooltip: {
            ...th.tooltip,
            trigger: 'axis',
            axisPointer: isBar
                ? { type: 'shadow', shadowStyle: { color: th.grid } }
                : { type: 'line', lineStyle: { color: ACCENT, type: 'dashed' } },
            formatter: ([p]) => `<div style="font-weight:600;margin-bottom:4px">${p.name}</div>` +
                tipRow('Job posts', p.value.toLocaleString())
        },
        xAxis: {
            type: 'category',
            data: props.points.map((p) => p.month),
            boundaryGap: isBar,
            axisLine: { lineStyle: { color: th.grid } },
            axisTick: { show: false },
            axisLabel: th.axisLabel
        },
        yAxis: {
            type: 'value',
            splitNumber: 3,
            axisLabel: th.axisLabel,
            splitLine: th.splitLine
        },
        series: [
            isBar
                ? {
                    type: 'bar',
                    data: props.points.map((p) => p.count),
                    barMaxWidth: 34,
                    itemStyle: { color: fade(ACCENT, 0.95, 0.25), borderRadius: [6, 6, 2, 2] },
                    emphasis: {
                        itemStyle: { color: ACCENT, shadowBlur: 16, shadowColor: 'rgba(88,166,255,0.6)' }
                    }
                }
                : {
                    type: 'line',
                    data: props.points.map((p) => p.count),
                    smooth: 0.35,
                    symbol: 'circle',
                    symbolSize: 7,
                    showSymbol: false,
                    lineStyle: { width: 2.5, color: ACCENT, shadowBlur: 10, shadowColor: 'rgba(88,166,255,0.5)' },
                    itemStyle: { color: ACCENT, borderColor: th.surface, borderWidth: 2 },
                    areaStyle: { color: fade(ACCENT, 0.35, 0) },
                    emphasis: { focus: 'series' }
                }
        ]
    }
})
</script>

<template>
    <VChart class="month-chart" :option="option" autoresize aria-label="Job posts per month" />
</template>

<style scoped>
.month-chart {
    /* grows to the card's height when the parent is a flex column */
    min-height: var(--jobs-chart-h, 240px);
    width: 100%;
}
</style>
