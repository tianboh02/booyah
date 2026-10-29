<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
    UNDO_MS,
    itemCategory,
    itemLang,
    useSavedLibrary,
} from '@/utils/savedLibrary'
import { topLangColors } from '@/utils/langColors'

import PageHeader from '@/components/shared/PageHeader.vue'
import AlertBanners from '@/components/shared/AlertBanners.vue'
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

//for the aurora in the header cards
const HEADER_FALLBACK = ['#58a6ff', '#6b8aff', '#e3b341']
const headerColors = computed(() => {
    const top = topLangColors(items.value.filter(i => i.status === 'ok' && i.language).map(itemLang))
    return HEADER_FALLBACK.map((c, i) => top[i] || c)
})
const filled = computed(() => !loading.value && items.value.length > 0)
const pillText = computed(() => {
    if (loading.value) return 'Loading your bookmarks'
    if (items.value.length === 0) return 'Nothing saved yet'
    return `${items.value.length} saved`
})

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

// compute search and sorting to the focused items.
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
        <PageHeader title="Saved Projects" subtitle="Everything you bookmarked in Discovery, in one place."
            :status="pillText" :live="filled" :colors="headerColors">
            <!-- Bookmark instead of the pulse dot; it fills in once something is saved -->
            <template #marker>
                <svg class="pill-mark" :class="{ 'is-filled': filled }" width="13" height="13" viewBox="0 0 16 16"
                    fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">
                    <path d="M3.5 2.5h9v11.2L8 10.6l-4.5 3.1z" />
                </svg>
            </template>
        </PageHeader>

        <AlertBanners :error="error" @retry="load" />

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
