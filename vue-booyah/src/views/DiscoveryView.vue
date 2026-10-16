<script setup>
import { onMounted, ref } from 'vue'
import { fetchDiscoveryData } from '@/utils/hackernewsDiscovery'

import DiscoveryPageHeader from '@/components/discovery/discoveryPageHeader.vue'
import DiscoveryBanners from '@/components/discovery/discoveryBanners.vue'
import DiscoveryStats from '@/components/discovery/discoveryStats.vue'
import DiscoveryLanguageFilter from '@/components/discovery/discoveryLanguageFilter.vue'
import DiscoveryCategoryGrid from '@/components/discovery/discoveryCategoryGrid.vue'
import DiscoveryProjectDetail from '@/components/discovery/discoveryProjectDetail.vue'
import JobsLoadingSatellite from '@/components/jobs/jobsLoadingSatellite.vue'

const loading = ref(true)
const error = ref('')
const warning = ref('')
const progress = ref({ done: 0, total: 0 })

const categories = ref([])
const selectedProject = ref(null)
// The language in focus. The filter bar, the stat cards and each row's language label all share it.
const selectedLang = ref(null)

async function load() {
    loading.value = true
    error.value = ''
    warning.value = ''
    progress.value = { done: 0, total: 0 }
    selectedProject.value = null
    selectedLang.value = null
    try {
        const { data, warning: warnMsg } = await fetchDiscoveryData((done, total) => {
            progress.value = { done, total }
        })
        categories.value = data
        warning.value = warnMsg
    } catch (e) {
        console.error('DiscoveryView: could not load discovery data', e)
        error.value = 'Could not load projects from Hacker News and GitHub. Check your connection and try again.'
    } finally {
        loading.value = false
    }
}

function openProject(category, project) {
    selectedProject.value = { ...project, categoryName: category.name }
}

function saveProject() {
    // TODO: save to the backend (POST /createSave with userID, projectlink, category)
}

onMounted(load)
</script>

<template>
    <div class="container my-4">
        <DiscoveryPageHeader :categories="categories" :loading="loading" :error="!!error" />

        <JobsLoadingSatellite v-if="loading" :done="progress.done" :total="progress.total" />

        <!-- Loaded Content & Banners -->
        <template v-else>
            <DiscoveryBanners :warning="warning" :error="error" @retry="load" />

            <template v-if="!error">
                <DiscoveryStats v-if="categories.length" :categories="categories" :selected-lang="selectedLang" />
                <DiscoveryLanguageFilter v-model:selected-lang="selectedLang" :categories="categories" />
                <DiscoveryCategoryGrid v-model:selected-lang="selectedLang" :categories="categories"
                    @open="openProject" @save="saveProject" />

                <DiscoveryProjectDetail v-if="selectedProject" :project="selectedProject"
                    @close="selectedProject = null" @save="saveProject" />
            </template>
        </template>
    </div>
</template>
