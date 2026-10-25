<script setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { fade, tipRow, useChartTheme } from '@/utils/charts'

const props = defineProps({
    points: { type: Array, default: () => [] }, // [{ month, share, count, posts } | { month, missing }]
    metric: { type: String, default: 'share' }, // 'share' | 'count'
    color: { type: String, default: '#58a6ff' }
})

const t = useChartTheme()

// a missing month is null, so the line breaks there instead of dropping to 0
const option = computed(() => {
    const th = t.value
    const isShare = props.metric === 'share'
    return {
        animation: th.animation,
        grid: { left: 4, right: 10, top: 14, bottom: 4, containLabel: true },
        tooltip: {
            ...th.tooltip,
            trigger: 'axis',
            axisPointer: { type: 'line', lineStyle: { color: props.color, type: 'dashed' } },
            formatter: ([p]) => {
                const pt = props.points[p.dataIndex]
                const head = `<div style="font-weight:600;margin-bottom:4px">${pt.month}</div>`
                if (pt.missing) return head + '<span style="opacity:.7">Month failed to load</span>'
                return head + tipRow('Share of posts', `${pt.share}%`) + tipRow('Role posts', pt.count) +
                    tipRow('All posts', pt.posts.toLocaleString())
            }
        },
        xAxis: {
            type: 'category',
            data: props.points.map((p) => p.month),
            boundaryGap: false,
            axisLine: { lineStyle: { color: th.grid } },
            axisTick: { show: false },
            axisLabel: th.axisLabel
        },
        yAxis: {
            type: 'value',
            splitNumber: 3,
            axisLabel: { ...th.axisLabel, formatter: isShare ? '{value}%' : '{value}' },
            splitLine: th.splitLine
        },
        series: [{
            type: 'line',
            data: props.points.map((p) => (p.missing ? null : isShare ? p.share : p.count)),
            connectNulls: false,
            smooth: 0.35,
            symbol: 'circle',
            symbolSize: 7,
            lineStyle: { width: 2.5, color: props.color, shadowBlur: 10, shadowColor: props.color },
            itemStyle: { color: props.color, borderColor: th.surface, borderWidth: 2 },
            areaStyle: { color: fade(props.color, 0.35, 0) },
            emphasis: { scale: 1.6 }
        }]
    }
})
</script>

<template>
    <VChart class="trend-chart w-100" :option="option" autoresize aria-label="Demand trend by month" />
</template>

<style scoped>
.trend-chart {
    /* grows to fill its card when the salary card beside it is taller */
    min-height: var(--jobs-chart-h, 200px);
}
</style>
