<script setup>
import { computed } from 'vue'

const props = defineProps({
    points: { type: Array, default: () => [] }
})

// a missing month splits the line, so a failed load is a visible gap and never a drop to 0
const segments = computed(() => {
    const top = Math.max(...props.points.map((p) => p.share ?? 0), 1)
    const step = 100 / Math.max(props.points.length - 1, 1)
    const out = [[]]
    props.points.forEach((p, i) => {
        if (p.missing) out.push([])
        else out.at(-1).push(`${i * step},${28 - (p.share / top) * 26}`)
    })
    return out.filter((s) => s.length > 1)
})
</script>

<template>
    <div>
        <svg class="spark w-100 text-primary" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
            <polyline v-for="(s, i) in segments" :key="i" :points="s.join(' ')" fill="none" stroke="currentColor"
                stroke-width="2" vector-effect="non-scaling-stroke" />
        </svg>
        <div class="d-flex justify-content-between text-muted-github small">
            <span v-for="p in points" :key="p.month" class="text-center">
                <span class="d-block">{{ p.month }}</span>
                <span class="font-monospace">{{ p.missing ? '–' : `${p.share}%` }}</span>
            </span>
        </div>
    </div>
</template>

<style scoped>
.spark {
    height: 48px;
}
</style>
