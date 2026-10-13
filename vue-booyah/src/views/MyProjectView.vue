<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

import ProjectList from '@/components/myproject/projectList.vue'
import ProjectPageHeader from '@/components/myproject/projectPageHeader.vue'
import ProjectStatsTable from '@/components/myproject/projectStatsTable.vue'

const repoList = ref([])

async function getRepos() {
    const token = localStorage.getItem('auth_token')
    const headers = {
        'Authorization': 'Bearer ' + token,
        'X-GitHub-Api-Version': '2022-11-28',
        'Accept': 'application/vnd.github+json'
    }

    try {
        const githubResponse = await axios.get("https://api.github.com/user/repos", { headers })
        repoList.value = githubResponse.data
    } catch (error) {
        console.error(error)
    }
}

onMounted(() => {
    getRepos()
})
</script>

<template>
    <main>
        <ProjectPageHeader />
        <ProjectStatsTable :repo-list="repoList" />
        <ProjectList :repo-list="repoList" />
    </main>
</template>