<!--
  src/components/trending/languages/detail/packageDashboard.vue

  What it does:  the detail panel on the right for the selected package:
                   rank badge + "Explore ↗" + "+ Compare", the package name,
                   the big number (counts up) with its % change, the D3 trend chart,
                   fact cards (only the ones this language's API can fill),
                   a one-line insight and the description.
                 While loading it shows grey "skeleton" shapes; if there's nothing to show,
                 a short message.
  Receives:      props  language, pkg (the selected package, with displayRank), packages (all 20,
                        ranked), period, status ('loading' | 'ready' | 'error'),
                        added (true if pkg is already in the compare tray)
  Gives back:    emits  add (the package name, when "+ Compare" is pressed)
  Used by:       languagesSection.vue.
  Children:      charts/trendChart.vue.
-->
<script setup>
// ---------- Imports ----------
import { computed } from 'vue'
import TrendChart from '@/components/trending/languages/charts/trendChart.vue'
import { useCountUp } from '@/composables/trending/useCountUp'
import { useTheme } from '@/composables/useTheme'
import {
  num,
  compact,
  pct,
  longDate,
  ordinal,
  trendClass,
  trendArrow,
  PERIOD_INFO,
} from '@/utils/trending/helpers/format'
import { packagePageUrl } from '@/utils/trending/helpers/packageLinks'
import { lineAccent } from '@/utils/trending/languages'

// ---------- Props & emits ----------
const props = defineProps({
  language: { type: Object, required: true },
  pkg: { type: Object, default: null }, // selected package (with displayRank)
  packages: { type: Array, default: () => [] }, // all 20, ranked
  period: { type: String, default: 'weekly' },
  status: { type: String, default: 'loading' },
  added: { type: Boolean, default: false }, // already in the compare tray
})
defineEmits(['add'])

const { theme } = useTheme() // 'dark' | 'light', from the navbar toggle

// ---------- Computed values ----------
// The wording and day count for the selected period (see PERIOD_INFO in helpers/format.js)
const info = computed(() => PERIOD_INFO[props.period])
// The chart's line colour (darker on the light theme so a bright accent stays visible)
const chartColor = computed(() => lineAccent(props.language, theme.value))

// The package's page on its registry website (null hides the Explore button)
const exploreUrl = computed(() =>
  props.pkg ? packagePageUrl(props.language.id, props.pkg.name) : null,
)

// % change for the selected period
const change = computed(() => (props.pkg ? props.pkg.changePercent[props.period] : null))

// The big number, counting up to its new value when it changes
const shownDownloads = useCountUp(() => (props.pkg ? props.pkg.latest[props.period] : null))

// Growth rank among the 20 (1 = biggest % increase). Packages with no % change go last.
const growthRank = computed(() => {
  if (!props.pkg) return null
  const sorted = [...props.packages].sort(
    (a, b) =>
      (b.changePercent[props.period] ?? -Infinity) - (a.changePercent[props.period] ?? -Infinity),
  )
  return sorted.findIndex((p) => p.name === props.pkg.name) + 1
})

// Fact cards: built from whatever this package has (each registry gives different extras,
// e.g. only crates.io has "Last updated", so a card only appears when its value exists)
const facts = computed(() => {
  const p = props.pkg
  if (!p) return []
  const list = [
    { label: 'Average per day', value: compact(p.latest[props.period] / info.value.days) },
    {
      label: 'Growth rank',
      value: ordinal(growthRank.value),
      small: `of ${props.packages.length}`,
    },
  ]
  if (p.allTimeDownloads)
    list.push({ label: 'All-time downloads', value: compact(p.allTimeDownloads) })
  if (p.latestVersion) list.push({ label: 'Latest version', value: p.latestVersion, code: true })
  if (p.licence) list.push({ label: 'Licence', value: p.licence })
  if (p.lastUpdated) list.push({ label: 'Last updated', value: longDate(p.lastUpdated) })
  return list
})

// How many days in the latest period are estimates (npm's missing days, see math/trendMath.js)
const estimatedInLatest = computed(() => {
  if (!props.pkg) return 0
  return props.pkg.daily.slice(-info.value.days).filter((d) => d.estimated).length
})

// One plain sentence that sums up the numbers (the box with the coloured left edge)
const insight = computed(() => {
  if (!props.pkg) return ''
  const c = change.value
  const count = props.packages.length
  let text = `${ordinal(props.pkg.displayRank)} most downloaded of the top ${count} ${props.language.name} packages in the ${info.value.latest}. `
  if (c === null) text += 'Not enough history to compare with the period before.'
  else if (c >= 0)
    text += `Up ${pct(c).replace('+', '')} on ${info.value.previous}, the ${ordinal(growthRank.value)} fastest growth of the ${count}.`
  else
    text += `Down ${pct(c).replace('−', '')} on ${info.value.previous}, ${ordinal(growthRank.value)} of ${count} for growth.`
  if (estimatedInLatest.value)
    text += ` Includes ${estimatedInLatest.value} estimated day${estimatedInLatest.value > 1 ? 's' : ''} where ${props.language.registry} recorded no data.`
  return text
})
</script>

<template>
  <aside class="panel card rounded-4" :aria-label="pkg ? `${pkg.name} details` : 'Package details'">
    <Transition name="swap" mode="out-in">
      <!-- Only one of these three sections shows at a time; <Transition> fades between them -->

      <!-- ===================== Loading ===================== -->
      <section v-if="status === 'loading'" key="loading" class="skeleton" aria-busy="true">
        <span class="bone w40"></span>
        <span class="bone w60 tall"></span>
        <span class="bone w80"></span>
        <span class="bone chart"></span>
        <div class="bone-row">
          <span class="bone"></span><span class="bone"></span><span class="bone"></span>
        </div>
      </section>

      <!-- ===================== Error / nothing yet ===================== -->
      <section v-else-if="status === 'error' || !pkg" key="empty" class="empty">
        <h5 class="fw-bold mb-0">No package to show yet</h5>
        <p class="description">
          Once {{ language.name }} packages load, pick one to see its downloads here.
        </p>
      </section>

      <!-- ===================== Package detail ===================== -->
      <section v-else :key="language.id + '/' + pkg.name" class="detail">
        <!-- Header: rank badge, Explore + Compare buttons, then the name on its own line -->
        <div class="head">
          <span class="rank-badge" :title="`Ranked by downloads in the ${info.latest}`">
            #{{ pkg.displayRank }}<small> of {{ packages.length }}</small>
          </span>
          <span class="spacer"></span>
          <h3 class="title">{{ pkg.name }}</h3>
          <div class="actions">
            <a
              v-if="exploreUrl"
              class="explore-btn"
              :href="exploreUrl"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="`Explore ${pkg.name} on ${language.registry} (opens in a new tab)`"
            >
              Explore <span class="explore-arrow" aria-hidden="true">↗</span>
            </a>
            <button
              type="button"
              class="compare-btn"
              :class="{ added }"
              :aria-pressed="added"
              @click="$emit('add', pkg.name)"
            >
              <span v-if="added">✓ Added</span>
              <span v-else>+ Compare</span>
            </button>
          </div>
        </div>

        <!-- Headline: the big number and its % change -->
        <div class="headline">
          <span class="headline-number">{{ num(shownDownloads) }}</span>
          <span class="headline-text">
            downloads, {{ info.latest }}
            <span class="change" :class="trendClass(change)"
              >{{ trendArrow(change) }} {{ pct(change) }}</span
            >
            vs {{ info.previous }}
          </span>
        </div>

        <!-- The D3 trend chart (bars for Monthly; drag-to-zoom for Daily) -->
        <TrendChart
          class="chart"
          :points="pkg[period]"
          :kind="period === 'monthly' ? 'bar' : 'line'"
          :color="chartColor"
          :fill="language.accent"
          :unit="info.unit"
          :zoomable="period === 'daily'"
        />

        <!-- Fact cards (only those with data) -->
        <dl class="facts">
          <div v-for="fact in facts" :key="fact.label" class="fact">
            <dt>{{ fact.label }}</dt>
            <dd :class="{ code: fact.code }">
              {{ fact.value }}<small v-if="fact.small"> {{ fact.small }}</small>
            </dd>
          </div>
        </dl>

        <!-- Insight sentence and description -->
        <p class="insight">{{ insight }}</p>

        <p v-if="pkg.description" class="description">{{ pkg.description }}</p>
      </section>
    </Transition>
  </aside>
</template>

<style scoped>
/*
  Sections, in order: layout → header (badge, name, buttons) → headline → facts → loading skeleton
  → animations → keyboard focus → responsive → reduced motion.
  (Rules are kept in their original order on purpose: a later CSS rule can override an earlier one.)
*/

/* ---------- Layout ---------- */
/* the card, with a soft glow of the language colour in its top-right corner */
.panel {
  min-width: 0;
  padding: 22px 24px 24px;
  background:
    radial-gradient(
      120% 50% at 100% 0%,
      color-mix(in srgb, var(--accent) 10%, transparent),
      transparent 60%
    ),
    var(--card) !important;
  transition: background 600ms var(--ease);
}

.detail,
.empty,
.skeleton {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ---------- Components: header ---------- */
.head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.rank-badge {
  flex: none;
  padding: 4px 10px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-line) 50%, transparent);
  color: var(--ink);
  font-size: 1.05rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* light theme: a stronger tint of the accent, so the badge stands out from white */
:root[data-bs-theme='light'] .rank-badge {
  background: color-mix(in srgb, var(--accent) 28%, transparent);
}

.rank-badge small {
  color: var(--ink-2);
  font-size: 0.72rem;
  font-weight: 400;
}

.head .spacer {
  flex: 1;
}

/* the name gets its own line under the rank badge and the Compare button */
.title {
  order: 3;
  flex: 1 1 100%;
  min-width: 0;
  margin: 0;
  font-family: var(--font-code);
  font-size: clamp(1.4rem, 2.4vw, 2rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: var(--ink);
  overflow-wrap: anywhere;
}

.compare-btn {
  flex: none;
  padding: 7px 14px;
  border: 1px solid color-mix(in srgb, var(--accent-line) 60%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--ink);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 200ms var(--ease),
    color 200ms var(--ease),
    transform 200ms var(--ease);
}

.compare-btn:hover {
  background: color-mix(in srgb, var(--accent) 24%, transparent);
}

/* light theme: stronger tints of the accent (the faint ones barely show on white) */
:root[data-bs-theme='light'] .compare-btn {
  background: color-mix(in srgb, var(--accent) 28%, transparent);
}

:root[data-bs-theme='light'] .compare-btn:hover {
  background: color-mix(in srgb, var(--accent) 42%, transparent);
}

:root[data-bs-theme='light'] .compare-btn.added {
  background: var(--accent);
}

.compare-btn:active {
  transform: scale(0.96);
}

.compare-btn.added {
  background: var(--accent);
  color: var(--on-accent);
  animation: pop 300ms var(--ease);
}

/* Explore + Compare stay together, so they wrap as one group */
.actions {
  flex: none;
  display: flex;
  gap: 8px;
}

/* Explore: outline version of the Compare pill, so Compare stays the main action */
.explore-btn {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  border: 1px solid color-mix(in srgb, var(--accent-line) 45%, transparent);
  border-radius: 999px;
  background: transparent;
  color: var(--ink-2);
  font-size: 0.85rem;
  font-weight: 600;
  line-height: normal;
  text-decoration: none;
  transition:
    border-color 200ms var(--ease),
    color 200ms var(--ease),
    transform 200ms var(--ease);
}

.explore-arrow {
  display: inline-block;
  transition: transform 200ms var(--ease);
}

.explore-btn:hover {
  border-color: color-mix(in srgb, var(--accent-line) 80%, transparent);
  color: var(--ink);
  transform: translateY(-1px);
}

.explore-btn:hover .explore-arrow {
  transform: translate(2px, -2px);
}

.explore-btn:active {
  transform: scale(0.96);
}

/* ---------- Components: headline ---------- */
.headline-number {
  display: block;
  color: var(--ink);
  font-size: clamp(2.1rem, 3.4vw, 3rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.headline-text {
  display: block;
  margin-top: 6px;
  color: var(--ink-2);
  font-size: 0.92rem;
}

.change {
  font-weight: 700;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.change.up {
  color: var(--up);
}

.change.down {
  color: var(--down);
}

.change.flat {
  color: var(--ink-2);
}

.chart {
  --chart-height: 280px;
}

/* ---------- Components: fact cards, insight, description ---------- */
.facts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  margin: 4px 0 0;
}

.fact {
  padding: 12px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--ink) 3%, transparent);
  border: 1px solid var(--edge);
}

.fact dt {
  color: var(--ink-2);
  font-size: 0.75rem;
  font-weight: 400;
}

.fact dd {
  margin: 6px 0 0;
  color: var(--ink);
  font-size: 1.08rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.fact dd small {
  margin-left: 4px;
  color: var(--ink-2);
  font-weight: 400;
  font-size: 0.78rem;
}

.fact dd.code {
  font-family: var(--font-code);
  font-size: 0.98rem;
}

.insight {
  margin: 0;
  padding: 12px 16px;
  border-left: 3px solid var(--accent-line);
  border-radius: 0 10px 10px 0;
  background: color-mix(in srgb, var(--accent) 7%, transparent);
  color: var(--ink);
  font-size: 0.9rem;
  line-height: 1.55;
}

.description {
  margin: 0;
  color: var(--ink-2);
  line-height: 1.5;
}

/* ---------- Components: loading skeleton (grey shapes that shimmer) ---------- */
.bone {
  display: block;
  height: 14px;
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--ink) 4%, transparent),
    color-mix(in srgb, var(--ink) 10%, transparent),
    color-mix(in srgb, var(--ink) 4%, transparent)
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}

.bone.tall {
  height: 40px;
}

.bone.chart {
  height: 260px;
  border-radius: 14px;
}

.w40 {
  width: 40%;
}

.w60 {
  width: 60%;
}

.w80 {
  width: 80%;
}

.bone-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.bone-row .bone {
  height: 60px;
}

/* ---------- Animations ----------
   pop      "+ Compare" bounces when it turns into "✓ Added"
   shimmer  the light sweeping across the loading skeleton */
@keyframes pop {
  50% {
    transform: scale(1.08);
  }
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}

/* the panel's content fades and slides when it changes (the <Transition name="swap">) */
.swap-enter-active,
.swap-leave-active {
  transition:
    opacity 260ms var(--ease),
    transform 260ms var(--ease);
}

.swap-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.swap-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ---------- Keyboard focus ---------- */
button:focus-visible,
.explore-btn:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}

/* ---------- Responsive (phone) ---------- */
@media (max-width: 575.98px) {
  .panel {
    padding: 16px 14px 18px;
  }

  .chart {
    --chart-height: 230px;
  }

  /* phones: the two buttons share their own row, equal widths */
  .actions {
    flex: 1 1 100%;
  }

  .actions > * {
    flex: 1;
    justify-content: center;
  }
}

/* ---------- Reduced motion ---------- */
@media (prefers-reduced-motion: reduce) {
  .swap-enter-active,
  .swap-leave-active,
  .compare-btn,
  .explore-btn,
  .explore-arrow {
    transition: none;
  }

  .explore-btn:hover,
  .explore-btn:hover .explore-arrow,
  .explore-btn:active {
    transform: none;
  }

  .bone,
  .compare-btn.added {
    animation: none;
  }
}
</style>
