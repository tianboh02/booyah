<script setup>
import { computed } from 'vue'
import { langColors } from '@/utils/langColors'
import PageHeader from '@/components/shared/PageHeader.vue'

const props = defineProps({
    rolesDetail: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    error: { type: Boolean, default: false }
})

// The aurora takes its colours from the three technologies most often named in job posts
// (only ones with a known language colour; the page falls back to the default blues until data arrives).
const colors = computed(() => {
    const totals = {}
    for (const d of Object.values(props.rolesDetail)) {
        for (const t of d.tech?.top ?? []) totals[t.name] = (totals[t.name] ?? 0) + t.share
    }
    return Object.keys(totals)
        .filter((name) => langColors[name])
        .sort((a, b) => totals[b] - totals[a])
        .slice(0, 3)
        .map((name) => langColors[name])
})

const live = computed(() => !props.loading && !props.error && Object.keys(props.rolesDetail).length > 0)
const status = computed(() => {
    if (props.loading) return 'Reading Who is Hiring'
    return live.value ? 'Live from Hacker News · Last 6 months' : 'Not connected'
})
</script>

<template>
    <PageHeader title="Jobs"
        subtitle='Which roles companies are hiring for and what they post as pay, from Hacker News "Who is Hiring" threads.'
        :status="status" :live="live" :colors="colors" />
</template>
