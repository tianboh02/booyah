<script setup>
import { onMounted, ref } from 'vue'
import { fetchDiscoveryData } from '@/utils/hackernewsDiscovery'
import { useSavedProjects } from '@/utils/savedProjects'

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

// Saved projects: bookmark state for the current user
const { saved, pending, error: saveError, loadSaved, toggleSave } = useSavedProjects()

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

// Bookmark clicked on a row: toggles the save (POST /createSave or DELETE /deleteSave)
function saveFromCard(category, project) {
    toggleSave(project, category.name)
}

// Save button inside the detail dialog (the project already carries categoryName)
function saveFromDetail(project) {
    toggleSave(project, project.categoryName)
}

onMounted(() => {
    load()
    loadSaved()
})
</script>

<template>
    <div class="container my-4">
        <DiscoveryPageHeader :categories="categories" :loading="loading" :error="!!error" />

        <JobsLoadingSatellite v-if="loading" :done="progress.done" :total="progress.total" />

        <!-- Loaded Content & Banners -->
        <template v-else>
            <DiscoveryBanners :warning="warning" :error="error" @retry="load" />

            <!-- Save / unsave failures -->
            <div v-if="saveError" class="alert alert-danger alert-dismissible py-2 px-3 small mb-3" role="alert">
                {{ saveError }}
                <button type="button" class="btn-close" aria-label="Dismiss" @click="saveError = ''"></button>
            </div>

            <template v-if="!error">
                <DiscoveryStats v-if="categories.length" :categories="categories" :selected-lang="selectedLang" />
                <DiscoveryLanguageFilter v-model:selected-lang="selectedLang" :categories="categories" />
                <DiscoveryCategoryGrid v-model:selected-lang="selectedLang" :categories="categories" :saved-map="saved"
                    :pending-links="pending" @open="openProject" @save="saveFromCard" />

                <DiscoveryProjectDetail v-if="selectedProject" :project="selectedProject"
                    :saved="!!saved[selectedProject.ghUrl]" :saving="pending.has(selectedProject.ghUrl)"
                    @close="selectedProject = null" @save="saveFromDetail" />
            </template>
        </template>
    </div>
</template>