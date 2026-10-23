<!--
  src/components/trending/languages/languagesSection.vue

  What it does:  the Trending → Languages section. It owns the section's state, so every part agrees:
                   languageId    which language tab is open
                   period        'daily' | 'weekly' | 'monthly'
                   selectedName  which package fills the detail panel
                   datasets      each language's data (fetched the first time its tab opens, then kept)
                   tray          up to 2 packages picked for Compare (kept when you switch tabs)
                   suggestion    once 1 package is in the tray, the package the wheel is on is
                                 offered as the 2nd pick, so scrolling fills the other slot
                 It hands that state down to its children as props and listens for their events.
  Receives:      nothing (no props).
  Gives back:    nothing (no emits).
  Used by:       trending.vue.
                 While a language loads it shows the same signal globe as Discovery.
  Children:      header/languageBar, orbit/packageOrbit, detail/packageDashboard,
                 compare/compareTray, compare/compareView, shared/SignalLoader.
-->
<script setup>
// ---------- Imports ----------
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue'
import { LANGUAGES, languageById, rankPackages } from '@/utils/trending/languages'

import LanguageBar from '@/components/trending/languages/header/languageBar.vue'
import PackageOrbit from '@/components/trending/languages/orbit/packageOrbit.vue'
import PackageDashboard from '@/components/trending/languages/detail/packageDashboard.vue'
import CompareTray from '@/components/trending/languages/compare/compareTray.vue'
import CompareView from '@/components/trending/languages/compare/compareView.vue'
import SignalLoader from '@/components/shared/SignalLoader.vue'

// ---------- Settings ----------
const TRAY_LIMIT = 2 // Compare always compares exactly two packages
const LOADER_LEGEND = [{ label: 'Package registries', colour: [88, 166, 255] }]

// ---------- State ----------
const languageId = ref(LANGUAGES[0].id)
const period = ref('weekly')
const selectedName = ref('')

// One entry per language: { status: 'loading' | 'ready' | 'error', data, error }
const datasets = reactive({})

// Compare tray. Each item: { id, name, registry, accent, languageId }.
// The package data itself is looked up from the cached dataset (see comparePair),
// so its displayRank always follows the selected period.
const tray = ref([])
const trayMessage = ref('') // the short red message above the tray, e.g. "Compare holds 2 packages…"
let messageTimer = 0
const compareOpen = ref(false)

// ---------- Computed values ----------
const language = computed(() => languageById(languageId.value))
const current = computed(
  () => datasets[languageId.value] || { status: 'loading', data: null, error: '' },
)

// The open language's 20 packages, ranked for the selected period
const ranked = computed(() => rankedFor(languageId.value))
const selectedPackage = computed(
  () => ranked.value.find((p) => p.name === selectedName.value) || null,
)
const failedCount = computed(() => (current.value.data ? current.value.data.failed.length : 0))

const trayIds = computed(() => tray.value.map((item) => item.id))

// The two tray packages as compareMath expects them: package data + `language` + up-to-date displayRank.
// null until the tray holds two packages whose data is loaded.
const comparePair = computed(() => {
  if (tray.value.length !== TRAY_LIMIT) return null
  const pair = tray.value.map((item) => {
    const pkg = rankedFor(item.languageId).find((p) => p.name === item.name)
    return pkg ? { ...pkg, language: languageById(item.languageId) } : null
  })
  return pair.every(Boolean) ? pair : null
})

// The 2nd compare pick, filled in automatically: once one package is in the tray, whatever
// package the wheel is on (in any language tab) is offered as the other side. It follows the
// wheel as you scroll; pressing Compare (or its "+") locks it in. null when there's nothing to offer.
const suggestion = computed(() => {
  if (tray.value.length !== 1 || !selectedPackage.value) return null
  const lang = language.value
  const id = itemId(lang.id, selectedPackage.value.name)
  if (id === tray.value[0].id) return null // the wheel is on the package already picked
  return {
    id,
    name: selectedPackage.value.name,
    registry: lang.registry,
    accent: lang.accent,
    languageId: lang.id,
  }
})

// ---------- Watchers ----------
// Opening a tab loads that language (straight away for the first tab)
watch(languageId, (id) => load(id), { immediate: true })

// A newly opened language starts with its #1 package
watch(ranked, (list) => {
  if (list.length && !list.some((p) => p.name === selectedName.value))
    selectedName.value = list[0].name
})

// ---------- Functions ----------

/**
 * Loads one language's data, once. Later visits reuse it, unless `force` is true
 * (the "Try again" button) or the last attempt failed. Saves the result in `datasets`.
 */
async function load(id, force = false) {
  const existing = datasets[id]
  if (!force && existing && existing.status !== 'error') return // already loaded or loading
  datasets[id] = { status: 'loading', data: null, error: '' }
  try {
    const data = await languageById(id).load()
    datasets[id] = { status: 'ready', data, error: '' }
  } catch (e) {
    console.error(`Trending: could not load ${id} packages`, e)
    datasets[id] = { status: 'error', data: null, error: e.message }
  }
}

/** A language's packages ranked for the selected period ([] if it hasn't loaded yet). */
function rankedFor(id) {
  const data = datasets[id] && datasets[id].data
  return data ? rankPackages(data.packages, period.value) : []
}

/** A tray item's unique id, e.g. 'php/psr/log' (the same name could exist in two languages). */
const itemId = (langId, name) => `${langId}/${name}`

/** Shows a short message above the tray for 3.5 seconds. */
function showTrayMessage(text) {
  trayMessage.value = text
  clearTimeout(messageTimer)
  messageTimer = setTimeout(() => (trayMessage.value = ''), 3500)
}

/** Adds a package from the open language to the tray (ignored if it's already there or the tray is full). */
function addToCompare(name) {
  const lang = language.value
  const id = itemId(lang.id, name)
  if (trayIds.value.includes(id)) return
  if (tray.value.length >= TRAY_LIMIT) {
    showTrayMessage('Compare holds 2 packages. Remove one first.')
    return
  }
  tray.value.push({ id, name, registry: lang.registry, accent: lang.accent, languageId: lang.id })
  trayMessage.value = ''
}

/** "Compare" in the tray: locks in the suggested 2nd package if needed, then opens the compare view. */
function openCompare() {
  if (tray.value.length < TRAY_LIMIT && suggestion.value) tray.value.push({ ...suggestion.value })
  if (tray.value.length === TRAY_LIMIT) compareOpen.value = true
}

/** Removes one package from the tray (and closes the compare view, which needs two). */
function removeFromCompare(id) {
  tray.value = tray.value.filter((item) => item.id !== id)
  trayMessage.value = ''
  if (tray.value.length < TRAY_LIMIT) compareOpen.value = false
}

/** Done comparing: empties the tray and closes the compare view if it's open. */
function clearCompare() {
  tray.value = []
  trayMessage.value = ''
  compareOpen.value = false
}

// ---------- Lifecycle ----------
onBeforeUnmount(() => clearTimeout(messageTimer))
</script>

<template>
  <section
    class="languages"
    :style="{
      '--accent': language.accent,
      '--accent-ink': language.accentInk,
      '--on-accent': language.onAccent,
    }"
    aria-labelledby="languages-heading"
  >
    <!-- Section title and intro -->
    <h4 id="languages-heading" class="fw-bold mb-1">Packages</h4>
    <p class="text-muted-github small mb-3">
      The 20 most downloaded packages in each language over the last 90 days, straight from npm,
      Packagist and crates.io. Pick two to compare them.
    </p>

    <!-- Language tabs + data status + Daily / Weekly / Monthly -->
    <LanguageBar
      :languages="LANGUAGES"
      :language-id="languageId"
      :period="period"
      :status="current.status"
      :data-up-to="current.data ? current.data.dataUpTo : ''"
      @update:language-id="languageId = $event"
      @update:period="period = $event"
    />

    <!-- Only shown when some packages failed to load -->
    <p v-if="failedCount" class="failed-note small mb-2" role="status">
      {{ failedCount }} package{{ failedCount > 1 ? 's' : '' }} couldn't load from
      {{ language.registry }}.
    </p>

    <!-- Loading: the signal globe, like Discovery -->
    <SignalLoader
      v-if="current.status === 'loading'"
      :status="`Fetching the top 20 from ${language.registry}`"
      :legend="LOADER_LEGEND"
    />

    <!-- Main area: the orb + package list (left) and the detail panel (right) -->
    <div v-else class="stage">
      <div class="orbit-area card rounded-4">
        <PackageOrbit
          :language="language"
          :packages="ranked"
          :selected-name="selectedName"
          :period="period"
          :status="current.status"
          :error-message="current.error"
          :tray-ids="trayIds"
          @select="selectedName = $event"
          @retry="load(languageId, true)"
          @add="addToCompare"
        />
      </div>

      <PackageDashboard
        :language="language"
        :pkg="selectedPackage"
        :packages="ranked"
        :period="period"
        :status="current.status"
        :added="
          selectedPackage ? trayIds.includes(itemId(languageId, selectedPackage.name)) : false
        "
        @add="addToCompare"
      />
    </div>

    <!-- Compare tray (slides up from the bottom once a package is picked) -->
    <CompareTray
      :items="tray"
      :limit="TRAY_LIMIT"
      :message="trayMessage"
      :languages="LANGUAGES"
      :suggestion="suggestion"
      @remove="removeFromCompare"
      @pin="addToCompare"
      @compare="openCompare"
      @clear="clearCompare"
    />

    <!-- Compare popup (its open/close animation classes, .backdrop-*, live in compareView.vue) -->
    <Transition name="backdrop">
      <CompareView
        v-if="compareOpen && comparePair"
        :pair="comparePair"
        :period="period"
        @update:period="period = $event"
        @close="compareOpen = false"
        @clear="clearCompare"
      />
    </Transition>
  </section>
</template>

<style scoped>
/* ---------- Colours & theme ----------
   The section's palette. The base colours come straight from main.css's light/dark tokens
   (--app-bg, --card-bg, --card-border, --app-text, --text-muted-github), which switch when
   <html data-bs-theme="light|dark"> changes (themeToggle.vue / useTheme.js). Every child
   component reads these variables, so the whole Trending page follows the theme toggle.
   Faint washes/lines are mixed from --ink, so they are light-on-dark in dark mode and
   dark-on-light in light mode automatically. --accent and --accent-ink are set in the template
   from the open language's colours. --accent-line is what lines, dots and borders use: the accent
   itself on dark, the darker --accent-ink on light (bright accents vanish on white). */
.languages {
  /* from main.css */
  --bg: var(--app-bg);
  --card: var(--card-bg);
  --edge: var(--card-border);
  --ink: var(--app-text);
  --ink-2: var(--text-muted-github);
  /* derived from main.css */
  --line: color-mix(in srgb, var(--text-muted-github) 22%, transparent);
  --dot-grid: color-mix(in srgb, var(--text-muted-github) 8%, transparent);
  --float-bg: color-mix(in srgb, var(--card-bg) 96%, transparent); /* chart hover boxes */
  /* page-only colours main.css doesn't define (dark values; light values below) */
  --ink-3: #6e7681;
  --up: #3fb950;
  --down: #f85149;
  --focus: #58a6ff;
  --shadow: #000;
  --overlay: rgba(5, 6, 8, 0.72);
  --error-bg: rgba(40, 14, 14, 0.95);
  --error-ink: #ffb3ad;
  --ease: cubic-bezier(0.22, 1, 0.36, 1);
  --font-code: var(--bs-font-monospace);
  --accent-line: var(--accent);
  /* room for the compare tray so it never covers the last content */
  padding-bottom: 96px;
}

/* light mode: darker greens/reds/blues that stay readable on white, and softer shadows */
:root[data-bs-theme='light'] .languages {
  --dot-grid: color-mix(in srgb, var(--text-muted-github) 14%, transparent);
  --ink-3: #6e7781;
  --up: #1a7f37;
  --down: #cf222e;
  --focus: #0969da;
  --shadow: rgba(31, 35, 40, 0.35);
  --overlay: rgba(31, 35, 40, 0.45);
  --error-bg: #ffebe9;
  --error-ink: #82071e;
  --accent-line: var(--accent-ink);
}

.failed-note {
  color: var(--ink-2);
}

/* ---------- Layout ---------- */
.stage {
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(380px, 42%, 560px);
  gap: 16px;
  align-items: start;
}

/* desktop: a fixed-height card that stays in view while the detail panel scrolls */
.orbit-area {
  position: sticky;
  top: 16px;
  min-width: 0;
  height: min(640px, calc(100vh - 32px));
  min-height: 520px;
  overflow: hidden;
  /* faint dot grid behind the orb */
  background:
    radial-gradient(
      50% 50% at 18% 50%,
      color-mix(in srgb, var(--accent) 9%, transparent),
      transparent 70%
    ),
    radial-gradient(var(--dot-grid) 1px, transparent 1px) 0 0 / 22px 22px,
    var(--card) !important;
  transition: background 600ms var(--ease);
}

/* ---------- Responsive ---------- */
/* tablet: one column, the orb area above the detail panel */
@media (max-width: 991.98px) {
  .stage {
    grid-template-columns: minmax(0, 1fr);
  }

  .orbit-area {
    position: relative;
    top: auto;
    height: 560px;
  }
}

/* phone: the orb area shrinks to fit the chip row */
@media (max-width: 575.98px) {
  .orbit-area {
    height: auto;
    min-height: 0;
    padding: 12px;
  }
}
</style>
