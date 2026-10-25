<script setup>
// Header card at the top of every page: drifting aurora, dot grid, letter-by-letter title, status pill.
// Each page wraps this in its own xxxPageHeader.vue, which only decides the text, status and colours.
//
// Slots:
//  - subtitle: rich subtitle content (falls back to the `subtitle` prop)
//  - marker:   replaces the pulse dot inside the status pill
//  - aside:    content on the right of the card (hidden below the sm breakpoint)
import { computed } from 'vue'

const props = defineProps({
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    status: { type: String, default: '' },
    live: { type: Boolean, default: false },
    // up to three colours for the aurora; missing ones fall back to the accent blues + Vue green
    colors: { type: Array, default: () => [] }
})

const letters = computed(() => props.title.split('').map((ch, i) => ({ ch: ch === ' ' ? ' ' : ch, i })))

const FALLBACK = ['#58a6ff', '#6b8aff', '#41b883']
const orbColors = computed(() => [0, 1, 2].map((i) => props.colors[i] || FALLBACK[i]))
</script>

<template>
    <div class="mb-4">
        <div class="hero rounded-4 p-4 p-md-5 position-relative overflow-hidden">

            <!-- Aurora -->
            <div class="aurora position-absolute top-0 start-0 w-100 h-100" aria-hidden="true">
                <span class="orb orb-1 position-absolute rounded-circle" :style="{ '--c': orbColors[0] }"></span>
                <span class="orb orb-2 position-absolute rounded-circle" :style="{ '--c': orbColors[1] }"></span>
                <span class="orb orb-3 position-absolute rounded-circle" :style="{ '--c': orbColors[2] }"></span>
            </div>
            <div class="dots position-absolute top-0 start-0 w-100 h-100" aria-hidden="true"></div>

            <div class="position-relative d-flex align-items-center justify-content-between gap-4">
                <div>
                    <h1 class="page-title display-5 fw-bold mb-2" :aria-label="title">
                        <span v-for="l in letters" :key="l.i" class="letter d-inline-block" aria-hidden="true"
                            :style="{ '--i': l.i }">{{ l.ch }}</span>
                    </h1>

                    <p v-if="$slots.subtitle || subtitle" class="hero-sub text-muted-github"
                        :class="status ? 'mb-3' : 'mb-0'">
                        <slot name="subtitle">{{ subtitle }}</slot>
                    </p>

                    <span v-if="status"
                        class="status-pill badge rounded-pill fw-normal d-inline-flex align-items-center gap-2 px-3 py-2 text-wrap text-start"
                        :class="{ 'is-live': live }">
                        <slot name="marker">
                            <span class="pulse-dot position-relative rounded-circle d-inline-block flex-shrink-0"></span>
                        </slot>
                        <span>{{ status }}</span>
                    </span>
                </div>

                <div v-if="$slots.aside" class="hero-aside d-none d-sm-block">
                    <slot name="aside" />
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
/* blur and opacity come from main.css (.hero .aurora), per theme */
.aurora {
    z-index: -2;
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

/* Dot grid that fades toward the bottom so text stays readable */
.dots {
    z-index: -1;
    background-image: radial-gradient(var(--card-border) 1px, transparent 1px);
    background-size: 22px 22px;
    -webkit-mask-image: linear-gradient(to bottom, #000, transparent 85%);
    mask-image: linear-gradient(to bottom, #000, transparent 85%);
}

/* --- The one orchestrated entrance -------------------------------------- */
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
.status-pill,
.hero-aside {
    opacity: 0;
    animation: fade-up 0.7s ease forwards;
}

.hero-sub {
    animation-delay: 0.65s;
}

.status-pill,
.hero-aside {
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
    .hero-aside,
    .is-live .pulse-dot::after {
        animation: none !important;
    }

    .letter,
    .hero-sub,
    .status-pill,
    .hero-aside {
        opacity: 1;
        transform: none;
    }
}
</style>
