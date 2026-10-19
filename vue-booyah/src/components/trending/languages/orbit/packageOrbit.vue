<!--
  src/components/trending/languages/orbit/packageOrbit.vue

  What it does:  the left-hand card: the open language's glowing orb and a scrollable arc of its
                 top 20 packages.
                   - Packages are ranked by downloads for the selected period (#1 = most downloaded).
                   - Scroll (wheel, trackpad, touch) to move along the arc. The package in the middle
                     sits furthest out, like a wheel turning; packages near the edges fade away.
                   - When scrolling stops, the package in the middle is selected automatically,
                     so the detail panel and graph follow the wheel (no click needed).
                   - ↑ ↓ on a package move the selection.
                   - The lines from the orb are worked out by D3 (d3.linkHorizontal) and follow the
                     scroll live.
                   - Each row has a "+" button that adds the package to Compare.
                   - Phones (under 576px): a small orb on the left with lines branching out to a
                     list of the packages beside it (top 5 first, "Show all 20" for the rest).
  Receives:      props  language (the open language's settings), packages (ranked, with displayRank),
                        selectedName, period, status ('loading' | 'ready' | 'error'),
                        errorMessage, trayIds (ids of packages already in the compare tray)
  Gives back:    emits  select (a package name was chosen), retry ("Try again" was pressed),
                        add (a package name to add to Compare)
  Used by:       languagesSection.vue.
-->
<script setup>
// ---------- Imports ----------
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as d3 from 'd3'
import { useMediaQuery } from '@vueuse/core'
import { compact, pct, trendClass, PERIOD_INFO } from '@/utils/trending/helpers/format'
import { prefersReducedMotion } from '@/utils/trending/helpers/motion'
import { useCountUp } from '@/composables/trending/useCountUp'

// ---------- Props & emits ----------
const props = defineProps({
  language: { type: Object, required: true },
  packages: { type: Array, default: () => [] }, // ranked: each has displayRank
  selectedName: { type: String, default: '' },
  period: { type: String, default: 'weekly' },
  status: { type: String, default: 'loading' },
  errorMessage: { type: String, default: '' },
  trayIds: { type: Array, default: () => [] },
})
const emit = defineEmits(['select', 'retry', 'add'])

// ---------- State ----------
const root = ref(null) // the whole card, measured by a ResizeObserver
const scroller = ref(null) // the scrollable arc
const width = ref(0) // card size in px
const height = ref(0)
const scrollTop = ref(0) // how far the arc is scrolled, in px
const hoveredName = ref('') // the package under the mouse (its line lights up)
const mainButtons = reactive({}) // each package's main button, by name (for keyboard focus)
let observer = null
let frame = 0 // the pending requestAnimationFrame for scrolling
let settleTimer = 0 // waits for the wheel to stop before selecting the middle package
// Phones: the tree (orb + list) and the parts its lines are measured from
const tree = ref(null)
const treeOrb = ref(null)
const treeDots = reactive({}) // each package's dot, by name
const treeGeo = ref(null) // { w, h, sx, orbY, ends: { name: [x, y] } }, see measureTree()
const showAll = ref(false) // phones: "Show all 20" pressed

// How long the arc must sit still (ms) before the package in the middle becomes the selection.
// Short enough to feel live, long enough that the chart doesn't redraw for every package flicked past
// (and that a smooth programmatic scroll, e.g. after a click, only selects where it lands).
const SETTLE_MS = 140

// Phones: how many packages show before "Show all", and the radius of the small orb
const PHONE_TOP = 5
const PHONE_ORB_R = 22

// D3's curve maker: given a start and end point it returns an SVG path with a smooth S-bend
const link = d3.linkHorizontal()

// ---------- Helpers (used by the computed values below) ----------
/** Keeps a number between lo and hi. */
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// ---------- Computed values ----------
// Phones get the tree. Same breakpoint as the page's phone CSS (languagesSection.vue), so the
// orbit card never shrinks to phone size while the orb is still drawn (that collapsed the card)
const isCompact = useMediaQuery('(max-width: 575.98px)')

// Phones: the packages the tree shows: the top 5 (or all 20 after "Show all"), always reaching
// down to the selected one so it's never hidden
const treePackages = computed(() => {
  if (showAll.value) return props.packages
  const i = props.packages.findIndex((p) => p.name === props.selectedName)
  return props.packages.slice(0, Math.max(PHONE_TOP, i + 1))
})

// A new key replays the draw-in animation (new language or new period)
const drawKey = computed(() => `${props.language.id}-${props.period}`)

// Every size and position the arc needs, in pixels, worked out from the card's size
const layout = computed(() => {
  const W = width.value
  const H = height.value
  const centre = H / 2
  const r = W < 640 ? 50 : 60 // smaller orb on narrow screens
  const orb = { x: clamp(W * 0.13, 96, 140), y: centre, r }
  const fanLeft = orb.x + orb.r + clamp(W * 0.07, 34, 90) // where the scroll area starts
  const bulge = clamp(W - fanLeft - 380, 24, 150) // how far the middle sticks out
  const spacing = clamp(H / 8.5, 64, 80) // gap between packages
  const pad = centre // lets #1 and #20 reach the middle
  const trackHeight = pad * 2 + spacing * Math.max(0, props.packages.length - 1)
  const scrollerWidth = W - fanLeft - 28 // matches .scroller's right: 28px
  return { W, H, centre, orb, fanLeft, bulge, spacing, pad, trackHeight, scrollerWidth }
})

// Every package's position, recalculated as you scroll.
// t = how far a package is from the middle (-1 top edge, 0 middle, 1 bottom edge).
// The middle one bulges out the most (x), and packages near the edges fade out.
const nodes = computed(() => {
  const { H, centre, fanLeft, bulge, spacing, pad } = layout.value
  return props.packages.map((pkg, index) => {
    const contentY = pad + index * spacing // position inside the scrolling track
    const viewY = contentY - scrollTop.value // position on screen
    const t = (viewY - centre) / (H / 2) // -1 top edge, 0 middle, 1 bottom edge
    const x = fanLeft + 24 + bulge * (1 - Math.min(1, t * t))
    const away = Math.abs(t)
    const fade = away < 0.72 ? 1 : Math.max(0.06, 1 - (away - 0.72) / 0.4)
    return { ...pkg, index, contentY, viewY, x, fade, visible: away < 1.08 }
  })
})

const selectedNode = computed(() => nodes.value.find((n) => n.name === props.selectedName) || null)

// Which rank is in the middle right now (for the rail of ticks on the right)
const centreIndex = computed(() =>
  Math.max(
    0,
    Math.min(props.packages.length - 1, Math.round(scrollTop.value / layout.value.spacing)),
  ),
)

// The orb's total: all 20 packages' downloads for the period, counting up when it changes
const total = computed(() => props.packages.reduce((n, p) => n + (p.latest[props.period] || 0), 0))
const shownTotal = useCountUp(() => (props.status === 'ready' ? total.value : null))

// ---------- Watchers ----------
// Whenever the selection or the order changes, bring the selected package to the middle.
// The first time a list appears it jumps there; after that it scrolls smoothly.
watch(
  () => [props.selectedName, drawKey.value, props.status, isCompact.value],
  async (now, old) => {
    await nextTick()
    const i = props.packages.findIndex((p) => p.name === props.selectedName)
    if (i < 0) return
    const firstShow = !old || old[2] !== 'ready' || old[1] !== drawKey.value
    scrollToIndex(i, !firstShow)
    if (scroller.value && firstShow) scrollTop.value = i * layout.value.spacing
  },
  { immediate: true },
)

// Phones: a new language starts with the short list again
watch(
  () => props.language.id,
  () => (showAll.value = false),
)

// Phones: re-measure the tree's lines whenever its rows move
watch(
  () => [
    isCompact.value,
    width.value,
    height.value,
    treePackages.value.length,
    drawKey.value,
    props.status,
  ],
  measureTree,
  { flush: 'post' },
)

// ---------- Functions ----------

/** true if this package is already in the compare tray. */
const isAdded = (name) => props.trayIds.includes(`${props.language.id}/${name}`)

/** Tells the parent which package was chosen. */
const choose = (name) => emit('select', name)

/** The SVG path for the line from the orb to one package (D3 works out the curve). */
function linkPath(node) {
  const { orb, centre } = layout.value
  return link({ source: [orb.x + orb.r * 0.85, centre], target: [node.x - 8, node.viewY] })
}

/**
 * Records the scroll position, at most once per frame, so the arc and lines follow smoothly.
 * Once the scrolling settles, the package sitting in the middle of the wheel is selected,
 * so the detail panel and its graph follow the wheel without needing a click.
 */
function onScroll() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    if (scroller.value) scrollTop.value = scroller.value.scrollTop
  })
  clearTimeout(settleTimer)
  settleTimer = setTimeout(selectCentre, SETTLE_MS)
}

/** Selects the package currently in the middle of the wheel (if it isn't already selected). */
function selectCentre() {
  if (!scroller.value || props.status !== 'ready') return
  scrollTop.value = scroller.value.scrollTop // use the final resting position
  const pkg = props.packages[centreIndex.value]
  if (pkg && pkg.name !== props.selectedName) choose(pkg.name)
}

/** Scrolls so that package number `index` sits in the middle. */
function scrollToIndex(index, smooth = true) {
  if (!scroller.value) return
  scroller.value.scrollTo({
    top: index * layout.value.spacing,
    behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto',
  })
}

/**
 * An element's position inside `ancestor`, from offsetLeft/offsetTop (these ignore CSS
 * transforms, so the rows' slide-in animation doesn't skew the lines).
 */
function offsetIn(el, ancestor) {
  let x = 0
  let y = 0
  while (el && el !== ancestor) {
    x += el.offsetLeft
    y += el.offsetTop
    el = el.offsetParent
  }
  return { x, y }
}

/** Phones: measures where the tree's lines start (the orb) and end (each package's dot). */
function measureTree() {
  if (!isCompact.value || !tree.value || !treeOrb.value) {
    treeGeo.value = null
    return
  }
  const orb = offsetIn(treeOrb.value, tree.value)
  const ends = {}
  for (const pkg of treePackages.value) {
    const dot = treeDots[pkg.name]
    if (!dot) continue
    const at = offsetIn(dot, tree.value)
    ends[pkg.name] = [at.x, at.y + dot.offsetHeight / 2]
  }
  // the orb sits level with the middle of the first 5 rows (and stays there on "Show all")
  const firstFew = treePackages.value
    .slice(0, PHONE_TOP)
    .map((p) => ends[p.name])
    .filter(Boolean)
  const orbY = firstFew.length ? (firstFew[0][1] + firstFew[firstFew.length - 1][1]) / 2 : 0
  treeGeo.value = {
    w: tree.value.offsetWidth,
    h: tree.value.offsetHeight,
    sx: orb.x + treeOrb.value.offsetWidth / 2, // the middle of the orb
    orbY,
    ends,
  }
}

/** Phones: the line from the orb's right edge to one package's dot (D3's S-curve, like the arc). */
function treePath(name) {
  const geo = treeGeo.value
  const end = geo && geo.ends[name]
  if (!end) return ''
  return link({ source: [geo.sx + PHONE_ORB_R * 0.85, geo.orbY], target: end })
}

/** ↑ ↓ (and ← → on phones) move the selection and keep keyboard focus on it. */
function onKeydown(event) {
  const back = event.key === 'ArrowUp' || (isCompact.value && event.key === 'ArrowLeft')
  const forward = event.key === 'ArrowDown' || (isCompact.value && event.key === 'ArrowRight')
  if (!back && !forward) return
  const i = props.packages.findIndex((p) => p.name === props.selectedName)
  const next = props.packages[forward ? i + 1 : i - 1]
  event.preventDefault()
  if (!next) return
  choose(next.name)
  nextTick(() => {
    const el = mainButtons[next.name]
    if (el) el.focus({ preventScroll: !isCompact.value })
  })
}

// ---------- Lifecycle ----------
onMounted(() => {
  // re-measure the card whenever it changes size; the whole layout follows from width/height
  observer = new ResizeObserver(([entry]) => {
    width.value = entry.contentRect.width
    height.value = entry.contentRect.height
  })
  observer.observe(root.value)
})
onBeforeUnmount(() => observer && observer.disconnect())
onBeforeUnmount(() => cancelAnimationFrame(frame))
onBeforeUnmount(() => clearTimeout(settleTimer))
</script>

<template>
  <div ref="root" class="orbit" :class="{ compact: isCompact }">
    <!-- ===================== Desktop / tablet: orb + arc ===================== -->
    <template v-if="!isCompact && width > 0">
      <!-- Lines from the orb to each visible package (behind everything) -->
      <svg class="links" :width="width" :height="height" aria-hidden="true">
        <g v-if="status === 'ready'" :key="drawKey">
          <path
            v-for="node in nodes.filter((n) => n.visible)"
            :key="node.name"
            :d="linkPath(node)"
            pathLength="1"
            class="link"
            :class="{ active: node.name === selectedName, hot: node.name === hoveredName }"
            :style="{ '--delay': node.index * 25 + 'ms', opacity: node.fade }"
          />
          <path
            v-if="selectedNode && selectedNode.visible"
            :d="linkPath(selectedNode)"
            pathLength="1"
            class="flow"
          />
        </g>
      </svg>

      <!-- The language orb -->
      <div
        class="orb"
        :class="{ loading: status === 'loading' }"
        :style="{
          left: layout.orb.x + 'px',
          top: layout.orb.y + 'px',
          '--size': layout.orb.r * 2 + 'px',
        }"
      >
        <span class="orb-ring"></span>
        <span class="orb-core"></span>
        <span class="orb-label">
          <strong>{{ language.name }}</strong>
          <template v-if="status === 'ready'">
            <span class="orb-total">{{ compact(shownTotal) }}</span>
            <span
              >downloads by the top {{ packages.length }}, {{ PERIOD_INFO[period].latest }}</span
            >
          </template>
          <span v-else-if="status === 'loading'"
            >Fetching the top 20 from {{ language.registry }}…</span
          >
        </span>
      </div>

      <!-- The scrollable arc of packages (each row: main button + "+" add-to-compare button) -->
      <div
        v-if="status === 'ready'"
        ref="scroller"
        class="scroller"
        :style="{ left: layout.fanLeft + 'px' }"
        @scroll="onScroll"
      >
        <div
          :key="drawKey"
          class="track"
          role="list"
          :aria-label="`${language.name} packages ranked by downloads, ${PERIOD_INFO[period].latest}`"
          :style="{ height: layout.trackHeight + 'px' }"
          @keydown="onKeydown"
        >
          <div
            v-for="node in nodes"
            :key="node.name"
            class="node"
            role="listitem"
            :class="{ active: node.name === selectedName }"
            :style="{
              top: node.contentY + 'px',
              left: node.x - layout.fanLeft + 'px',
              opacity: node.fade,
              maxWidth: layout.scrollerWidth - (node.x - layout.fanLeft) + 'px',
              '--delay': 100 + node.index * 25 + 'ms',
            }"
            @mouseenter="hoveredName = node.name"
            @mouseleave="hoveredName = ''"
          >
            <button
              :ref="(el) => (mainButtons[node.name] = el)"
              type="button"
              class="node-main"
              :aria-current="node.name === selectedName ? 'true' : undefined"
              :tabindex="node.name === selectedName ? 0 : -1"
              :title="node.name"
              @click="choose(node.name)"
            >
              <span class="node-dot"></span>
              <span class="node-rank">#{{ node.displayRank }}</span>
              <span class="node-body">
                <span class="node-name">{{ node.name }}</span>
                <span class="node-meta">
                  <strong>{{ compact(node.latest[period]) }}</strong>
                  <span class="pill" :class="trendClass(node.changePercent[period])">
                    {{ pct(node.changePercent[period]) }}
                  </span>
                </span>
              </span>
            </button>
            <button
              type="button"
              class="add"
              :class="{ added: isAdded(node.name) }"
              :tabindex="node.name === selectedName ? 0 : -1"
              :aria-label="
                isAdded(node.name) ? `${node.name} added to compare` : `Add ${node.name} to compare`
              "
              :title="isAdded(node.name) ? 'Added to compare' : 'Add to compare'"
              :aria-pressed="isAdded(node.name)"
              @click="$emit('add', node.name)"
            >
              <span aria-hidden="true">{{ isAdded(node.name) ? '✓' : '+' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Position rail on the right: one tick per rank (the long one is in the middle) -->
      <div v-if="status === 'ready'" class="rail" aria-hidden="true">
        <button
          v-for="node in nodes"
          :key="node.name"
          type="button"
          class="tick"
          :class="{ current: node.index === centreIndex, active: node.name === selectedName }"
          tabindex="-1"
          :title="`#${node.displayRank} ${node.name}`"
          @click="choose(node.name)"
        ></button>
      </div>

      <!-- Error message with "Try again" -->
      <div
        v-if="status === 'error'"
        class="message"
        :style="{ left: layout.fanLeft + 'px' }"
        role="alert"
      >
        <p>
          <strong>Couldn't load {{ language.name }} packages.</strong>
        </p>
        <p class="muted">
          {{ language.registry }} didn't answer ({{ errorMessage }}). Check your connection and try
          again.
        </p>
        <button type="button" class="btn-accent" @click="$emit('retry')">Try again</button>
      </div>
    </template>

    <!-- ===================== Phone: a small orb branching out to a list ===================== -->
    <div v-if="isCompact" ref="tree" class="tree">
      <!-- Lines from the orb down to each package (behind everything) -->
      <svg
        v-if="status === 'ready' && treeGeo"
        class="links"
        :width="treeGeo.w"
        :height="treeGeo.h"
        aria-hidden="true"
      >
        <g :key="drawKey">
          <path
            v-for="(pkg, i) in treePackages"
            :key="pkg.name"
            :d="treePath(pkg.name)"
            pathLength="1"
            class="link"
            :class="{ active: pkg.name === selectedName, hot: pkg.name === hoveredName }"
            :style="{ '--delay': i * 40 + 'ms' }"
          />
          <path v-if="selectedName" :d="treePath(selectedName)" pathLength="1" class="flow" />
        </g>
      </svg>

      <!-- The language's name and total, above everything -->
      <p class="tree-label">
        <strong>{{ language.name }}</strong>
        <template v-if="status === 'ready'">
          <span class="orb-total">{{ compact(shownTotal) }}</span>
          <span>downloads by the top {{ packages.length }}, {{ PERIOD_INFO[period].latest }}</span>
        </template>
        <span v-else-if="status === 'loading'"
          >Fetching the top 20 from {{ language.registry }}…</span
        >
      </p>

      <!-- The language orb (small, on the left, level with the middle of the top 5 rows) -->
      <div
        ref="treeOrb"
        class="tree-orb"
        :style="treeGeo && treeGeo.orbY ? { top: treeGeo.orbY + 'px' } : null"
      >
        <div class="orb" :class="{ loading: status === 'loading' }">
          <span class="orb-ring"></span>
          <span class="orb-core"></span>
        </div>
      </div>

      <!-- Loading placeholders -->
      <div v-if="status === 'loading'" class="tree-list placeholder-glow" aria-busy="true">
        <span v-for="n in PHONE_TOP" :key="n" class="placeholder row-bone"></span>
      </div>
      <!-- Error message with "Try again" -->
      <div v-else-if="status === 'error'" class="compact-msg" role="alert">
        <p>
          <strong>Couldn't load {{ language.name }} packages.</strong> {{ errorMessage }}
        </p>
        <button type="button" class="btn-accent" @click="$emit('retry')">Try again</button>
      </div>
      <!-- The packages (each row: main button + "+" add-to-compare button) -->
      <template v-else>
        <div
          :key="drawKey"
          class="tree-list"
          role="list"
          :aria-label="`${language.name} packages ranked by downloads, ${PERIOD_INFO[period].latest}`"
          @keydown="onKeydown"
        >
          <div
            v-for="(pkg, i) in treePackages"
            :key="pkg.name"
            class="node tree-node"
            role="listitem"
            :class="{ active: pkg.name === selectedName }"
            :style="{ '--delay': 100 + i * 40 + 'ms' }"
            @mouseenter="hoveredName = pkg.name"
            @mouseleave="hoveredName = ''"
          >
            <button
              :ref="(el) => (mainButtons[pkg.name] = el)"
              type="button"
              class="node-main"
              :aria-current="pkg.name === selectedName ? 'true' : undefined"
              :tabindex="pkg.name === selectedName ? 0 : -1"
              :title="pkg.name"
              @click="choose(pkg.name)"
            >
              <span :ref="(el) => (treeDots[pkg.name] = el)" class="node-dot"></span>
              <span class="node-rank">#{{ pkg.displayRank }}</span>
              <span class="node-body">
                <span class="node-name">{{ pkg.name }}</span>
                <span class="node-meta">
                  <strong>{{ compact(pkg.latest[period]) }}</strong>
                  <span class="pill" :class="trendClass(pkg.changePercent[period])">
                    {{ pct(pkg.changePercent[period]) }}
                  </span>
                </span>
              </span>
            </button>
            <button
              type="button"
              class="add"
              :class="{ added: isAdded(pkg.name) }"
              :tabindex="pkg.name === selectedName ? 0 : -1"
              :aria-label="
                isAdded(pkg.name) ? `${pkg.name} added to compare` : `Add ${pkg.name} to compare`
              "
              :title="isAdded(pkg.name) ? 'Added to compare' : 'Add to compare'"
              :aria-pressed="isAdded(pkg.name)"
              @click="$emit('add', pkg.name)"
            >
              <span aria-hidden="true">{{ isAdded(pkg.name) ? '✓' : '+' }}</span>
            </button>
          </div>
        </div>
        <!-- Show the rest of the 20 (or go back to the short list) -->
        <button
          v-if="packages.length > PHONE_TOP"
          type="button"
          class="tree-more"
          :aria-expanded="showAll"
          @click="showAll = !showAll"
        >
          {{ showAll ? 'Show fewer' : `Show all ${packages.length}` }}
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
/*
  Sections, in order: layout → lines → orb → scrollable arc → "+" button → rail → messages
  → % pills → phone tree → animations → light theme → keyboard focus → reduced motion.
  (There's no separate "responsive" block: on phones the template shows the tree instead,
   decided in the script by isCompact.)
  (Rules are kept in their original order on purpose: in CSS, a later rule can override an
   earlier one, so reordering could change how things look.)
*/

/* ---------- Layout ---------- */
/* fills the card it sits in (a Bootstrap card is a flex column) */
.orbit {
  position: relative;
  flex: 1 1 auto;
  width: 100%;
}

.orbit.compact {
  flex: none;
}

/* ---------- Components: lines from the orb (drawn with D3's curve) ---------- */
.links {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.link {
  fill: none;
  stroke: var(--line);
  stroke-width: 1.25;
  stroke-linecap: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: draw 600ms var(--ease) var(--delay, 0ms) forwards;
  transition:
    stroke 250ms var(--ease),
    stroke-width 250ms var(--ease);
}

.link.hot {
  stroke: color-mix(in srgb, var(--accent-line) 70%, transparent);
  stroke-width: 1.75;
}

.link.active {
  stroke: var(--accent-line);
  stroke-width: 2.25;
}

.flow {
  fill: none;
  stroke: var(--accent-line);
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-dasharray: 0.07 0.93;
  filter: drop-shadow(0 0 7px var(--accent));
  animation: flow 2.2s linear infinite;
}

/* ---------- Components: orb ---------- */
.orb {
  position: absolute;
  width: var(--size);
  height: var(--size);
  transform: translate(-50%, -50%);
  z-index: 2;
}

.orb-ring {
  position: absolute;
  inset: -12px;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    var(--accent-line),
    transparent 35%,
    var(--accent-line) 50%,
    transparent 85%,
    var(--accent-line)
  );
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px));
  animation: spin 12s linear infinite;
}

.orb.loading .orb-ring {
  animation-duration: 1.6s;
}

.orb-core {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.45), transparent 42%),
    radial-gradient(circle at 50% 55%, var(--accent), var(--bg) 82%);
  box-shadow:
    0 0 46px -6px var(--accent),
    inset 0 0 20px rgba(0, 0, 0, 0.45);
  transition:
    background 600ms var(--ease),
    box-shadow 600ms var(--ease);
  animation: breathe 5s ease-in-out infinite;
}

.orb-label {
  position: absolute;
  top: calc(100% + 22px);
  left: 50%;
  transform: translateX(-50%);
  display: grid;
  gap: 2px;
  width: 170px;
  text-align: center;
  color: var(--ink-2);
  font-size: 0.8rem;
  line-height: 1.35;
}

.orb-label strong {
  color: var(--ink);
  font-size: 1.15rem;
}

.orb-total {
  color: var(--ink);
  font-size: 1.55rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

/* ---------- Components: scrollable arc ---------- */
.scroller {
  position: absolute;
  top: 0;
  right: 28px;
  bottom: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-snap-type: y proximity;
  scrollbar-width: none;
  z-index: 1;
  /* soft fade at the top and bottom edges */
  -webkit-mask: linear-gradient(transparent, #000 12%, #000 88%, transparent);
  mask: linear-gradient(transparent, #000 12%, #000 88%, transparent);
}

.scroller::-webkit-scrollbar {
  display: none;
}

.track {
  position: relative;
}

.node {
  position: absolute;
  transform: translate(-8px, -50%);
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 14px;
  scroll-snap-align: center;
  animation: slide-in 450ms var(--ease) var(--delay) backwards;
  transition: background-color 250ms var(--ease);
}

.node:hover {
  background: color-mix(in srgb, var(--ink) 4%, transparent);
}

.node.active {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}

.node-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 8px 4px 8px 0;
  border: 0;
  border-radius: 14px;
  background: none;
  color: var(--ink);
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}

.node-dot {
  flex: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--bg);
  border: 2px solid var(--accent-line);
  transition:
    background-color 250ms var(--ease),
    box-shadow 250ms var(--ease),
    transform 250ms var(--ease);
}

.node:hover .node-dot {
  transform: scale(1.2);
  box-shadow: 0 0 14px var(--accent);
}

.node.active .node-dot {
  background: var(--accent-line);
  box-shadow:
    0 0 0 5px color-mix(in srgb, var(--accent-line) 25%, transparent),
    0 0 20px var(--accent);
}

.node-rank {
  flex: none;
  min-width: 2.6em;
  padding: 3px 7px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--ink) 6%, transparent);
  color: var(--ink-2);
  font-size: 0.8rem;
  font-weight: 700;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.node.active .node-rank {
  background: var(--accent);
  color: var(--on-accent);
}

.node-body {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.node-name {
  overflow: hidden;
  text-overflow: ellipsis;
  /* long names end in "…"; the full name shows on hover */
  font-family: var(--font-code);
  font-size: 0.95rem;
  color: var(--ink-2);
  transition: color 250ms var(--ease);
}

.node:hover .node-name,
.node.active .node-name {
  color: var(--ink);
}

.node-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
}

.node-meta strong {
  color: var(--ink);
}

/* ---------- Components: "+" add to compare ---------- */
.add {
  flex: none;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  margin-right: 6px;
  padding: 0;
  border: 1px solid var(--edge);
  border-radius: 50%;
  background: color-mix(in srgb, var(--ink) 4%, transparent);
  color: var(--ink-2);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transform: scale(0.85);
  transition:
    opacity 200ms var(--ease),
    transform 200ms var(--ease),
    background-color 200ms var(--ease),
    color 200ms var(--ease),
    border-color 200ms var(--ease);
}

/* shown on hover, on the selected row, when focused, or once added */
.node:hover .add,
.node.active .add,
.add:focus-visible,
.add.added,
.tree-node .add {
  opacity: 1;
  transform: none;
}

.add:hover {
  color: var(--ink);
  border-color: var(--accent-line);
  background: color-mix(in srgb, var(--accent) 18%, transparent);
}

.add.added {
  color: var(--on-accent);
  border-color: var(--accent);
  background: var(--accent);
  animation: pop 300ms var(--ease);
}

/* ---------- Components: rail ---------- */
.rail {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  display: grid;
  gap: 5px;
  z-index: 2;
}

.tick {
  width: 6px;
  height: 6px;
  padding: 0;
  border: 0;
  border-radius: 3px;
  background: color-mix(in srgb, var(--ink) 18%, transparent);
  cursor: pointer;
  transition:
    height 250ms var(--ease),
    background-color 250ms var(--ease);
}

.tick.current {
  height: 16px;
  background: color-mix(in srgb, var(--ink) 50%, transparent);
}

.tick.active {
  background: var(--accent-line);
}

/* ---------- Components: messages ---------- */
.message {
  position: absolute;
  top: 50%;
  right: 24px;
  transform: translateY(-50%);
  max-width: 360px;
}

.message p,
.compact-msg p {
  margin: 0 0 8px;
  line-height: 1.45;
}

.muted {
  color: var(--ink-2);
}

.btn-accent {
  margin-top: 6px;
  padding: 7px 14px;
  border: 1px solid var(--accent);
  border-radius: 10px;
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 600;
  cursor: pointer;
}

/* ---------- Components: % pills (green up, red down, grey flat) ---------- */
.pill {
  display: inline-flex;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.pill.up {
  color: var(--up);
  background: color-mix(in srgb, var(--up) 14%, transparent);
}

.pill.down {
  color: var(--down);
  background: color-mix(in srgb, var(--down) 14%, transparent);
}

.pill.flat {
  color: var(--ink-2);
  background: color-mix(in srgb, var(--ink) 6%, transparent);
}

/* ---------- Components: phone tree (shown instead of the orb and arc on phones) ----------
   A small orb in a column on the left; the lines (measured in the script, see treePath()) branch
   out from it to each row's dot. The rows reuse the arc's .node styles. */
.compact-msg {
  padding: 4px 2px;
  color: var(--ink-2);
}

.tree {
  position: relative; /* the lines and offsetIn() measure from here */
  padding-bottom: 4px;
}

.tree-label {
  position: relative;
  z-index: 2;
  display: grid;
  gap: 2px;
  margin: 4px 0 12px;
  text-align: center;
  color: var(--ink-2);
  font-size: 0.8rem;
  line-height: 1.35;
}

.tree-label strong {
  color: var(--ink);
  font-size: 1.15rem;
}

/* the small orb (44px) and its ring (12px each side). Its top is set from the script, level
   with the middle of the top 5 rows. */
.tree-orb {
  position: absolute;
  left: 0;
  top: 180px; /* until the rows are measured */
  z-index: 2;
  width: 68px;
  height: 68px;
  transform: translateY(-50%);
}

.tree-orb .orb {
  left: 50%;
  top: 50%;
  --size: 44px;
}

.tree-list {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 4px;
  padding-left: 80px; /* the orb's column */
}

.tree-node {
  position: relative;
  transform: none;
  min-width: 0;
  animation-name: fade-in;
}

/* tighter than the arc so a row fits a 320px phone without running under the "+" */
.tree-node .node-main {
  flex: 1;
  gap: 8px;
  min-width: 0;
  padding: 6px 4px 6px 0;
  overflow: hidden;
}

.tree-node .node-rank {
  min-width: 2.2em;
  padding: 3px 5px;
}

.tree-node .node-name {
  font-size: 0.9rem;
}

/* on the narrowest phones the % pill drops under the download count instead of being cut off */
.tree-node .node-meta {
  flex-wrap: wrap;
  row-gap: 3px;
}

.tree-node .add {
  margin-right: 4px;
}

.row-bone {
  height: 48px;
  border-radius: 14px;
}

.tree-more {
  display: block;
  margin: 10px 0 0 80px;
  padding: 6px 14px;
  border: 1px solid var(--edge);
  border-radius: 999px;
  background: transparent;
  color: var(--ink-2);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.tree-more:hover {
  color: var(--ink);
  border-color: var(--accent-line);
}

/* phones up to 400px: the rank badge gives its room to the name (the panel shows the rank) */
@media (max-width: 399.98px) {
  .tree-node .node-rank {
    display: none;
  }
}

/* ---------- Animations ----------
   draw      the lines grow out of the orb      flow     the light running along the selected line
   spin      the orb's ring turns               breathe  the orb's glow swells and fades
   slide-in  rows slide in from the left        pop      the "+" button bounces when pressed
   fade-in   phone rows slide in */
@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes flow {
  from {
    stroke-dashoffset: 1;
  }

  to {
    stroke-dashoffset: 0;
  }
}

@keyframes spin {
  to {
    transform: rotate(1turn);
  }
}

@keyframes breathe {
  50% {
    box-shadow:
      0 0 70px -4px var(--accent),
      inset 0 0 20px rgba(0, 0, 0, 0.45);
  }
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translate(-28px, -50%);
  }
}

@keyframes pop {
  50% {
    transform: scale(1.25);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateX(12px);
  }
}

/* ---------- Light theme ----------
   Coloured glows read as light on the dark theme but as smudges on white, so the light theme
   swaps them for soft shadows. The orb fills with shades of its own colour instead of fading
   into the grey page, so it looks solid. */
:root[data-bs-theme='light'] .flow {
  filter: none;
}

:root[data-bs-theme='light'] .node:hover .node-dot {
  box-shadow: 0 1px 4px var(--shadow);
}

:root[data-bs-theme='light'] .node.active .node-dot {
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-line) 22%, transparent);
}

/* selected states: a stronger tint of the accent, so they stand out from white */
:root[data-bs-theme='light'] .node.active {
  background: color-mix(in srgb, var(--accent) 26%, transparent);
}

:root[data-bs-theme='light'] .add:not(.added):hover {
  background: color-mix(in srgb, var(--accent) 36%, transparent);
}

:root[data-bs-theme='light'] .orb-core {
  background:
    radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.6), transparent 45%),
    radial-gradient(
      circle at 50% 45%,
      var(--accent) 35%,
      color-mix(in srgb, var(--accent-line) 80%, #000) 100%
    );
  box-shadow:
    0 14px 30px -12px color-mix(in srgb, var(--accent-line) 70%, transparent),
    inset 0 -8px 16px rgba(0, 0, 0, 0.12);
  animation-name: breathe-light;
}

@keyframes breathe-light {
  50% {
    box-shadow:
      0 18px 36px -10px color-mix(in srgb, var(--accent-line) 80%, transparent),
      inset 0 -8px 16px rgba(0, 0, 0, 0.12);
  }
}

/* ---------- Keyboard focus ---------- */
button:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}

/* ---------- Reduced motion: no drawing, spinning, sliding or popping ---------- */
@media (prefers-reduced-motion: reduce) {
  .link {
    animation: none;
    stroke-dashoffset: 0;
  }

  .flow,
  .orb-ring,
  .orb-core,
  :root[data-bs-theme='light'] .orb-core,
  .node,
  .add.added {
    animation: none;
  }

  .link,
  .node,
  .node-dot,
  .add,
  .tick {
    transition: none;
  }
}
</style>
