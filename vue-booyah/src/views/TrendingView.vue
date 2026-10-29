
<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import TrendingTabs from '@/components/trending/trendingTabs.vue'
import LanguagesSection from '@/components/trending/languages/languagesSection.vue'
import RepositoriesSection from '@/components/trending/repositories/repositoriesSection.vue'
import DevelopersSection from '@/components/trending/developers/developersSection.vue'

// ---------- Settings ----------
// The tabs, in order. `id` is what shows in the address (?tab=repositories).
const TABS = [
  { id: 'packages', label: 'Packages', component: LanguagesSection },
  { id: 'repositories', label: 'Repositories', component: RepositoriesSection },
  { id: 'developers', label: 'Developers', component: DevelopersSection },
]

const route = useRoute()
const router = useRouter()

// The open tab lives in the address bar (?tab=…); Packages when there's none or it's unknown
const activeTab = computed({
  get: () => (TABS.some((t) => t.id === route.query.tab) ? route.query.tab : 'packages'),
  set: (id) => {
    const query = { ...route.query, tab: id }
    if (id === 'packages') delete query.tab // keep the plain /trending address for the first tab
    router.replace({ query })
  },
})

const activeComponent = computed(() => TABS.find((t) => t.id === activeTab.value).component)

// The header's status pill names the open tab's source
const status = computed(() =>
  activeTab.value === 'packages' ? 'Live from npm, PyPI & more' : 'Live from GitHub',
)
</script>

<template>
  <div class="trending-page container my-4">
    <!-- Page header -->
    <PageHeader
      title="Trending"
      subtitle="What developers are installing, starring and following right now."
      :status="status"
      live
    />

    <!-- Trending nav bar -->
    <TrendingTabs v-model="activeTab" :tabs="TABS" />

    <!-- The open section. KeepAlive keeps each section's data and state while you're on another tab. -->
    <div
      :id="`trending-panel-${activeTab}`"
      role="tabpanel"
      :aria-labelledby="`trending-tab-${activeTab}`"
    >
      <Transition name="section" mode="out-in">
        <KeepAlive>
          <component :is="activeComponent" :key="activeTab" />
        </KeepAlive>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.trending-page {
  --ink: var(--app-text);
  --ink-2: var(--text-muted-github);
  --edge: var(--card-border);
  --accent: var(--brand-blue, #58a6ff);
  --accent-line: var(--brand-blue, #58a6ff);
  --focus: var(--brand-blue, #58a6ff);
  --ease: cubic-bezier(0.22, 1, 0.36, 1);
}

/* switching tabs: the old section fades out, the new one fades up */
.section-enter-active,
.section-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.section-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.section-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .section-enter-active,
  .section-leave-active {
    transition: none;
  }
}
</style>
