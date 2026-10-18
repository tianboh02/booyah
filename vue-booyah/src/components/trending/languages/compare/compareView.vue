<!--
  src/components/trending/languages/compare/compareView.vue

  What it does:  the compare popup: a large panel over the page (full screen on phones) comparing
                 the two tray packages. Everything it shows comes from buildComparison() in
                 math/compareMath.js:
                   header  the two names, language badges, the shared date range,
                           the period toggle (kept in sync with the page), Clear and ×
                   rows    the six measures, with ✓ on the better side
                   chart   the D3 comparison chart (Downloads / Growth)
                   verdict the one-sentence summary, plus small-print notes
                 Closes with ×, Esc, or a click outside the panel. "Clear" closes it and empties the
                 compare tray. While open, the page behind it can't scroll and Tab stays inside it.
  Receives:      props  pair ([a, b]: package data + `language` + displayRank for this period), period
  Gives back:    emits  update:period (a new period was chosen), close, clear
  Used by:       languagesSection.vue (inside a <Transition name="backdrop">).
  Children:      header/periodToggle.vue, charts/compareChart.vue.
-->
<script setup>
// ---------- Imports ----------
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { buildComparison } from '@/utils/trending/math/compareMath'
import { compact, pct, dateRange, PERIODS, PERIOD_INFO } from '@/utils/trending/helpers/format'
import PeriodToggle from '@/components/trending/languages/header/periodToggle.vue'
import CompareChart from '@/components/trending/languages/charts/compareChart.vue'

// ---------- Props & emits ----------
const props = defineProps({
  pair: { type: Array, required: true }, // [a, b]: package data + `language` + displayRank for this period
  period: { type: String, required: true },
})
const emit = defineEmits(['update:period', 'close', 'clear'])

// ---------- Settings ----------
// Same language → both lines would share one colour, so B's line is light grey and dashed
const SAME_LANGUAGE_B = '#c9d1d9'
// The chart's Downloads / Growth toggle
const MODES = ['downloads', 'growth']
const MODE_LABELS = { downloads: { label: 'Downloads' }, growth: { label: 'Growth' } }

// ---------- State ----------
const mode = ref('downloads') // the chart mode
const panel = ref(null) // the popup panel (for keeping Tab inside it)
const closeBtn = ref(null) // the × button (gets focus when the popup opens)
let previousFocus = null // what had focus before opening, to give it back on close
let previousOverflow = '' // the page's scroll setting before opening, to restore on close

// ---------- Computed values ----------
// Every number, row, sentence and chart line the popup shows
const comparison = computed(() => buildComparison(props.pair[0], props.pair[1], props.period))
const [a, b] = [computed(() => props.pair[0]), computed(() => props.pair[1])]
const sameLanguage = computed(() => a.value.language.id === b.value.language.id)

// The two lines' colours
const colors = computed(() => [
  a.value.language.accent,
  sameLanguage.value ? SAME_LANGUAGE_B : b.value.language.accent,
])

// ---------- Functions ----------

/** PHP names are 'vendor/package': splits them so a long name can wrap after the '/', not mid-word. */
const nameParts = (name) => name.split(/(?<=\/)/)

/** How a row's value is written, e.g. size → '7.2M', change → '+3.1%', rank → '#1 in PHP'. */
function format(row, side) {
  const value = row[side]
  const pkg = side === 'a' ? a.value : b.value
  if (value === null || value === undefined) return '–'
  switch (row.key) {
    case 'size':
    case 'averagePerDay':
      return compact(value)
    case 'change':
      return pct(value)
    case 'trend':
      return `${row[side + 'Label']} (${pct(value)})`
    case 'weekdayShare':
      return `${value}%`
    case 'rank':
      return `#${value} in ${pkg.language.name}`
    default:
      return String(value)
  }
}

/** The colour class for a value: 'up' (green) / 'down' (red) for changes and trends, else ''. */
function tone(row, side) {
  const value = row[side]
  if (row.key !== 'change' && row.key !== 'trend') return ''
  if (value === null) return ''
  if (row.key === 'trend')
    return row[side + 'Label'] === 'Growing'
      ? 'up'
      : row[side + 'Label'] === 'Declining'
        ? 'down'
        : ''
  return value > 0 ? 'up' : value < 0 ? 'down' : ''
}

/** Esc closes the popup; Tab and Shift+Tab wrap around inside it instead of leaving it. */
function onKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }
  if (event.key !== 'Tab' || !panel.value) return
  // keep Tab inside the panel while it's open
  const focusable = [
    ...panel.value.querySelectorAll('button:not([disabled]), a[href], [tabindex="0"]'),
  ]
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

// ---------- Lifecycle ----------
// Opening: lock the page's scrolling, listen for keys, focus the × button.
// Closing: undo all of that and give focus back to where it was.
onMounted(() => {
  previousFocus = document.activeElement
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden' // stop the page scrolling behind the panel
  document.addEventListener('keydown', onKeydown)
  nextTick(() => closeBtn.value && closeBtn.value.focus())
})

onBeforeUnmount(() => {
  document.body.style.overflow = previousOverflow
  document.removeEventListener('keydown', onKeydown)
  if (previousFocus && previousFocus.focus) previousFocus.focus()
})
</script>

<template>
  <!-- the open/close animation (.backdrop-*) is run by the <Transition> around this component -->
  <div class="backdrop" @click.self="$emit('close')">
    <div
      ref="panel"
      class="compare"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-title"
      :style="{ '--accent': a.language.accent, '--on-accent': a.language.onAccent }"
    >
      <!-- ===================== Header: names, date range, period toggle, Clear, × ===================== -->
      <header class="compare-head">
        <div class="title-block">
          <h4 id="compare-title" class="names">
            <span class="name" :style="{ '--side': colors[0] }">
              <span class="name-text"
                ><template v-for="(part, i) in nameParts(a.name)" :key="i"
                  ><wbr v-if="i" />{{ part }}</template
                ></span
              >
              <span class="badge-lang" :style="{ '--lang': a.language.accent }">{{
                a.language.name
              }}</span>
            </span>
            <span class="vs">vs</span>
            <span class="name" :style="{ '--side': colors[1] }">
              <span class="name-text"
                ><template v-for="(part, i) in nameParts(b.name)" :key="i"
                  ><wbr v-if="i" />{{ part }}</template
                ></span
              >
              <span class="badge-lang" :style="{ '--lang': b.language.accent }">{{
                b.language.name
              }}</span>
            </span>
          </h4>
          <p class="range">
            Measured over the same days: {{ dateRange(comparison.from, comparison.to) }}
          </p>
        </div>
        <div class="head-actions">
          <PeriodToggle
            :model-value="period"
            :periods="PERIODS"
            :labels="PERIOD_INFO"
            @update:model-value="$emit('update:period', $event)"
          />
          <button
            type="button"
            class="clear"
            aria-label="Clear compared packages and close"
            @click="$emit('clear')"
          >
            Clear
          </button>
        </div>
        <!-- pinned to the popup's top-right corner -->
        <button
          ref="closeBtn"
          type="button"
          class="close"
          aria-label="Close compare"
          @click="$emit('close')"
        >
          ×
        </button>
      </header>

      <div class="compare-body">
        <!-- ===================== The six rows (a small table; ✓ marks the better side) ===================== -->
        <div class="rows" role="table" :aria-label="`${a.name} compared with ${b.name}`">
          <div class="row-line head-line" role="row">
            <span role="columnheader" class="visually-hidden">Measure</span>
            <span role="columnheader" class="col-name" :style="{ '--side': colors[0] }">{{
              a.name
            }}</span>
            <span role="columnheader" class="col-name" :style="{ '--side': colors[1] }">{{
              b.name
            }}</span>
          </div>
          <div
            v-for="(row, i) in comparison.rows"
            :key="period + row.key"
            class="row-line"
            role="row"
            :style="{ '--i': i }"
          >
            <span class="row-label" role="rowheader">{{ row.label }}</span>
            <span
              v-for="side in ['a', 'b']"
              :key="side"
              class="cell"
              role="cell"
              :class="{ win: row.win === side }"
            >
              <span class="cell-name" aria-hidden="true">{{ side === 'a' ? a.name : b.name }}</span>
              <span class="cell-value" :class="tone(row, side)">{{ format(row, side) }}</span>
              <span
                v-if="row.win === side"
                class="check"
                :style="{ '--side': colors[side === 'a' ? 0 : 1] }"
              >
                ✓<span class="visually-hidden"> higher</span>
              </span>
            </span>
          </div>
        </div>

        <!-- ===================== Chart: legend, Downloads / Growth toggle, help line, D3 chart ===================== -->
        <section class="chart-card" aria-label="Comparison chart">
          <div class="chart-head">
            <ul class="legend">
              <li :style="{ '--side': colors[0] }">
                <span class="swatch"></span>
                <span
                  ><template v-for="(part, i) in nameParts(a.name)" :key="i"
                    ><wbr v-if="i" />{{ part }}</template
                  ></span
                >
              </li>
              <li :style="{ '--side': colors[1] }">
                <span class="swatch" :class="{ dashed: sameLanguage }"></span>
                <span
                  ><template v-for="(part, i) in nameParts(b.name)" :key="i"
                    ><wbr v-if="i" />{{ part }}</template
                  ></span
                >
              </li>
            </ul>
            <PeriodToggle
              v-model="mode"
              :periods="MODES"
              :labels="MODE_LABELS"
              aria-label="Chart mode"
            />
          </div>
          <p class="chart-help">
            <template v-if="mode === 'growth'"
              >Both lines start at 100, so 120 means 20% higher than at the start.</template
            >
            <template v-else
              >Real download counts, {{ PERIOD_INFO[period].label.toLowerCase() }}.</template
            >
          </p>
          <CompareChart
            class="chart"
            :series="comparison.series"
            :mode="mode"
            :period="period"
            :names="[a.name, b.name]"
            :colors="colors"
            :dashed-b="sameLanguage"
          />
        </section>

        <!-- ===================== Verdict + notes (fade when the sentence changes) ===================== -->
        <Transition name="verdict" mode="out-in" appear>
          <div :key="comparison.verdict" class="verdict-block">
            <p class="verdict">{{ comparison.verdict }}</p>
            <p v-for="note in comparison.notes" :key="note" class="note">{{ note }}</p>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
  Sections, in order: layout (backdrop + panel) → header → body → rows → chart → verdict
  → animations → keyboard focus → responsive (tablet, phone) → reduced motion.
  (Rules are kept in their original order on purpose: a later CSS rule can override an earlier one.)
*/

/* ---------- Layout: the dimmed, blurred backdrop and the panel ---------- */
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 1055;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(5, 6, 8, 0.72);
  backdrop-filter: blur(6px);
}

.compare {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(1040px, 100%);
  max-height: calc(100vh - 48px);
  border: 1px solid var(--edge);
  border-radius: 22px;
  background:
    radial-gradient(
      80% 40% at 0% 0%,
      color-mix(in srgb, var(--accent) 8%, transparent),
      transparent 60%
    ),
    var(--card);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

/* ---------- Components: header ---------- */
.compare-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 20px;
  /* the right padding leaves room for the × in the corner */
  padding: 20px 72px 16px 24px;
  border-bottom: 1px solid var(--edge);
}

/* long names (e.g. PHP's vendor/package) wrap inside the title, so the toggle never gets pushed down */
.title-block {
  flex: 1 1 auto;
  min-width: 0;
}

.names {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin: 0 0 4px;
  font-weight: 700;
}

.name {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.name-text {
  color: var(--ink);
  font-family: var(--font-code);
  overflow-wrap: break-word;
  border-bottom: 3px solid var(--side);
}

.badge-lang {
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--lang) 60%, transparent);
  background: color-mix(in srgb, var(--lang) 16%, transparent);
  color: var(--ink);
  font-size: 0.72rem;
  font-weight: 600;
}

.vs {
  color: var(--ink-2);
  font-size: 0.9rem;
  font-weight: 600;
}

.range {
  margin: 0;
  color: var(--ink-2);
  font-size: 0.85rem;
}

.head-actions {
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
}

.close {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--edge);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.04);
  color: var(--ink);
  font-size: 1.3rem;
  line-height: 1;
  cursor: pointer;
  transition: background-color 200ms var(--ease);
}

.close:hover {
  background: rgba(255, 255, 255, 0.12);
}

.clear {
  flex: none;
  height: 36px;
  padding: 0 14px;
  border: 1px solid var(--edge);
  border-radius: 999px;
  background: transparent;
  color: var(--ink-2);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 200ms var(--ease),
    color 200ms var(--ease);
}

.clear:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--ink);
}

/* ---------- Layout: body (rows | chart, verdict underneath) ---------- */
.compare-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
  grid-template-areas:
    'rows chart'
    'verdict verdict';
  gap: 18px 20px;
  padding: 18px 24px 24px;
  overflow-y: auto;
}

/* ---------- Components: the six rows ---------- */
.rows {
  grid-area: rows;
  display: grid;
  align-content: start;
  gap: 6px;
}

.row-line {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid var(--edge);
  animation: row-in 400ms var(--ease) calc(var(--i) * 60ms + 120ms) backwards;
}

.head-line {
  padding-top: 0;
  padding-bottom: 2px;
  background: none;
  border: 0;
  animation: none;
}

.col-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink);
  font-family: var(--font-code);
  font-size: 0.82rem;
  font-weight: 600;
  border-bottom: 2px solid var(--side);
  padding-bottom: 4px;
}

.row-label {
  color: var(--ink-2);
  font-size: 0.82rem;
}

.cell {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.cell-name {
  display: none;
}

.cell-value {
  color: var(--ink);
  font-weight: 600;
  font-size: 0.92rem;
  font-variant-numeric: tabular-nums;
}

.cell-value.up {
  color: var(--up);
}

.cell-value.down {
  color: var(--down);
}

.check {
  display: inline-grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--side) 22%, transparent);
  color: var(--ink);
  font-size: 0.72rem;
  font-weight: 700;
  animation: pop 350ms var(--ease) calc(var(--i) * 60ms + 380ms) backwards;
}

/* ---------- Components: chart card ---------- */
.chart-card {
  grid-area: chart;
  min-width: 0;
  padding: 14px 14px 10px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--edge);
}

.chart-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

/* same idea: long names wrap in the legend, the Downloads / Growth toggle stays on the right */
.chart-head > :last-child {
  flex: none;
}

.legend {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.legend li {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow-wrap: break-word;
  color: var(--ink);
  font-family: var(--font-code);
  font-size: 0.82rem;
}

.swatch {
  flex: none;
  width: 18px;
  height: 3px;
  border-radius: 2px;
  background: var(--side);
}

.swatch.dashed {
  background: repeating-linear-gradient(90deg, var(--side) 0 5px, transparent 5px 8px);
}

.chart-help {
  margin: 8px 0 4px;
  color: var(--ink-2);
  font-size: 0.78rem;
}

.chart {
  --chart-height: 280px;
}

/* ---------- Components: verdict and notes ---------- */
.verdict-block {
  grid-area: verdict;
}

.verdict {
  margin: 0 0 6px;
  padding: 14px 18px;
  border-left: 3px solid var(--accent);
  border-radius: 0 12px 12px 0;
  background: color-mix(in srgb, var(--accent) 7%, transparent);
  color: var(--ink);
  font-size: 1rem;
  line-height: 1.55;
}

.note {
  margin: 4px 0 0;
  color: var(--ink-2);
  font-size: 0.8rem;
}

/* ---------- Animations: keyframes ----------
   row-in  the six rows slide in one after another
   pop     the ✓ marks pop in after the rows */
@keyframes row-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

@keyframes pop {
  from {
    opacity: 0;
    transform: scale(0.3);
  }

  70% {
    transform: scale(1.2);
  }
}

/* ---------- Animations: open / close (Vue <Transition> classes) ----------
   backdrop  the popup fades in and the panel grows into place
   verdict   the sentence fades out and back in when it changes */
.backdrop-enter-active,
.backdrop-leave-active {
  transition: opacity 300ms var(--ease);
}

.backdrop-enter-active .compare,
.backdrop-leave-active .compare {
  transition:
    transform 400ms var(--ease),
    opacity 400ms var(--ease);
}

.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}

.backdrop-enter-from .compare,
.backdrop-leave-to .compare {
  opacity: 0;
  transform: scale(0.96) translateY(12px);
}

.verdict-enter-active,
.verdict-leave-active {
  transition: opacity 400ms var(--ease);
}

.verdict-enter-active {
  transition-delay: 300ms;
}

.verdict-enter-from,
.verdict-leave-to {
  opacity: 0;
}

/* ---------- Keyboard focus ---------- */
button:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}

/* ---------- Responsive (tablet): one column, controls on the top row ---------- */
@media (max-width: 899.98px) {
  /* narrower screens: the toggle and Clear take the top row beside the ×, the names get the full width below */
  .compare-head {
    flex-wrap: wrap;
  }

  .head-actions {
    width: 100%;
    gap: 8px;
    order: -1;
    padding-right: 44px;
  }

  .compare-body {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'rows'
      'chart'
      'verdict';
  }
}

/* ---------- Responsive (phone): full screen ---------- */
@media (max-width: 575.98px) {
  .backdrop {
    padding: 0;
  }

  .compare {
    width: 100%;
    height: 100%;
    max-height: none;
    border-radius: 0;
    border: 0;
  }

  .compare-head {
    padding: 12px 14px 12px;
  }

  .head-actions > :first-child {
    flex: 1;
    min-width: 0;
  }

  .close {
    top: 12px;
    right: 12px;
  }

  .compare-body {
    padding: 14px 14px 20px;
  }

  /* each row stacks: label on top, the two values side by side underneath */
  .row-line {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .row-label {
    grid-column: 1 / -1;
  }

  .head-line {
    display: none;
  }

  .cell {
    flex-wrap: wrap;
  }

  .cell-name {
    display: block;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--ink-2);
    font-family: var(--font-code);
    font-size: 0.72rem;
  }

  .chart {
    --chart-height: 230px;
  }
}

/* ---------- Reduced motion ---------- */
@media (prefers-reduced-motion: reduce) {
  .backdrop-enter-active,
  .backdrop-leave-active,
  .backdrop-enter-active .compare,
  .backdrop-leave-active .compare,
  .verdict-enter-active,
  .verdict-leave-active,
  .clear,
  .close {
    transition: none;
  }

  .row-line,
  .check {
    animation: none;
  }
}
</style>
