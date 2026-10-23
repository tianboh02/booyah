<!--
  src/components/trending/developers/developersSection.vue

  What it does:  the Trending → Top Developers tab. Loads the 20 most followed developers from GitHub
                 (githubTrending.fetchTopDevelopers) and shows them in one big card
                 (developersCard.vue), like a Discovery category card.
                 While loading it shows the same signal globe as Discovery, with live progress
                 ("Reading profiles 12 / 40"); on failure, a message with "Try again".
  Receives:      nothing (no props).
  Gives back:    nothing (no emits).
  Used by:       trending.vue (the "Top Developers" tab).
  Children:      developersCard.vue, shared/SignalLoader.vue, shared/RetryCard.vue.
-->
<script setup>
// ---------- Imports ----------
import { ref, computed, onMounted } from 'vue'
import { fetchTopDevelopers, RULES } from '@/utils/trending/github/githubTrending'
import SignalLoader from '@/components/shared/SignalLoader.vue'
import RetryCard from '@/components/shared/RetryCard.vue'
import DevelopersCard from '@/components/trending/developers/developersCard.vue'

// ---------- Settings ----------
// The loader's colours (the first one is used for each finished request's arc)
const LOADER_LEGEND = [
  { label: 'GitHub profiles', colour: [88, 166, 255] },
  { label: 'Repositories', colour: [63, 185, 80] },
]

// ---------- State ----------
const status = ref('loading')
const error = ref('')
const data = ref({ developers: [], totalCount: 0, failed: [] })
const progress = ref({ done: 0, total: 0 })

// ---------- Computed values ----------
const loaderStatus = computed(() => {
  const { done, total } = progress.value
  if (!total) return 'Searching GitHub for the most followed developers'
  if (done < total) return `Reading profiles and repositories ${done} / ${total}`
  return 'Ranking developers'
})

// ---------- Functions ----------
/** Loads the developers (from the cache when it's fresh; `force` asks GitHub again). */
async function load(force = false) {
  status.value = 'loading'
  error.value = ''
  progress.value = { done: 0, total: 0 }
  try {
    data.value = await fetchTopDevelopers((done, total) => (progress.value = { done, total }), {
      force,
    })
    status.value = 'ready'
  } catch (e) {
    console.error('Trending: could not load top developers', e)
    error.value = e.message || "Couldn't load developers from GitHub."
    status.value = 'error'
  }
}

// ---------- Lifecycle ----------
onMounted(() => load())
</script>

<template>
  <section class="developers" aria-labelledby="devs-heading">
    <!-- Heading -->
    <div class="mb-3">
      <h4 id="devs-heading" class="fw-bold mb-1">Top Developers</h4>
      <p class="text-muted-github small mb-0">
        The {{ RULES.limit }} most followed developers on GitHub, with what they mostly build in.
      </p>
    </div>

    <!-- Loading: the signal globe, like Discovery -->
    <SignalLoader
      v-if="status === 'loading'"
      :done="progress.done"
      :total="progress.total"
      :status="loaderStatus"
      :legend="LOADER_LEGEND"
    />

    <RetryCard
      v-else-if="status === 'error'"
      title="Couldn't load the top developers."
      :message="error"
      @retry="load(true)"
    />

    <!-- The one big card -->
    <template v-else>
      <p v-if="data.failed.length" class="text-muted-github small mb-2" role="status">
        {{ data.failed.length }} profile{{ data.failed.length > 1 ? 's' : '' }} couldn't load, so
        some details are missing.
      </p>
      <DevelopersCard :developers="data.developers" :total-count="data.totalCount" />
    </template>
  </section>
</template>
