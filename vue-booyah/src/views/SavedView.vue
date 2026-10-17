<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { UNDO_MS, itemCategory, itemLang, useSavedLibrary } from '@/utils/savedLibrary'

import SavedPageHeader from '@/components/saved/savedPageHeader.vue'
import SavedStats from '@/components/saved/savedStats.vue'
import SavedToolbar from '@/components/saved/savedToolbar.vue'
import SavedList from '@/components/saved/savedList.vue'
import SavedUndoToast from '@/components/saved/savedUndoToast.vue'

const { items, loading, error, lastRemoved, load, remove, undo, dismissUndo } = useSavedLibrary()

// Shared by the charts, the toolbar chips, the cards and the list
const selectedCategory = ref(null)
const selectedLang = ref(null)
const search = ref('')
const sortBy = ref('newest')

// Category + language focus. The top stat cards describe this set.
const focusItems = computed(() =>
    items.value.filter(i =>
        (!selectedCategory.value || itemCategory(i) === selectedCategory.value) &&
        (!selectedLang.value || itemLang(i) === selectedLang.value)
    )
)

// Focus + search + sort. This is what the list shows.
const visibleItems = computed(() => {
    let list = [...focusItems.value]

    const q = search.value.trim().toLowerCase()
    if (q) {
        list = list.filter(i =>
            [i.name, i.owner, i.description, itemCategory(i)].some(v => v?.toLowerCase().includes(q))
        )
    }

    list.sort((a, b) => {
        if (sortBy.value === 'name') return a.name.localeCompare(b.name)
        if (sortBy.value === 'stars') return (b.stars || 0) - (a.stars || 0)
        // newest: a Mongo _id starts with a timestamp
        return String(b._id).localeCompare(String(a._id))
    })

    return list
})

// If the last project of a focused category / language is removed, drop that focus
watch(items, (list) => {
    if (selectedCategory.value && !list.some(i => itemCategory(i) === selectedCategory.value)) {
        selectedCategory.value = null
    }
    if (selectedLang.value && !list.some(i => i.status === 'ok' && itemLang(i) === selectedLang.value)) {
        selectedLang.value = null
    }
}, { deep: true })

function resetFilters() {
    selectedCategory.value = null
    selectedLang.value = null
    search.value = ''
}

const toggleCategory = (name) => (selectedCategory.value = selectedCategory.value === name ? null : name)
const toggleLang = (name) => (selectedLang.value = selectedLang.value === name ? null : name)

onMounted(load)
</script>

<template>
    <div class="container my-4">
        <SavedPageHeader :items="items" :loading="loading" />

        <div v-if="error" class="alert alert-danger d-flex align-items-center justify-content-between mb-3"
            role="alert">
            <span>{{ error }}</span>
            <button type="button" class="btn btn-sm btn-outline-danger" @click="load">Try again</button>
        </div>

        <SavedStats v-if="loading || items.length" v-model:selected-category="selectedCategory"
            v-model:selected-lang="selectedLang" :items="items" :scoped="focusItems" :loading="loading" />

        <SavedToolbar v-if="!loading && items.length" v-model:search="search" v-model:sort-by="sortBy"
            v-model:selected-category="selectedCategory" v-model:selected-lang="selectedLang"
            :shown="visibleItems.length" :total="items.length" />

        <SavedList v-if="!error || items.length" :items="visibleItems" :total="items.length" :loading="loading"
            :selected-category="selectedCategory" :selected-lang="selectedLang" @remove="remove"
            @toggle-category="toggleCategory" @toggle-lang="toggleLang" @reset="resetFilters" />

        <SavedUndoToast :removed="lastRemoved ? lastRemoved.item : null" :duration="UNDO_MS" @undo="undo"
            @dismiss="dismissUndo" />
    </div>
</template>