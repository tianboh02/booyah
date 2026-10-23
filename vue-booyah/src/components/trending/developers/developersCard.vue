<!--
  src/components/trending/developers/developersCard.vue

  What it does:  the one big card on Trending → Top Developers, in the style of a Discovery category
                 card (header with a count badge, then neatly lined-up rows with a language-coloured
                 edge on hover):
                   - header: title, "N developers with 1,000+ followers" badge, Sort (Followers /
                     Repositories / Joined)
                   - language filter: the developers' main languages as pills (click to filter)
                   - 20 rows: rank, avatar, username + name + bio, main language, followers,
                     public repos, joined year, and an arrow. Clicking a row opens their GitHub
                     profile in a new tab; clicking a language filters the list instead.
  Receives:      props  developers (from githubTrending.fetchTopDevelopers), totalCount
  Gives back:    nothing (no emits).
  Used by:       developersSection.vue.
  Children:      discovery/discoveryLangPill.vue (the same language pill Discovery uses),
                 shared/SortPills.vue (the Sort by pill, same as My Projects and Saved).
-->
<script setup>
// ---------- Imports ----------
import { ref, computed } from 'vue'
import { getLangColor } from '@/utils/langColors'
import { vSpotlight, useCountUp } from '@/utils/motion'
import { langOf } from '@/utils/top5Categories'
import { shortCount, pad2, MEDALS } from '@/utils/trending/github/display'
import DiscoveryLangPill from '@/components/discovery/discoveryLangPill.vue'
import SortPills from '@/components/shared/SortPills.vue'

// ---------- Props ----------
const props = defineProps({
  developers: { type: Array, default: () => [] },
  totalCount: { type: Number, default: 0 },
})

// ---------- Settings ----------
const SORT_OPTIONS = [
  { value: 'followers', label: 'Followers' },
  { value: 'repos', label: 'Repositories' },
  { value: 'joined', label: 'Joined' },
]

const MAX_LANG_PILLS = 6

// ---------- State ----------
const sortBy = ref('followers')
const selectedLang = ref(null)

// ---------- Computed values ----------
// The languages to offer as filters: the most common main languages first
const languages = computed(() => {
  const counts = {}
  for (const dev of props.developers) counts[langOf(dev)] = (counts[langOf(dev)] || 0) + 1
  return Object.keys(counts)
    .sort((a, b) => counts[b] - counts[a] || a.localeCompare(b))
    .slice(0, MAX_LANG_PILLS)
})

const rows = computed(() => {
  const list = selectedLang.value
    ? props.developers.filter((d) => langOf(d) === selectedLang.value)
    : [...props.developers]
  const sorters = {
    followers: (a, b) => a.rank - b.rank, // the search already ranks by followers
    repos: (a, b) => (b.publicRepos ?? -1) - (a.publicRepos ?? -1),
    joined: (a, b) => new Date(a.joined || 0) - new Date(b.joined || 0), // earliest first
  }
  return list.sort(sorters[sortBy.value])
})

const countBadge = useCountUp(() => props.totalCount)

// ---------- Functions ----------
const toggleLang = (lang) => (selectedLang.value = selectedLang.value === lang ? null : lang)
const joinedYear = (iso) => (iso ? new Date(iso).getUTCFullYear() : '–')
</script>

<template>
  <section v-spotlight class="dev-card card p-3 p-md-4 rounded-3 shadow-sm" aria-label="Top developers">
    <!-- ===================== Header ===================== -->
    <header
      class="card-head d-flex flex-wrap align-items-center justify-content-between gap-2 pb-3 mb-2"
    >
      <div class="d-flex align-items-center gap-2 flex-wrap min-w-0">
        <h2 class="h5 fw-bold section-title mb-0">Most followed on GitHub</h2>
        <span class="badge badge-github rounded-pill fw-normal px-2 py-1 text-nowrap">
          <span class="font-monospace">{{ countBadge.toLocaleString('en-US') }}</span>
          developers with 1,000+ followers
        </span>
      </div>

      <SortPills v-model="sortBy" :options="SORT_OPTIONS" aria-label="Sort developers" />
    </header>

    <!-- ===================== Language filter ===================== -->
    <div class="d-flex flex-wrap align-items-center gap-2 mb-3" role="group" aria-label="Filter by language">
      <span class="text-muted-github small me-1">Main language</span>
      <DiscoveryLangPill
        v-for="lang in languages"
        :key="lang"
        :lang="lang"
        :active="selectedLang === lang"
        outlined
        @click="toggleLang(lang)"
      />
      <button
        v-if="selectedLang"
        type="button"
        class="btn btn-sm btn-outline-secondary rounded-pill"
        @click="selectedLang = null"
      >
        Show all
      </button>
    </div>

    <!-- ===================== Column labels =====================
         Header and rows share the same Bootstrap grid classes, so the columns line up.
         Smaller screens drop columns with Bootstrap's d-none / d-*-block. -->
    <div class="row gx-2 mx-0 px-2 pb-2 text-muted-github small text-uppercase text-nowrap head-row" aria-hidden="true">
      <span class="col-auto rank-col">#</span>
      <span class="col">Developer</span>
      <span class="col-2 d-none d-md-block">Language</span>
      <span class="col-3 col-sm-2 col-lg-1 text-end">Followers</span>
      <span class="col-2 col-lg-1 d-none d-sm-block text-end">Repos</span>
      <span class="col-1 d-none d-lg-block text-end">Joined</span>
      <span class="col-auto d-none d-md-block arrow-col"></span>
    </div>

    <!-- ===================== The developers ===================== -->
    <TransitionGroup v-if="rows.length" name="dev" tag="ol" class="rows list-unstyled mb-0" appear>
      <li
        v-for="(dev, i) in rows"
        :key="dev.id"
        class="dev-row row gx-2 mx-0 align-items-center position-relative px-2 py-2 rounded-2"
        :style="{ '--lang': getLangColor(langOf(dev)), '--i': i }"
      >
        <!-- Rank (gold / silver / bronze for the top 3) -->
        <span class="col-auto rank-col">
          <span
            class="rank badge rounded-2 font-monospace text-muted-github"
            :class="{ podium: dev.rank <= 3 }"
            :style="dev.rank <= 3 ? { '--medal': MEDALS[dev.rank - 1] } : null"
          >
            {{ pad2(dev.rank) }}
          </span>
        </span>

        <!-- Avatar, username (the link to their profile: stretched-link makes the whole row
             clickable), name and bio -->
        <span class="col d-flex align-items-center gap-3 min-w-0">
          <img
            :src="dev.avatar"
            alt=""
            class="avatar rounded-circle border flex-shrink-0"
            width="40"
            height="40"
            loading="lazy"
          />
          <span class="d-flex flex-column min-w-0">
            <a
              :href="dev.htmlUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="dev-link stretched-link fw-semibold font-monospace text-truncate"
            >
              {{ dev.login }}<span class="visually-hidden"> (opens their GitHub profile)</span>
            </a>
            <span class="text-muted-github small text-truncate">
              <template v-if="dev.name">{{ dev.name }}</template>
              <template v-if="dev.name && (dev.bio || dev.company)"> · </template>
              {{ dev.bio || dev.company || (dev.name ? '' : dev.location) }}
            </span>
          </span>
        </span>

        <!-- Main language (z-2 lifts it above the row link, so clicking it filters instead) -->
        <span class="col-2 d-none d-md-block position-relative z-2 min-w-0">
          <DiscoveryLangPill
            :lang="langOf(dev)"
            :active="selectedLang === langOf(dev)"
            :title="selectedLang === langOf(dev) ? 'Clear filter' : 'Filter by ' + langOf(dev)"
            @click="toggleLang(langOf(dev))"
          />
        </span>

        <span class="col-3 col-sm-2 col-lg-1 text-end text-nowrap font-monospace small" title="Followers">
          <svg class="me-1 text-muted-github" width="13" height="13" viewBox="0 0 16 16" fill="none"
            stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
            <circle cx="8" cy="5.5" r="2.5" />
            <path d="M3 14c.6-2.6 2.6-4 5-4s4.4 1.4 5 4" />
          </svg>{{ shortCount(dev.followers) }}
        </span>

        <span class="col-2 col-lg-1 d-none d-sm-block text-end text-nowrap font-monospace small" title="Public repositories">
          <svg class="me-1 text-muted-github" width="13" height="13" viewBox="0 0 16 16" fill="none"
            stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 2.5h8.5a1 1 0 0 1 1 1V12H4.2A1.2 1.2 0 0 0 3 13.2z" />
            <path d="M3 13.2A1.2 1.2 0 0 0 4.2 14.5h8.3" stroke-linecap="round" />
          </svg>{{ shortCount(dev.publicRepos) }}
        </span>

        <span class="col-1 d-none d-lg-block text-end text-muted-github small font-monospace" title="Joined GitHub">
          {{ joinedYear(dev.joined) }}
        </span>

        <span class="col-auto d-none d-md-block arrow-col">
          <svg class="row-arrow" width="14" height="14" viewBox="0 0 16 16" fill="none"
            stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
            aria-hidden="true">
            <path d="M5 11L11 5M6 5h5v5" />
          </svg>
        </span>
      </li>
    </TransitionGroup>

    <p v-else class="empty text-muted-github small text-center py-5 mb-0">
      {{ selectedLang ? `No developers mainly writing ${selectedLang} in the top 20.` : 'GitHub returned no developers.' }}
    </p>

    <p class="text-muted-github small mt-3 mb-0">
      Ranked by followers. "Language" is the most common language in each developer's 30 most
      recently pushed repositories (forks left out).
    </p>
  </section>
</template>

<style scoped>
/*
  Layout is Bootstrap: the card, the header's d-flex/gap, and a row/col grid shared by the column
  labels and every developer row (so the columns line up), with d-none / d-*-block hiding columns on
  smaller screens. This CSS is only what Bootstrap can't do: main.css's theme colours, the cursor
  spotlight, the hover effects and the row animations (styled after Discovery's category card).
*/
.min-w-0 {
  min-width: 0;
}

.section-title,
.dev-link {
  color: var(--app-text);
}

/* ---------- The card ---------- */
.dev-card {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.dev-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
  background: radial-gradient(
    420px circle at var(--mx, 50%) var(--my, 50%),
    color-mix(in srgb, #58a6ff 12%, transparent),
    transparent 70%
  );
}

.dev-card:hover::before {
  opacity: 1;
}

.dev-card > * {
  position: relative;
}

.card-head {
  border-bottom: 1px solid var(--card-border);
}

.dev-link:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4);
}

/* ---------- Rows ---------- */
.head-row {
  font-size: 0.75rem;
  letter-spacing: 0.04em;
}

/* fixed widths so the rank and arrow columns line up between the labels and the rows */
.rank-col {
  width: 3.25rem;
}

.arrow-col {
  width: 1.75rem;
}

.rows {
  min-height: calc(5 * 64px); /* keeps the card's height steady when a filter leaves few rows */
}

.dev-row {
  min-height: 64px;
  transition: background-color 0.2s ease;
}

.dev-row + .dev-row {
  border-top: 1px solid color-mix(in srgb, var(--card-border) 60%, transparent);
}

.dev-row:hover {
  background-color: var(--badge-bg);
}

/* language-coloured edge on the hovered row */
.dev-row::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  padding: 0;
  border-radius: 2px;
  background: var(--lang);
  transform: scaleY(0);
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.dev-row:hover::before {
  transform: scaleY(1);
}

.rank {
  min-width: 2.2em;
}

.rank.podium {
  color: var(--medal) !important;
  border: 1px solid color-mix(in srgb, var(--medal) 55%, var(--card-border));
  background-color: color-mix(in srgb, var(--medal) 14%, var(--card-bg));
}

.avatar {
  border-color: var(--card-border) !important;
  background-color: var(--badge-bg);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dev-row:hover .avatar {
  transform: scale(1.08);
}

.dev-link {
  font-size: 0.95rem;
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;
  text-decoration-color: transparent;
  transition: text-decoration-color 0.25s ease;
}

.dev-row:hover .dev-link {
  text-decoration-color: var(--lang);
}

.row-arrow {
  color: var(--lang);
  opacity: 0;
  transform: translateX(-8px);
  transition:
    opacity 0.25s ease,
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.dev-row:hover .row-arrow {
  opacity: 1;
  transform: translateX(0);
}

/* ---------- Row animations: stagger in, slide when re-sorted ---------- */
.dev-enter-active {
  animation: dev-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--i) * 35ms);
}

.dev-leave-active {
  display: none; /* filtered-out rows go at once, so the rest can slide into place */
}

.dev-move {
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes dev-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
}

/* phones: a smaller avatar */
@media (max-width: 575.98px) {
  .avatar {
    width: 32px;
    height: 32px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dev-card::before,
  .dev-row,
  .dev-row::before,
  .avatar,
  .row-arrow,
  .dev-link,
  .dev-move {
    transition: none !important;
  }

  .dev-enter-active {
    animation: none !important;
  }
}
</style>
