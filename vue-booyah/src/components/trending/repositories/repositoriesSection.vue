<!--
  src/components/trending/repositories/repositoriesSection.vue

  What it does:  the Trending → Top 20 Repositories tab, laid out like the My Projects page:
                   heading + Today / This week / This month toggle + "public repos only" note,
                   three stat cards (repoStats.vue), then the repository cards (repoList.vue).
                 It owns the tab's state, so every part agrees:
                   timeframe     'daily' | 'weekly' | 'monthly' (how recently the repos were created)
                   status        'loading' | 'ready' | 'error'
                   data          { repos, totalCount, since } from githubTrending.fetchTopRepos()
                   selectedLang  the language filter, shared by the stat cards and the list
  Receives:      nothing (no props).
  Gives back:    nothing (no emits).
  Used by:       trending.vue (the "Top 20 Repositories" tab).
  Children:      repoStats.vue, repoList.vue, languages/header/periodToggle.vue (the timeframe pill).
-->
<script setup>
// ---------- Imports ----------
import { ref, computed, watch } from 'vue'
import { fetchTopRepos, TIMEFRAMES } from '@/utils/trending/github/githubTrending'
import PeriodToggle from '@/components/trending/languages/header/periodToggle.vue'
import RepoStats from '@/components/trending/repositories/repoStats.vue'
import RepoList from '@/components/trending/repositories/repoList.vue'

// ---------- Settings ----------
// The Today / This week / This month pill (the Packages tab's periodToggle.vue; TIMEFRAMES has the labels)
const TIMEFRAME_VALUES = Object.keys(TIMEFRAMES)

// ---------- State ----------
const timeframe = ref('weekly')
const status = ref('loading')
const error = ref('')
const data = ref({ repos: [], totalCount: 0, since: '' })
const progress = ref({ done: 0, total: 0 })
const selectedLang = ref(null)
let requestId = 0 // ignores an older answer if the timeframe changed while it was loading

// ---------- Computed values ----------
const frame = computed(() => TIMEFRAMES[timeframe.value])
const loading = computed(() => status.value === 'loading')

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
    if (selectedLang.value && !result.repos.some((r) => (r.language || 'No language') === selectedLang.value))
      selectedLang.value = null
    status.value = 'ready'
  } catch (e) {
    if (id !== requestId) return
    console.error('Trending: could not load top repositories', e)
    error.value = e.message || "Couldn't load repositories from GitHub."
    status.value = 'error'
  }
}

// ---------- Watchers ----------
// First load, and again whenever the timeframe changes
watch(timeframe, () => load(), { immediate: true })
</script>

<template>
  <section class="repositories" aria-labelledby="repos-heading">
    <!-- Heading + timeframe toggle -->
    <div class="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-3">
      <div>
        <h4 id="repos-heading" class="fw-bold mb-1">Top 20 repositories</h4>
        <p class="text-muted-github small mb-0">
          The most starred public repositories created {{ frame.words }}, straight from GitHub.
        </p>
      </div>
      <PeriodToggle
        v-model="timeframe"
        :periods="TIMEFRAME_VALUES"
        :labels="TIMEFRAMES"
        aria-label="Created within"
      />
    </div>

    <!-- Public-only disclaimer (GitHub only shares data for public repositories) -->
    <p class="public-note card flex-row align-items-start gap-2 px-3 py-2 mb-4 small text-muted-github">
      <svg
        class="note-icon flex-shrink-0 mt-1"
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="6.5" />
        <path d="M8 7.2v4M8 4.9v.1" />
      </svg>
      <span>
        Only <strong class="text-body">public</strong> repositories are included: GitHub doesn't share data for
        private ones. To have your own project counted, set its repository to public.
      </span>
    </p>

    <!-- Error -->
    <div
      v-if="status === 'error'"
      class="card p-4 rounded-3 shadow-sm text-center mb-4"
      role="alert"
    >
      <p class="fw-semibold mb-1">Couldn't load the top repositories.</p>
      <p class="text-muted-github small mb-3">{{ error }}</p>
      <div>
        <button type="button" class="btn btn-sm btn-outline-primary rounded-pill px-3" @click="load(true)">
          Try again
        </button>
      </div>
    </div>

    <template v-else>
      <!-- Loading progress line (languages are fetched per repo) -->
      <p v-if="loading" class="text-muted-github small font-monospace mb-3" role="status">
        <template v-if="!progress.total">Searching GitHub…</template>
        <template v-else>Reading languages {{ progress.done }} / {{ progress.total }}</template>
      </p>

      <RepoStats
        v-model:selected-lang="selectedLang"
        :repos="data.repos"
        :total-count="data.totalCount"
        :timeframe-words="frame.words"
        :loading="loading"
      />

      <RepoList v-model:selected-lang="selectedLang" :repos="data.repos" :loading="loading" />
    </template>
  </section>
</template>

<style scoped>
/*
  The colours the pill toggles (languages/header/periodToggle.vue) read, set the same way as on the
  Packages tab (languagesSection.vue) but with GitHub blue as the accent instead of a language colour.
  --brand-blue comes from main.css and is already darker on the light theme.
*/
.repositories {
  --ink: var(--app-text);
  --ink-2: var(--text-muted-github);
  --edge: var(--card-border);
  --accent: var(--brand-blue, #58a6ff);
  --accent-line: var(--brand-blue, #58a6ff);
  --focus: var(--brand-blue, #58a6ff);
  --ease: cubic-bezier(0.22, 1, 0.36, 1);
}

/* The blue edge on the public-only note (everything else is Bootstrap classes) */
.public-note {
  border-left: 3px solid var(--brand-blue, #58a6ff) !important;
}

.note-icon {
  color: var(--brand-blue, #58a6ff);
}
</style>
