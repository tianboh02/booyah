<!--
  src/components/trending/repositories/repoStats.vue

  What it does:  the three stat cards above the Top 20 Repositories list, in the same style as the
                 My Projects stat cards (count-up numbers, tilt, cursor spotlight, coloured top edge):
                   1. Repositories    how many are shown, and how many new public repos GitHub found
                   2. Top language    the most common language in the 20 (click to filter by it)
                   3. Total stars     stars across the 20 (or the filtered language), plus forks
                 When a language filter is on, the cards describe just that language.
  Receives:      props  repos, totalCount (all matching repos on GitHub), timeframeWords
                        ("in the last 7 days"), v-model:selectedLang
  Gives back:    update:selectedLang (through v-model) when the language card is clicked
  Used by:       repositoriesSection.vue.
-->
<script setup>
// ---------- Imports ----------
import { computed, ref, watch } from 'vue'
import { getLangColor } from '@/utils/langColors'
import { vSpotlight, vTilt, useCountUp } from '@/utils/motion'
import { mostCommon, shortCount } from '@/utils/trending/github/display'
import { langOf } from '@/utils/top5Categories'

// ---------- Props & model ----------
const props = defineProps({
  repos: { type: Array, default: () => [] },
  totalCount: { type: Number, default: 0 },
  timeframeWords: { type: String, default: '' },
})
const selectedLang = defineModel('selectedLang', { type: String, default: null })

// ---------- Computed values ----------
const hasData = computed(() => props.repos.length > 0)
const scoped = computed(() =>
  selectedLang.value ? props.repos.filter((r) => langOf(r) === selectedLang.value) : props.repos,
)

// The language card: the selected language, or the most common real language in the 20
const topLang = computed(() => {
  if (selectedLang.value) {
    return { value: selectedLang.value, count: scoped.value.length }
  }
  return mostCommon(props.repos, (r) => r.language) || { value: 'No language', count: 0 }
})
const topLangPct = computed(() =>
  props.repos.length ? Math.round((topLang.value.count / props.repos.length) * 100) : 0,
)
const topLangColor = computed(() => getLangColor(topLang.value.value))

const stars = computed(() => scoped.value.reduce((sum, r) => sum + r.stars, 0))
const forks = computed(() => scoped.value.reduce((sum, r) => sum + r.forks, 0))

// Count-up numbers (they animate when the data or the filter changes)
const repoCount = useCountUp(() => scoped.value.length)
const starCount = useCountUp(() => stars.value)
const pctCount = useCountUp(() => topLangPct.value)

// The cards slide in once the data is there
const ready = ref(false)
watch(
  hasData,
  (has) => {
    ready.value = false
    if (has) requestAnimationFrame(() => requestAnimationFrame(() => (ready.value = true)))
  },
  { immediate: true },
)

// ---------- Functions ----------
/** The language card: filter by the top language, or clear the filter if it's on. */
function toggleTopLang() {
  selectedLang.value = selectedLang.value ? null : topLang.value.value
}
</script>

<template>
  <div class="mb-4">
    <div v-if="hasData" class="row row-cols-1 row-cols-md-3 g-3">
      <!-- 1. Repositories -->
      <div class="col">
        <div
          v-tilt="5"
          v-spotlight
          class="card stat-card overflow-hidden d-flex flex-column p-3 h-100 rounded-3 shadow-sm"
          :class="{ 'is-in': ready, 'is-focused': selectedLang }"
          :style="{ '--i': 0, '--accent': selectedLang ? topLangColor : '#58a6ff' }"
        >
          <span class="h3 fw-bold stat-value mb-1 font-monospace">{{ repoCount }}</span>
          <span class="stat-label fw-semibold small text-truncate">
            {{ selectedLang ? `${selectedLang} repositories` : 'Top repositories' }}
          </span>
          <span class="text-muted-github small">
            Out of {{ totalCount.toLocaleString('en-US') }} new public repos {{ timeframeWords }}
          </span>
        </div>
      </div>

      <!-- 2. Top language (click to filter) -->
      <div class="col">
        <button
          v-tilt="5"
          v-spotlight
          type="button"
          class="card stat-card overflow-hidden d-flex flex-column stat-button p-3 h-100 w-100 rounded-3 shadow-sm text-start"
          :class="{ 'is-in': ready, 'is-focused': selectedLang }"
          :style="{ '--i': 1, '--accent': topLangColor }"
          :aria-pressed="!!selectedLang"
          :title="selectedLang ? 'Clear the language filter' : `Show only ${topLang.value}`"
          @click="toggleTopLang"
        >
          <span class="h3 fw-bold stat-value mb-1 font-monospace text-truncate d-block">
            <span class="lang-dot rounded-circle me-2 d-inline-block"></span>{{ topLang.value }}
          </span>
          <span class="stat-label fw-semibold small">
            {{ selectedLang ? 'Selected language' : 'Most common language' }}
          </span>
          <span class="text-muted-github small">
            <span class="font-monospace">{{ pctCount }}%</span> of the top {{ repos.length }} ·
            {{ selectedLang ? 'click to show all' : 'click to filter' }}
          </span>
        </button>
      </div>

      <!-- 3. Total stars -->
      <div class="col">
        <div
          v-tilt="5"
          v-spotlight
          class="card stat-card overflow-hidden d-flex flex-column p-3 h-100 rounded-3 shadow-sm"
          :class="{ 'is-in': ready, 'is-focused': selectedLang }"
          :style="{ '--i': 2, '--accent': selectedLang ? topLangColor : '#e3b341' }"
        >
          <span class="h3 fw-bold stat-value mb-1 font-monospace">{{ starCount.toLocaleString('en-US') }}</span>
          <span class="stat-label fw-semibold small">
            {{ selectedLang ? `Stars in ${selectedLang}` : 'Total stars' }}
          </span>
          <span class="text-muted-github small">
            Plus <span class="font-monospace">{{ shortCount(forks) }}</span> forks across
            {{ scoped.length }} {{ scoped.length === 1 ? 'repository' : 'repositories' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Same look as My Projects' stat cards (projectStatsTable.vue) */
.stat-value,
.stat-label {
  color: var(--app-text);
  transition: color 0.2s ease;
}

.stat-card {
  transform: perspective(700px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
  transition:
    transform 0.2s ease-out,
    border-color 0.3s ease,
    box-shadow 0.3s ease,
    opacity 0.6s ease,
    translate 0.7s cubic-bezier(0.22, 1, 0.36, 1);
  opacity: 0;
  translate: 0 18px;
  transition-delay: 0s, 0s, 0s, calc(var(--i) * 110ms), calc(var(--i) * 110ms);
}

.stat-card > * {
  position: relative;
}

.stat-card.is-in {
  opacity: 1;
  translate: 0 0;
}

/* the soft light that follows the cursor */
.stat-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
  background: radial-gradient(
    260px circle at var(--mx, 50%) var(--my, 50%),
    color-mix(in srgb, var(--accent, #58a6ff) 20%, transparent),
    transparent 70%
  );
}

.stat-card:hover::before {
  opacity: 1;
}

.stat-card:hover,
.stat-card.is-focused {
  border-color: color-mix(in srgb, var(--accent) 55%, var(--card-border)) !important;
  box-shadow: 0 10px 30px -12px color-mix(in srgb, var(--accent) 45%, transparent) !important;
}

/* the coloured line that draws across the top once the card is in */
.stat-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  height: 2px;
  width: 100%;
  background: linear-gradient(90deg, var(--accent), transparent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: calc(var(--i) * 110ms + 300ms);
}

.stat-card.is-in::after {
  transform: scaleX(1);
}

/* the language card is a button, so reset the button look */
.stat-button {
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.stat-button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4) !important;
}

.lang-dot {
  width: 12px;
  height: 12px;
  background-color: var(--accent);
  box-shadow: 0 0 12px var(--accent);
  transition:
    background-color 0.4s ease,
    box-shadow 0.4s ease;
}

@media (prefers-reduced-motion: reduce) {
  .stat-card,
  .stat-card::after {
    transition: none !important;
  }

  .stat-card {
    opacity: 1;
    translate: 0 0;
  }
}
</style>
