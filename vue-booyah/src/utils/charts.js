// Shared ECharts setup: tree-shaken registration plus theme-aware styling, so every chart looks alike.
import { computed } from 'vue'
import { use, graphic } from 'echarts/core'
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, MarkAreaComponent, MarkLineComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useTheme } from '@/composables/useTheme'

use([BarChart, LineChart, PieChart, ScatterChart, GridComponent, TooltipComponent, MarkAreaComponent,
    MarkLineComponent, CanvasRenderer])

export const ACCENT = '#58a6ff'
export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const PALETTES = {
    dark: {
        text: '#8b949e',
        strong: '#e6edf3',
        grid: 'rgba(255, 255, 255, 0.07)',
        tipBg: 'rgba(22, 27, 34, 0.9)',
        tipBorder: 'rgba(255, 255, 255, 0.1)',
        surface: '#0d1117'
    },
    light: {
        text: '#57606a',
        strong: '#1f2328',
        grid: 'rgba(31, 35, 40, 0.08)',
        tipBg: 'rgba(255, 255, 255, 0.94)',
        tipBorder: '#d0d7de',
        surface: '#ffffff'
    }
}

// Vertical fade from a colour to transparent, for area and column fills
export function fade(hex, top = 0.9, bottom = 0.05) {
    return new graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: hexAlpha(hex, top) },
        { offset: 1, color: hexAlpha(hex, bottom) }
    ])
}

export function hexAlpha(hex, a) {
    const n = parseInt(hex.slice(1), 16)
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

// Colours and building blocks that follow the app's light/dark theme
export function useChartTheme() {
    const { theme } = useTheme()
    return computed(() => {
        const c = PALETTES[theme.value] ?? PALETTES.dark
        return {
            ...c,
            animation: !reduceMotion,
            tooltip: {
                backgroundColor: c.tipBg,
                borderColor: c.tipBorder,
                borderWidth: 1,
                padding: [8, 12],
                textStyle: { color: c.strong, fontSize: 13 },
                extraCssText: 'border-radius: 10px; backdrop-filter: blur(8px); box-shadow: 0 10px 30px -12px rgba(0,0,0,0.5);'
            },
            axisLabel: { color: c.text, fontSize: 12 },
            splitLine: { lineStyle: { color: c.grid, type: 'dashed' } }
        }
    })
}

// Tooltip row: muted label + monospace value
export const tipRow = (label, value) =>
    `<div style="display:flex;justify-content:space-between;gap:16px"><span style="opacity:.7">${label}</span>` +
    `<span style="font-family:ui-monospace,monospace;font-weight:600">${value}</span></div>`
