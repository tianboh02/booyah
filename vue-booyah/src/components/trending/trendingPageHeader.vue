<!--
  src/components/trending/trendingPageHeader.vue

  What it does:  the Trending page's header card (shared/PageHeader.vue), like the Discovery, Jobs and
                 My Projects headers. The status pill names the open tab's source, without the dot.
  Receives:      props  activeTab (the open tab's id: packages | repositories | developers)
  Gives back:    nothing (no emits).
  Used by:       trending.vue.
-->
<script setup>
// ---------- Imports ----------
import { computed } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'

// ---------- Props ----------
const props = defineProps({
  activeTab: { type: String, default: 'packages' },
})

// ---------- Computed values ----------
const status = computed(() =>
  props.activeTab === 'packages' ? 'Live from npm, PyPI & more' : 'Live from GitHub',
)
</script>

<template>
  <PageHeader
    title="Trending"
    subtitle="What developers are installing, starring and following right now."
    :status="status"
    live
  >
    <!-- no pulse dot on Trending (an empty slot would fall back to the dot, so pass a hidden span) -->
    <template #marker><span class="d-none"></span></template>
  </PageHeader>
</template>
