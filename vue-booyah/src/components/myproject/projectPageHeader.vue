<script setup>
import { computed } from 'vue'
import { getLangColor } from '@/utils/langColors'
import PageHeader from '@/components/shared/PageHeader.vue'

const props = defineProps({
    repoList: {
        type: Array,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    }
})

// The aurora takes its colours from the three most common languages in your repositories.
const colors = computed(() => {
    const counts = {}
    props.repoList.forEach(r => {
        if (r.language) counts[r.language] = (counts[r.language] || 0) + 1
    })
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => getLangColor(name))
})

const synced = computed(() => !props.loading && props.repoList.length > 0)
const status = computed(() => {
    if (synced.value) return 'Synced with GitHub'
    return props.loading ? 'Connecting to GitHub' : 'Not connected'
})
</script>

<template>
    <PageHeader title="My Projects" subtitle="Your GitHub repositories, loaded when you sign in."
        :status="status" :live="synced" :colors="colors" />
</template>
