<!--
  src/components/trending/repositories/repoList.vue

  What it does:  the Top 20 Repositories cards, in the same style and with the same controls as the
                 My Projects repository list (projectList.vue):
                   - search box, Sort by (Rank / Stars / Forks / Newest), carousel / list toggle
                   - click a card's language to filter by it (shared with the stat cards)
                 Each card shows: rank, owner avatar + owner/name (opens GitHub), Public badge,
                 description, up to 4 topics, the language composition bar (from GitHub's
                 /languages endpoint), language, stars, forks and when it was created.
  Receives:      props  repos (from githubTrending.fetchTopRepos), loading, v-model:selectedLang
  Gives back:    update:selectedLang (through v-model) when a language is clicked or cleared
  Used by:       repositoriesSection.vue.
  Children:      ring/CardRing.vue, ring/RingCaption.vue, ring/ViewToggle.vue (the carousel view),
                 languages/header/periodToggle.vue (the Sort by pill, same as the Packages tab's).
-->
<script setup>
// ---------- Imports ----------
import { ref, computed } from 'vue'
import { createReusableTemplate } from '@vueuse/core'
import { getLangColor } from '@/utils/langColors'
import { vSpotlight } from '@/utils/motion'
import { useViewMode } from '@/composables/useViewMode'
import { timeAgo, shortCount, pad2 } from '@/utils/trending/github/display'
import CardRing from '@/components/ring/CardRing.vue'
import RingCaption from '@/components/ring/RingCaption.vue'
import ViewToggle from '@/components/ring/ViewToggle.vue'
import PeriodToggle from '@/components/trending/languages/header/periodToggle.vue'

// The repo card is written once in the template and used by both the carousel and the list
const [DefineRepoCard, ReuseRepoCard] = createReusableTemplate()

// ---------- Props & model ----------
const props = defineProps({
  repos: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})
const selectedLang = defineModel('selectedLang', { type: String, default: null })

// ---------- State ----------
const view = useViewMode('trending-repos') // carousel or list, remembered like My Projects
const searchQuery = ref('')
const sortBy = ref('rank')

// Gold, silver and bronze for the top 3 rank badges (readable in both themes)
const MEDALS = ['#d4a72c', '#8c959f', '#c26c2b']

const SORT_OPTIONS = [
  { value: 'rank', label: 'Rank' },
  { value: 'stars', label: 'Stars' },
  { value: 'forks', label: 'Forks' },
  { value: 'newest', label: 'Newest' },
]

// The Sort by toggle uses the Packages tab's pill (periodToggle.vue): option values + their labels
const SORT_VALUES = SORT_OPTIONS.map((o) => o.value)
const SORT_LABELS = Object.fromEntries(SORT_OPTIONS.map((o) => [o.value, { label: o.label }]))

// ---------- Computed values ----------
const langOf = (repo) => repo.language || 'No language'
const selectedColor = computed(() =>
  selectedLang.value ? getLangColor(selectedLang.value) : '#58a6ff',
)

const shownRepos = computed(() => {
  let list = [...props.repos]
  if (selectedLang.value) list = list.filter((r) => langOf(r) === selectedLang.value)

  const query = searchQuery.value.trim().toLowerCase()
  if (query) {
    list = list.filter(
      (r) =>
        r.fullName.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.topics.some((t) => t.includes(query)),
    )
  }

  const sorters = {
    rank: (a, b) => a.rank - b.rank,
    stars: (a, b) => b.stars - a.stars,
    forks: (a, b) => b.forks - a.forks,
    newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  }
  return list.sort(sorters[sortBy.value])
})

// ---------- Functions ----------
function toggleLang(name) {
  selectedLang.value = selectedLang.value === name ? null : name
}

/** The composition bar's hover text: 'TypeScript 82% · CSS 12% · Other 6%'. */
const compositionLabel = (repo) =>
  repo.composition.map((c) => `${c.name} ${Math.round(c.pct)}%`).join(' · ')
</script>

<template>
  <div id="trending-repo-list" class="mb-4">
    <!-- ===================== The repo card (used by both views) ===================== -->
    <DefineRepoCard v-slot="{ repo, index, inRing }">
      <div
        v-spotlight
        class="repo-card card p-3 rounded-3 shadow-sm"
        :class="inRing ? 'h-100' : 'mb-3'"
        :style="{ '--lang': getLangColor(langOf(repo)), '--i': Math.min(index, 10) }"
      >
        <!-- Rank, owner avatar, owner/name, Public badge, arrow -->
        <div class="d-flex align-items-center gap-2 mb-2 min-w-0">
          <span
            class="rank-badge badge rounded-2 border font-monospace text-muted-github flex-shrink-0"
            :class="{ podium: repo.rank <= 3 }"
            :style="repo.rank <= 3 ? { '--medal': MEDALS[repo.rank - 1] } : null"
            :title="`Rank ${repo.rank} by stars`"
          >
            {{ pad2(repo.rank) }}
          </span>
          <img
            :src="repo.ownerAvatar"
            :alt="''"
            class="owner-avatar border flex-shrink-0"
            :class="repo.ownerType === 'Organization' ? 'rounded-2' : 'rounded-circle'"
            width="22"
            height="22"
            loading="lazy"
          />
          <h5 class="card-title h6 fw-bold mb-0 text-truncate min-w-0">
            <a
              :href="repo.htmlUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="repo-link stretched-link"
            >
              <span class="text-muted-github fw-normal">{{ repo.owner }}/</span>{{ repo.name }}
              <span class="visually-hidden">(opens on GitHub)</span>
            </a>
          </h5>
          <span class="badge badge-github rounded-pill fw-normal px-2 py-1 flex-shrink-0">Public</span>
          <svg
            class="repo-arrow ms-auto flex-shrink-0"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M5 11L11 5M6 5h5v5" />
          </svg>
        </div>

        <p class="card-text text-muted-github small mb-2 description">
          {{ repo.description || 'No description' }}
        </p>

        <!-- Topics -->
        <div v-if="repo.topics.length" class="d-flex flex-wrap gap-1 mb-2">
          <span
            v-for="topic in repo.topics.slice(0, 4)"
            :key="topic"
            class="topic badge rounded-pill fw-normal"
          >
            {{ topic }}
          </span>
        </div>

        <!-- Language composition (GitHub /languages), as a Bootstrap stacked progress bar -->
        <div
          v-if="repo.composition.length"
          class="composition progress-stacked mb-3"
          role="img"
          :aria-label="`Languages: ${compositionLabel(repo)}`"
          :title="compositionLabel(repo)"
        >
          <div
            v-for="part in repo.composition"
            :key="part.name"
            class="progress"
            :style="{ width: part.pct + '%' }"
          >
            <div class="progress-bar" :style="{ backgroundColor: part.color }"></div>
          </div>
        </div>

        <!-- Metadata row: language (click to filter), stars, forks, created -->
        <div class="d-flex align-items-center gap-3 text-muted-github small flex-wrap mt-auto">
          <button
            type="button"
            class="lang-link d-flex align-items-center gap-1 rounded-2"
            :class="{ 'is-selected': selectedLang === langOf(repo) }"
            :aria-pressed="selectedLang === langOf(repo)"
            :title="selectedLang === langOf(repo) ? 'Clear filter' : 'Filter by ' + langOf(repo)"
            @click="toggleLang(langOf(repo))"
          >
            <span class="lang-dot rounded-circle d-inline-block flex-shrink-0"></span>
            <span>{{ langOf(repo) }}</span>
          </button>

          <span class="meta-star d-inline-flex align-items-center gap-1" title="Stars">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path
                d="M8 .25l2.3 4.66 5.15.75-3.72 3.63.88 5.13L8 12.04l-4.61 2.38.88-5.13L.55 5.66l5.15-.75z"
              />
            </svg>
            <span class="font-monospace">{{ repo.stars.toLocaleString('en-US') }}</span>
          </span>

          <span class="d-inline-flex align-items-center gap-1" title="Forks">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <circle cx="4" cy="3" r="1.6" />
              <circle cx="12" cy="3" r="1.6" />
              <circle cx="8" cy="13" r="1.6" />
              <path d="M4 4.6v1.2c0 1 .8 1.7 1.7 1.7h4.6c.9 0 1.7-.7 1.7-1.7V4.6M8 7.5v4" />
            </svg>
            <span class="font-monospace">{{ shortCount(repo.forks) }}</span>
          </span>

          <span>Created {{ timeAgo(repo.createdAt) }}</span>
          <span v-if="repo.license" class="d-none d-sm-inline">{{ repo.license }}</span>
        </div>
      </div>
    </DefineRepoCard>

    <!-- ===================== Controls: title, filter chip, search, sort, view ===================== -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div class="d-flex align-items-center gap-2 flex-wrap">
        <h3 class="h3 fw-bold section-title mb-0">Repositories</h3>
        <span v-if="!loading && repos.length" class="text-muted-github small font-monospace">
          {{ shownRepos.length }}/{{ repos.length }}
        </span>

        <!-- Active language filter -->
        <Transition name="chip">
          <button
            v-if="selectedLang"
            type="button"
            class="filter-chip d-inline-flex align-items-center gap-2 rounded-pill ps-3 pe-2 py-1"
            :style="{ '--c': selectedColor }"
            :aria-label="`Clear ${selectedLang} filter`"
            @click="selectedLang = null"
          >
            <span class="chip-dot rounded-circle d-inline-block"></span>
            <span class="small fw-semibold">{{ selectedLang }}</span>
            <span class="chip-x rounded-circle d-inline-flex align-items-center justify-content-center"
              >✕</span
            >
          </button>
        </Transition>
      </div>

      <div class="d-flex align-items-center gap-3 flex-wrap">
        <!-- Search -->
        <div class="search-wrap position-relative">
          <svg
            class="search-icon position-absolute top-50 start-0 translate-middle-y ms-2 pe-none"
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            class="form-control form-control-sm github-control"
            style="padding-left: 1.85rem"
            placeholder="Search repositories or topics"
            aria-label="Search repositories or topics"
          />
        </div>

        <!-- Sort -->
        <div class="d-flex align-items-center gap-2">
          <span class="text-muted-github small text-nowrap">Sort by</span>
          <PeriodToggle
            v-model="sortBy"
            :periods="SORT_VALUES"
            :labels="SORT_LABELS"
            aria-label="Sort repositories"
          />
        </div>

        <ViewToggle v-model="view" />
      </div>
    </div>

    <!-- ===================== Loading skeleton ===================== -->
    <div v-if="loading">
      <div v-for="n in 4" :key="n" class="card mb-3 p-3 rounded-3 shadow-sm placeholder-glow">
        <span class="placeholder col-3 mb-2"></span>
        <span class="placeholder col-8 mb-3"></span>
        <span class="placeholder col-5"></span>
      </div>
    </div>

    <!-- ===================== The cards: carousel or list ===================== -->
    <Transition v-else-if="shownRepos.length > 0" name="view-swap" mode="out-in">
      <CardRing
        v-if="view === 'carousel'"
        key="carousel"
        :items="shownRepos"
        item-key="id"
        item-label="fullName"
        card-width="min(460px, 86vw)"
        label="Top repositories"
      >
        <template #card="{ item: repo, index }">
          <ReuseRepoCard :repo="repo" :index="index" :in-ring="true" />
        </template>
        <template #caption="{ item: repo }">
          <RingCaption
            :title="repo.name"
            :index="pad2(repo.rank)"
            :accent="getLangColor(langOf(repo))"
            :subtitle="`${repo.owner} · ${langOf(repo)} · ★ ${shortCount(repo.stars)}`"
            :meta="`Rank ${pad2(repo.rank)} / ${pad2(repos.length)} — Created ${timeAgo(repo.createdAt)}`"
          />
        </template>
      </CardRing>

      <TransitionGroup v-else key="list" name="repo" tag="div" appear class="position-relative">
        <ReuseRepoCard
          v-for="(repo, index) in shownRepos"
          :key="repo.id"
          :repo="repo"
          :index="index"
          :in-ring="false"
        />
      </TransitionGroup>
    </Transition>

    <!-- ===================== Nothing to show ===================== -->
    <div v-else class="text-center py-5 text-muted-github card p-4 rounded-3 shadow-sm">
      <span v-if="!repos.length">GitHub didn't return any repositories for this timeframe.</span>
      <span v-else-if="searchQuery.trim() && selectedLang">
        No {{ selectedLang }} repositories match "{{ searchQuery }}".
      </span>
      <span v-else-if="searchQuery.trim()">
        No repositories match "{{ searchQuery }}". Try a shorter search.
      </span>
      <span v-else>No {{ selectedLang }} repositories in the top {{ repos.length }}.</span>
      <div v-if="selectedLang" class="mt-3">
        <button type="button" class="btn btn-sm sort-btn" @click="selectedLang = null">
          Show all languages
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
  Layout, spacing and type are Bootstrap classes in the template (card, badge, progress-stacked,
  d-flex, gap, text-truncate…). This CSS is only what Bootstrap can't do: main.css's theme colours,
  hover effects and animations, matching My Projects' projectList.vue.
*/
.min-w-0 {
  min-width: 0;
}

.section-title,
.card-title {
  color: var(--app-text);
}

/* ---------- Filter chip ---------- */
.filter-chip {
  color: var(--app-text);
  background-color: color-mix(in srgb, var(--c) 14%, var(--card-bg));
  border: 1px solid color-mix(in srgb, var(--c) 55%, var(--card-border));
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.filter-chip:hover {
  background-color: color-mix(in srgb, var(--c) 26%, var(--card-bg));
}

.filter-chip:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4);
}

.chip-dot {
  width: 9px;
  height: 9px;
  background-color: var(--c);
  box-shadow: 0 0 8px var(--c);
}

.chip-x {
  width: 18px;
  height: 18px;
  font-size: 0.6rem;
  background-color: color-mix(in srgb, var(--c) 25%, transparent);
}

.chip-enter-active,
.chip-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.chip-enter-from,
.chip-leave-to {
  opacity: 0;
  transform: scale(0.85);
}

/* ---------- Controls ---------- */
.search-wrap {
  width: 240px;
  transition: width 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.search-wrap:focus-within {
  width: min(320px, 100%);
}

.search-icon {
  color: #8b949e;
  transition: color 0.2s ease;
}

.search-wrap:focus-within .search-icon {
  color: var(--brand-blue, #58a6ff);
}

.github-control:focus {
  border-color: #58a6ff !important;
  box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.3);
}

.sort-btn {
  color: var(--text-muted-github);
  background-color: transparent;
  border: 1px solid var(--card-border);
  padding: 0.15rem 0.7rem;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.sort-btn:hover,
.sort-btn.active {
  color: var(--app-text);
  background-color: var(--badge-bg);
}

.sort-btn.active {
  font-weight: 600;
}

.sort-btn:focus-visible {
  box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4);
}

/* ---------- Repo cards ---------- */
.repo-card {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  transition:
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.25s ease,
    box-shadow 0.25s ease;
}

/* soft light of the language colour that follows the cursor */
.repo-card::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
  background: radial-gradient(
    320px circle at var(--mx, 50%) var(--my, 50%),
    color-mix(in srgb, var(--lang) 18%, transparent),
    transparent 70%
  );
}

/* language-coloured edge that grows in on hover */
.repo-card::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--lang);
  transform: scaleY(0);
  transform-origin: top;
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.repo-card:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--lang) 50%, var(--card-border)) !important;
  box-shadow: 0 14px 30px -16px color-mix(in srgb, var(--lang) 55%, transparent) !important;
}

.repo-card:hover::before {
  opacity: 1;
}

.repo-card:hover::after {
  transform: scaleY(1);
}

/* rank badge: a Bootstrap .badge; the top 3 get a gold / silver / bronze tint */
.rank-badge {
  min-width: 2.2em;
  background-color: var(--badge-bg);
  border-color: var(--card-border) !important;
}

.rank-badge.podium {
  color: var(--medal) !important;
  border-color: color-mix(in srgb, var(--medal) 55%, var(--card-border)) !important;
  background-color: color-mix(in srgb, var(--medal) 14%, var(--card-bg));
}

.owner-avatar {
  border-color: var(--card-border) !important;
  background-color: var(--badge-bg);
}

.repo-link {
  color: var(--app-text);
  text-decoration: none;
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;
  text-decoration-color: transparent;
  transition: text-decoration-color 0.25s ease;
}

.repo-card:hover .repo-link {
  text-decoration: underline;
  text-decoration-color: var(--lang);
}

.repo-link:focus-visible {
  outline: none;
}

.repo-card:has(.repo-link:focus-visible) {
  border-color: #58a6ff !important;
  box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4) !important;
}

/* descriptions are clamped to 2 lines so every card stays a similar height */
.description {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.topic {
  color: var(--brand-blue, #58a6ff);
  background-color: color-mix(in srgb, var(--brand-blue, #58a6ff) 12%, transparent);
}

/* the language bar: Bootstrap's .progress-stacked, made thin, with a gap between languages */
.composition {
  --bs-progress-height: 6px;
  --bs-progress-bg: var(--badge-bg);
  gap: 2px;
}

.composition .progress {
  min-width: 3px;
  transform-origin: left;
  animation: grow 0.8s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--i, 0) * 50ms + 200ms);
}

@keyframes grow {
  from {
    transform: scaleX(0);
  }
}

.lang-dot {
  width: 10px;
  height: 10px;
  background-color: var(--lang);
  box-shadow: 0 0 8px color-mix(in srgb, var(--lang) 70%, transparent);
}

.lang-link {
  color: inherit;
  background: transparent;
  border: 1px solid transparent;
  padding: 0.1rem 0.4rem;
  margin-left: -0.4rem;
  position: relative;
  z-index: 2; /* above the card's stretched link, so it filters instead of opening GitHub */
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.lang-link:hover,
.lang-link.is-selected {
  color: var(--app-text);
  background-color: color-mix(in srgb, var(--lang) 16%, transparent);
  border-color: color-mix(in srgb, var(--lang) 55%, transparent);
}

.lang-link:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4);
}

.repo-arrow {
  color: var(--lang);
  opacity: 0;
  transform: translateX(-8px);
  transition:
    opacity 0.25s ease,
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.repo-card:hover .repo-arrow {
  opacity: 1;
  transform: translateX(0);
}

.meta-star svg {
  transition:
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    color 0.2s ease;
}

.repo-card:hover .meta-star svg {
  color: #e3b341;
  transform: rotate(72deg) scale(1.2);
}

/* light theme: no glow on the language dots (it smudges on white) */
:root[data-bs-theme='light'] .lang-dot,
:root[data-bs-theme='light'] .chip-dot {
  box-shadow: none;
}

/* ---------- Switching between carousel and list ---------- */
.view-swap-enter-active,
.view-swap-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.view-swap-enter-from,
.view-swap-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

/* ---------- List transitions ---------- */
.repo-enter-active {
  animation: repo-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--i) * 50ms);
}

.repo-leave-active {
  position: absolute;
  left: 0;
  right: 0;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.repo-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

.repo-move {
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes repo-in {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .view-swap-enter-active,
  .view-swap-leave-active,
  .repo-enter-active,
  .repo-leave-active,
  .repo-move,
  .chip-enter-active,
  .chip-leave-active,
  .composition .progress {
    animation: none !important;
    transition: none !important;
  }

  .repo-card,
  .repo-arrow,
  .meta-star svg {
    transition: none !important;
  }
}
</style>
