<script setup>
import { onMounted, ref } from 'vue'
import { fetchHNJobsData } from '@/utils/hackernewsJobs'

import JobsPageHeader from '@/components/jobs/jobsPageHeader.vue'
import JobsOverviewCards from '@/components/jobs/jobsOverviewCards.vue'
import JobsRoleDemandCards from '@/components/jobs/jobsRoleDemandCards.vue'
import JobsRoleDetail from '@/components/jobs/jobsRoleDetail.vue'
import JobsLoadingSatellite from '@/components/jobs/jobsLoadingSatellite.vue'

const loading = ref(true)
const error = ref('')
const warning = ref('')
const progress = ref({ done: 0, total: 0 })

const postsAnalysed = ref(0)
const roles = ref([])
const salaries = ref([])
const postsPerMonth = ref([])
const rolesDetail = ref({})
const selectedRole = ref('')

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
    salaries.value = data.salaries
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
    <!-- Clean Header Component -->
    <JobsPageHeader :roles-detail="rolesDetail" :loading="loading" :error="!!error" />

    <!-- Satellite Loading Indicator (plan for sharing it across screens: see jobsLoadingSatellite.vue) -->
    <JobsLoadingSatellite v-if="loading" :done="progress.done" :total="progress.total" />

    <!-- Loaded Content & Banners -->
    <template v-else>
      <JobsOverviewCards :warning="warning" :error="error" :posts-analysed="postsAnalysed" :salaries="salaries"
        :roles="roles" :posts-per-month="postsPerMonth" @retry="load" />

      <template v-if="!error">
        <JobsRoleDemandCards :roles="roles" :posts-per-month="postsPerMonth" @select="selectedRole = $event" />

        <JobsRoleDetail v-if="selectedRole" :role="selectedRole" :detail="rolesDetail[selectedRole]"
          @close="selectedRole = ''" />
      </template>
    </template>
  </div>
</template>