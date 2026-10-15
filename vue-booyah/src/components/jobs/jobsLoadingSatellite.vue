<script setup>
defineProps({
    done: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
})

// PARKED: this loader is jobs-only for now. To share it across screens (Trending / Discovery / MyProject):
//  - move it to a shared components folder and rename it (it only needs `done` and `total`)
//  - give each screen's fetcher an onProgress(done, total) callback, like fetchHNJobsData has
//  - cache hits skip fetching, so the loader simply never shows in that case
</script>

<template>
    <div class="text-center py-5" role="status">
        <div class="sky position-relative mx-auto mb-3">
            <span class="planet position-absolute top-50 start-50 translate-middle">🌍</span>
            <div class="orbit position-absolute top-0 start-0 w-100 h-100">
                <span class="satellite position-absolute top-0 start-50 translate-middle-x">🛰️</span>
            </div>
        </div>

        <!-- one signal lights up per request that has come back -->
        <div class="d-flex justify-content-center gap-2 mb-2">
            <span v-for="n in total" :key="n" class="signal rounded-circle" :class="{ 'signal-on': n <= done }"></span>
        </div>
        <p class="text-muted-github small mb-0">
            {{ total ? `Receiving signals ${done} / ${total}` : 'Contacting Hacker News…' }}
        </p>
    </div>
</template>

<style scoped>
.sky {
    width: 96px;
    height: 96px;
}

.planet {
    font-size: 2rem;
}

.satellite {
    font-size: 1.4rem;
}

.orbit {
    animation: orbit-spin 3s linear infinite;
}

.signal {
    width: 0.6rem;
    height: 0.6rem;
    background-color: var(--card-border);
    transition: background-color 0.3s ease;
}

.signal-on {
    background-color: var(--bs-primary);
}

@keyframes orbit-spin {
    to {
        transform: rotate(360deg);
    }
}

@media (prefers-reduced-motion: reduce) {
    .orbit {
        animation: none;
    }
}
</style>
