<script setup>
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import Navbar from '@/components/navbar/navbar.vue'
import SiteFooter from '@/components/footer/siteFooter.vue'

const route = useRoute()
const isLanding = computed(() => route.path === '/')

</script>

<template>
  <div class="d-flex flex-column min-vh-100">
    <Navbar />
    <main class="flex-grow-1" :class="{ 'px-4 px-md-5': !isLanding }">
      <RouterView />
    </main>
    <SiteFooter />
  </div>
</template>