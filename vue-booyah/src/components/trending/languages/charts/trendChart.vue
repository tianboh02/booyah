<!--
  src/components/trending/languages/charts/trendChart.vue

  What it does:  the interactive download chart for one package, drawn with D3.js.
                   kind="line" → line + soft gradient area (Daily and Weekly)
                   kind="bar"  → rounded bars with values on top (Monthly)
                 What the user can do:
                   - Hover (or touch) anywhere to see the exact date, downloads and % change
                     (daily: vs the same day last week; weekly/monthly: vs the point before)
                   - Daily view: drag across the chart to zoom into those days; "Show all" or a
                     double-click zooms back out
                 Animations: the line draws itself in, the area fades up, bars grow from the baseline,
                 and zooming slides smoothly to the new range.
  Receives:      props  points (a daily / weekly / monthly list from the package card), kind,
                        color (the line's colour), fill (the area's colour; defaults to color),
                        unit (for "vs previous day"), zoomable
  Gives back:    nothing (no emits).
  Used by:       detail/packageDashboard.vue.

  How it works:  Vue only creates the empty <svg>. D3 builds everything inside it once (setup),
                 then redraws it (render) whenever the data, the size or the zoom changes.
-->
<script setup>
// ---------- Imports ----------
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import * as d3 from 'd3'
import { compact, num, itemLabel, trendArrow } from '@/utils/trending/helpers/format'
import { prefersReducedMotion } from '@/utils/motion'

// ---------- Props ----------
const props = defineProps({
  points: { type: Array, required: true }, // [{ date, downloads }] or [{ start, end, downloads }]
  kind: { type: String, default: 'line' }, // 'line' or 'bar'
  color: { type: String, default: '#58a6ff' },
  fill: { type: String, default: '' }, // the gradient under the line; '' → same as color
  unit: { type: String, default: 'day' }, // used in the hover text: "vs previous day"
  zoomable: { type: Boolean, default: false },
})

// ---------- State ----------
const root = ref(null) // the box around the chart (its size sets the chart's size)
const svgEl = ref(null) // the <svg> D3 draws into
// What the hover box shows and where
const tip = reactive({
  show: false,
  below: false,
  x: 0,
  y: 0,
  label: '',
  value: '',
  change: '',
  trend: '',
  note: '',
})
const zoomDomain = ref(null) // [startDate, endDate] when zoomed in, otherwise null

// Settings
const margin = { top: 20, right: 16, bottom: 30, left: 52 } // room around the plot for the axes
const reduceMotion = prefersReducedMotion()
const ms = (time) => (reduceMotion ? 0 : time) // all animation times go through this
const uid = Math.random().toString(36).slice(2) // unique ids for the gradient and clip

// D3 selections (handles to the SVG groups) and scales, created once in setup().
// These are plain variables, not Vue refs: D3 changes the SVG directly, Vue doesn't need to know.
let svg,
  plot,
  gridG,
  yAxisG,
  xAxisG,
  areaPath,
  linePath,
  dotsG,
  barsG,
  labelsG,
  focusG,
  brushG,
  overlay
let x, y // the scales: data value → pixel position
let data = [] // the points, converted by prepare()
let innerW = 0 // the plot's size inside the margins, in px
let innerH = 0
let observer = null

// ---------- Computed values ----------
const zoomed = computed(() => zoomDomain.value !== null)

// What screen readers announce for the chart
const ariaLabel = computed(() => {
  const last = props.points[props.points.length - 1]
  return last
    ? `Downloads per ${props.unit}, ${props.points.length} points, latest ${num(last.downloads)}`
    : 'Downloads chart'
})

// ---------- Watchers ----------
// New package or new period → start fresh and animate in
watch(
  () => [props.points, props.kind],
  () => {
    zoomDomain.value = null
    prepare()
    render('enter')
  },
)

// New language colour → recolour the gradient under the line
watch(() => [props.color, props.fill], colourGradient)

// ---------- Functions: building the chart ----------

/**
 * Builds the empty chart structure once. Layers are added bottom to top:
 * grid → axes → (clipped) area, line, dots → bars → bar labels → hover guide → hover catcher → zoom brush.
 */
function setup() {
  svg = d3.select(svgEl.value)
  const defs = svg.append('defs')

  // Gradient under the line: the chart colour fading to transparent
  const gradient = defs
    .append('linearGradient')
    .attr('id', `fill-${uid}`)
    .attr('x1', 0)
    .attr('x2', 0)
    .attr('y1', 0)
    .attr('y2', 1)
  gradient.append('stop').attr('offset', '0%').attr('class', 'stop-top')
  gradient.append('stop').attr('offset', '100%').attr('class', 'stop-bottom')

  // Clip: keeps the line inside the plot when zoomed in
  defs.append('clipPath').attr('id', `clip-${uid}`).append('rect')

  plot = svg.append('g')
  gridG = plot.append('g').attr('class', 'grid')
  yAxisG = plot.append('g').attr('class', 'axis')
  xAxisG = plot.append('g').attr('class', 'axis')

  const clipped = plot.append('g').attr('clip-path', `url(#clip-${uid})`)
  areaPath = clipped.append('path').attr('class', 'area').attr('fill', `url(#fill-${uid})`)
  linePath = clipped.append('path').attr('class', 'line')
  dotsG = clipped.append('g').attr('class', 'dots')

  barsG = plot.append('g').attr('class', 'bars')
  labelsG = plot.append('g').attr('class', 'bar-labels')

  focusG = plot.append('g').attr('class', 'focus').style('display', 'none')
  focusG.append('line').attr('class', 'guide')
  focusG.append('circle').attr('class', 'focus-dot').attr('r', 5)

  overlay = plot.append('rect').attr('class', 'overlay') // catches hover events
  brushG = plot.append('g').attr('class', 'brush') // drag-to-zoom (daily only)

  // Hover anywhere on the plot
  plot.on('pointermove', onHover).on('pointerleave', hideTip)
  svg.on('dblclick', resetZoom)
  colourGradient()
}

/** Sets the gradient under the line to the fill colour (35% at the top, fading to 0). */
function colourGradient() {
  const fill = props.fill || props.color
  svg.select('.stop-top').attr('stop-color', fill).attr('stop-opacity', 0.35)
  svg.select('.stop-bottom').attr('stop-color', fill).attr('stop-opacity', 0)
}

/** Measures the box and fits the SVG, the plot area and the zoom clip to it. */
function measure() {
  const w = root.value.clientWidth
  const h = root.value.clientHeight
  innerW = Math.max(10, w - margin.left - margin.right)
  innerH = Math.max(10, h - margin.top - margin.bottom)
  svg.attr('width', w).attr('height', h)
  plot.attr('transform', `translate(${margin.left},${margin.top})`)
  svg
    .select(`#clip-${uid} rect`)
    .attr('x', -4)
    .attr('y', -6)
    .attr('width', innerW + 8)
    .attr('height', innerH + 8)
  overlay.attr('width', innerW).attr('height', innerH)
  xAxisG.attr('transform', `translate(0,${innerH})`)
}

/**
 * Turns the props into chart-ready points: a real Date for the x position, the value,
 * the label for the hover box, the % change, and how many days are estimates.
 * Daily points compare with the same weekday a week earlier (7 points back), like the headline
 * number, so weekends don't show up as huge drops; weekly/monthly points compare with the one before.
 */
function prepare() {
  const pts = props.points
  data = pts.map((p, i) => {
    const back = p.date ? 7 : 1 // daily items have `date`; weekly/monthly blocks have start/end
    const prev = i >= back ? pts[i - back].downloads : null
    return {
      date: new Date((p.date || p.end) + 'T00:00:00Z'), // daily uses date, weekly/monthly use the end date
      value: p.downloads,
      label: itemLabel(p),
      change: prev ? ((p.downloads - prev) / prev) * 100 : null,
      estimated: p.estimated ? 1 : p.estimatedDays || 0, // filled-in days (npm's missing days)
      isDay: Boolean(p.date),
    }
  })
}

// ---------- Functions: drawing ----------

/**
 * Draws (or redraws) the chart.
 *   mode = 'enter'  new data: animate in
 *          'zoom'   slide smoothly to the new date range
 *          'resize' redraw instantly at the new size
 */
function render(mode) {
  // A chart that's been taken off the page (e.g. the panel swapping to another package) can still
  // get a resize or data update; D3's timed transitions throw on detached elements, so skip it
  if (!data.length || !root.value || !root.value.isConnected) return
  hideTip()
  if (props.kind === 'bar') renderBars(mode)
  else renderLine(mode)
  setupBrush()
}

/** Draws the line + area version (Daily and Weekly). */
function renderLine(mode) {
  // clear anything left over from the bar chart
  barsG.selectAll('*').remove()
  labelsG.selectAll('*').remove()

  const domain = zoomDomain.value || d3.extent(data, (d) => d.date)
  const visible = data.filter((d) => d.date >= domain[0] && d.date <= domain[1])

  // Scales turn data into pixels.
  //   x: a date → how far across (0 … innerW). scaleUtc understands dates in UTC.
  //   y: downloads → how far down. The range is [innerH, 0] because SVG measures y from the top,
  //      so 0 downloads sits at the bottom. It always starts at 0 so the trend isn't exaggerated,
  //      goes 12% above the highest point for breathing room, and .nice() rounds the top to a
  //      tidy number (e.g. 1.2B) so the axis labels look clean.
  x = d3.scaleUtc().domain(domain).range([0, innerW])
  y = d3
    .scaleLinear()
    .domain([0, d3.max(visible, (d) => d.value) * 1.12])
    .nice()
    .range([innerH, 0])

  // One shared timing for this redraw: 500 ms when zooming, instant otherwise
  const t = d3
    .transition()
    .duration(mode === 'zoom' ? ms(500) : 0)
    .ease(d3.easeCubicInOut)

  // Gridlines and axes. An axis "generator" (d3.axisLeft / axisBottom) draws the tick marks and
  // labels for a scale; .call() runs it on a group. The grid is the left axis with very long,
  // label-less ticks stretched across the whole plot.
  gridG.transition(t).call(d3.axisLeft(y).ticks(4).tickSize(-innerW).tickFormat(''))
  yAxisG.transition(t).call(d3.axisLeft(y).ticks(4).tickSize(0).tickPadding(10).tickFormat(compact))
  xAxisG.transition(t).call(
    d3
      .axisBottom(x)
      .ticks(Math.max(2, Math.floor(innerW / 90)))
      .tickSize(0)
      .tickPadding(10)
      .tickFormat(d3.utcFormat('%-d %b')),
  )

  // Line and area shapes (smooth curve through the points)
  const line = d3
    .line()
    .x((d) => x(d.date))
    .y((d) => y(d.value))
    .curve(d3.curveMonotoneX)
  const area = d3
    .area()
    .x((d) => x(d.date))
    .y0(innerH)
    .y1((d) => y(d.value))
    .curve(d3.curveMonotoneX)

  linePath.interrupt()
  areaPath.interrupt()

  if (mode === 'enter') {
    // Area fades up, line draws itself from left to right
    areaPath
      .attr('d', area(data))
      .attr('opacity', 0)
      .transition()
      .delay(ms(150))
      .duration(ms(500))
      .attr('opacity', 1)
    linePath.attr('d', line(data))
    const length = linePath.node().getTotalLength()
    linePath
      .attr('stroke-dasharray', `${length} ${length}`)
      .attr('stroke-dashoffset', length)
      .transition()
      .duration(ms(600))
      .ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', 0)
      .on('end', () => linePath.attr('stroke-dasharray', null))
  } else {
    areaPath.attr('opacity', 1).transition(t).attr('d', area(data))
    linePath.attr('stroke-dasharray', null).transition(t).attr('d', line(data))
  }

  // Dots on each point when there are few of them (weekly).
  // .data(...).join(enter, update, exit) is D3's way of matching data to elements:
  //   enter  = new points  → add a circle and fade it in
  //   update = existing    → slide it to its new position
  //   exit   = gone points → remove the circle
  const showDots = data.length <= 20
  dotsG
    .selectAll('circle')
    .data(showDots ? data : [], (d) => +d.date)
    .join(
      (enter) =>
        enter
          .append('circle')
          .attr('r', 3.5)
          .attr('cx', (d) => x(d.date))
          .attr('cy', (d) => y(d.value))
          .attr('opacity', 0)
          .call((e) =>
            e
              .transition()
              .delay((d, i) => ms(200 + i * 40))
              .duration(ms(250))
              .attr('opacity', 1),
          ),
      (update) =>
        update.call((u) =>
          u
            .transition(t)
            .attr('cx', (d) => x(d.date))
            .attr('cy', (d) => y(d.value)),
        ),
      (exit) => exit.remove(),
    )
}

/** Draws the bar version (Monthly): bars grow up one after another, with values on top. */
function renderBars(mode) {
  // clear anything left over from the line chart
  areaPath.attr('d', null)
  linePath.attr('d', null)
  dotsG.selectAll('*').remove()

  // Scales: scaleBand splits the width into one equal slot per bar (padding = the gap between bars);
  // y works like the line chart's, with 18% headroom for the value labels above the bars
  x = d3
    .scaleBand()
    .domain(data.map((d) => d.label))
    .range([0, innerW])
    .padding(0.45)
  y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.value) * 1.18])
    .nice()
    .range([innerH, 0])
  const barW = Math.min(x.bandwidth(), 72)
  const centre = (d) => x(d.label) + x.bandwidth() / 2

  gridG.call(d3.axisLeft(y).ticks(4).tickSize(-innerW).tickFormat(''))
  yAxisG.call(d3.axisLeft(y).ticks(4).tickSize(0).tickPadding(10).tickFormat(compact))
  const manyBars = data.length > 4
  const monthOf = new Map(data.map((d) => [d.label, d3.utcFormat('%b')(d.date)]))
  xAxisG.call(
    d3
      .axisBottom(x)
      .tickSize(0)
      .tickPadding(10)
      // with many bars, show only the month each block ends in ('Oct'); the hover box shows the full range
      .tickFormat((label) => (manyBars ? monthOf.get(label) : label)),
  )

  const animate = mode === 'enter'

  // Bars: rounded at the top, square at the baseline, growing upwards
  barsG
    .selectAll('path')
    .data(data, (d) => d.label)
    .join('path')
    .attr('d', (d) => barShape(centre(d), barW, innerH, animate ? innerH : y(d.value)))
    .transition()
    .delay((d, i) => (animate ? ms(i * 100) : 0))
    .duration(animate ? ms(500) : 0)
    .ease(d3.easeCubicOut)
    .attr('d', (d) => barShape(centre(d), barW, innerH, y(d.value)))

  // Value labels above each bar
  labelsG
    .selectAll('text')
    .data(manyBars ? [] : data, (d) => d.label) // with many bars, values live in the hover box instead
    .join('text')
    .attr('x', centre)
    .attr('y', (d) => y(d.value) - 10)
    .attr('text-anchor', 'middle')
    .attr('font-size', 12)
    .text((d) => compact(d.value))
    .attr('opacity', animate ? 0 : 1)
    .transition()
    .delay((d, i) => (animate ? ms(350 + i * 100) : 0))
    .duration(ms(250))
    .attr('opacity', 1)
}

/** SVG path for a bar centred on cx, from the baseline up to `top`, with rounded top corners */
function barShape(cx, w, baseline, top) {
  const r = Math.min(6, (baseline - top) / 2, w / 2)
  const left = cx - w / 2
  const right = cx + w / 2
  return `M${left},${baseline} V${top + r} Q${left},${top} ${left + r},${top} H${right - r} Q${right},${top} ${right},${top + r} V${baseline} Z`
}

// ---------- Functions: drag to zoom (daily line only) ----------

/**
 * Turns on D3's "brush": drag across the plot to select a date range.
 * When the drag ends, the chart zooms to that range (if it covers at least 4 days).
 */
function setupBrush() {
  brushG.on('.brush', null).selectAll('*').remove()
  if (!(props.zoomable && props.kind === 'line')) return

  const brush = d3
    .brushX()
    .extent([
      [0, 0],
      [innerW, innerH],
    ])
    .on('end', (event) => {
      if (!event.selection) return
      const [from, to] = event.selection.map(x.invert)
      brushG.call(brush.move, null) // clear the grey selection box
      const daysInside = data.filter((d) => d.date >= from && d.date <= to).length
      if (daysInside < 4) return // too small to be useful
      zoomDomain.value = [from, to]
      render('zoom')
    })
  brushG.call(brush)
}

/** Zooms back out to show every day. */
function resetZoom() {
  if (!zoomDomain.value) return
  zoomDomain.value = null
  render('zoom')
}

// ---------- Functions: hover box ----------

/**
 * Finds the point nearest the pointer and shows its details.
 * d3.pointer gives the pointer position inside the plot; for the line chart, x.invert turns that
 * position back into a date and d3.bisector finds the closest point to that date.
 */
function onHover(event) {
  const [mx, my] = d3.pointer(event, plot.node())
  if (mx < 0 || mx > innerW || my < 0 || my > innerH) return hideTip()

  let d
  let px
  if (props.kind === 'bar') {
    // which bar is the pointer over?
    const index = Math.floor((mx / innerW) * data.length)
    d = data[Math.max(0, Math.min(data.length - 1, index))]
    px = x(d.label) + x.bandwidth() / 2
  } else {
    const index = d3.bisector((p) => p.date).center(data, x.invert(mx))
    d = data[index]
    px = x(d.date)
    if (px < 0 || px > innerW) return hideTip()
  }
  const py = y(d.value)

  // guide line + dot
  focusG.style('display', null)
  focusG.select('.guide').attr('x1', px).attr('x2', px).attr('y1', 0).attr('y2', innerH)
  focusG
    .select('.focus-dot')
    .attr('cx', px)
    .attr('cy', py)
    .style('display', props.kind === 'bar' ? 'none' : null)

  // hover box, kept inside the chart's edges
  const boxW = root.value.clientWidth
  tip.x = Math.min(Math.max(margin.left + px, 80), boxW - 80)
  tip.y = margin.top + py
  tip.below = py < 80 // near the top: show the box under the point so it isn't cut off
  tip.label = d.label
  tip.value = `${num(d.value)} downloads`
  if (d.change === null) {
    tip.change = ''
  } else {
    const versus = d.isDay ? 'same day last week' : `previous ${props.unit}`
    tip.change = `${trendArrow(d.change)} ${Math.abs(d.change).toFixed(1)}% vs ${versus}`
    tip.trend = d.change > 0 ? 'up' : d.change < 0 ? 'down' : ''
  }
  tip.note = !d.estimated
    ? ''
    : d.isDay
      ? 'Estimated: no data recorded for this day'
      : `Includes ${d.estimated} estimated day${d.estimated > 1 ? 's' : ''}`
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

  // Only redraw when the size really changes (the observer also fires once at the start,
  // which would otherwise cut the draw-in animation short)
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
  <div ref="root" class="trend" :style="{ '--c': color }">
    <svg ref="svgEl" class="trend-svg" role="img" :aria-label="ariaLabel"></svg>

    <!-- Hover box (plain HTML on top of the chart) -->
    <div
      v-show="tip.show"
      class="tip"
      :class="{ below: tip.below }"
      :style="{ left: tip.x + 'px', top: tip.y + 'px' }"
    >
      <span class="tip-label">{{ tip.label }}</span>
      <strong class="tip-value">{{ tip.value }}</strong>
      <span v-if="tip.change" class="tip-change" :class="tip.trend">{{ tip.change }}</span>
      <span v-if="tip.note" class="tip-note">{{ tip.note }}</span>
    </div>

    <!-- Daily only: the zoom hint, or the button to zoom back out -->
    <p v-if="zoomable && kind === 'line' && !zoomed" class="help">
      Drag across the chart to zoom in
    </p>
    <button v-if="zoomed" class="reset" @click="resetZoom">
      Show all {{ points.length }} days
    </button>
  </div>
</template>

<style scoped>
/* ---------- Layout ---------- */
.trend {
  position: relative;
  height: var(--chart-height, 250px); /* the parent sets --chart-height */
}
.trend-svg {
  display: block;
  overflow: visible;
}

/* ---------- Colours & theme: the chart parts D3 draws ----------
   D3 adds these elements itself, so Vue's scoped styles can't see them;
   :deep() reaches inside them from this scoped style. --c is the language colour. */
.trend :deep(.axis text) {
  fill: var(--ink-2);
  font-size: 11px;
}
.trend :deep(.domain) {
  display: none;
}
.trend :deep(.grid line) {
  stroke: color-mix(in srgb, var(--ink) 6%, transparent);
}
.trend :deep(.grid .tick:first-of-type line) {
  stroke: color-mix(in srgb, var(--ink) 16%, transparent);
}
.trend :deep(.line) {
  fill: none;
  stroke: var(--c);
  stroke-width: 2.25;
  stroke-linejoin: round;
  stroke-linecap: round;
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--c) 55%, transparent));
}
.trend :deep(.dots circle) {
  fill: var(--bg);
  stroke: var(--c);
  stroke-width: 2;
}
.trend :deep(.bars path) {
  fill: var(--c);
  filter: drop-shadow(0 0 10px color-mix(in srgb, var(--c) 40%, transparent));
}
/* light theme: no coloured glow (it smudges on white) */
:root[data-bs-theme='light'] .trend :deep(.line),
:root[data-bs-theme='light'] .trend :deep(.bars path) {
  filter: none;
}
.trend :deep(.bar-labels text) {
  fill: var(--ink);
  font-weight: 600;
}
.trend :deep(.overlay) {
  fill: transparent;
  pointer-events: all;
}
.trend :deep(.guide) {
  stroke: color-mix(in srgb, var(--ink) 28%, transparent);
  stroke-dasharray: 3 3;
}
.trend :deep(.focus-dot) {
  fill: var(--bg);
  stroke: var(--c);
  stroke-width: 2.5;
}
.trend :deep(.brush .selection) {
  fill: var(--c);
  fill-opacity: 0.14;
  stroke: var(--c);
  stroke-opacity: 0.5;
}

/* ---------- Components: hover box ---------- */
.tip {
  position: absolute;
  transform: translate(-50%, calc(-100% - 14px));
  display: grid;
  gap: 2px;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--float-bg);
  border: 1px solid var(--edge);
  box-shadow: 0 10px 30px color-mix(in srgb, var(--shadow) 40%, transparent);
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
.tip-value {
  color: var(--ink);
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
}
.tip-change {
  font-size: 0.72rem;
  font-weight: 600;
}
.tip-change.up {
  color: var(--up);
}
.tip-change.down {
  color: var(--down);
}
.tip-note {
  color: var(--ink-2);
  font-size: 0.7rem;
  font-style: italic;
}

/* ---------- Components: zoom hint and "Show all" button ---------- */
.help {
  position: absolute;
  right: 16px;
  top: -4px;
  margin: 0;
  color: var(--ink-2);
  font-size: 0.72rem;
}
.reset {
  position: absolute;
  right: 16px;
  top: -8px;
  padding: 4px 10px;
  border: 1px solid var(--edge);
  border-radius: 999px;
  background: color-mix(in srgb, var(--ink) 5%, transparent);
  color: var(--ink);
  font-size: 0.75rem;
  cursor: pointer;
}
.reset:hover {
  background: color-mix(in srgb, var(--ink) 10%, transparent);
}
/* ---------- Keyboard focus ---------- */
.reset:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}
</style>
