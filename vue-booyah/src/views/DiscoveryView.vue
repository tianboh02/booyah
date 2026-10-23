<script setup>
import { computed, onMounted, ref } from 'vue'
import { fetchDiscoveryData } from '@/utils/hackernewsDiscovery'
import { useSavedProjects } from '@/utils/savedProjects'

import DiscoveryPageHeader from '@/components/discovery/discoveryPageHeader.vue'
import DiscoveryBanners from '@/components/discovery/discoveryBanners.vue'
import DiscoveryStats from '@/components/discovery/discoveryStats.vue'
import DiscoveryLanguageFilter from '@/components/discovery/discoveryLanguageFilter.vue'
import DiscoveryCategoryGrid from '@/components/discovery/discoveryCategoryGrid.vue'
import DiscoveryProjectDetail from '@/components/discovery/discoveryProjectDetail.vue'
import SignalLoader from '@/components/shared/SignalLoader.vue'

const loading = ref(true)
const error = ref('')
const warning = ref('')
const progress = ref({ done: 0, total: 0 })

const LOADER_LEGEND = [
    { label: 'GitHub repos', colour: [63, 185, 80] },
    { label: 'Hacker News', colour: [255, 138, 61] }
]
const loaderStatus = computed(() => {
    const { done, total } = progress.value
    if (!total) return 'Scanning Hacker News for projects'
    if (done < total) return `Pulling repo details from GitHub ${done} / ${total}`
    return 'Sorting projects into categories'
})

const categories = ref([])
const selectedProject = ref(null)

// Shared language selection for filters, statistics, and project labels.
const selectedLang = ref(null)

// Saved projects and bookmark state.
const {
    saved,
    pending,
    error: saveError,
    loadSaved,
    toggleSave,
} = useSavedProjects()

async function load() {
    loading.value = true
    error.value = ''
    warning.value = ''
    progress.value = { done: 0, total: 0 }
    selectedProject.value = null
    selectedLang.value = null

    try {
        const { data, warning: warnMsg } = await fetchDiscoveryData(
            (done, total) => {
                progress.value = { done, total }
            },
        )

        categories.value = data
        warning.value = warnMsg
    } catch (e) {
        console.error('DiscoveryView: could not load discovery data', e)

        error.value =
            'Could not load projects from Hacker News and GitHub. Check your connection and try again.'
    } finally {
        loading.value = false
    }
}

function openProject(category, project) {
    selectedProject.value = {
        ...project,
        categoryName: category.name,
    }
}

// Toggle a project's saved state from a category card.
function saveFromCard(category, project) {
    toggleSave(project, category.name)
}

// Toggle a project's saved state from the detail dialog.
function saveFromDetail(project) {
    toggleSave(project, project.categoryName)
}

onMounted(() => {
    load()
    loadSaved().then(() => {
        // loadSaved only sets an error when the saves request fails
        if (saveError.value) saveError.value = 'Could not load Discovery Page'
    })
})
</script>

<template>
    <div class="container my-4">
        <DiscoveryPageHeader :categories="categories" :loading="loading" :error="!!error" />

        <SignalLoader v-if="loading" :done="progress.done" :total="progress.total" :status="loaderStatus"
            :legend="LOADER_LEGEND" />

        <template v-else>
            <DiscoveryBanners :warning="warning" :error="error" @retry="load" />

            <!-- Saved-project error message -->
            <div v-if="saveError" class="alert alert-danger d-flex align-items-center py-2 px-3 small mb-3" role="alert">
                <span class="flex-grow-1">{{ saveError }}</span>

                <button type="button" class="btn-close ms-3" aria-label="Dismiss" @click="saveError = ''"></button>
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
