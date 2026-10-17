<script setup>
import { computed } from 'vue'
import { getLangColor } from '@/utils/langColors'
import { itemLang } from '@/utils/savedLibrary'

const props = defineProps({
    items: {
        type: Array,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    }
})

const title = 'Saved Projects'
const letters = title.split('').map((ch, i) => ({ ch: ch === ' ' ? '\u00A0' : ch, i }))

// The aurora takes its colors from the languages of your saved projects.
const orbColors = computed(() => {
    const counts = {}
    props.items.forEach(i => {
        if (i.status === 'ok' && i.language) counts[itemLang(i)] = (counts[itemLang(i)] || 0) + 1
    })
    const top = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => getLangColor(name))

    const fallback = ['#58a6ff', '#6b8aff', '#e3b341']
    return [0, 1, 2].map(i => top[i] || fallback[i])
})

const count = computed(() => props.items.length)
const pillText = computed(() => {
    if (props.loading) return 'Loading your bookmarks'
    if (count.value === 0) return 'Nothing saved yet'
    return `${count.value} saved`
})
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

            <div class="position-relative">
                <h1 class="page-title display-5 fw-bold mb-2" :aria-label="title">
                    <span v-for="l in letters" :key="l.i" class="letter" aria-hidden="true"
                        :style="{ '--i': l.i }">{{ l.ch }}</span>
                </h1>

                <p class="hero-sub text-muted-github mb-3">
                    Everything you bookmarked in Discovery, in one place.
                </p>

                <span class="status-pill badge rounded-pill fw-normal d-inline-flex align-items-center gap-2 px-3 py-2"
                    :class="{ 'is-live': !loading && count > 0 }">
                    <svg class="pill-mark" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                        stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">
                        <path d="M3.5 2.5h9v11.2L8 10.6l-4.5 3.1z" />
                    </svg>
                    <span>{{ pillText }}</span>
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
    position: absolute;
    inset: 0;
    z-index: -2;
    filter: blur(60px) saturate(1.2);
    opacity: 0.55;
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
.status-pill {
    opacity: 0;
    animation: fade-up 0.7s ease forwards;
}

.hero-sub {
    animation-delay: 0.7s;
}

.status-pill {
    animation-delay: 0.85s;
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

/* --- Pill ------------------------------------------------------------------- */
.status-pill {
    background-color: color-mix(in srgb, var(--card-bg) 70%, transparent);
    border: 1px solid var(--card-border);
    color: var(--app-text);
    backdrop-filter: blur(6px);
}

.pill-mark path {
    fill: transparent;
    transition: fill 0.4s ease;
}

.is-live .pill-mark {
    color: #58a6ff;
}

.is-live .pill-mark path {
    fill: currentColor;
}

@media (prefers-reduced-motion: reduce) {
    .orb,
    .letter,
    .hero-sub,
    .status-pill {
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
