<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import JobsStatSection from '@/components/jobs/jobsStatSection.vue'
import JobsShareBar from '@/components/jobs/jobsShareBar.vue'
import JobsSalaryStrip from '@/components/jobs/jobsSalaryStrip.vue'
import JobsTrendChart from '@/components/jobs/jobsTrendChart.vue'
import JobsWorkModeDonut from '@/components/jobs/jobsWorkModeDonut.vue'
import SegmentedToggle from '@/components/shared/SegmentedToggle.vue'

defineProps({
    role: { type: String, required: true },
    detail: { type: Object, required: true }
})

defineEmits(['close'])

const usd = (v) => `$${v}k`
const CHANGE = {
    up: { label: 'Trending up', badge: 'text-bg-success', color: '#3fb950' },
    down: { label: 'Trending down', badge: 'text-bg-danger', color: '#f85149' },
    steady: { label: 'Steady', badge: 'text-bg-secondary', color: '#58a6ff' }
}
const trendMetric = ref('share')

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
    <dialog ref="dialog" class="role-dialog p-0 border-0 bg-transparent text-reset" aria-labelledby="role-dialog-title" @close="$emit('close')"
        @click.self="dialog.close()">
        <div class="card role-dialog-body overflow-y-auto p-4 rounded-3 shadow">
            <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                    <h2 id="role-dialog-title" class="h4 fw-bold section-title mb-1">{{ role }}</h2>
                    <p class="text-muted-github mb-0">{{ detail.posts }} posts over the last 6 months</p>
                </div>
                <button type="button" class="btn-close" aria-label="Close" @click="dialog.close()"></button>
            </div>

            <div class="row row-cols-1 row-cols-md-2 g-3">
                <!-- Salary distribution -->
                <div class="col">
                    <JobsStatSection title="Salary distribution" :status="detail.salary.status"
                        :reason="detail.salary.reason">
                        <JobsSalaryStrip :bands="detail.salary.bands" :stats="detail.salary.stats" />
                        <dl v-if="detail.salary.stats" class="stat-list row font-monospace mt-3 mb-0">
                            <dt class="col-6 fw-normal text-muted-github">Average</dt>
                            <dd class="col-6 mb-1">{{ usd(detail.salary.stats.mean) }}</dd>
                            <dt class="col-6 fw-normal text-muted-github">Typical range</dt>
                            <dd class="col-6 mb-1">{{ usd(detail.salary.stats.p25) }} to {{ usd(detail.salary.stats.p75)
                                }}</dd>
                            <dt class="col-6 fw-normal text-muted-github">Lowest / highest</dt>
                            <dd class="col-6 mb-1">{{ usd(detail.salary.stats.min) }} / {{ usd(detail.salary.stats.max)
                                }}</dd>
                            <dt class="col-6 fw-normal text-muted-github">Most common</dt>
                            <dd class="col-6 mb-1">{{ usd(detail.salary.stats.mode) }} to {{
                                usd(detail.salary.stats.mode + 10) }}</dd>
                        </dl>
                        <p class="text-muted-github font-monospace mt-2 mb-0">n = {{ detail.salary.n }}</p>
                    </JobsStatSection>
                </div>

                <!-- Demand trend -->
                <div class="col">
                    <JobsStatSection title="Demand trend" :status="detail.trend.status" :reason="detail.trend.reason">
                        <div class="d-flex align-items-center justify-content-between gap-2 mb-1">
                            <span class="badge" :class="CHANGE[detail.trend.change].badge">
                                {{ CHANGE[detail.trend.change].label }}
                            </span>
                            <SegmentedToggle v-model="trendMetric" label="Trend metric"
                                :options="[{ value: 'share', label: 'Share %' }, { value: 'count', label: 'Posts' }]" />
                        </div>
                        <JobsTrendChart class="flex-grow-1" :points="detail.trend.points" :metric="trendMetric"
                            :color="CHANGE[detail.trend.change].color" />
                    </JobsStatSection>
                </div>

                <!-- Work mode -->
                <div class="col">
                    <JobsStatSection title="Work mode" :status="detail.workMode.status">
                        <JobsWorkModeDonut :counts="detail.workMode.counts" :posts="detail.workMode.posts" />
                    </JobsStatSection>
                </div>

                <!-- Tech stack -->
                <div class="col">
                    <JobsStatSection title="Tech stack" :status="detail.tech.status" :reason="detail.tech.reason">
                        <p class="text-muted-github">
                            {{ detail.tech.coverage }}% of posts name a tracked technology
                        </p>
                        <JobsShareBar v-for="t in detail.tech.top" :key="t.name" :label="t.name" :value="t.share"
                            :count="t.count" />
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

.stat-list {
    font-size: 0.9rem;
}

.role-dialog {
    width: min(1120px, 94vw);
    max-width: none;
}

/* one chart height for every card, so the 2x2 frames line up */
.role-dialog-body {
    --jobs-chart-h: 200px;
    font-size: 0.95rem;
    max-height: 90vh;
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
