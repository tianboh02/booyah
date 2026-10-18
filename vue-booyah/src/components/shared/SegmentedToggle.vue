<script setup>
// Small pill toggle used to switch chart views. options: [{ value, label }]
defineProps({
    options: { type: Array, required: true },
    label: { type: String, default: 'View' }
})

const model = defineModel({ type: [String, Number], required: true })
</script>

<template>
    <div class="seg d-inline-flex p-1 rounded-pill" role="group" :aria-label="label">
        <button v-for="o in options" :key="o.value" type="button" class="seg-btn rounded-pill border-0 px-2"
            :class="{ 'is-on': model === o.value }" :aria-pressed="model === o.value" @click="model = o.value">
            {{ o.label }}
        </button>
    </div>
</template>

<style scoped>
.seg {
    background-color: var(--badge-bg);
    border: 1px solid var(--card-border);
    gap: 2px;
}

.seg-btn {
    font-size: 0.72rem;
    line-height: 1.6;
    color: var(--text-muted-github);
    background: transparent;
    transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}

.seg-btn:hover {
    color: var(--app-text);
}

.seg-btn.is-on {
    color: #fff;
    background: #58a6ff;
    box-shadow: 0 2px 10px -3px rgba(88, 166, 255, 0.7);
}

.seg-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.4);
}
</style>
