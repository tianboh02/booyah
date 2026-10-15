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

        <!-- Controls Header Row -->
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
            <h3 class="h3 fw-bold section-title mb-0">Repositories</h3>

            <div class="d-flex align-items-center gap-3 flex-wrap">
                <!-- Search Input -->
                <div class="position-relative" style="min-width: 240px;">
                    <span class="position-absolute top-50 start-0 translate-middle-y ms-2 pe-none opacity-75"
                        style="font-size: 0.85rem; line-height: 1;">🔍</span>

                    <input v-model="searchQuery" type="text" class="form-control form-control-sm github-control"
                        style="padding-left: 1.85rem;" placeholder="Search repositories" />
                </div>

                <!-- Sort Select Box -->
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

        <!-- Repository List Cards -->
        <div v-if="filteredAndSortedRepos.length > 0">
            <div v-for="repo in filteredAndSortedRepos" :key="repo.id" class="card mb-3 p-3 rounded-3 shadow-sm">
                <div class="d-flex align-items-center gap-2 mb-2">
                    <h5 class="card-title h6 fw-bold mb-0">{{ repo.name }}</h5>
                    <span class="badge badge-github rounded-pill text-capitalize fw-normal px-2 py-1">
                        {{ repo.private ? "Private" : "Public" }}
                    </span>
                </div>

                <p class="card-text text-muted-github small mb-3">
                    {{ repo.description || "No description" }}
                </p>

                <!-- Bottom Metadata Row -->
                <div class="d-flex align-items-center gap-3 text-muted-github small flex-wrap">
                    <div class="d-flex align-items-center gap-1">
                        <span class="rounded-circle d-inline-block flex-shrink-0"
                            :style="{ backgroundColor: getLangColor(repo.language || 'No language'), width: '10px', height: '10px' }"></span>
                        <span>{{ repo.language || 'No language' }}</span>
                    </div>

                    <!-- Monospace restricted to numbers only -->
                    <span>☆ <span class="font-monospace">{{ repo.stargazers_count }}</span></span>
                    <span>Y <span class="font-monospace">{{ repo.forks_count }}</span></span>

                    <!-- Standard prose font for date -->
                    <span>Updated {{ timeAgo(repo.updated_at) }}</span>
                </div>
            </div>
        </div>

        <!-- Empty Filter/Repository Message -->
        <div v-else class="text-center py-5 text-muted-github card p-4 rounded-3 shadow-sm">
            <span v-if="searchQuery.trim()">
                No repositories found matching "{{ searchQuery }}"
            </span>
            <span v-else>
                No repositories found.
            </span>
        </div>

    </div>
</template>

<style scoped>
.section-title,
.card-title {
    color: var(--app-text);
}

.github-control:focus {
    border-color: #58a6ff !important;
    box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.3);
}
</style>