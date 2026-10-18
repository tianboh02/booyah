<!--
  src/components/trending/trending.vue

  What it does:  the Trending page itself: the page title, then each Trending section.
                 Right now there is one section, Languages (languages/languagesSection.vue).
  Receives:      nothing (no props).
  Gives back:    nothing (no emits).
  Used by:       src/views/TrendingView.vue (the /trending route). Keep this file's name and place,
                 because TrendingView.vue imports it by this path.
-->
<script setup>
// ---------- Imports ----------
import LanguagesSection from '@/components/trending/languages/languagesSection.vue'
</script>

<template>
  <div class="container my-4">
    <!-- Page header -->
    <header class="mb-4">
      <h3 class="fw-bold text-white mb-1">Trending</h3>
      <p class="text-muted-github small mb-0">
        What developers are installing right now, across the biggest package registries.
      </p>
    </header>

    <!-- Sections (more Trending sections can be added below) -->
    <LanguagesSection />
  </div>
</template>
