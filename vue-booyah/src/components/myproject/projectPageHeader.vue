<script setup>
import { computed } from 'vue'
import { getLangColor } from '@/utils/langColors'

const props = defineProps({
    repoList: {
        type: Array,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    }
})

const title = 'My Projects'
const letters = title.split('').map((ch, i) => ({ ch: ch === ' ' ? '\u00A0' : ch, i }))

const orbColors = computed(() => {
    const counts = {}
    props.repoList.forEach(r => {
        if (r.language) counts[r.language] = (counts[r.language] || 0) + 1
    })
    const top = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => getLangColor(name))

    const fallback = ['#58a6ff', '#6b8aff', '#41b883']
    return [0, 1, 2].map(i => top[i] || fallback[i])
})

const synced = computed(() => !props.loading && props.repoList.length > 0)
</script>

<template>
    <div class="container my-4">
        <div class="hero rounded-4 p-4 p-md-5 position-relative overflow-hidden">
            <!-- Aurora -->
            <div class="aurora position-absolute top-0 start-0 w-100 h-100" aria-hidden="true">
                <span class="orb orb-1 position-absolute rounded-circle" :style="{ '--c': orbColors[0] }"></span>
                <span class="orb orb-2 position-absolute rounded-circle" :style="{ '--c': orbColors[1] }"></span>
                <span class="orb orb-3 position-absolute rounded-circle" :style="{ '--c': orbColors[2] }"></span>
            </div>
            <div class="dots position-absolute top-0 start-0 w-100 h-100" aria-hidden="true"></div>

            <div class="position-relative hero-content">
                <h1 class="page-title display-5 fw-bold mb-2" :aria-label="title">
                    <span v-for="l in letters" :key="l.i" class="letter d-inline-block" aria-hidden="true"
                        :style="{ '--i': l.i }">{{ l.ch }}</span>
                </h1>

                <p class="hero-sub text-muted-github mb-3">
                    Your GitHub repositories, loaded when you sign in.
                </p>

                <span class="status-pill badge rounded-pill fw-normal d-inline-flex align-items-center gap-2 px-3 py-2"
                    :class="{ 'is-live': synced }">
                    <span class="pulse-dot position-relative rounded-circle d-inline-block"></span>
                    <span>{{ synced ? 'Synced with GitHub' : (loading ? 'Connecting to GitHub' : 'Not connected')
                    }}</span>
                </span>
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
    z-index: -2;
    filter: blur(60px) saturate(1.2);
    opacity: 0.55;
}

.orb {
    width: 46%;
    aspect-ratio: 1;
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
    to {
        transform: translate(18%, 24%) scale(1.15);
    }
}

@keyframes drift-b {
    to {
        transform: translate(-22%, 18%) scale(0.9);
    }
}

@keyframes drift-c {
    to {
        transform: translate(14%, -20%) scale(1.2);
    }
}

.dots {
    z-index: -1;
    background-image: radial-gradient(var(--card-border) 1px, transparent 1px);
    background-size: 22px 22px;
    -webkit-mask-image: linear-gradient(to bottom, #000, transparent 85%);
    mask-image: linear-gradient(to bottom, #000, transparent 85%);
}

/* --- Entrance animations ------------------------------------------------ */
.letter {
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
.status-pill {
    opacity: 0;
    animation: fade-up 0.7s ease forwards;
}

.hero-sub {
    animation-delay: 0.65s;
}

.status-pill {
    animation-delay: 0.8s;
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

/* --- Status pill ---------------------------------------------------------- */
.status-pill {
    background-color: color-mix(in srgb, var(--card-bg) 70%, transparent);
    border: 1px solid var(--card-border);
    color: var(--app-text);
    backdrop-filter: blur(6px);
}

.pulse-dot {
    width: 8px;
    height: 8px;
    background-color: #6e7681;
}

.is-live .pulse-dot {
    background-color: #3fb950;
}

.is-live .pulse-dot::after {
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

@media (prefers-reduced-motion: reduce) {

    .orb,
    .letter,
    .hero-sub,
    .status-pill,
    .is-live .pulse-dot::after {
        animation: none !important;
    }

    .letter,
    .hero-sub,
    .status-pill {
        opacity: 1;
        transform: none;
    }
}
</style>