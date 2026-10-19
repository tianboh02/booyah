<script setup>
defineProps({
    title: { type: String, required: true },
    status: { type: String, default: 'ok' },
    reason: { type: String, default: '' }
})

const REASONS = {
    'no-bands': 'No salary posted for this role.',
    'too-few': 'Too few salary bands to show safely.',
    'no-history': 'Not enough months loaded to show a trend.',
    'not-applicable': 'Not applicable to this role.'
}
</script>

<template>
    <div class="card p-3 h-100 rounded-3 shadow-sm d-flex flex-column">
        <div class="d-flex justify-content-between align-items-start mb-3">
            <h3 class="section-title fw-bold mb-0">{{ title }}</h3>
            <span v-if="status === 'thin'" class="badge badge-github fw-normal small">Low sample</span>
        </div>

        <p v-if="status === 'none'" class="text-muted-github mb-0">{{ REASONS[reason] }}</p>
        <!-- flex column, so a chart inside can grow to the card's height (cards in a row match heights) -->
        <div v-else class="d-flex flex-column flex-grow-1">
            <slot />
        </div>
    </div>
</template>

<style scoped>
.section-title {
    font-size: 1.05rem;
    color: var(--app-text);
    transition: color 0.2s ease;
}
</style>
