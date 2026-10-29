<script setup>
defineProps({
  saved: { type: Boolean, default: false },
  pending: { type: Boolean, default: false },
  label: { type: String, required: true },
})

defineEmits(['click'])
</script>

<template>
  <button
    type="button"
    class="bookmark-btn btn btn-sm btn-link p-0 text-muted-github"
    :class="{ 'is-saved': saved, 'is-pending': pending }"
    :aria-pressed="saved"
    :aria-busy="pending"
    :aria-label="saved ? `Remove ${label} from saved` : `Save ${label}`"
    :title="saved ? 'Saved. Click to remove' : 'Save project'"
    @click="$emit('click')"
  >
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M3.5 2.5h9v11.2L8 10.6l-4.5 3.1z" />
    </svg>
  </button>
</template>

<style scoped>
.bookmark-btn {
  transition:
    transform 0.15s ease,
    color 0.2s ease;
}

.bookmark-btn:hover,
.bookmark-btn.is-saved {
  color: #58a6ff !important;
}

.bookmark-btn:active {
  transform: scale(0.85);
}

.bookmark-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4);
}

.bookmark-btn svg path {
  fill: transparent;
  transition: fill 0.25s ease;
}

.bookmark-btn.is-saved svg {
  animation: bookmark-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.bookmark-btn.is-saved svg path {
  fill: currentColor;
}

/* a save request is in flight */
.bookmark-btn.is-pending {
  opacity: 0.6;
  pointer-events: none;
}

@keyframes bookmark-pop {
  40% {
    transform: scale(1.5) rotate(-12deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bookmark-btn {
    transition: none !important;
  }

  .bookmark-btn.is-saved svg {
    animation: none;
  }

  .bookmark-btn:active {
    transform: none;
  }
}
</style>
