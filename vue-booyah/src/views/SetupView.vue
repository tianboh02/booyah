<script setup>
import { ref } from 'vue'
import Setup from '@/components/setup/setup.vue'
import ExperienceForm from '@/components/setup/experienceForm.vue'

const experience = ref('Newcomer')
</script>

<template>
    <main class="setup-stage d-flex flex-column justify-content-center">
        <Setup :experience="experience" />
        <ExperienceForm v-model:experience="experience" />
    </main>
</template>

<style scoped>
.setup-stage {
    position: relative;
    isolation: isolate;
    min-height: 100vh;
    overflow-x: clip;
    padding-block: 3rem;
}
</style>