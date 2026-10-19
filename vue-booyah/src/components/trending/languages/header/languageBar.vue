<!--
  src/components/trending/languages/header/languageBar.vue

  What it does:  the bar at the top of the Languages section.
                   left  → JavaScript / PHP / Rust tabs (a glowing line slides under the open one)
                   right → the data status ("Loading…", "data up to 12 Oct") + the Daily / Weekly /
                           Monthly toggle
  Receives:      props  languages (the LANGUAGES list), languageId, period,
                        status ('loading' | 'ready' | 'error'), dataUpTo ('YYYY-MM-DD')
  Gives back:    emits  update:languageId (a tab was chosen), update:period (a period was chosen)
  Used by:       languagesSection.vue.
-->
<script setup>
// ---------- Imports ----------
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { PERIODS, PERIOD_INFO, shortDate } from '@/utils/trending/helpers/format'
import PeriodToggle from '@/components/trending/languages/header/periodToggle.vue'

// ---------- Props & emits ----------
const props = defineProps({
  languages: { type: Array, required: true },
  languageId: { type: String, required: true },
  period: { type: String, required: true },
  status: { type: String, default: 'loading' },
  dataUpTo: { type: String, default: '' },
})
const emit = defineEmits(['update:languageId', 'update:period'])

// ---------- State ----------
const tabsEl = ref(null) // the tab row, watched for size changes
const tabEls = reactive({}) // each tab button, by language id
const indicator = reactive({ left: 0, width: 0 }) // where the sliding line sits, in px
let observer = null

// ---------- Computed values ----------
const current = computed(() => props.languages.find((l) => l.id === props.languageId))
const indicatorStyle = computed(() => ({
  transform: `translateX(${indicator.left}px)`,
  width: `${indicator.width}px`,
}))

// ---------- Watchers ----------
// A new tab is open → move the line under it (after Vue has updated the page)
watch(
  () => props.languageId,
  () => nextTick(placeIndicator),
)

// ---------- Functions ----------

/** Measures the open tab and moves the sliding line under it. */
function placeIndicator() {
  const el = tabEls[props.languageId]
  if (!el) return
  indicator.left = el.offsetLeft
  indicator.width = el.offsetWidth
}

/** ← → move between tabs and keep keyboard focus on the new tab (standard tab behaviour). */
function onTabKey(event) {
  const i = props.languages.findIndex((l) => l.id === props.languageId)
  let next
  if (event.key === 'ArrowRight') next = (i + 1) % props.languages.length
  else if (event.key === 'ArrowLeft')
    next = (i - 1 + props.languages.length) % props.languages.length
  else return
  event.preventDefault()
  const id = props.languages[next].id
  emit('update:languageId', id)
  nextTick(() => tabEls[id] && tabEls[id].focus())
}

// ---------- Lifecycle ----------
onMounted(() => {
  nextTick(placeIndicator)
  // the tabs can change width (fonts loading, window resizing), so re-measure when they do
  observer = new ResizeObserver(placeIndicator)
  observer.observe(tabsEl.value)
})
onBeforeUnmount(() => observer && observer.disconnect())
</script>

<template>
  <div class="bar card rounded-4 mb-3">
    <!-- Language tabs -->
    <div ref="tabsEl" class="tabs" role="tablist" aria-label="Languages" @keydown="onTabKey">
      <button
        v-for="lang in languages"
        :key="lang.id"
        :ref="(el) => (tabEls[lang.id] = el)"
        type="button"
        role="tab"
        class="tab"
        :class="{ active: lang.id === languageId }"
        :aria-selected="lang.id === languageId"
        :tabindex="lang.id === languageId ? 0 : -1"
        :style="{ '--tab-accent': lang.accent }"
        @click="$emit('update:languageId', lang.id)"
      >
        <span class="tab-dot"></span>
        <span class="tab-name">{{ lang.name }}</span>
        <span class="tab-registry">{{ lang.registry }}</span>
      </button>
      <!-- The glowing line under the open tab -->
      <span class="indicator" :style="indicatorStyle"></span>
    </div>

    <!-- Data status + period toggle -->
    <div class="right">
      <p class="status" aria-live="polite">
        <template v-if="status === 'loading'">Loading from {{ current.registry }}…</template>
        <template v-else-if="status === 'error'">Couldn't reach {{ current.registry }}</template>
        <template v-else-if="dataUpTo">
          <span class="live-dot"></span>data up to {{ shortDate(dataUpTo) }}
        </template>
      </p>
      <PeriodToggle
        :model-value="period"
        :periods="PERIODS"
        :labels="PERIOD_INFO"
        @update:model-value="$emit('update:period', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
/* ---------- Layout ---------- */
.bar {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
  flex-wrap: wrap;
  padding: 6px 8px 6px 6px;
}

/* ---------- Components: tabs ---------- */
.tabs {
  position: relative;
  display: flex;
  gap: 4px;
}

.tab {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 10px 16px 12px;
  border: 0;
  border-radius: 11px;
  background: none;
  color: var(--ink-2);
  cursor: pointer;
  transition:
    color 250ms var(--ease),
    background-color 250ms var(--ease);
}

.tab:hover {
  color: var(--ink);
  background: color-mix(in srgb, var(--ink) 4%, transparent);
}

.tab.active {
  color: var(--ink);
}

.tab-dot {
  align-self: center;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--tab-accent);
  transition: box-shadow 300ms var(--ease);
}

/* the open tab's dot glows */
.tab.active .tab-dot {
  box-shadow: 0 0 12px 1px var(--tab-accent);
}

.tab-name {
  font-weight: 600;
}

.tab-registry {
  font-size: 0.78rem;
  color: var(--ink-3);
}

/* the sliding line; its position comes from indicatorStyle in the script */
.indicator {
  position: absolute;
  left: 0;
  bottom: 2px;
  height: 2px;
  border-radius: 2px;
  background: var(--accent);
  box-shadow: 0 0 12px var(--accent);
  transition:
    transform 450ms var(--ease),
    width 450ms var(--ease),
    background-color 450ms var(--ease);
}

/* ---------- Components: status + toggle ---------- */
.right {
  display: flex;
  align-items: center;
  gap: 12px 16px;
  flex-wrap: wrap;
}

.status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--ink-2);
  font-size: 0.8rem;
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--up);
  animation: pulse 2.4s ease-in-out infinite;
}

/* ---------- Animations ---------- */
/* the green "live" dot gently fades in and out */
@keyframes pulse {
  50% {
    opacity: 0.35;
  }
}

/* ---------- Keyboard focus ---------- */
button:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}

/* ---------- Responsive (phone) ---------- */
/* the tabs share the full width and hide the registry names; the status and toggle get their own row */
@media (max-width: 575.98px) {
  .bar {
    padding: 6px;
  }

  .tabs {
    width: 100%;
  }

  .tab {
    flex: 1;
    justify-content: center;
    padding: 10px 6px 12px;
  }

  .tab-registry {
    display: none;
  }

  .right {
    width: 100%;
    justify-content: space-between;
  }
}

/* ---------- Reduced motion ---------- */
@media (prefers-reduced-motion: reduce) {
  .indicator {
    transition: none;
  }

  .live-dot {
    animation: none;
  }
}
</style>
