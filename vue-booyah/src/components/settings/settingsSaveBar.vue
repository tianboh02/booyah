<script setup>
import { computed } from 'vue'

const props = defineProps({
    // there are unsaved changes
    dirty: { type: Boolean, default: false },
    // 'idle' | 'saving' | 'saved'
    status: { type: String, default: 'idle' },
    // block saving (for example, invalid input)
    disabled: { type: Boolean, default: false },
    error: { type: String, default: '' }
})

defineEmits(['save', 'reset'])

const open = computed(() => props.dirty || props.status === 'saved')
</script>

<template>
    <div>
        <!-- Save failed -->
        <div v-if="error" class="alert alert-danger py-2 small mt-3 mb-0" role="alert">{{ error }}</div>

        <!-- Slides open (grid-rows trick, so the card grows smoothly) -->
        <div class="bar-wrap d-grid" :class="{ open }" :inert="!open || undefined">
            <div class="bar-inner overflow-hidden">
                <div class="save-bar d-flex align-items-center justify-content-between gap-3 flex-wrap">
                    <span class="small d-inline-flex align-items-center gap-2" :class="status === 'saved' ? 'text-saved' : 'text-muted-github'">
                        <template v-if="status === 'saved'">
                            <svg class="check" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                                stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M3 8.5l3.2 3.2L13 5" />
                            </svg>
                            Saved
                        </template>
                        <template v-else>
                            <span class="dirty-dot rounded-circle"></span>
                            You have unsaved changes
                        </template>
                    </span>

                    <div class="d-flex gap-2">
                        <button type="button" class="btn btn-sm discard-btn" :disabled="status !== 'idle'"
                            :class="{ 'invisible': status === 'saved' }" @click="$emit('reset')">
                            Discard
                        </button>
                        <button type="button" class="btn btn-sm btn-primary px-3 fw-semibold save-btn"
                            :class="{ 'is-saved': status === 'saved' }"
                            :disabled="disabled || status !== 'idle'" @click="$emit('save')">
                            <span v-if="status === 'saving'" class="spinner-border spinner-border-sm me-2"
                                role="status"></span>
                            {{ status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved' : 'Save changes' }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.bar-wrap {
    grid-template-rows: 0fr;
    opacity: 0;
    transition: grid-template-rows 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease;
}

.bar-wrap.open {
    grid-template-rows: 1fr;
    opacity: 1;
}

.bar-inner {
    min-height: 0;
}

.save-bar {
    margin-top: 1.25rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--card-border);
}

.dirty-dot {
    width: 8px;
    height: 8px;
    background-color: #e3b341;
    animation: dirty-pulse 1.6s ease-in-out infinite;
}

@keyframes dirty-pulse {

    0%,
    100% {
        box-shadow: 0 0 0 0 rgba(227, 179, 65, 0.5);
    }

    50% {
        box-shadow: 0 0 0 5px rgba(227, 179, 65, 0);
    }
}

.text-saved {
    color: #3fb950;
}

.check path {
    stroke-dasharray: 20;
    stroke-dashoffset: 20;
    animation: draw 0.5s ease 0.05s forwards;
}

@keyframes draw {
    to {
        stroke-dashoffset: 0;
    }
}

.discard-btn {
    color: var(--app-text);
    border: 1px solid var(--card-border);
    background: transparent;
    transition: background-color 0.2s ease;
}

.discard-btn:hover:not(:disabled) {
    background-color: color-mix(in srgb, #58a6ff 12%, transparent);
    color: var(--app-text);
}

.save-btn {
    transition: background-color 0.3s ease, border-color 0.3s ease, transform 0.15s ease;
}

.save-btn.is-saved {
    background-color: #238636;
    border-color: #238636;
    opacity: 1;
}

.save-btn:active:not(:disabled) {
    transform: scale(0.97);
}

@media (prefers-reduced-motion: reduce) {

    .bar-wrap,
    .save-btn {
        transition: none !important;
    }

    .dirty-dot,
    .check path {
        animation: none !important;
    }

    .check path {
        stroke-dashoffset: 0;
    }
}
</style>
