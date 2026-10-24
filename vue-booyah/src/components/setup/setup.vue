<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
    // Shared with the form via SetupView: 'Newcomer' | 'Practitioner'
    experience: {
        type: String,
        default: 'Newcomer'
    }
})

// --- Greeting ---------------------------------------------------------------
// Reads the name from the same localStorage user object the form uses.
// If your user object stores it under another key, add it to this list.
const displayName = computed(() => {
    try {
        const u = JSON.parse(localStorage.getItem('user') || '{}')
        return (u.name || u.username || u.fullName || u.firstName || '').trim()
    } catch {
        return ''
    }
})

const words = computed(() => {
    if (!displayName.value) return ['Welcome', 'to', 'Booyah']
    const nameWords = displayName.value.split(/\s+/)
    nameWords[nameWords.length - 1] += ','
    return ['Hi', ...nameWords, 'welcome', 'to', 'Booyah']
})

// --- Scene that morphs with the chosen path ---------------------------------
const isDiscovery = computed(() => props.experience.toLowerCase() === 'new')

// Discovery = warm, exploratory palette. My Project = cool, structured palette.
// All colors come from your existing language/accent colors.
const sceneVars = computed(() => {
    const palette = isDiscovery.value
        ? ['#41b883', '#58a6ff', '#f1e05a']
        : ['#58a6ff', '#6b8aff', '#3178c6']
    return {
        '--o1': palette[0],
        '--o2': palette[1],
        '--o3': palette[2],
        '--mote-radius': isDiscovery.value ? '50%' : '2px'
    }
})

const motes = Array.from({ length: 26 }, (_, id) => ({
    id,
    left: Math.random() * 100,
    size: 3 + Math.random() * 5,
    dur: 14 + Math.random() * 16,
    delay: -Math.random() * 24,
    drift: (Math.random() - 0.5) * 80
}))

// --- Cursor light --------------------------------------------------------------
const scene = ref(null)
let raf = 0
function onMove(e) {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
        scene.value?.style.setProperty('--cx', e.clientX + 'px')
        scene.value?.style.setProperty('--cy', e.clientY + 'px')
    })
}

onMounted(() => window.addEventListener('pointermove', onMove, { passive: true }))
onBeforeUnmount(() => {
    window.removeEventListener('pointermove', onMove)
    cancelAnimationFrame(raf)
})
</script>

<template>
    <section class="setup-hero">

        <!-- Background scene (fixed, behind everything) -->
        <div ref="scene" class="scene" :class="{ 'is-structured': !isDiscovery }" :style="sceneVars" aria-hidden="true">
            <span class="orb o1"></span>
            <span class="orb o2"></span>
            <span class="orb o3"></span>
            <span class="grid"></span>
            <span class="cursor-glow"></span>
            <span v-for="m in motes" :key="m.id" class="mote" :style="{
                left: m.left + '%',
                width: m.size + 'px',
                height: m.size + 'px',
                animationDuration: m.dur + 's',
                animationDelay: m.delay + 's',
                '--drift': m.drift + 'px'
            }"></span>
        </div>

        <!-- Greeting -->
        <header class="hero-copy container pt-4 pb-2">
            <h1 class="hero-title display-5 fw-bold mb-3" :aria-label="words.join(' ')">
                <span v-for="(w, i) in words" :key="i" class="word" aria-hidden="true" :style="{ '--i': i }">{{ w
                }}&nbsp;</span>
            </h1>
            <p class="hero-sub text-muted-github fs-5 mb-0">
                Tell us how you work so we can open the right tab when you sign in. You can change this any time in
                Settings.
            </p>
        </header>
    </section>
</template>

<style scoped>
.hero-copy {
    max-width: 800px;
}

.hero-title {
    color: var(--app-text);
    letter-spacing: -0.02em;
}

/* One orchestrated entrance: words resolve out of blur */
.word {
    display: inline-block;
    opacity: 0;
    filter: blur(14px);
    transform: translateY(45%) scale(0.96);
    animation: word-in 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    animation-delay: calc(var(--i) * 80ms + 150ms);
}

@keyframes word-in {
    to {
        opacity: 1;
        filter: blur(0);
        transform: none;
    }
}

.hero-sub {
    max-width: 62ch;
    opacity: 0;
    animation: sub-in 0.8s ease 0.9s forwards;
}

@keyframes sub-in {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: none;
    }
}

/* --- Scene ------------------------------------------------------------------ */
.scene {
    position: fixed;
    inset: 0;
    z-index: -1;
    overflow: hidden;
    pointer-events: none;
}

.orb {
    position: absolute;
    width: 52vmax;
    aspect-ratio: 1;
    border-radius: 50%;
    filter: blur(90px);
    opacity: 0.28;
    will-change: transform;
    transition: background-color 1.4s ease;
}

.o1 {
    background-color: var(--o1);
    top: -25vmax;
    left: -15vmax;
    animation: orb-a 20s ease-in-out infinite alternate;
}

.o2 {
    background-color: var(--o2);
    right: -20vmax;
    top: 10vmax;
    animation: orb-b 24s ease-in-out infinite alternate;
}

.o3 {
    background-color: var(--o3);
    bottom: -35vmax;
    left: 25vw;
    opacity: 0.18;
    animation: orb-c 28s ease-in-out infinite alternate;
}

@keyframes orb-a {
    to {
        transform: translate(14vmax, 12vmax) scale(1.15);
    }
}

@keyframes orb-b {
    to {
        transform: translate(-16vmax, 8vmax) scale(0.9);
    }
}

@keyframes orb-c {
    to {
        transform: translate(10vmax, -14vmax) scale(1.2);
    }
}

/* Grid only fades in for the structured (My Project) path */
.grid {
    position: absolute;
    inset: 0;
    background-image:
        linear-gradient(var(--card-border) 1px, transparent 1px),
        linear-gradient(90deg, var(--card-border) 1px, transparent 1px);
    background-size: 56px 56px;
    -webkit-mask-image: radial-gradient(ellipse at 50% 40%, #000 0%, transparent 70%);
    mask-image: radial-gradient(ellipse at 50% 40%, #000 0%, transparent 70%);
    opacity: 0;
    transform: scale(1.08);
    transition: opacity 1s ease, transform 1.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.is-structured .grid {
    opacity: 0.6;
    transform: scale(1);
}

.cursor-glow {
    position: absolute;
    left: 0;
    top: 0;
    width: 560px;
    height: 560px;
    margin: -280px 0 0 -280px;
    transform: translate(var(--cx, 50vw), var(--cy, 30vh));
    background: radial-gradient(circle, color-mix(in srgb, var(--o2) 22%, transparent), transparent 65%);
    transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), background 1.2s ease;
}

.mote {
    position: absolute;
    bottom: -20px;
    background-color: var(--o1);
    border-radius: var(--mote-radius);
    opacity: 0;
    animation: float-up linear infinite;
    transition: background-color 1.4s ease, border-radius 0.8s ease;
}

@keyframes float-up {
    0% {
        transform: translate(0, 0);
        opacity: 0;
    }

    12% {
        opacity: 0.7;
    }

    85% {
        opacity: 0.5;
    }

    100% {
        transform: translate(var(--drift), -105vh);
        opacity: 0;
    }
}

@media (prefers-reduced-motion: reduce) {

    .word,
    .hero-sub {
        animation: none !important;
        opacity: 1;
        filter: none;
        transform: none;
    }

    .orb,
    .mote {
        animation: none !important;
    }

    .mote {
        display: none;
    }
}
</style>