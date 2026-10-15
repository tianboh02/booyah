<script setup>
import { RouterView } from 'vue-router'
import Navbar from '@/components/navbar/navbar.vue'
</script>

<template>
  <Navbar />
  <main class="px-4 px-md-5">
    <RouterView />
  </main>
</template>