<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import JobsStatSection from '@/components/jobs/jobsStatSection.vue'
import JobsShareBar from '@/components/jobs/jobsShareBar.vue'
import JobsDotPlot from '@/components/jobs/jobsDotPlot.vue'
import JobsTrendSparkline from '@/components/jobs/jobsTrendSparkline.vue'

defineProps({
    role: { type: String, required: true },
    detail: { type: Object, required: true }
})

defineEmits(['close'])

const usd = (v) => `$${v}k`
const MODES = ['remote', 'hybrid', 'onsite', 'mixed', 'unspecified']
const CHANGE = {
    up: { label: 'Trending up', badge: 'text-bg-success' },
    down: { label: 'Trending down', badge: 'text-bg-danger' },
    steady: { label: 'Steady', badge: 'text-bg-secondary' }
}
const pct = (n, total) => Math.round((100 * n) / total)

// native <dialog>: the browser provides the backdrop mask, Esc-to-close and focus trap
const dialog = ref(null)

onMounted(() => {
    document.body.classList.add('overflow-hidden')
    dialog.value.showModal()
})

onBeforeUnmount(() => document.body.classList.remove('overflow-hidden'))
</script>

<template>
    <!-- clicking the dimmed backdrop lands on the <dialog> itself, which closes it -->
    <dialog ref="dialog" class="role-dialog" aria-labelledby="role-dialog-title" @close="$emit('close')"
        @click.self="dialog.close()">
        <div class="card role-dialog-body p-4 rounded-3 shadow">
            <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                    <h2 id="role-dialog-title" class="h5 fw-bold section-title mb-1">{{ role }}</h2>
                    <p class="text-muted-github small mb-0">{{ detail.posts }} posts over the last 6 months</p>
                </div>
                <button type="button" class="btn-close" aria-label="Close" @click="dialog.close()"></button>
            </div>

            <div class="row row-cols-1 row-cols-md-2 g-3">
                <!-- Salary distribution -->
                <div class="col">
                    <JobsStatSection title="Salary distribution" :status="detail.salary.status"
                        :reason="detail.salary.reason">
                        <JobsDotPlot :bands="detail.salary.bands" />
                        <dl v-if="detail.salary.stats" class="row small font-monospace mt-3 mb-0">
                            <dt class="col-6 fw-normal text-muted-github">Median range</dt>
                            <dd class="col-6 mb-1">{{ usd(detail.salary.stats.medianLo) }} to {{
                                usd(detail.salary.stats.medianHi) }}</dd>
                            <dt class="col-6 fw-normal text-muted-github">Mean midpoint</dt>
                            <dd class="col-6 mb-1">{{ usd(detail.salary.stats.mean) }}</dd>
                            <dt class="col-6 fw-normal text-muted-github">Middle 50%</dt>
                            <dd class="col-6 mb-1">{{ usd(detail.salary.stats.p25) }} to {{ usd(detail.salary.stats.p75)
                                }}</dd>
                            <dt class="col-6 fw-normal text-muted-github">Lowest / highest</dt>
                            <dd class="col-6 mb-1">{{ usd(detail.salary.stats.min) }} / {{ usd(detail.salary.stats.max)
                                }}</dd>
                            <dt class="col-6 fw-normal text-muted-github">Most common</dt>
                            <dd class="col-6 mb-1">{{ usd(detail.salary.stats.mode) }} to {{
                                usd(detail.salary.stats.mode + 10) }}</dd>
                        </dl>
                        <p class="text-muted-github small font-monospace mt-2 mb-0">n = {{ detail.salary.n }}</p>
                    </JobsStatSection>
                </div>

                <!-- Usable salary rate -->
                <div class="col">
                    <JobsStatSection title="Usable salary rate" :status="detail.usableSalaryRate.status">
                        <JobsShareBar label="Posts with a usable USD salary" :value="detail.usableSalaryRate.rate" />
                        <p class="text-muted-github small mb-0">
                            {{ detail.usableSalaryRate.withSalary }} of {{ detail.usableSalaryRate.posts }} posts for this
                            role.
                        </p>
                    </JobsStatSection>
                </div>

                <!-- Demand trend -->
                <div class="col">
                    <JobsStatSection title="Demand trend" :status="detail.trend.status" :reason="detail.trend.reason">
                        <span class="badge mb-2" :class="CHANGE[detail.trend.change].badge">
                            {{ CHANGE[detail.trend.change].label }}
                        </span>
                        <JobsTrendSparkline :points="detail.trend.points" />
                    </JobsStatSection>
                </div>

                <!-- Work mode -->
                <div class="col">
                    <JobsStatSection title="Work mode" :status="detail.workMode.status">
                        <JobsShareBar v-for="m in MODES" :key="m" class="text-capitalize" :label="m"
                            :value="pct(detail.workMode.counts[m] ?? 0, detail.workMode.posts)" />
                    </JobsStatSection>
                </div>

                <!-- Tech stack -->
                <div class="col">
                    <JobsStatSection title="Tech stack" :status="detail.tech.status" :reason="detail.tech.reason">
                        <p class="text-muted-github small">
                            {{ detail.tech.coverage }}% of posts name a tracked technology
                        </p>
                        <JobsShareBar v-for="t in detail.tech.top" :key="t.name" :label="t.name" :value="t.share" />
                    </JobsStatSection>
                </div>
            </div>
        </div>
    </dialog>
</template>

<style scoped>
.section-title {
    color: var(--app-text);
    transition: color 0.2s ease;
}

.role-dialog {
    width: min(960px, 92vw);
    max-width: none;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
}

.role-dialog-body {
    max-height: 90vh;
    overflow-y: auto;
}

.role-dialog[open] {
    animation: role-pop 0.2s ease-out;
}

.role-dialog::backdrop {
    background-color: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
}

@keyframes role-pop {
    from {
        opacity: 0;
        transform: scale(0.85);
    }
}

@media (prefers-reduced-motion: reduce) {
    .role-dialog[open] {
        animation: none;
    }
}
</style>
