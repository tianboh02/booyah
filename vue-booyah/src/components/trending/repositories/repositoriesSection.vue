<!--
  src/components/trending/repositories/repositoriesSection.vue

  What it does:  the Trending → Top 20 Repositories tab, laid out like the My Projects page:
                   heading + Today / This week / This month toggle + "public repos only" note,
                   three stat cards (repoStats.vue), then the repository cards (repoList.vue).
                 While loading it shows the same signal globe as Discovery, with live progress.
                 Each card's bookmark saves the repo to Saved Projects (category 'Trending').
                 It owns the tab's state, so every part agrees:
                   timeframe     'daily' | 'weekly' | 'monthly' (how recently the repos were created)
                   status        'loading' | 'ready' | 'error'
                   data          { repos, totalCount } from githubTrending.fetchTopRepos()
                   selectedLang  the language filter, shared by the stat cards and the list
                   saved         which repos are bookmarked (utils/savedProjects.js, as on Discovery)
  Receives:      nothing (no props).
  Gives back:    nothing (no emits).
  Used by:       views/TrendingView.vue (the "Top 20 Repositories" tab).
  Children:      repoStats.vue, repoList.vue, languages/header/periodToggle.vue (the timeframe pill),
                 shared/SignalLoader.vue, shared/RetryCard.vue.
-->
<script setup>
// ---------- Imports ----------
import { ref, computed, watch, onMounted } from 'vue'
import { fetchTopRepos, TIMEFRAMES, RULES } from '@/utils/trending/github/githubTrending'
import { useSavedProjects } from '@/utils/savedProjects'
import { langOf } from '@/utils/top5Categories'
import SignalLoader from '@/components/shared/SignalLoader.vue'
import RetryCard from '@/components/shared/RetryCard.vue'
import PeriodToggle from '@/components/trending/languages/header/periodToggle.vue'
import RepoStats from '@/components/trending/repositories/repoStats.vue'
import RepoList from '@/components/trending/repositories/repoList.vue'

// ---------- Settings ----------
// The Today / This week / This month pill (the Packages tab's periodToggle.vue; TIMEFRAMES has the labels)
const TIMEFRAME_VALUES = Object.keys(TIMEFRAMES)

// The loader's colours (the first one is used for each finished request's arc)
const LOADER_LEGEND = [
  { label: 'GitHub repos', colour: [88, 166, 255] },
  { label: 'Languages', colour: [63, 185, 80] },
]

// Bookmarked repos land in this category on the Saved page
const SAVE_CATEGORY = 'Trending'

// ---------- State ----------
const timeframe = ref('weekly')
const status = ref('loading')
const error = ref('')
const data = ref({ repos: [], totalCount: 0 })
const progress = ref({ done: 0, total: 0 })
const selectedLang = ref(null)
let requestId = 0 // ignores an older answer if the timeframe changed while it was loading

// Saved projects and bookmark state (same as Discovery)
const { saved, pending, error: saveError, loadSaved, toggleSave } = useSavedProjects()

// ---------- Computed values ----------
const frame = computed(() => TIMEFRAMES[timeframe.value])
const loading = computed(() => status.value === 'loading')
const loaderStatus = computed(() =>
  progress.value.total
    ? `Reading languages ${progress.value.done} / ${progress.value.total}`
    : 'Searching GitHub…',
)

// ---------- Functions ----------
/** Loads the top repos for the current timeframe (from the cache when it's fresh). */
async function load(force = false) {
  const id = ++requestId
  status.value = 'loading'
  error.value = ''
  progress.value = { done: 0, total: 0 }
  try {
    const result = await fetchTopRepos(
      timeframe.value,
      (done, total) => {
        if (id === requestId) progress.value = { done, total }
      },
      { force },
    )
    if (id !== requestId) return
    data.value = result
    // keep the language filter only if that language is still in the new list
    if (selectedLang.value && !result.repos.some((r) => langOf(r) === selectedLang.value))
      selectedLang.value = null
    status.value = 'ready'
  } catch (e) {
    if (id !== requestId) return
    console.error('Trending: could not load top repositories', e)
    error.value = e.message || "Couldn't load repositories from GitHub."
    status.value = 'error'
  }
}

/** Saves or unsaves a repo (toggleSave reads the GitHub link from ghUrl). */
function saveRepo(repo) {
  toggleSave({ ghUrl: repo.htmlUrl }, SAVE_CATEGORY)
}

// ---------- Watchers & lifecycle ----------
// First load, and again whenever the timeframe changes
watch(timeframe, () => load(), { immediate: true })
onMounted(loadSaved)
</script>

<template>
  <section class="repositories" aria-labelledby="repos-heading">
    <!-- Heading + timeframe toggle -->
    <div class="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-3">
      <div>
        <h4 id="repos-heading" class="fw-bold mb-1">Top {{ RULES.limit }} Repositories</h4>
        <p class="text-muted-github small mb-0">
          The {{ RULES.limit }} most starred public repositories created {{ frame.words }}, straight from GitHub.
        </p>
      </div>
      <PeriodToggle v-model="timeframe" :periods="TIMEFRAME_VALUES" :labels="TIMEFRAMES" aria-label="Created within" />
    </div>

    <!-- Public-only disclaimer (GitHub only shares data for public repositories) -->
    <p class="public-note card flex-row align-items-start gap-2 px-3 py-2 mb-4 small text-muted-github">
      <svg class="note-icon flex-shrink-0 mt-1" width="14" height="14" viewBox="0 0 16 16" fill="none"
        stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
        <circle cx="8" cy="8" r="6.5" />
        <path d="M8 7.2v4M8 4.9v.1" />
      </svg>
      <span>
        Only <strong class="text-body">public</strong> repositories are included: GitHub doesn't share data for
        private ones. To have your own project counted, set its repository to public.
      </span>
    </p>

    <!-- Loading: the signal globe, like Discovery -->
    <SignalLoader v-if="loading" :done="progress.done" :total="progress.total" :status="loaderStatus"
      :legend="LOADER_LEGEND" />

    <RetryCard v-else-if="status === 'error'" title="Couldn't load the top repositories." :message="error"
      @retry="load(true)" />

    <template v-else>
      <!-- Saved-project error message (same as Discovery) -->
      <div v-if="saveError" class="alert alert-danger d-flex align-items-center py-2 px-3 small mb-3" role="alert">
        <span class="flex-grow-1">{{ saveError }}</span>
        <button type="button" class="btn-close ms-3" aria-label="Dismiss" @click="saveError = ''"></button>
      </div>

      <RepoStats v-model:selected-lang="selectedLang" :repos="data.repos" :total-count="data.totalCount"
        :timeframe-words="frame.words" />

      <RepoList v-model:selected-lang="selectedLang" :repos="data.repos" :saved-map="saved" :pending-links="pending"
        @save="saveRepo" />
    </template>
  </section>
</template>

<style scoped>
/* The blue edge on the public-only note (everything else is Bootstrap classes) */
.public-note {
  border-left: 3px solid var(--brand-blue, #58a6ff) !important;
}

.note-icon {
  color: var(--brand-blue, #58a6ff);
}
</style>
