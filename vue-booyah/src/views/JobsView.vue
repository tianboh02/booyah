<script setup>
import { computed, onMounted, ref } from 'vue'
import { fetchHNJobsData } from '@/utils/hackernewsJobs'
import { langColors } from '@/utils/langColors'

import PageHeader from '@/components/shared/PageHeader.vue'
import AlertBanners from '@/components/shared/AlertBanners.vue'
import JobsStatCard from '@/components/jobs/jobsStatCard.vue'
import JobsRoleDemandCards from '@/components/jobs/jobsRoleDemandCards.vue'
import JobsRoleDetail from '@/components/jobs/jobsRoleDetail.vue'
import SignalLoader from '@/components/shared/SignalLoader.vue'

const loading = ref(true)
const error = ref('')
const warning = ref('')
const progress = ref({ done: 0, total: 0 })

const postsAnalysed = ref(0)
const roles = ref([])
const salaryBands = ref(0)
const postsPerMonth = ref([])
const rolesDetail = ref({})
const selectedRole = ref('')


const headerColors = computed(() => {
  const totals = {}
  for (const d of Object.values(rolesDetail.value)) {
    for (const t of d.tech?.top ?? []) totals[t.name] = (totals[t.name] ?? 0) + t.share
  }
  return Object.keys(totals)
    .filter((name) => langColors[name])
    .sort((a, b) => totals[b] - totals[a])
    .slice(0, 3)
    .map((name) => langColors[name])
})
const live = computed(() => !loading.value && !error.value && Object.keys(rolesDetail.value).length > 0)
const status = computed(() => {
  if (loading.value) return 'Reading Who is Hiring'
  return live.value ? 'Live from Hacker News · Last 6 months' : 'Not connected'
})

const stats = computed(() => [
  { label: 'Job posts analysed', value: postsAnalysed.value, accent: '#58a6ff' },
  { label: 'Salary bands used', value: salaryBands.value, accent: '#3fb950' },
  { label: 'Role families tracked', value: roles.value.length, accent: '#a371f7' },
  { label: 'Months covered', value: postsPerMonth.value.length, accent: '#e3b341' },
])

const LOADER_LEGEND = [
  { label: 'Hacker News threads', colour: [255, 138, 61] },
  { label: 'Salary bands', colour: [227, 179, 65] }
]
const loaderStatus = computed(() => {
  const { done, total } = progress.value
  if (!total) return 'Contacting Hacker News'
  if (done < total) return `Receiving 'Who is hiring?' threads ${done} / ${total}`
  return 'Parsing roles & salaries'
})

async function load() {
  loading.value = true
  error.value = ''
  warning.value = ''
  progress.value = { done: 0, total: 0 }
  selectedRole.value = ''
  try {
    const { data, warning: warnMsg } = await fetchHNJobsData((done, total) => {
      progress.value = { done, total }
    })
    postsAnalysed.value = data.postsAnalysed
    roles.value = data.roles
    salaryBands.value = data.salaryBands
    postsPerMonth.value = data.postsPerMonth
    rolesDetail.value = data.rolesDetail
    warning.value = warnMsg
  } catch (e) {
    console.error('JobsView: could not load job data', e)
    error.value = 'Could not load job data from Hacker News. Check your connection and try again.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="container my-4">
    <PageHeader title="Jobs"
      subtitle='Which roles companies are hiring for and what they post as pay, from Hacker News "Who is Hiring" threads.'
      :status="status" :live="live" :colors="headerColors" />

    <!-- Particle globe loader, shared with the auth screen: one arc per thread that comes back -->
    <SignalLoader v-if="loading" :done="progress.done" :total="progress.total" :status="loaderStatus"
      :legend="LOADER_LEGEND" />

    <!-- Loaded Content & Banners -->
    <template v-else>
      <AlertBanners :warning="warning" :error="error" @retry="load" />

      <template v-if="!error">
        <div class="row row-cols-2 row-cols-md-4 g-3 mb-2">
          <div v-for="(s, i) in stats" :key="s.label" class="col">
            <JobsStatCard :value="s.value" :label="s.label" :accent="s.accent" :index="i" />
          </div>
        </div>
        <p class="text-muted-github small mb-4" role="note">Salary figures come from US and global postings.</p>

        <JobsRoleDemandCards :roles="roles" :posts-per-month="postsPerMonth" @select="selectedRole = $event" />

        <JobsRoleDetail v-if="selectedRole" :role="selectedRole" :detail="rolesDetail[selectedRole]"
          @close="selectedRole = ''" />
      </template>
    </template>
  </div>
</template>