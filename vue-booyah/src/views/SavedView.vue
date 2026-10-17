<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
    UNDO_MS,
    itemCategory,
    itemLang,
    useSavedLibrary,
} from '@/utils/savedLibrary'

import SavedPageHeader from '@/components/saved/savedPageHeader.vue'
import SavedStats from '@/components/saved/savedStats.vue'
import SavedToolbar from '@/components/saved/savedToolbar.vue'
import SavedList from '@/components/saved/savedList.vue'
import SavedUndoToast from '@/components/saved/savedUndoToast.vue'

const {
    items,
    loading,
    error,
    lastRemoved,
    load,
    remove,
    undo,
    dismissUndo,
} = useSavedLibrary()

// Shared filters for the statistics, toolbar, and list.
const selectedCategory = ref(null)
const selectedLang = ref(null)
const search = ref('')
const sortBy = ref('newest')

// Filter items by category and language.
const focusItems = computed(() =>
    items.value.filter(item =>
        (!selectedCategory.value ||
            itemCategory(item) === selectedCategory.value) &&
        (!selectedLang.value ||
            itemLang(item) === selectedLang.value),
    ),
)

// Apply search and sorting to the focused items.
const visibleItems = computed(() => {
    let list = [...focusItems.value]

    const query = search.value.trim().toLowerCase()

    if (query) {
        list = list.filter(item =>
            [
                item.name,
                item.owner,
                item.description,
                itemCategory(item),
            ].some(value => value?.toLowerCase().includes(query)),
        )
    }

    list.sort((a, b) => {
        if (sortBy.value === 'name') {
            return a.name.localeCompare(b.name)
        }

        if (sortBy.value === 'stars') {
            return (b.stars || 0) - (a.stars || 0)
        }

        // MongoDB IDs begin with a timestamp.
        return String(b._id).localeCompare(String(a._id))
    })

    return list
})

// Clear filters when their selected category or language no longer exists.
watch(
    items,
    list => {
        if (
            selectedCategory.value &&
            !list.some(
                item => itemCategory(item) === selectedCategory.value,
            )
        ) {
            selectedCategory.value = null
        }

        if (
            selectedLang.value &&
            !list.some(
                item =>
                    item.status === 'ok' &&
                    itemLang(item) === selectedLang.value,
            )
        ) {
            selectedLang.value = null
        }
    },
    { deep: true },
)

function resetFilters() {
    selectedCategory.value = null
    selectedLang.value = null
    search.value = ''
}

function toggleCategory(name) {
    selectedCategory.value =
        selectedCategory.value === name ? null : name
}

function toggleLang(name) {
    selectedLang.value =
        selectedLang.value === name ? null : name
}

onMounted(load)
</script>

<template>
    <div class="container my-4">
        <SavedPageHeader :items="items" :loading="loading" />

        <!-- Error message -->
        <div v-if="error"
            class="alert alert-danger d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 mb-3"
            role="alert">
            <span>{{ error }}</span>

            <button type="button"
                class="btn btn-sm btn-outline-danger flex-shrink-0 align-self-start align-self-sm-center" @click="load">
                Try again
            </button>
        </div>

        <!-- Saved project statistics -->
        <SavedStats v-if="loading || items.length" v-model:selected-category="selectedCategory"
            v-model:selected-lang="selectedLang" :items="items" :scoped="focusItems" :loading="loading" />

        <!-- Search and sorting toolbar -->
        <SavedToolbar v-if="!loading && items.length" v-model:search="search" v-model:sort-by="sortBy"
            v-model:selected-category="selectedCategory" v-model:selected-lang="selectedLang"
            :shown="visibleItems.length" :total="items.length" />

        <!-- Saved projects list -->
        <SavedList v-if="!error || items.length" :items="visibleItems" :total="items.length" :loading="loading"
            :selected-category="selectedCategory" :selected-lang="selectedLang" @remove="remove"
            @toggle-category="toggleCategory" @toggle-lang="toggleLang" @reset="resetFilters" />

        <!-- Undo removal notification -->
        <SavedUndoToast :removed="lastRemoved ? lastRemoved.item : null" :duration="UNDO_MS" @undo="undo"
            @dismiss="dismissUndo" />
    </div>
</template>
