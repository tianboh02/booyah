<script setup>

import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import Navbar from '@/components/navbar/navbar.vue'

const route = useRoute()
const isLanding = computed(() => route.path === '/')

</script>

<template>
  <Navbar />
  <main :class="{ 'px-4 px-md-5': !isLanding }">
    <RouterView />
  </main>
</template>