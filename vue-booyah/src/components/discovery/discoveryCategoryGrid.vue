<script setup>
import DiscoveryCategoryCard from '@/components/discovery/discoveryCategoryCard.vue'
import CardRing from '@/components/ring/CardRing.vue'
import RingCaption from '@/components/ring/RingCaption.vue'
import ViewToggle from '@/components/ring/ViewToggle.vue'
import { useViewMode, isSmallScreen } from '@/composables/useViewMode'

defineProps({
    categories: { type: Array, default: () => [] },
    savedMap: { type: Object, default: () => ({}) },
    pendingLinks: { type: Object, default: () => new Set() }
})

defineEmits(['open', 'save'])

const selectedLang = defineModel('selectedLang', {
    type: String,
    default: null
})

// carousel or the original 2-column grid; Discovery opens as the carousel.
const view = useViewMode('discovery', 'carousel')

const pad = (n) => String(n).padStart(2, '0')
</script>

<template>
    <div>
        <div v-if="!isSmallScreen" class="d-flex justify-content-end mb-2">
            <ViewToggle v-model="view" />
        </div>

        <Transition name="view-swap" mode="out-in">
            <CardRing v-if="view === 'carousel'" key="carousel" :items="categories" item-key="id" item-label="name"
                card-width="min(560px, 90vw)" :radius="1.2" label="Top categories this month">
                <template #card="{ item: category }">
                    <DiscoveryCategoryCard v-model:selected-lang="selectedLang" :category="category"
                        :saved-map="savedMap" :pending-links="pendingLinks" in-ring
                        @open="$emit('open', category, $event)" @save="$emit('save', category, $event)" />
                </template>

                <template #caption="{ item: category, index, total }">
                    <RingCaption :title="category.name" :index="pad(index + 1)"
                        :subtitle="`${category.builders} builders this month`"
                        :meta="`Category ${pad(index + 1)} / ${pad(total)}`" />
                </template>
            </CardRing>

            <!-- Original 2-column grid -->
            <TransitionGroup v-else key="list" name="cat" tag="div" appear class="row row-cols-1 row-cols-lg-2 g-3">
                <div v-for="(category, index) in categories" :key="category.id" class="col" :style="{ '--i': index }">
                    <DiscoveryCategoryCard v-model:selected-lang="selectedLang" :category="category"
                        :saved-map="savedMap" :pending-links="pendingLinks" @open="$emit('open', category, $event)"
                        @save="$emit('save', category, $event)" />
                </div>
            </TransitionGroup>
        </Transition>
    </div>
</template>

<style scoped>

.cat-enter-active {
    animation: rise-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: calc(var(--i) * 80ms);
}

@media (prefers-reduced-motion: reduce) {
    .cat-enter-active {
        animation: none !important;
    }
}
</style>
