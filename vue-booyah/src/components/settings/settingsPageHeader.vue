<script setup>
import { computed } from 'vue'
import { useUserSettings } from '@/utils/userSettings'
import SettingsAvatar from '@/components/settings/settingsAvatar.vue'

const { handle, avatarUrl, initial, experience } = useUserSettings()

const title = 'Settings'
const letters = title.split('').map((ch, i) => ({ ch, i }))

// Same palette as the setup page: Discovery is warm, My Project is cool.
// The aurora shifts color the moment you save a different experience level.
const orbColors = computed(() =>
    experience.value.toLowerCase() === 'new'
        ? ['#41b883', '#58a6ff', '#f1e05a']
        : ['#58a6ff', '#6b8aff', '#3178c6']
)
</script>

<template>
    <div class="header-body my-4">
        <div class="hero rounded-4 p-4 p-md-5 position-relative overflow-hidden">

            <div class="aurora" aria-hidden="true">
                <span class="orb orb-1" :style="{ '--c': orbColors[0] }"></span>
                <span class="orb orb-2" :style="{ '--c': orbColors[1] }"></span>
                <span class="orb orb-3" :style="{ '--c': orbColors[2] }"></span>
            </div>
            <div class="dots" aria-hidden="true"></div>

            <div class="position-relative d-flex align-items-center justify-content-between gap-4">
                <div>
                    <h1 class="page-title display-5 fw-bold mb-2" :aria-label="title">
                        <span v-for="l in letters" :key="l.i" class="letter" aria-hidden="true"
                            :style="{ '--i': l.i }">{{ l.ch }}</span>
                    </h1>

                    <p class="hero-sub text-muted-github mb-0">
                        <template v-if="handle">Signed in as <span class="font-monospace">@{{ handle }}</span></template>
                        <template v-else>Manage your profile and preferences.</template>
                    </p>
                </div>

                <div class="hero-avatar d-none d-sm-block">
                    <SettingsAvatar :src="avatarUrl" :initial="initial" :size="72" ring :ring-color="orbColors[0]" />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.hero {
    background-color: var(--card-bg);
    border: 1px solid var(--card-border);
    isolation: isolate;
    transition: background-color 0.2s ease, border-color 0.2s ease;
}

.page-title {
    color: var(--app-text);
    letter-spacing: -0.02em;
}

/* --- Aurora ------------------------------------------------------------ */
.aurora {
    position: absolute;
    inset: 0;
    z-index: -2;
    filter: blur(60px) saturate(1.2);
    opacity: 0.5;
}

.orb {
    position: absolute;
    width: 46%;
    aspect-ratio: 1;
    border-radius: 50%;
    background-color: var(--c);
    transition: background-color 1.4s ease;
    will-change: transform;
}

.orb-1 {
    top: -40%;
    left: -8%;
    animation: drift-a 14s ease-in-out infinite alternate;
}

.orb-2 {
    top: -30%;
    right: -10%;
    animation: drift-b 17s ease-in-out infinite alternate;
}

.orb-3 {
    bottom: -60%;
    left: 30%;
    animation: drift-c 20s ease-in-out infinite alternate;
}

@keyframes drift-a {
    to { transform: translate(18%, 24%) scale(1.15); }
}

@keyframes drift-b {
    to { transform: translate(-22%, 18%) scale(0.9); }
}

@keyframes drift-c {
    to { transform: translate(14%, -20%) scale(1.2); }
}

.dots {
    position: absolute;
    inset: 0;
    z-index: -1;
    background-image: radial-gradient(var(--card-border) 1px, transparent 1px);
    background-size: 22px 22px;
    -webkit-mask-image: linear-gradient(to bottom, #000, transparent 85%);
    mask-image: linear-gradient(to bottom, #000, transparent 85%);
}

/* --- Entrance --------------------------------------------------------------- */
.letter {
    display: inline-block;
    opacity: 0;
    transform: translateY(60%) rotate(6deg);
    animation: letter-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    animation-delay: calc(var(--i) * 45ms + 120ms);
}

@keyframes letter-in {
    to {
        opacity: 1;
        transform: none;
    }
}

.hero-sub,
.hero-avatar {
    opacity: 0;
    animation: fade-up 0.7s ease forwards;
}

.hero-sub {
    animation-delay: 0.6s;
}

.hero-avatar {
    animation-delay: 0.75s;
}

@keyframes fade-up {
    from {
        opacity: 0;
        transform: translateY(8px);
    }

    to {
        opacity: 1;
        transform: none;
    }
}

@media (prefers-reduced-motion: reduce) {

    .orb,
    .letter,
    .hero-sub,
    .hero-avatar {
        animation: none !important;
    }

    .letter,
    .hero-sub,
    .hero-avatar {
        opacity: 1;
        transform: none;
    }
}
</style>
