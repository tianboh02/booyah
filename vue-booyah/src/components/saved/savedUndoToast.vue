<script setup>
defineProps({
    removed: { type: Object, default: null },
    duration: { type: Number, default: 6000 }
})

defineEmits(['undo', 'dismiss'])
</script>

<template>
    <Transition name="toast-slide">
        <div v-if="removed" :key="removed._id"
            class="undo-toast position-fixed start-50 overflow-hidden shadow-lg rounded-3" role="status"
            aria-live="polite">
            <div class="d-flex align-items-center gap-3 px-3 py-2">
                <svg class="flex-shrink-0 toast-mark" width="16" height="16" viewBox="0 0 16 16" fill="none"
                    stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">
                    <path d="M3.5 2.5h9v11.2L8 10.6l-4.5 3.1z" />
                </svg>
                <span class="small toast-text text-truncate min-w-0">
                    Removed <span class="font-monospace">{{ removed.name }}</span>
                </span>
                <button type="button" class="btn btn-sm undo-btn rounded-pill px-3 fw-semibold" @click="$emit('undo')">Undo</button>
                <button type="button" class="btn-close btn-close-sm" aria-label="Dismiss"
                    @click="$emit('dismiss')"></button>
            </div>

            <!-- Countdown -->
            <div class="countdown" :style="{ animationDuration: duration + 'ms' }"></div>
        </div>
    </Transition>
</template>

<style scoped>
.undo-toast {
    bottom: 1.5rem;
    z-index: 1080;
    width: min(420px, calc(100vw - 2rem));
    translate: -50% 0;
    background-color: var(--card-bg);
    border: 1px solid var(--card-border);
    color: var(--app-text);
}

.toast-mark {
    color: #8b949e;
}

.toast-text {
    flex: 1;
}

.undo-btn {
    color: #58a6ff;
    background: transparent;
    border: 1px solid color-mix(in srgb, #58a6ff 50%, transparent);
    transition: background-color 0.2s ease;
}

.undo-btn:hover {
    background-color: color-mix(in srgb, #58a6ff 16%, transparent);
    color: #58a6ff;
}

.countdown {
    height: 3px;
    background: linear-gradient(90deg, #58a6ff, #6b8aff);
    transform-origin: left;
    animation: countdown linear forwards;
}

@keyframes countdown {
    from {
        transform: scaleX(1);
    }

    to {
        transform: scaleX(0);
    }
}

.toast-slide-enter-active,
.toast-slide-leave-active {
    transition: opacity 0.3s ease, transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-slide-enter-from,
.toast-slide-leave-to {
    opacity: 0;
    transform: translateY(24px);
}

@media (prefers-reduced-motion: reduce) {

    .toast-slide-enter-active,
    .toast-slide-leave-active {
        transition: opacity 0.2s ease;
    }

    .toast-slide-enter-from,
    .toast-slide-leave-to {
        transform: none;
    }
}
</style>
