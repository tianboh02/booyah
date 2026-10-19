<script setup>
import { onMounted } from 'vue'
import { useUserSettings } from '@/utils/userSettings'

import SettingsPageHeader from '@/components/settings/settingsPageHeader.vue'
import SettingsProfileCard from '@/components/settings/settingsProfileCard.vue'
import SettingsExperienceCard from '@/components/settings/settingsExperienceCard.vue'
import SettingsAccountCard from '@/components/settings/settingsAccountCard.vue'
import SettingsLogoutCard from '@/components/settings/settingsLogoutCard.vue'

const { isSignedIn, refreshUser } = useUserSettings()

// pick up anything that changed in localStorage since the last visit
onMounted(refreshUser)
</script>

<template>
    <div class="container my-4">
        <SettingsPageHeader />

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
/* Cards rise in one after another */
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