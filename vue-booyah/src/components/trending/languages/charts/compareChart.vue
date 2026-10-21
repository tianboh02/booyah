<!--
  src/components/trending/languages/charts/compareChart.vue

  What it does:  draws two packages on one D3 chart, on the same dates.
                   mode="downloads" → the real numbers (series.a / series.b, `downloads`)
                   mode="growth"    → each line starts at 100 (series.growthA / growthB, `index`),
                                      so 120 means 20% higher than at the start
                 The lines draw in when the period changes and slide to their new shape when the mode
                 changes. Hovering shows both values for that date.
  Receives:      props  series (buildComparison(...).series), mode ('downloads' | 'growth'),
                        names ([nameA, nameB]), colors ([colourA, colourB]),
                        dashedB (true when B's line should be dashed), period
  Gives back:    nothing (no emits).
  Used by:       compare/compareView.vue.

  How it works:  the same pattern as trendChart.vue: Vue creates the empty <svg>, D3 builds the
                 layers once (setup) and redraws them (render) when the data, mode or size changes.
-->
<script setup>
// ---------- Imports ----------
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import * as d3 from 'd3'
import { compact, num, itemLabel } from '@/utils/trending/helpers/format'
import { prefersReducedMotion } from '@/utils/trending/helpers/motion'

// ---------- Props ----------
const props = defineProps({
  series: { type: Object, required: true }, // buildComparison(...).series
  mode: { type: String, default: 'downloads' }, // 'downloads' | 'growth'
  names: { type: Array, required: true }, // [nameA, nameB]
  colors: { type: Array, required: true }, // [colourA, colourB]
  dashedB: { type: Boolean, default: false }, // B's line is dashed so the two stay apart
  period: { type: String, default: 'weekly' },
})

// ---------- State ----------
const root = ref(null) // the box around the chart (its size sets the chart's size)
const svgEl = ref(null) // the <svg> D3 draws into
const tip = reactive({ show: false, x: 0, y: 0, below: false, label: '', rows: [] }) // the hover box

// Settings
const margin = { top: 16, right: 16, bottom: 30, left: 52 } // room around the plot for the axes
const reduceMotion = prefersReducedMotion()
const ms = (time) => (reduceMotion ? 0 : time) // all animation times go through this

// D3 selections, scales and sizes (plain variables: D3 changes the SVG directly)
let svg, plot, gridG, yAxisG, xAxisG, baseLine, lineA, lineB, dotsG, focusG, overlay
let x, y
let points = [] // [{ date, label, a, b }] one per shared date/block
let innerW = 0
let innerH = 0
let observer = null

// ---------- Computed values ----------
// Which field holds the value to plot for the current mode
const valueKey = computed(() => (props.mode === 'growth' ? 'index' : 'downloads'))

// What screen readers announce for the chart
const ariaLabel = computed(
  () =>
    `${props.names[0]} and ${props.names[1]}, ${props.mode === 'growth' ? 'growth from a start of 100' : 'downloads'} per ${props.period === 'daily' ? 'day' : props.period === 'weekly' ? 'week' : '30 days'}`,
)

// ---------- Watchers ----------
// New period or new packages → draw in again; same dates with a new mode → slide
watch(
  () => [props.series, props.period],
  () => {
    prepare()
    render('enter')
  },
)
// Downloads ↔ Growth → the lines slide to their new shape
watch(
  () => props.mode,
  () => {
    prepare()
    render('morph')
  },
)
// New colours → redraw instantly
watch(
  () => props.colors.join(),
  () => {
    prepare()
    render('resize')
  },
)

// ---------- Functions: building the chart ----------

/** Builds the empty chart layers once, bottom to top, and listens for hovering. */
function setup() {
  svg = d3.select(svgEl.value)
  plot = svg.append('g')
  gridG = plot.append('g').attr('class', 'grid')
  yAxisG = plot.append('g').attr('class', 'axis')
  xAxisG = plot.append('g').attr('class', 'axis')
  baseLine = plot.append('line').attr('class', 'base')
  lineA = plot.append('path').attr('class', 'line line-a')
  lineB = plot.append('path').attr('class', 'line line-b')
  dotsG = plot.append('g').attr('class', 'dots')
  focusG = plot.append('g').attr('class', 'focus').style('display', 'none')
  focusG.append('line').attr('class', 'guide')
  focusG.append('circle').attr('class', 'focus-dot focus-a').attr('r', 4.5)
  focusG.append('circle').attr('class', 'focus-dot focus-b').attr('r', 4.5)
  overlay = plot.append('rect').attr('class', 'overlay')
  plot.on('pointermove', onHover).on('pointerleave', hideTip)
}

/** Measures the box and fits the SVG and the plot area to it. */
function measure() {
  const w = root.value.clientWidth
  const h = root.value.clientHeight
  innerW = Math.max(10, w - margin.left - margin.right)
  innerH = Math.max(10, h - margin.top - margin.bottom)
  svg.attr('width', w).attr('height', h)
  plot.attr('transform', `translate(${margin.left},${margin.top})`)
  overlay.attr('width', innerW).attr('height', innerH)
  xAxisG.attr('transform', `translate(0,${innerH})`)
}

/** Pairs A and B up on the same dates: one point per date/block with both values (a and b). */
function prepare() {
  const key = valueKey.value
  const listA = props.mode === 'growth' ? props.series.growthA : props.series.a
  const listB = props.mode === 'growth' ? props.series.growthB : props.series.b
  points = listA.map((p, i) => ({
    date: new Date((p.date || p.end) + 'T00:00:00Z'),
    label: itemLabel(p),
    a: p[key],
    b: listB[i] ? listB[i][key] : null,
  }))
}

// ---------- Functions: drawing ----------

/**
 * Draws (or redraws) both lines, the axes, the "100 = start" line and the dots.
 *   how = 'enter'  draw the lines in from left to right
 *         'morph'  slide to the new values (switching Downloads ↔ Growth)
 *         'resize' redraw instantly
 */
function render(how) {
  // skip charts already taken off the page (e.g. while the panel closes): D3 transitions throw there
  if (!points.length || !root.value || !root.value.isConnected) return
  hideTip()
  const growth = props.mode === 'growth'
  const values = points.flatMap((p) => [p.a, p.b]).filter((v) => v !== null)

  // x: date → pixels across. With a single point, widen the range by a day each side so it's centred.
  x = d3
    .scaleUtc()
    .domain(d3.extent(points, (p) => p.date))
    .range([0, innerW])
  if (points.length === 1)
    x.domain([d3.utcDay.offset(points[0].date, -1), d3.utcDay.offset(points[0].date, 1)])

  // y: value → pixels down ([innerH, 0] puts small values at the bottom).
  //   Growth: fit the lowest and highest values (always including 100, the start line) plus 12% padding.
  //   Downloads: start at 0 so the gap between the two packages isn't exaggerated.
  if (growth) {
    const [lo, hi] = d3.extent([...values, 100])
    const pad = Math.max(4, (hi - lo) * 0.12)
    y = d3
      .scaleLinear()
      .domain([lo - pad, hi + pad])
      .nice()
      .range([innerH, 0])
  } else {
    y = d3
      .scaleLinear()
      .domain([0, d3.max(values) * 1.12])
      .nice()
      .range([innerH, 0])
  }

  // One shared timing: 500 ms when switching Downloads ↔ Growth, instant otherwise
  const t = d3
    .transition()
    .duration(how === 'morph' ? ms(500) : 0)
    .ease(d3.easeCubicInOut)
  const fmt = growth ? (v) => Math.round(v) : compact

  gridG.transition(t).call(d3.axisLeft(y).ticks(4).tickSize(-innerW).tickFormat(''))
  yAxisG.transition(t).call(d3.axisLeft(y).ticks(4).tickSize(0).tickPadding(10).tickFormat(fmt))
  xAxisG.transition(t).call(
    d3
      .axisBottom(x)
      .ticks(Math.max(2, Math.min(points.length, Math.floor(innerW / 90))))
      .tickSize(0)
      .tickPadding(10)
      .tickFormat(d3.utcFormat('%-d %b')),
  )

  // the "100 = start" reference line in growth mode
  baseLine
    .transition(t)
    .attr('x1', 0)
    .attr('x2', innerW)
    .attr('y1', growth ? y(100) : innerH)
    .attr('y2', growth ? y(100) : innerH)
    .attr('opacity', growth ? 1 : 0)

  const lineOf = (key) =>
    d3
      .line()
      .defined((p) => p[key] !== null)
      .x((p) => x(p.date))
      .y((p) => y(p[key]))
      .curve(d3.curveMonotoneX)

  lineA.attr('stroke', props.colors[0])
  lineB.attr('stroke', props.colors[1]).attr('stroke-dasharray', props.dashedB ? '6 5' : null)

  for (const [path, key] of [
    [lineA, 'a'],
    [lineB, 'b'],
  ]) {
    path.interrupt()
    if (how === 'enter') {
      path.attr('d', lineOf(key)(points))
      const length = path.node().getTotalLength()
      const dash = props.dashedB && key === 'b'
      // dashed lines fade in instead (their dash pattern is already in use)
      if (dash) {
        path.attr('opacity', 0).transition().duration(ms(600)).attr('opacity', 1)
      } else {
        path
          .attr('opacity', 1)
          .attr('stroke-dasharray', `${length} ${length}`)
          .attr('stroke-dashoffset', length)
          .transition()
          .duration(ms(600))
          .ease(d3.easeCubicOut)
          .attr('stroke-dashoffset', 0)
          .on('end', () => path.attr('stroke-dasharray', null))
      }
    } else {
      // a draw-in cut short leaves its dash behind; clear it (B keeps its own dash pattern)
      if (!(props.dashedB && key === 'b')) path.attr('stroke-dasharray', null)
      path
        .attr('stroke-dashoffset', null)
        .attr('opacity', 1)
        .transition(t)
        .attr('d', lineOf(key)(points))
    }
  }

  // dots when there are only a few points (weekly, monthly)
  const showDots = points.length <= 20
  const dots = showDots
    ? points
        .flatMap((p, i) => [
          { id: `a${i}`, x: p.date, v: p.a, c: props.colors[0] },
          { id: `b${i}`, x: p.date, v: p.b, c: props.colors[1] },
        ])
        .filter((d) => d.v !== null)
    : []
  dotsG
    .selectAll('circle')
    .data(dots, (d) => d.id)
    .join(
      (enter) =>
        enter
          .append('circle')
          .attr('r', 3.5)
          .attr('cx', (d) => x(d.x))
          .attr('cy', (d) => y(d.v))
          .attr('stroke', (d) => d.c)
          .attr('opacity', 0)
          .call((e) => e.transition().delay(ms(350)).duration(ms(250)).attr('opacity', 1)),
      (update) =>
        update
          .attr('stroke', (d) => d.c)
          .call((u) =>
            u
              .transition(t)
              .attr('cx', (d) => x(d.x))
              .attr('cy', (d) => y(d.v)),
          ),
      (exit) => exit.remove(),
    )
}

// ---------- Functions: hover box ----------

/** Finds the date nearest the pointer (d3.bisector) and shows both packages' values for it. */
function onHover(event) {
  const [mx, my] = d3.pointer(event, plot.node())
  if (mx < 0 || mx > innerW || my < 0 || my > innerH) return hideTip()
  const i = d3.bisector((p) => p.date).center(points, x.invert(mx))
  const p = points[i]
  const px = x(p.date)
  const growth = props.mode === 'growth'

  focusG.style('display', null)
  focusG.select('.guide').attr('x1', px).attr('x2', px).attr('y1', 0).attr('y2', innerH)
  focusG
    .select('.focus-a')
    .attr('cx', px)
    .attr('cy', p.a === null ? -99 : y(p.a))
    .attr('stroke', props.colors[0])
  focusG
    .select('.focus-b')
    .attr('cx', px)
    .attr('cy', p.b === null ? -99 : y(p.b))
    .attr('stroke', props.colors[1])

  const describe = (v) => {
    if (v === null) return '–'
    if (!growth) return `${num(v)} downloads`
    const diff = v - 100
    return `${v.toFixed(1)} (${diff >= 0 ? '+' : '−'}${Math.abs(diff).toFixed(1)}%)`
  }
  const top = Math.min(p.a === null ? innerH : y(p.a), p.b === null ? innerH : y(p.b))
  const boxW = root.value.clientWidth
  tip.x = Math.min(Math.max(margin.left + px, 100), boxW - 100)
  tip.y = margin.top + top
  tip.below = top < 90
  tip.label = p.label
  tip.rows = [
    { name: props.names[0], color: props.colors[0], text: describe(p.a) },
    { name: props.names[1], color: props.colors[1], text: describe(p.b) },
  ]
  tip.show = true
}

/** Hides the hover box and the guide line. */
function hideTip() {
  tip.show = false
  if (focusG) focusG.style('display', 'none')
}

// ---------- Lifecycle ----------
// Draw on mount, refit when the box changes size, stop watching the size when removed
onMounted(() => {
  setup()
  measure()
  prepare()
  render('enter')
  let lastSize = `${root.value.clientWidth}x${root.value.clientHeight}`
  observer = new ResizeObserver(() => {
    const size = `${root.value.clientWidth}x${root.value.clientHeight}`
    if (size === lastSize) return
    lastSize = size
    measure()
    render('resize')
  })
  observer.observe(root.value)
})

onBeforeUnmount(() => observer && observer.disconnect())
</script>

<template>
  <div ref="root" class="compare-chart">
    <!-- The chart: D3 fills this <svg> (see setup and render in the script) -->
    <svg ref="svgEl" role="img" :aria-label="ariaLabel"></svg>

    <!-- Hover box: the date, then one row per package -->
    <div
      v-show="tip.show"
      class="tip"
      :class="{ below: tip.below }"
      :style="{ left: tip.x + 'px', top: tip.y + 'px' }"
    >
      <span class="tip-label">{{ tip.label }}</span>
      <span v-for="row in tip.rows" :key="row.name" class="tip-row">
        <span class="tip-dot" :style="{ background: row.color }"></span>
        <span class="tip-name">{{ row.name }}</span>
        <strong>{{ row.text }}</strong>
      </span>
    </div>
  </div>
</template>

<style scoped>
/* ---------- Layout ---------- */
.compare-chart {
  position: relative;
  height: var(--chart-height, 280px);
}

svg {
  display: block;
  overflow: visible;
}

/* ---------- Colours & theme: the chart parts D3 draws (reached with :deep) ---------- */
.compare-chart :deep(.axis text) {
  fill: var(--ink-2);
  font-size: 11px;
}

.compare-chart :deep(.domain) {
  display: none;
}

.compare-chart :deep(.grid line) {
  stroke: color-mix(in srgb, var(--ink) 6%, transparent);
}

.compare-chart :deep(.base) {
  stroke: color-mix(in srgb, var(--ink) 30%, transparent);
  stroke-dasharray: 2 4;
}

.compare-chart :deep(.line) {
  fill: none;
  stroke-width: 2.25;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.compare-chart :deep(.dots circle) {
  fill: var(--bg);
  stroke-width: 2;
}

.compare-chart :deep(.overlay) {
  fill: transparent;
  pointer-events: all;
}

.compare-chart :deep(.guide) {
  stroke: color-mix(in srgb, var(--ink) 28%, transparent);
  stroke-dasharray: 3 3;
}

.compare-chart :deep(.focus-dot) {
  fill: var(--bg);
  stroke-width: 2.5;
}

/* ---------- Components: hover box ---------- */
.tip {
  position: absolute;
  transform: translate(-50%, calc(-100% - 14px));
  display: grid;
  gap: 3px;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--float-bg);
  border: 1px solid var(--edge);
  box-shadow: 0 10px 30px color-mix(in srgb, var(--shadow) 45%, transparent);
  white-space: nowrap;
  pointer-events: none;
  z-index: 2;
}

.tip.below {
  transform: translate(-50%, 16px);
}

.tip-label {
  color: var(--ink-2);
  font-size: 0.72rem;
}

.tip-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}

.tip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.tip-name {
  color: var(--ink-2);
  font-family: var(--font-code);
}

.tip-row strong {
  color: var(--ink);
}
</style>
