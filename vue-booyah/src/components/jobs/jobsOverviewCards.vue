<script setup>
import { computed } from 'vue'

const props = defineProps({
    warning: { type: String, default: '' },
    error: { type: String, default: '' },
    postsAnalysed: { type: Number, default: 0 },
    salaries: { type: Array, default: () => [] },
    roles: { type: Array, default: () => [] },
    postsPerMonth: { type: Array, default: () => [] }
})

defineEmits(['retry'])

const stats = computed(() => [
    { label: 'Job posts analysed', value: props.postsAnalysed },
    { label: 'Salary bands used', value: props.salaries.reduce((sum, s) => sum + s.n, 0) },
    { label: 'Role families tracked', value: props.roles.length },
    { label: 'Months covered', value: props.postsPerMonth.length },
])
</script>

<template>
    <div>
        <!-- Info Banner -->
        <div class="alert badge-github text-muted-github border-0 mb-3 small" role="note">
            💡 Salary figures come from US and global postings
        </div>

        <!-- Warning Alert -->
        <div v-if="warning" class="alert alert-warning py-2 px-3 small mb-3" role="status">
            {{ warning }}
        </div>

        <!-- Error Alert -->
        <div v-if="error" class="alert alert-danger d-flex align-items-center justify-content-between mb-3"
            role="alert">
            <span>{{ error }}</span>
            <button type="button" class="btn btn-sm btn-outline-danger" @click="$emit('retry')">Try again</button>
        </div>

        <!-- Overview Metric Cards (Hidden if there is an unrecoverable error) -->
        <div v-if="!error" class="row row-cols-2 row-cols-md-4 g-3 mb-4">
            <div v-for="s in stats" :key="s.label" class="col">
                <div class="card p-3 h-100 rounded-3 shadow-sm text-white">
                    <span class="h3 fw-bold text-white mb-1 font-monospace">{{ s.value }}</span>
                    <span class="text-muted-github small">{{ s.label }}</span>
                </div>
            </div>
        </div>
    </div>
</template>