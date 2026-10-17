<script setup>
import { computed } from 'vue'
import JobsStatCard from '@/components/jobs/jobsStatCard.vue'

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
    { label: 'Job posts analysed', value: props.postsAnalysed, accent: '#58a6ff' },
    { label: 'Salary bands used', value: props.salaries.reduce((sum, s) => sum + (s.n || 0), 0), accent: '#3fb950' },
    { label: 'Role families tracked', value: props.roles.length, accent: '#a371f7' },
    { label: 'Months covered', value: props.postsPerMonth.length, accent: '#e3b341' },
])
</script>

<template>
    <div>
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
        <template v-if="!error">
            <div class="row row-cols-2 row-cols-md-4 g-3 mb-2">
                <div v-for="(s, i) in stats" :key="s.label" class="col">
                    <JobsStatCard :value="s.value" :label="s.label" :accent="s.accent" :index="i" />
                </div>
            </div>
            <p class="text-muted-github small mb-4" role="note">Salary figures come from US and global postings.</p>
        </template>
    </div>
</template>
