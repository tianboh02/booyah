<script setup>
import { onMounted, ref } from 'vue'
import { fetchHNJobsData } from '@/utils/hackernewsJobs'

import JobsPageHeader from '@/components/jobs/jobsPageHeader.vue'
import JobsOverviewCards from '@/components/jobs/jobsOverviewCards.vue'
import JobsRoleDemandCards from '@/components/jobs/jobsRoleDemandCards.vue'
import JobsSalaryBandsTable from '@/components/jobs/jobsSalaryBandsTable.vue'

const loading = ref(true)
const error = ref('')
const warning = ref('')

const postsAnalysed = ref(0)
const roles = ref([])
const salaries = ref([])
const postsPerMonth = ref([])

async function load() {
  loading.value = true
  error.value = ''
  warning.value = ''
  try {
    const { data, warning: warnMsg } = await fetchHNJobsData()
    postsAnalysed.value = data.postsAnalysed
    roles.value = data.roles
    salaries.value = data.salaries
    postsPerMonth.value = data.postsPerMonth
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
    <!-- Clean Header Component -->
    <JobsPageHeader />

    <!-- Skeleton Loading Placeholder -->
    <div v-if="loading" class="placeholder-glow">
      <div class="row row-cols-2 row-cols-md-4 g-3 mb-4">
        <div v-for="n in 4" :key="n" class="col">
          <div class="card p-3">
            <span class="placeholder col-6 mb-2"></span>
            <span class="placeholder col-8"></span>
          </div>
        </div>
      </div>
      <div class="card p-4">
        <span v-for="n in 5" :key="n" class="placeholder col-12 mb-3"></span>
      </div>
    </div>

    <!-- Loaded Content & Banners -->
    <template v-else>
      <JobsOverviewCards :warning="warning" :error="error" :posts-analysed="postsAnalysed" :salaries="salaries"
        :roles="roles" :posts-per-month="postsPerMonth" @retry="load" />

      <template v-if="!error">
        <JobsRoleDemandCards :roles="roles" :posts-per-month="postsPerMonth" />

        <JobsSalaryBandsTable :salaries="salaries" />
      </template>
    </template>
  </div>
</template>