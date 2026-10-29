<script setup>
import { useUserSettings } from '@/utils/userSettings'
import { vSpotlight } from '@/utils/motion'
import SettingsAvatar from '@/components/settings/settingsAvatar.vue'

const { handle, avatarUrl, initial } = useUserSettings()

// what Booyah can see through your GitHub sign-in?
const access = ['Your profile', 'Your public and private repositories']
</script>

<template>
    <section v-spotlight class="settings-card card overflow-hidden rounded-4 p-4">
        <h2 class="h5 fw-bold card-heading mb-4">GitHub account</h2>

        <div class="d-flex align-items-center gap-3 mb-4">
            <SettingsAvatar :src="avatarUrl" :initial="initial" :size="72" ring />

            <div class="min-w-0">
                <div class="d-flex align-items-center gap-2 flex-wrap">
                    <span class="handle font-monospace fs-5 text-truncate">{{ handle ? '@' + handle : 'GitHub user' }}</span>
                    <span class="connected badge rounded-pill fw-normal d-inline-flex align-items-center gap-2">
                        <span class="live-dot position-relative rounded-circle"></span>Connected
                    </span>
                </div>
                <div class="card-sub">Connected via GitHub sign-in</div>
                <div class="text-muted-github small">
                    Your profile picture comes from GitHub. Change it there and it updates here next time you sign in.
                </div>
            </div>
        </div>

        <p class="text-muted-github mb-2">Booyah can access</p>
        <ul class="list-unstyled mb-0 d-flex flex-column gap-2">
            <li v-for="(item, i) in access" :key="item" class="access-item d-flex align-items-center gap-2"
                :style="{ '--i': i }">
                <svg class="tick flex-shrink-0" width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#3fb950"
                    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M3 8.5l3.2 3.2L13 5" />
                </svg>
                <span class="card-sub">{{ item }}</span>
            </li>
        </ul>

        <div class="manage mt-4 pt-3">
            <a href="https://github.com/settings/applications" target="_blank" rel="noopener noreferrer"
                class="manage-link d-inline-flex align-items-center gap-2">
                Manage access on GitHub
                <svg class="ext" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                    stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M5 11L11 5M6 5h5v5" />
                </svg>
            </a>
            <p class="text-muted-github small mt-1 mb-0">Revoking access on GitHub signs you out of Booyah.</p>
        </div>
    </section>
</template>

<style scoped>
.settings-card {
    isolation: isolate;
}

.settings-card::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
    background: radial-gradient(320px circle at var(--mx, 50%) var(--my, 50%),
            color-mix(in srgb, #58a6ff 14%, transparent),
            transparent 70%);
}

.settings-card:hover::before {
    opacity: 1;
}

.card-heading,
.handle,
.card-sub {
    color: var(--app-text);
}

.connected {
    color: #3fb950;
    background-color: color-mix(in srgb, #3fb950 12%, transparent);
    border: 1px solid color-mix(in srgb, #3fb950 40%, transparent);
}

.live-dot {
    width: 7px;
    height: 7px;
    background-color: #3fb950;
}

.live-dot::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background-color: #3fb950;
    animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes ping {
    from {
        transform: scale(1);
        opacity: 0.7;
    }

    to {
        transform: scale(3);
        opacity: 0;
    }
}

.access-item {
    opacity: 0;
    transform: translateX(-8px);
    animation: item-in 0.5s ease forwards;
    animation-delay: calc(var(--i) * 140ms + 700ms);
}

.tick path {
    stroke-dasharray: 20;
    stroke-dashoffset: 20;
    animation: draw 0.5s ease forwards;
    animation-delay: calc(var(--i) * 140ms + 850ms);
}

@keyframes item-in {
    to {
        opacity: 1;
        transform: none;
    }
}

@keyframes draw {
    to {
        stroke-dashoffset: 0;
    }
}

.manage {
    border-top: 1px solid var(--card-border);
}

.manage-link {
    color: #58a6ff;
    text-decoration: none;
    text-underline-offset: 4px;
}

.manage-link:hover {
    text-decoration: underline;
}

.manage-link:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4);
    border-radius: 4px;
}

.ext {
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.manage-link:hover .ext {
    transform: translate(2px, -2px);
}

@media (prefers-reduced-motion: reduce) {

    .access-item,
    .tick path,
    .live-dot::after {
        animation: none !important;
    }

    .access-item {
        opacity: 1;
        transform: none;
    }

    .tick path {
        stroke-dashoffset: 0;
    }
}
</style>
