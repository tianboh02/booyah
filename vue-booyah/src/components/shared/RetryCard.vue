<script setup>
// The "Couldn't load … / why / Try again" card shown when a section fails to load.
defineProps({
  title: { type: String, required: true },
  message: { type: String, default: '' },
})

defineEmits(['retry'])
</script>

<template>
  <div class="card p-4 rounded-3 shadow-sm text-center mb-4" role="alert">
    <p class="fw-semibold mb-1">{{ title }}</p>
    <p class="text-muted-github small mb-3">{{ message }}</p>
    <div>
      <button
        type="button"
        class="btn btn-sm btn-outline-primary rounded-pill px-3"
        @click="$emit('retry')"
      >
        Try again
      </button>
    </div>
  </div>
</template>
