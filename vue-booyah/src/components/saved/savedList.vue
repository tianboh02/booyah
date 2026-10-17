<script setup>
import SavedCard from '@/components/saved/savedCard.vue'

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

        <!-- Cards -->
        <TransitionGroup v-else-if="items.length" name="saved" tag="div" appear class="saved-stack position-relative">
            <SavedCard v-for="(item, index) in items" :key="item._id" :item="item"
                :selected-category="selectedCategory" :selected-lang="selectedLang"
                :style="{ '--i': Math.min(index, 10) }" @remove="$emit('remove', $event)"
                @toggle-category="$emit('toggle-category', $event)" @toggle-lang="$emit('toggle-lang', $event)" />
        </TransitionGroup>

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

/* --- List transitions: staggered entrance, smooth re-ordering, fly-out removal --- */
.saved-enter-active {
    animation: saved-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: calc(var(--i) * 50ms);
}

.saved-leave-active {
    position: absolute;
    left: 0;
    right: 0;
    transition: opacity 0.3s ease, transform 0.35s cubic-bezier(0.55, 0, 0.7, 0.2);
}

.saved-leave-to {
    opacity: 0;
    transform: translateX(60px) scale(0.96);
}

.saved-move {
    transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes saved-in {
    from {
        opacity: 0;
        transform: translateY(18px) scale(0.98);
    }

    to {
        opacity: 1;
        transform: none;
    }
}

@media (prefers-reduced-motion: reduce) {

    .saved-enter-active,
    .saved-leave-active,
    .saved-move,
    .empty-mark {
        animation: none !important;
        transition: none !important;
    }
}
</style>
