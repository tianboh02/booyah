<script setup>
import { computed } from 'vue'
import { getLangColor } from '@/utils/langColors'
import { itemLang } from '@/utils/savedLibrary'
import PageHeader from '@/components/shared/PageHeader.vue'

const props = defineProps({
    items: {
        type: Array,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    }
})

// The aurora takes its colors from the languages of your saved projects.
const colors = computed(() => {
    const counts = {}
    props.items.forEach(i => {
        if (i.status === 'ok' && i.language) counts[itemLang(i)] = (counts[itemLang(i)] || 0) + 1
    })
    const top = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => getLangColor(name))

    const fallback = ['#58a6ff', '#6b8aff', '#e3b341']
    return [0, 1, 2].map(i => top[i] || fallback[i])
})

const count = computed(() => props.items.length)
const filled = computed(() => !props.loading && count.value > 0)
const pillText = computed(() => {
    if (props.loading) return 'Loading your bookmarks'
    if (count.value === 0) return 'Nothing saved yet'
    return `${count.value} saved`
})
</script>

<template>
    <PageHeader title="Saved Projects" subtitle="Everything you bookmarked in Discovery, in one place."
        :status="pillText" :live="filled" :colors="colors">
        <!-- Bookmark instead of the pulse dot; it fills in once something is saved -->
        <template #marker>
            <svg class="pill-mark" :class="{ 'is-filled': filled }" width="13" height="13" viewBox="0 0 16 16"
                fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">
                <path d="M3.5 2.5h9v11.2L8 10.6l-4.5 3.1z" />
            </svg>
        </template>
    </PageHeader>
</template>

<style scoped>
.pill-mark path {
    fill: transparent;
    transition: fill 0.4s ease;
}

.pill-mark.is-filled {
    color: #58a6ff;
}

.pill-mark.is-filled path {
    fill: currentColor;
}
</style>
