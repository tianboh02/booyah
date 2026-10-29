<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserSettings } from '@/utils/userSettings'

const LOGIN_ROUTE = '/'

const router = useRouter()
const { logout } = useUserSettings()

// First click asks for confirmation, second click logs out. It resets after 3 seconds. cool but abit useless actually. lets keep this
const confirming = ref(false)
const leaving = ref(false)
let timer = null

function onClick() {
    if (leaving.value) return

    if (!confirming.value) {
        confirming.value = true
        timer = setTimeout(() => (confirming.value = false), 3000)
        return
    }

    clearTimeout(timer)
    leaving.value = true
    logout()
    router.push(LOGIN_ROUTE)
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
    <section class="card rounded-4 p-4">
        <div class="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div>
                <h2 class="h5 fw-bold card-heading mb-1">Log out</h2>
                <p class="text-muted-github mb-0">Your saved projects stay on your account.</p>
            </div>

            <button type="button" class="logout-btn btn position-relative overflow-hidden px-3"
                :class="{ 'is-confirming': confirming }" :disabled="leaving" @click="onClick">
                <span class="d-inline-block">
                    <Transition name="label" mode="out-in">
                        <span :key="confirming ? 'confirm' : 'idle'">{{ confirming ? 'Confirm log out' : 'Log out' }}</span>
                    </Transition>
                </span>
                <!-- kim jong un nuclear button -->
                <span v-if="confirming" class="countdown position-absolute start-0 bottom-0 w-100" aria-hidden="true"></span>
            </button>
        </div>
    </section>
</template>

<style scoped>
.card-heading {
    color: var(--app-text);
}

.logout-btn {
    color: var(--app-text);
    background: transparent;
    border: 1px solid var(--card-border);
    transition: background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, transform 0.15s ease;
}

.logout-btn:hover:not(.is-confirming) {
    background-color: color-mix(in srgb, #58a6ff 10%, transparent);
    color: var(--app-text);
}

.logout-btn.is-confirming {
    color: #f85149;
    border-color: #f85149;
    background-color: color-mix(in srgb, #f85149 10%, transparent);
    animation: nudge 0.4s ease;
}

.logout-btn:active {
    transform: scale(0.97);
}

.logout-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4);
}

.countdown {
    height: 2px;
    background-color: #f85149;
    transform-origin: left;
    animation: countdown 3s linear forwards;
}

@keyframes countdown {
    from {
        transform: scaleX(1);
    }

    to {
        transform: scaleX(0);
    }
}

@keyframes nudge {

    0%,
    100% {
        transform: translateX(0);
    }

    25% {
        transform: translateX(-3px);
    }

    75% {
        transform: translateX(3px);
    }
}

.label-enter-active,
.label-leave-active {
    transition: opacity 0.15s ease, transform 0.2s ease;
}

.label-enter-from {
    opacity: 0;
    transform: translateY(6px);
}

.label-leave-to {
    opacity: 0;
    transform: translateY(-6px);
}

@media (prefers-reduced-motion: reduce) {
    .logout-btn.is-confirming,
    .countdown {
        animation: none !important;
    }

    .label-enter-active,
    .label-leave-active {
        transition: none !important;
    }
}
</style>
