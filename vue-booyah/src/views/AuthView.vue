<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import API from '@/api.js'
import GitHubSSO from '@/components/landing/GitHubSSO.vue'
import { createScene, sampleAvatar, SUCCESS_MS } from '@/utils/signalScene'

//possible user errors in auth, keep it user friendly since user cannot understand
const ERROR_COPY = {
    denied: {
        icon: 'cancel', tint: [139, 148, 158],
        title: 'Sign-in cancelled',
        detail: "You chose not to authorise Booyah on GitHub, so nothing was shared. You can sign in again whenever you're ready."
    },
    github: {
        icon: 'alert', tint: [248, 81, 73],
        title: "GitHub couldn't finish signing you in",
        detail: 'GitHub rejected this sign-in request. Starting again usually sorts it out.'
    },
    missing: {
        icon: 'alert', tint: [139, 148, 158],
        title: 'Nothing to sign in with',
        detail: 'This page only works when GitHub sends you back here after you approve Booyah. Use the button below to start signing in.'
    },
    expired: {
        icon: 'clock', tint: [240, 136, 62],
        title: 'This sign-in link has expired',
        detail: 'GitHub sign-in links work only once and expire after 10 minutes, so refreshing this page or waiting too long breaks them. Sign in again to get a fresh one.'
    },
    offline: {
        icon: 'offline', tint: [240, 136, 62], retry: true,
        title: "Can't reach Booyah",
        detail: "Check your internet connection. If you're online, our server may still be starting up, so try again in a few seconds."
    },
    timeout: {
        icon: 'offline', tint: [240, 136, 62], retry: true,
        title: 'Booyah is taking too long to respond',
        detail: 'Our server may be starting up after a quiet spell. Give it a few seconds, then try again.'
    },
    rateLimited: {
        icon: 'clock', tint: [240, 136, 62],
        title: 'Too many sign-in attempts',
        detail: 'Wait about a minute, then sign in again.'
    },
    server: {
        icon: 'alert', tint: [248, 81, 73],
        title: 'Something went wrong on our side',
        detail: 'Your GitHub account is fine. Our server hit a problem while signing you in, so please try again in a moment.'
    },
    unknown: {
        icon: 'alert', tint: [248, 81, 73],
        title: "Sign-in didn't go through",
        detail: 'Something unexpected happened while signing you in. Please try again.'
    }
}

const authError = (kind, tech) => Object.assign(new Error(tech || kind), { kind, tech })

function classify(err) {
    if (err?.kind) return err
    if (!err?.isAxiosError) return authError('unknown', String(err?.message || err))
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') return authError('timeout', err.message)
    if (!err.response) return authError('offline', err.message)
    const { status, data } = err.response
    const tech = `HTTP ${status}${data?.message ? ` · ${data.message}` : ''}`
    if (status === 400) return authError('expired', tech)
    if (status === 429) return authError('rateLimited', tech)
    if (status >= 500) return authError('server', tech)
    return authError('unknown', tech)
}

const STATUS_STEPS = [
    { at: 0, text: 'Handshaking with GitHub' },
    { at: 1500, text: 'Verifying your identity' },
    { at: 3000, text: 'Syncing your Booyah profile' },
    { at: 8000, text: 'Still working, our server may be waking up' }
]


const route = useRoute()
const router = useRouter()
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const canvasEl = ref(null)
const phase = ref('loading') // 'loading' | 'success' | 'error'
const status = ref(STATUS_STEPS[0].text)
const failure = ref(null)
const showCard = ref(false)
const welcome = ref(null)
const showWelcome = ref(false)
const fadingOut = ref(false)

const copy = computed(() => failure.value && (ERROR_COPY[failure.value.kind] || ERROR_COPY.unknown))

let scene = null
let code = null
let statusTimer = 0
let disposed = false
let navigated = false
const timers = []
const later = (fn, ms) => timers.push(setTimeout(fn, ms))

function trackStatus() {
    const startedAt = performance.now()
    clearInterval(statusTimer)
    status.value = STATUS_STEPS[0].text
    statusTimer = setInterval(() => {
        const elapsed = performance.now() - startedAt
        status.value = STATUS_STEPS.findLast((step) => elapsed >= step.at).text
    }, 250)
}

function fail(err) {
    clearInterval(statusTimer)
    failure.value = err
    phase.value = 'error'
    scene?.setMode('error', (ERROR_COPY[err.kind] || ERROR_COPY.unknown).tint)
    later(() => (showCard.value = true), reduceMotion ? 0 : 450)
}

async function celebrate({ user, newUser }) {
    clearInterval(statusTimer)
    status.value = 'Identity confirmed'

    const name = user.name || user.username
    const destination = user.experience === 'Practitioner' ? '/my-projects' : '/discovery'
    welcome.value = {
        headline: newUser ? `Welcome to Booyah, ${name}` : `Welcome back, ${name}`,
        sub: user.experience == null
            ? "Let's set up your profile"
            : destination === '/my-projects' ? 'Opening My Projects' : 'Opening Discovery'
    }
    const go = () => {
        if (disposed || navigated) return
        navigated = true
        router.push(destination)
    }

    if (reduceMotion || !scene) {
        phase.value = 'success'
        showWelcome.value = true
        later(() => (fadingOut.value = true), 900)
        later(go, 1300)
        return
    }

    const points = await sampleAvatar(user.avatar)
    if (disposed) return
    phase.value = 'success'
    scene.success(points, {
        onWelcome: () => (showWelcome.value = true),
        onFade: () => (fadingOut.value = true),
        onDone: go
    })
    later(go, SUCCESS_MS + 2000)
}

async function authenticate() {
    phase.value = 'loading'
    showCard.value = false
    failure.value = null
    scene?.setMode('loading')
    trackStatus()

    try {
        const { data } = await API.post('/auth/githubOAuth', { code }, { timeout: 20000 })
        if (!data?.token || !data?.user) throw authError('server', 'Response was missing the session token')

        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        await celebrate(data)
    } catch (err) {
        console.error('GitHub authentication failed:', err)
        fail(classify(err))
    }
}

onMounted(() => {
    const { code: authCode, error, error_description: description } = route.query

    if (authCode || error) router.replace({ query: {} })

    try {
        scene = createScene(canvasEl.value, { reduceMotion })
    } catch (err) {
        console.warn('Auth scene unavailable, continuing without it.', err)
    }

    if (error) return fail(authError(error === 'access_denied' ? 'denied' : 'github', description || error))
    if (!authCode) return fail(authError('missing'))

    code = authCode
    authenticate()
})

onBeforeUnmount(() => {
    disposed = true
    scene?.destroy()
    clearInterval(statusTimer)
    timers.forEach(clearTimeout)
})
</script>

<template>
    <div class="auth-stage position-fixed top-0 start-0 w-100 h-100 overflow-hidden">
        <canvas ref="canvasEl" class="position-absolute top-0 start-0 w-100 h-100 d-block" aria-hidden="true"></canvas>

        <Transition name="fade">
            <div v-if="phase === 'loading'" class="hud position-absolute start-50 translate-middle-x text-center px-3 w-100">
                <p class="hud-status font-monospace mb-2" role="status" aria-live="polite">
                    {{ status }}<span class="caret">_</span>
                </p>
                <div class="legend d-flex justify-content-center flex-wrap gap-3 small font-monospace">
                    <span><i class="legend-dot d-inline-block rounded-circle align-middle" style="--c: #3fb950"></i>GitHub</span>
                    <span><i class="legend-dot d-inline-block rounded-circle align-middle" style="--c: #ff8a3d"></i>Hacker News</span>
                    <span><i class="legend-dot d-inline-block rounded-circle align-middle" style="--c: #a371f7"></i>Registries</span>
                </div>
            </div>
        </Transition>

        <!-- Success: greeting under the particle avatar -->
        <Transition name="rise">
            <div v-if="showWelcome && welcome" class="welcome position-absolute start-0 w-100 text-center px-3"
                role="status">
                <h1 class="welcome-title fw-semibold mb-1">{{ welcome.headline }}</h1>
                <p class="welcome-sub font-monospace small mb-0">{{ welcome.sub }}</p>
            </div>
        </Transition>

        <!-- Error card -->
        <Transition name="rise">
            <div v-if="showCard && copy"
                class="error-wrap position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3">
                <section class="error-card w-100 text-center p-4 p-sm-5" role="alert"
                    :style="{ '--accent': `rgb(${copy.tint.join(',')})` }">
                    <div class="error-icon mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <template v-if="copy.icon === 'cancel'">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                            </template>
                            <template v-else-if="copy.icon === 'clock'">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </template>
                            <template v-else-if="copy.icon === 'offline'">
                                <line x1="1" y1="1" x2="23" y2="23" />
                                <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                                <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                                <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
                                <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                                <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                                <line x1="12" y1="20" x2="12.01" y2="20" />
                            </template>
                            <template v-else>
                                <path
                                    d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </template>
                        </svg>
                    </div>

                    <h1 class="h4 fw-semibold mb-2">{{ copy.title }}</h1>
                    <p class="error-detail mb-4">{{ copy.detail }}</p>

                    <div class="d-flex flex-column flex-sm-row gap-2 justify-content-center align-items-center">
                        <button v-if="copy.retry" type="button" class="btn btn-primary px-4 py-2 fw-semibold"
                            @click="authenticate">
                            Try again
                        </button>
                        <GitHubSSO v-else />
                        <RouterLink to="/" class="btn btn-link back-link text-decoration-none">Back to home</RouterLink>
                    </div>
                </section>
            </div>
        </Transition>

        <!-- Fades into the app's own background just before navigating -->
        <div class="fade-out position-absolute top-0 start-0 w-100 h-100 pe-none" :class="{ 'is-on': fadingOut }">
        </div>
    </div>
</template>

<style scoped>
/* The stage is always dark: it's a full-screen moment, independent of the app theme */
.auth-stage {
    z-index: 1090;
    background: radial-gradient(ellipse at 50% 45%, #0d1220 0%, #07080c 55%, #040507 100%);
    color: #e6edf3;
}

.hud {
    bottom: 9vh;
}

.hud-status {
    color: #8fa7ff;
    letter-spacing: 0.02em;
}

.caret {
    margin-left: 2px;
    animation: blink 1s steps(1) infinite;
}

.legend {
    color: #8b949e;
}

.legend-dot {
    width: 8px;
    height: 8px;
    margin-right: 6px;
    background: var(--c);
    box-shadow: 0 0 8px var(--c);
}

/* Sits just below the particle avatar (globe radius is 20vmin, avatar 18vmin) */
.welcome {
    top: calc(45% + 21vmin);
}

.welcome-title {
    font-size: clamp(1.4rem, 3.2vw, 2.2rem);
    letter-spacing: -0.02em;
}

.welcome-sub {
    color: #8fa7ff;
}

.error-card {
    max-width: 460px;
    background: rgba(14, 16, 20, 0.72);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    box-shadow:
        0 0 0 1px color-mix(in srgb, var(--accent) 25%, transparent),
        0 24px 60px rgba(0, 0, 0, 0.5),
        0 0 80px -20px var(--accent);
}

.error-icon {
    width: 56px;
    height: 56px;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
}

.error-detail {
    color: #adb3ba;
    line-height: 1.6;
}

.back-link {
    color: #8b949e;
}

.back-link:hover {
    color: #e6edf3;
}

.fade-out {
    background-color: var(--app-bg);
    opacity: 0;
    transition: opacity 0.45s ease;
}

.fade-out.is-on {
    opacity: 1;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.rise-enter-active {
    transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.rise-leave-active {
    transition: opacity 0.25s ease;
}

.rise-enter-from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
}

.rise-leave-to {
    opacity: 0;
}

@keyframes blink {
    50% {
        opacity: 0;
    }
}

@media (prefers-reduced-motion: reduce) {
    .caret {
        animation: none;
    }

    .rise-enter-from {
        transform: none;
    }
}
</style>
