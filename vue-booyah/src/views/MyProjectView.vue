<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

import ProjectList from '@/components/myproject/projectList.vue'
import ProjectPageHeader from '@/components/myproject/projectPageHeader.vue'
import ProjectStatsTable from '@/components/myproject/projectStatsTable.vue'

const repoList = ref([])
const loading = ref(true)

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
        <ProjectPageHeader :repo-list="repoList" :loading="loading" />

        <ProjectStatsTable v-model:selected-lang="selectedLang" :repo-list="repoList" :loading="loading" />

        <ProjectList v-model:selected-lang="selectedLang" :repo-list="repoList" :loading="loading" />
    </div>
</template>
