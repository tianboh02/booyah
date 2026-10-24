<script setup>
import { computed } from 'vue'
import { useUserSettings } from '@/utils/userSettings'
import PageHeader from '@/components/shared/PageHeader.vue'
import SettingsAvatar from '@/components/settings/settingsAvatar.vue'

const { handle, avatarUrl, initial, experience } = useUserSettings()

// Same palette as the setup page: Discovery is warm, My Project is cool.
// The aurora shifts color the moment you save a different experience level.
const colors = computed(() =>
    experience.value.toLowerCase() === 'newcomer'
        ? ['#41b883', '#58a6ff', '#f1e05a']
        : ['#58a6ff', '#6b8aff', '#3178c6']
)
</script>

<template>
    <PageHeader title="Settings" :colors="colors">
        <template #subtitle>
            <template v-if="handle">Signed in as <span class="font-monospace">@{{ handle }}</span></template>
            <template v-else>Manage your profile and preferences.</template>
        </template>

        <template #aside>
            <SettingsAvatar :src="avatarUrl" :initial="initial" :size="72" ring :ring-color="colors[0]" />
        </template>
    </PageHeader>
</template>
