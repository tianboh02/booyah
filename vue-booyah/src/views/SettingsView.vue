<script setup>
import { computed, onMounted } from 'vue'
import { useUserSettings } from '@/utils/userSettings'

import PageHeader from '@/components/shared/PageHeader.vue'
import SettingsAvatar from '@/components/settings/settingsAvatar.vue'
import SettingsProfileCard from '@/components/settings/settingsProfileCard.vue'
import SettingsExperienceCard from '@/components/settings/settingsExperienceCard.vue'
import SettingsAccountCard from '@/components/settings/settingsAccountCard.vue'
import SettingsLogoutCard from '@/components/settings/settingsLogoutCard.vue'

const { isSignedIn, refreshUser, handle, avatarUrl, initial, experience } = useUserSettings()

//for the aurora in the header cards
const headerColors = computed(() =>
    experience.value.toLowerCase() === 'newcomer'
        ? ['#41b883', '#58a6ff', '#f1e05a']
        : ['#58a6ff', '#6b8aff', '#3178c6']
)

onMounted(refreshUser)
</script>

<template>
    <div class="container my-4">
        <PageHeader title="Settings" :colors="headerColors">
            <template #subtitle>
                <template v-if="handle">Signed in as <span class="font-monospace">@{{ handle }}</span></template>
                <template v-else>Manage your profile and preferences.</template>
            </template>

            <template #aside>
                <SettingsAvatar :src="avatarUrl" :initial="initial" :size="72" ring :ring-color="headerColors[0]" />
            </template>
        </PageHeader>

        <div v-if="!isSignedIn" class="alert alert-warning py-2 px-3 small mb-4" role="status">
            We could not find your account details. Sign in again to change your settings.
        </div>

        <div class="row g-4">
            <!-- Left: things you edit -->
            <div class="col-lg-7 d-flex flex-column gap-4">
                <div class="rise" style="--n: 0">
                    <SettingsProfileCard />
                </div>
                <div class="rise" style="--n: 1">
                    <SettingsExperienceCard />
                </div>
            </div>

            <!-- Right: account and sign out -->
            <div class="col-lg-5 d-flex flex-column gap-4">
                <div class="rise" style="--n: 2">
                    <SettingsAccountCard />
                </div>
                <div class="rise" style="--n: 3">
                    <SettingsLogoutCard />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.rise {
    opacity: 0;
    animation: rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    animation-delay: calc(var(--n) * 120ms + 450ms);
}

@keyframes rise {
    from {
        opacity: 0;
        transform: translateY(24px);
    }

    to {
        opacity: 1;
        transform: none;
    }
}

@media (prefers-reduced-motion: reduce) {
    .rise {
        animation: none !important;
        opacity: 1;
    }
}
</style>