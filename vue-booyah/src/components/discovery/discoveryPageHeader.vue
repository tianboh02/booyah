<script setup>
import { computed } from 'vue'
import { getLangColor } from '@/utils/langColors'
import PageHeader from '@/components/shared/PageHeader.vue'

const props = defineProps({
    categories: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: Boolean, default: false }
})

// The aurora takes its colours from the three most common languages across the launches.
const colors = computed(() => {
    const counts = {}
    for (const c of props.categories) {
        for (const p of c.projects) if (p.language) counts[p.language] = (counts[p.language] || 0) + 1
    }
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => getLangColor(name))
})

const live = computed(() => !props.loading && !props.error && props.categories.length > 0)
const status = computed(() => {
    if (props.loading) return 'Reading Show HN'
    return live.value ? 'Live from Show HN · Last 30 days' : 'Not connected'
})
</script>

<template>
    <PageHeader title="Discovery"
        subtitle="What developers are building this month, from Show HN launches checked against GitHub."
        :status="status" :live="live" :colors="colors" />
</template>
