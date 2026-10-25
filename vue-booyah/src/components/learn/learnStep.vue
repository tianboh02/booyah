<script setup>
// One numbered step of the Learn path: number, title, optional hint, then the step's content.
// The number uses the same "01" style as the Discovery category cards; the step rises in when it appears.
defineProps({
    number: { type: Number, required: true },
    title: { type: String, required: true },
    hint: { type: String, default: '' }
})
</script>

<template>
    <section class="mb-4 rise-in">
        <div class="d-flex align-items-baseline gap-2 mb-1">
            <span class="text-muted-github small font-monospace">{{ String(number).padStart(2, '0') }}</span>
            <h2 class="h6 fw-bold mb-0">{{ title }}</h2>
        </div>
        <p v-if="hint" class="text-muted-github small mb-3">{{ hint }}</p>
        <slot />
    </section>
</template>
