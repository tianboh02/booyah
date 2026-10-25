<script setup>
import { ref } from 'vue'
import Setup from '@/components/setup/setup.vue'
import ExperienceForm from '@/components/setup/experienceForm.vue'

const experience = ref('Newcomer')
</script>

<template>
    <main class="setup-stage position-relative min-vh-100 py-5 d-flex flex-column justify-content-center">
        <Setup :experience="experience" />
        <ExperienceForm v-model:experience="experience" />
    </main>
</template>

<style scoped>
.setup-stage {
    isolation: isolate;
    overflow-x: clip;
}
</style>