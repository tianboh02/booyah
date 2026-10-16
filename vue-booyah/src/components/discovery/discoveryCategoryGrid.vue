<script setup>
import DiscoveryCategoryCard from '@/components/discovery/discoveryCategoryCard.vue'

defineProps({
    categories: { type: Array, default: () => [] }
})

defineEmits(['open', 'save'])

const selectedLang = defineModel('selectedLang', { type: String, default: null })
</script>

<template>
    <TransitionGroup name="cat" tag="div" appear class="row row-cols-1 row-cols-lg-2 g-3">
        <div v-for="(c, i) in categories" :key="c.id" class="col" :style="{ '--i': i }">
            <DiscoveryCategoryCard v-model:selected-lang="selectedLang" :category="c"
                @open="$emit('open', c, $event)" @save="$emit('save', $event)" />
        </div>
    </TransitionGroup>
</template>

<style scoped>
/* Staggered entrance */
.cat-enter-active {
    animation: cat-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: calc(var(--i) * 80ms);
}

@keyframes cat-in {
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
    .cat-enter-active {
        animation: none !important;
    }
}
</style>
