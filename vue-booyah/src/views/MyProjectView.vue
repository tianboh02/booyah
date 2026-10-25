<script setup>
import { computed, ref, onMounted } from 'vue'
import axios from 'axios'
import { topLangColors } from '@/utils/langColors'

import ProjectList from '@/components/myproject/projectList.vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import ProjectStatsTable from '@/components/myproject/projectStatsTable.vue'

const repoList = ref([])
const loading = ref(true)

// Header: the aurora takes its colours from the three most common languages in your repositories.
const headerColors = computed(() => topLangColors(repoList.value.map(r => r.language)))
const synced = computed(() => !loading.value && repoList.value.length > 0)
const status = computed(() => {
    if (synced.value) return 'Synced with GitHub'
    return loading.value ? 'Connecting to GitHub' : 'Not connected'
})

// Shared language selection for the statistics and repository list.
const selectedLang = ref(null)

async function getRepos() {
    const token = localStorage.getItem('auth_token')

    const headers = {
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        Accept: 'application/vnd.github+json',
    }

    try {
        const { data } = await axios.get(
            'https://api.github.com/user/repos',
            { headers },
        )

        repoList.value = data
    } catch (error) {
        console.error('Failed to fetch repositories:', error)
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    getRepos()
})
</script>

<template>
    <div class="container my-4">
        <PageHeader title="My Projects" subtitle="Your GitHub repositories, loaded when you sign in."
            :status="status" :live="synced" :colors="headerColors" />

        <ProjectStatsTable v-model:selected-lang="selectedLang" :repo-list="repoList" :loading="loading" />

        <ProjectList v-model:selected-lang="selectedLang" :repo-list="repoList" :loading="loading" />
    </div>
</template>
