<script setup>
import { ref, computed } from 'vue'
import { getLangColor } from '@/utils/langColors'

const props = defineProps({
    repoList: {
        type: Array,
        default: () => []
    }
})

// Two-way data binding states
const searchQuery = ref('')
const sortBy = ref('updated')

// Filter and sort repositories dynamically
const filteredAndSortedRepos = computed(() => {
    let list = [...props.repoList]

    // Filter by name or description
    if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase()
        list = list.filter(repo => {
            const nameMatch = repo.name?.toLowerCase().includes(query)
            const descMatch = repo.description?.toLowerCase().includes(query)
            return nameMatch || descMatch
        })
    }

    // Sort logic
    list.sort((a, b) => {
        if (sortBy.value === 'name') {
            return a.name.localeCompare(b.name)
        } else if (sortBy.value === 'stars') {
            return (b.stargazers_count || 0) - (a.stargazers_count || 0)
        } else {
            // Default: Last updated
            return new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
        }
    })

    return list
})

function timeAgo(isoString) {
    if (!isoString) return ''
    const now = new Date()
    const past = new Date(isoString)
    const diffInSeconds = Math.floor((now - past) / 1000)

    if (diffInSeconds < 60) return 'just now'
    const minutes = Math.floor(diffInSeconds / 60)
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
    const months = Math.floor(days / 30)
    if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`
    const years = Math.floor(days / 365)
    return `${years} year${years > 1 ? 's' : ''} ago`
}
</script>

<template>
    <div class="repo-list-body container my-4">

        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
            <h4 class="text-white fw-bold mb-0">Repositories</h4>

            <div class="d-flex align-items-center gap-3 flex-wrap">
                <!-- Search -->
                <div class="position-relative" style="min-width: 220px;">
                    <span class="position-absolute top-50 start-0 translate-middle-y ms-2 pe-none small">🔍</span>
                    <input v-model="searchQuery" type="text" class="form-control form-control-sm github-control ps-4"
                        placeholder="Search repositories" />
                </div>

                <!-- Sort -->
                <div class="d-flex align-items-center gap-2">
                    <span class="text-muted-github small text-nowrap">Sort by</span>
                    <select v-model="sortBy" class="form-select form-select-sm github-control w-auto">
                        <option value="updated">Last updated</option>
                        <option value="name">Name</option>
                        <option value="stars">Stars</option>
                    </select>
                </div>
            </div>
        </div>

        <div v-if="filteredAndSortedRepos.length > 0">
            <div v-for="repo in filteredAndSortedRepos" :key="repo.id"
                class="card mb-3 p-3 rounded-3 shadow-sm text-white">
                <div class="d-flex align-items-center gap-2 mb-2">
                    <h5 class="card-title h6 fw-bold mb-0 text-white">{{ repo.name }}</h5>
                    <span class="badge badge-github rounded-pill text-capitalize fw-normal px-2 py-1">
                        {{ repo.private ? "Private" : "Public" }}
                    </span>
                </div>

                <p class="card-text text-muted-github small mb-3">
                    {{ repo.description || "No description" }}
                </p>

                <div class="d-flex align-items-center gap-3 text-muted-github small flex-wrap">
                    <div class="d-flex align-items-center gap-1">
                        <span class="rounded-circle d-inline-block"
                            :style="{ backgroundColor: getLangColor(repo.language || 'No language'), width: '10px', height: '10px' }"></span>
                        <span>{{ repo.language || 'No language' }}</span>
                    </div>

                    <span>☆ {{ repo.stargazers_count }}</span>
                    <span>Y {{ repo.forks_count }}</span>
                    <span>Updated {{ timeAgo(repo.updated_at) }}</span>
                </div>
            </div>
        </div>

        <!-- Empty Filter Results -->
        <div v-else class="text-center py-5 text-muted-github card p-4">
            No repositories found matching "{{ searchQuery }}"
        </div>

    </div>
</template>

<style scoped>
.github-control {
    background-color: #0d1117;
    border-color: #30363d;
    color: #f0f6fc;
}

.github-control:focus {
    background-color: #0d1117;
    border-color: #58a6ff;
    color: #f0f6fc;
    box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.3);
}
</style>