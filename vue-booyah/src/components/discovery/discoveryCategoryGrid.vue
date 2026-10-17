<script setup>
import DiscoveryCategoryCard from '@/components/discovery/discoveryCategoryCard.vue'
import CardRing from '@/components/ring/CardRing.vue'
import RingCaption from '@/components/ring/RingCaption.vue'

defineProps({
    categories: { type: Array, default: () => [] },
    // { [ghUrl]: saveId } and the set of ghUrls with a request in flight
    savedMap: { type: Object, default: () => ({}) },
    pendingLinks: { type: Object, default: () => new Set() }
})

defineEmits(['open', 'save'])

const selectedLang = defineModel('selectedLang', {
    type: String,
    default: null
})

const pad = (n) => String(n).padStart(2, '0')
</script>

<template>
    <!-- Category cards on a rotating ring; the front card is the one you can use. -->
    <CardRing :items="categories" item-key="id" item-label="name" card-width="min(560px, 90vw)" :radius="0.95"
        label="Top categories this month">
        <template #card="{ item: category }">
            <DiscoveryCategoryCard v-model:selected-lang="selectedLang" :category="category" :saved-map="savedMap"
                :pending-links="pendingLinks" @open="$emit('open', category, $event)"
                @save="$emit('save', category, $event)" />
        </template>

        <template #caption="{ item: category, index, total }">
            <RingCaption :title="category.name" :index="pad(index + 1)"
                :subtitle="`${category.builders} builders this month`"
                :meta="`Category ${pad(index + 1)} / ${pad(total)}`" />
        </template>
    </CardRing>
</template>
