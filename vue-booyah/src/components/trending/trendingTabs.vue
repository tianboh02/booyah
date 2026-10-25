<!--
  src/components/trending/trendingTabs.vue

  What it does:  the nav bar inside the Trending page: Packages | Repositories | Developers.
                 A line slides under the open tab. ← → (and Home / End) move between tabs, as in any
                 tab bar, and the open tab's panel is linked to it for screen readers.
  Receives:      props  tabs ([{ id, label }]),
                        v-model (the open tab's id)
  Gives back:    update:modelValue (through v-model) when a tab is chosen
  Used by:       trending.vue.
-->
<script setup>
// ---------- Imports ----------
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

// ---------- Props & model ----------
const props = defineProps({
  tabs: { type: Array, required: true },
})
const active = defineModel({ type: String, required: true })

// ---------- State ----------
const bar = ref(null)
const buttons = {} // each tab's button, by id
const line = ref({ left: 0, width: 0, ready: false }) // the sliding underline
let observer = null

// ---------- Functions ----------
/** Moves the underline under the open tab. */
function placeLine() {
  const el = buttons[active.value]
  if (!el || !bar.value) return
  const barBox = bar.value.getBoundingClientRect()
  const box = el.getBoundingClientRect()
  line.value = { left: box.left - barBox.left + bar.value.scrollLeft, width: box.width, ready: true }
}

/** ← → Home End: move to another tab and focus it. */
function onKeydown(event) {
  const ids = props.tabs.map((t) => t.id)
  const i = ids.indexOf(active.value)
  let next = null
  if (event.key === 'ArrowRight') next = ids[(i + 1) % ids.length]
  else if (event.key === 'ArrowLeft') next = ids[(i - 1 + ids.length) % ids.length]
  else if (event.key === 'Home') next = ids[0]
  else if (event.key === 'End') next = ids[ids.length - 1]
  if (!next) return
  event.preventDefault()
  active.value = next
  nextTick(() => buttons[next]?.focus())
}

// ---------- Watchers & lifecycle ----------
watch(active, () => nextTick(placeLine))
onMounted(() => {
  placeLine()
  observer = new ResizeObserver(placeLine) // labels change width on phones
  observer.observe(bar.value)
})
onBeforeUnmount(() => observer && observer.disconnect())
</script>

<template>
  <nav class="trending-tabs mb-4" aria-label="Trending sections">
    <!-- Bootstrap .nav for the layout; only the theme colours and the sliding line are custom CSS -->
    <div
      ref="bar"
      class="tab-bar nav flex-nowrap gap-sm-1 px-sm-1 border-bottom position-relative overflow-x-auto"
      role="tablist"
      @keydown="onKeydown"
    >
      <button
        v-for="tab in tabs"
        :id="`trending-tab-${tab.id}`"
        :key="tab.id"
        :ref="(el) => (buttons[tab.id] = el)"
        type="button"
        role="tab"
        class="tab nav-link d-inline-flex align-items-center gap-2 flex-shrink-0 my-2 px-2 px-sm-3 py-2 rounded-3 fw-semibold text-nowrap border-0"
        :class="{ active: active === tab.id }"
        :aria-selected="active === tab.id"
        :aria-controls="`trending-panel-${tab.id}`"
        :tabindex="active === tab.id ? 0 : -1"
        @click="active = tab.id"
      >
        <!-- Icons: package box, repo book, people -->
        <svg
          v-if="tab.id === 'packages'"
          class="tab-icon d-none d-sm-inline-block flex-shrink-0"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <path d="M8 1.8l5.7 3v6.4L8 14.2l-5.7-3V4.8z" stroke-linejoin="round" />
          <path d="M2.4 4.9L8 7.9l5.6-3M8 7.9v6.2" stroke-linejoin="round" />
        </svg>
        <svg
          v-else-if="tab.id === 'repositories'"
          class="tab-icon d-none d-sm-inline-block flex-shrink-0"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M3 2.5h8.5a1 1 0 0 1 1 1V12H4.2A1.2 1.2 0 0 0 3 13.2z" />
          <path d="M3 13.2A1.2 1.2 0 0 0 4.2 14.5h8.3M6 5.5h4" stroke-linecap="round" />
        </svg>
        <svg
          v-else
          class="tab-icon d-none d-sm-inline-block flex-shrink-0"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <circle cx="6" cy="5.5" r="2.3" />
          <path d="M1.8 13.5c.5-2.3 2.2-3.6 4.2-3.6s3.7 1.3 4.2 3.6" />
          <path d="M10.6 3.4a2.2 2.2 0 0 1 0 4.2M12 9.9c1.2.5 2 1.6 2.3 3.1" />
        </svg>
        <span>{{ tab.label }}</span>
      </button>

      <span
        class="tab-line position-absolute start-0 rounded-pill pe-none"
        :class="{ ready: line.ready }"
        :style="{ transform: `translateX(${line.left}px)`, width: line.width + 'px' }"
        aria-hidden="true"
      ></span>
    </div>
  </nav>
</template>

<style scoped>
/*
  Layout, spacing, type and the phone labels are Bootstrap classes in the template (.nav, .nav-link,
  d-flex/gap/px/py, d-none d-sm-inline…). Only what Bootstrap can't do is here: main.css's theme
  colours, the hover fill, the focus ring and the sliding line under the open tab.
*/
.tab-bar {
  /* Bootstrap's nav-link colours → main.css's theme colours */
  --bs-nav-link-color: var(--text-muted-github);
  --bs-nav-link-hover-color: var(--app-text);
  --bs-nav-link-font-size: 0.95rem;
  border-color: var(--card-border) !important;
  scrollbar-width: none;
}

.tab-bar::-webkit-scrollbar {
  display: none;
}

/* phones: smaller labels so all three tabs fit without scrolling */
@media (max-width: 575.98px) {
  .tab-bar {
    --bs-nav-link-font-size: 0.85rem;
  }
}

.tab {
  background: transparent;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.tab:hover {
  background-color: var(--badge-bg);
}

.tab.active {
  color: var(--app-text);
}

.tab-icon {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.tab.active .tab-icon {
  color: var(--brand-blue, #58a6ff);
  transform: scale(1.1);
}

.tab:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4);
}

/* the line under the open tab; it slides when another tab opens */
.tab-line {
  bottom: -1px;
  height: 2px;
  background: var(--brand-blue, #58a6ff);
  opacity: 0;
}

.tab-line.ready {
  opacity: 1;
  transition:
    transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
    width 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

@media (prefers-reduced-motion: reduce) {
  .tab,
  .tab-icon,
  .tab-line.ready {
    transition: none;
  }
}
</style>
