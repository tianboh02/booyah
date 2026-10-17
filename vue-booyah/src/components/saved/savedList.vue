<script setup>
import SavedCard from '@/components/saved/savedCard.vue'
import CardRing from '@/components/ring/CardRing.vue'
import RingCaption from '@/components/ring/RingCaption.vue'
import { categoryColor, itemCategory } from '@/utils/savedLibrary'

defineProps({
    // already filtered and sorted
    items: { type: Array, default: () => [] },
    // how many projects are saved in total, before any filter
    total: { type: Number, default: 0 },
    loading: { type: Boolean, default: false },
    selectedCategory: { type: String, default: null },
    selectedLang: { type: String, default: null }
})

defineEmits(['remove', 'toggle-category', 'toggle-lang', 'reset'])

const pad = (n) => String(n).padStart(2, '0')
</script>

<template>
    <div id="saved-list">

        <!-- Loading skeleton (Bootstrap placeholders) -->
        <div v-if="loading">
            <div v-for="n in 4" :key="n" class="card mb-3 p-3 rounded-3 shadow-sm placeholder-glow">
                <span class="placeholder col-3 mb-2"></span>
                <span class="placeholder col-8 mb-3"></span>
                <span class="placeholder col-5"></span>
            </div>
        </div>

        <!-- Cards Ring -->
        <CardRing v-else-if="items.length" class="saved-ring" :items="items" item-key="_id" item-label="name"
            card-width="min(440px, 86vw)" label="Saved projects">
            <template #card="{ item }">
                <SavedCard :item="item" :selected-category="selectedCategory" :selected-lang="selectedLang"
                    @remove="$emit('remove', $event)" @toggle-category="$emit('toggle-category', $event)"
                    @toggle-lang="$emit('toggle-lang', $event)" />
            </template>

            <template #caption="{ item, index, total }">
                <RingCaption :title="item.name" :index="pad(index + 1)"
                    :accent="categoryColor(itemCategory(item))" :subtitle="itemCategory(item)"
                    :meta="`Saved ${pad(index + 1)} / ${pad(total)}`" />
            </template>
        </CardRing>

        <!-- Nothing saved at all -->
        <div v-else-if="total === 0" class="empty card rounded-3 shadow-sm text-center p-5">
            <svg class="empty-mark mx-auto mb-3" width="56" height="56" viewBox="0 0 16 16" fill="none"
                stroke="currentColor" stroke-width="1" stroke-linejoin="round" aria-hidden="true">
                <path d="M3.5 2.5h9v11.2L8 10.6l-4.5 3.1z" />
            </svg>
            <h4 class="h5 fw-bold empty-title mb-1">No saved projects yet</h4>
            <p class="text-muted-github mb-4">
                Tap the bookmark on any project in Discovery and it will show up here.
            </p>
            <div>
                <RouterLink to="/discovery" class="btn btn-primary px-4">Explore Discovery</RouterLink>
            </div>
        </div>

        <!-- Saved projects exist, but the filters hide all of them -->
        <div v-else class="card rounded-3 shadow-sm text-center p-4 text-muted-github">
            <span>No saved projects match your search or filters.</span>
            <div class="mt-3">
                <button type="button" class="btn btn-sm reset-btn" @click="$emit('reset')">Clear filters</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.empty-title {
    color: var(--app-text);
}

.empty-mark {
    color: #58a6ff;
    animation: bob 3.2s ease-in-out infinite;
}

.empty-mark path {
    fill: color-mix(in srgb, #58a6ff 14%, transparent);
}

@keyframes bob {

    0%,
    100% {
        transform: translateY(0) rotate(-4deg);
    }

    50% {
        transform: translateY(-8px) rotate(4deg);
    }
}

.reset-btn {
    color: var(--app-text);
    border: 1px solid var(--card-border);
    background: transparent;
    transition: background-color 0.2s ease;
}

.reset-btn:hover {
    background-color: color-mix(in srgb, #58a6ff 12%, transparent);
    color: var(--app-text);
}

/* --- Ring: cards fill their slot instead of stacking with a gap --- */
.saved-ring :deep(.saved-card) {
    height: 100%;
    margin-bottom: 0 !important;
}

@media (prefers-reduced-motion: reduce) {

    .empty-mark {
        animation: none !important;
        transition: none !important;
    }
}
</style>
