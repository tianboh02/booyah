<script setup>
import { computed } from 'vue'
import { MIN_SALARY_BANDS } from '@/utils/hackernewsJobs'

const props = defineProps({
    salaries: { type: Array, default: () => [] }
})

const usd = (v) => `$${v}k`

const salaryRows = computed(() =>
    props.salaries.filter((s) => s.n >= MIN_SALARY_BANDS && s.low !== null)
)

const thinRoles = computed(() =>
    props.salaries.filter((s) => s.n < MIN_SALARY_BANDS)
)
</script>

<template>
    <section class="mb-4">
        <div class="mb-3">
            <h2 class="h5 fw-bold section-title mb-1">Posted salary bands</h2>
            <p class="text-muted-github small mb-0">Median posted range per role, last 6 months, USD per year</p>
        </div>

        <div class="card p-4 rounded-3 shadow-sm">
            <div class="chart-placeholder text-muted-github small p-4 mb-3 text-center border border-dashed rounded-3">
                Salary range chart coming soon
            </div>

            <div class="table-responsive">
                <table class="table mb-0 align-middle">
                    <thead>
                        <tr class="text-muted-github small border-bottom-theme">
                            <th scope="col" class="fw-normal bg-transparent text-muted-github">Role</th>
                            <th scope="col" class="fw-normal bg-transparent text-muted-github">Median range</th>
                            <th scope="col" class="fw-normal bg-transparent text-muted-github">Salary bands</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="s in salaryRows" :key="s.role" class="border-bottom-theme small">
                            <td class="bg-transparent py-3 role-name">{{ s.role }}</td>
                            <td class="bg-transparent py-3 font-monospace text-muted-github">{{ usd(s.low) }} to {{
                                usd(s.high) }}</td>
                            <td class="bg-transparent py-3 font-monospace text-muted-github">n = {{ s.n }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Thin Roles Badges -->
            <div v-if="thinRoles.length" class="mt-4 pt-3 border-top-theme">
                <h3 class="h6 text-muted-github fw-medium mb-3">Not enough salary data yet</h3>
                <div class="d-flex flex-wrap gap-2">
                    <span v-for="t in thinRoles" :key="t.role" class="badge badge-github fw-normal py-2 px-3 small">
                        {{ t.role }} · <span class="font-monospace">{{ t.n }}</span>
                    </span>
                </div>
            </div>
        </div>

        <p class="text-muted-github small mt-2">
            Medians are used so a few extreme salaries can't skew the range. Duplicate postings across months are
            counted once.
        </p>
    </section>
</template>

<style scoped>
.section-title,
.role-name {
    color: var(--app-text);
    transition: color 0.2s ease;
}

.chart-placeholder {
    background-color: var(--github-control-bg);
    border-color: var(--card-border) !important;
    transition: background-color 0.2s ease, border-color 0.2s ease;
}

.border-dashed {
    border-style: dashed !important;
}

.border-bottom-theme {
    border-bottom: 1px solid var(--card-border) !important;
    transition: border-color 0.2s ease;
}

.border-top-theme {
    border-top: 1px solid var(--card-border) !important;
    transition: border-color 0.2s ease;
}
</style>