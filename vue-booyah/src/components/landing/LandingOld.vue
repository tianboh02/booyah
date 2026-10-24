<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import Typed from 'typed.js'
import GitHubSSO from './GitHubSSO.vue'
import { useTheme } from '@/composables/useTheme'
import CardSpotlight from '@/views/CardSpotlight.vue'

const { theme } = useTheme()


// ---------- Typed.js Setup ----------
const typedTarget = ref(null)
let typedInstance = null

onMounted(async () => {
    await nextTick()

    if (typedTarget.value && !typedInstance) {
        typedInstance = new Typed(typedTarget.value, {
            strings: [
                'building.',
                'installing.',
                'hiring for.'
            ],
            typeSpeed: 80,
            backSpeed: 60,
            backDelay: 2000,
            loop: true,
            showCursor: true,
            cursorChar: '|'
        })
    }
})

onUnmounted(() => {
    if (typedInstance) {
        typedInstance.destroy()
        typedInstance = null
    }
})

// ---------- Dynamic Theme-Aware tsParticles Configuration ----------
const particlesOptions = computed(() => {
    const isDark = theme.value === 'dark'

    return {
        fullScreen: { enable: false },
        background: { color: { value: 'transparent' } },
        fpsLimit: 80,
        interactivity: {
            events: {
                onHover: { enable: true, mode: 'grab' },
                resize: true
            },
            modes: {
                grab: {
                    distance: 160,
                    links: {
                        opacity: isDark ? 0.7 : 0.6,
                        color: isDark ? '#6b8aff' : '#1d4ed8'
                    }
                }
            }
        },
        particles: {
            // Darker, high-contrast blue for light mode; bright pastel blue for dark mode
            color: { value: isDark ? '#6b8aff' : '#2563eb' },
            links: {
                color: isDark ? '#6b8aff' : '#3b82f6',
                distance: 140,
                enable: true,
                opacity: isDark ? 0.35 : 0.45,
                width: isDark ? 1 : 1.2
            },
            move: {
                enable: true,
                speed: 1.0,
                direction: 'none',
                outModes: { default: 'bounce' }
            },
            number: {
                density: { enable: true, area: 900 },
                value: 55
            },
            opacity: { value: isDark ? 0.6 : 0.75 },
            shape: { type: 'circle' },
            size: { value: { min: 1.5, max: 3.5 } }
        }
    }
})
</script>

<template>
    <div class="landing-wrapper position-relative overflow-hidden min-vh-100 py-5 px-3 px-md-5">

        <!-- tsParticles Background Layer -->
        <vue-particles id="tsparticles" class="position-absolute top-0 start-0 w-100 h-100 pe-none"
            :options="particlesOptions" />

        <!-- Hero Content Container -->
        <div class="container position-relative z-1 py-4 main-hero-content">

            <!-- Tagline -->
            <div class="tagline font-monospace mb-3 small">
                For developers in Singapore
            </div>

            <!-- Animated Main Headline -->
            <h1 class="headline mb-4 fw-semibold lh-sm tracking-tight">
                Decide what to build or learn next, based on what developers are actually
                <span ref="typedTarget" class="text-typed font-monospace"></span>
            </h1>

            <!-- Description -->
            <p class="mb-4 text-muted-github fs-5 main-description">
                Tech signals are scattered across separate feeds. Booyah cross-validates real trends against viral hype
                using live data from GitHub, Hacker News, and registries to direct your learning and career choices.
            </p>

            <!-- GitHub SSO Button Container -->
            <!-- <div class="mb-3">
                <GitHubSSO />
            </div> -->

            <!-- Disclaimer -->
            <p class="text-muted-github small lh-base mb-5" style="max-width: 680px;">
                Booyah reads your repositories to tailor results, and makes data requests with your own GitHub account,
                so they count toward your GitHub usage limit.
            </p>

            <!-- Bottom Feature Cards Grid -->
            <div class="row row-cols-1 row-cols-md-3 g-4 pt-4 mt-2">

                <!-- Card 1: What's being built -->
                <div class="col">
                    <CardSpotlight 
                        class="feature-card bg-card dark:bg-card text-foreground dark:text-foreground border-border"
                        gradient-color="rgba(107, 138, 255, 0.30)"
                        :gradient-opacity="1"
                        slot-class="flex w-full flex-col justify-between p-4">
                        <div>
                            <div
                                class="feature-icon mb-3 d-inline-flex align-items-center justify-content-center rounded-2">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b8aff"
                                    stroke-width="2">
                                    <polyline points="16 18 22 12 16 6"></polyline>
                                    <polyline points="8 6 2 12 8 18"></polyline>
                                </svg>
                            </div>
                            <h3 class="h6 fw-bold card-title mb-2">What's being built</h3>
                            <p class="small mb-3 text-muted-github">
                                Live categorised GitHub trends showing repositories gaining stars and real engagement,
                                helping individual learning alignment.
                            </p>
                        </div>
                        <div class="d-flex gap-2 flex-wrap">
                            <span class="badge badge-github font-monospace fw-normal">GitHub</span>
                            <span class="badge badge-github font-monospace fw-normal">HackerNews</span>
                        </div>
                    </CardSpotlight>
                </div>

                <!-- Card 2: What's being used -->
                <div class="col">
                    <CardSpotlight
                        class="feature-card bg-card dark:bg-card text-foreground dark:text-foreground border-border"
                        gradient-color="rgba(107, 138, 255, 0.30)"
                        :gradient-opacity="1"
                        slot-class="flex w-full flex-col justify-between p-4">
                        <div>
                            <div
                                class="feature-icon mb-3 d-inline-flex align-items-center justify-content-center rounded-2">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b8aff"
                                    stroke-width="2">
                                    <path
                                        d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z">
                                    </path>
                                </svg>
                            </div>
                            <h3 class="h6 fw-bold card-title mb-2">What's being used</h3>
                            <p class="small mb-3 text-muted-github">
                                Actual package registry download trends to verify production code usage and strip out
                                superficial viral social media hype.
                            </p>
                        </div>
                        <div class="d-flex gap-2 flex-wrap">
                            <span class="badge badge-github font-monospace fw-normal">Packagist</span>
                            <span class="badge badge-github font-monospace fw-normal">npm</span>
                            <span class="badge badge-github font-monospace fw-normal">crates.io</span>
                        </div>
                    </CardSpotlight>
                </div>

                <!-- Card 3: What's being hired -->
                <div class="col">
                    <CardSpotlight
                        class="feature-card bg-card dark:bg-card text-foreground dark:text-foreground border-border"
                        gradient-color="rgba(107, 138, 255, 0.30)"
                        :gradient-opacity="1"
                        slot-class="flex w-full flex-col justify-between p-4">
                        <div>
                            <div
                                class="feature-icon mb-3 d-inline-flex align-items-center justify-content-center rounded-2">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b8aff"
                                    stroke-width="2">
                                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                                </svg>
                            </div>
                            <h3 class="h6 fw-bold card-title mb-2">What's being hired</h3>
                            <p class="small mb-3 text-muted-github">
                                Multi-dimensional role and salary analytics mapped directly against active monthly tech
                                job postings to close industry talent skills gaps.
                            </p>
                        </div>
                        <div class="d-flex gap-2 flex-wrap">
                            <span class="badge badge-github font-monospace fw-normal">HackerNews: Who is Hiring</span>
                        </div>
                    </CardSpotlight>
                </div>

            </div>
        </div>
    </div>
</template>

<style scoped>
/* Main Structural Layout definitions */
.landing-wrapper {
    background-color: var(--app-bg);
    color: var(--app-text);
    transition: background-color 0.2s ease, color 0.2s ease;
}

.main-hero-content {
    max-width: 1120px;
}

.headline {
    max-width: 900px;
    font-size: 3.5rem;
    color: var(--app-text);
}

.main-description {
    max-width: 680px;
}

/* Base Theme Color Accents */
.tagline,
.text-typed {
    color: #6b8aff;
}

/* Feature Cards Style Layer & Visual Animations */
.feature-card {
    background-color: var(--card-bg);
    border-color: var(--card-border) !important;
    transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1),
        border-color 0.3s ease,
        box-shadow 0.3s ease,
        background-color 0.2s ease;
}

.feature-card:hover {
    border-color: #3b82f6 !important;
    transform: translateY(-4px) scale(1.01);
    box-shadow: 0 12px 24px rgba(59, 130, 246, 0.12);
}

.card-title {
    color: var(--app-text);
}

.feature-icon {
    width: 36px;
    height: 36px;
    background-color: var(--github-control-bg);
    border: 1px solid var(--card-border);
}
</style>