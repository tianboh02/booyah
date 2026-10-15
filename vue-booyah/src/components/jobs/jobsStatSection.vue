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
    <div class="card p-3 h-100 rounded-3 shadow-sm">
        <div class="d-flex justify-content-between align-items-start mb-3">
            <h3 class="h6 fw-bold section-title mb-0">{{ title }}</h3>
            <span v-if="status === 'thin'" class="badge badge-github fw-normal small">Low sample</span>
        </div>

        <p v-if="status === 'none'" class="text-muted-github small mb-0">{{ REASONS[reason] }}</p>
        <slot v-else />
    </div>
</template>

<style scoped>
.section-title {
    color: var(--app-text);
    transition: color 0.2s ease;
}
</style>
