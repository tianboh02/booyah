<script setup>
import { onMounted, ref } from 'vue'
import { fetchDiscoveryData } from '@/utils/hackernewsDiscovery'
import { MIN_STARS } from '@/utils/top5Categories'

import DiscoveryPageHeader from '@/components/discovery/discoveryPageHeader.vue'
import DiscoveryCategoryCard from '@/components/discovery/discoveryCategoryCard.vue'
import DiscoveryProjectDetail from '@/components/discovery/discoveryProjectDetail.vue'
import JobsLoadingSatellite from '@/components/jobs/jobsLoadingSatellite.vue'

const loading = ref(true)
const error = ref('')
const warning = ref('')
const progress = ref({ done: 0, total: 0 })

const categories = ref([])
const selectedProject = ref(null)

async function load() {
    loading.value = true
    error.value = ''
    warning.value = ''
    progress.value = { done: 0, total: 0 }
    selectedProject.value = null
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
        <DiscoveryPageHeader />

        <JobsLoadingSatellite v-if="loading" :done="progress.done" :total="progress.total" />

        <template v-else>
            <div v-if="warning" class="alert alert-warning py-2 px-3 small mb-3" role="status">
                {{ warning }}
            </div>

            <div v-if="error" class="alert alert-danger d-flex align-items-center justify-content-between mb-3"
                role="alert">
                <span>{{ error }}</span>
                <button type="button" class="btn btn-sm btn-outline-danger" @click="load">Try again</button>
            </div>

            <div v-else class="alert badge-github text-muted-github border mb-3 small py-2 px-3" role="note">
                💡 Categories are ranked by number of builders. Projects within a category are ranked by Show HN
                points, not GitHub stars. Only repositories with at least {{ MIN_STARS }} stars are shown.
            </div>

            <div v-if="!error" class="row row-cols-1 row-cols-lg-2 g-3">
                <div v-for="c in categories" :key="c.id" class="col">
                    <DiscoveryCategoryCard :category="c" @open="openProject(c, $event)" @save="saveProject" />
                </div>
            </div>

            <DiscoveryProjectDetail v-if="selectedProject" :project="selectedProject" @close="selectedProject = null"
                @save="saveProject" />
        </template>
    </div>
</template>
