<script setup>
defineProps({
    warning: { type: String, default: '' },
    error: { type: String, default: '' }
})

defineEmits(['retry'])
</script>

<template>
    <div>
        <div v-if="warning" class="alert alert-warning py-2 px-3 small mb-3" role="status">
            {{ warning }}
        </div>

        <div v-if="error" class="alert alert-danger d-flex align-items-center justify-content-between gap-2 mb-3"
            role="alert">
            <span>{{ error }}</span>

            <button type="button" class="btn btn-sm btn-outline-danger flex-shrink-0" @click="$emit('retry')">
                Try again
            </button>
        </div>
    </div>
</template>
