<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createScene } from '@/utils/signalScene'

// Inline version of the auth screen's particle globe. Each completed request fires one signal arc.
const props = defineProps({
    done: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    status: { type: String, default: 'Loading' },
    // [{ label, colour: [r, g, b] }]; the colours double as the arc palette
    legend: { type: Array, default: () => [] },
    height: { type: String, default: '360px' }
})

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const canvasEl = ref(null)
const hasScene = ref(true)
let scene = null

const css = (c) => `rgb(${c.join(',')})`
const accent = computed(() => css(props.legend[0]?.colour ?? [107, 138, 255]))

onMounted(() => {
    try {
        scene = createScene(canvasEl.value, {
            reduceMotion,
            sphereCount: 1200,
            ringCount: 500,
            starCount: 80,
            signals: props.legend.length ? props.legend.map((l) => l.colour) : undefined,
            arcGap: [700, 600], // quieter ambient arcs, so the per-request arcs stand out
            centerY: 0.42,
            radius: 0.26
        })
    } catch (err) {
        console.warn('Signal loader scene unavailable, showing text only.', err)
        hasScene.value = false
    }
})

// One arc per request that comes back, in the first legend colour
watch(
    () => props.done,
    (now, before) => {
        // capped, so a burst of responses doesn't flood the globe
        const n = Math.min(now - (before ?? 0), 3)
        for (let i = 0; i < n; i++) scene?.emitSignal(props.legend[0]?.colour)
    }
)

onBeforeUnmount(() => scene?.destroy())
</script>

<template>
    <div class="signal-stage position-relative overflow-hidden rounded-4 mb-4" :style="{ height }">
        <canvas v-show="hasScene" ref="canvasEl" class="position-absolute top-0 start-0 w-100 h-100"
            aria-hidden="true"></canvas>

        <div class="hud position-absolute bottom-0 start-0 w-100 text-center px-3 pb-4">
            <p class="hud-status font-monospace mb-2" role="status" aria-live="polite">
                {{ status }}<span class="caret">_</span>
            </p>

            <!-- one pip lights up per request that has come back; many requests collapse into a bar -->
            <div v-if="total && total <= 12" class="d-flex justify-content-center gap-1 mb-2" aria-hidden="true"
                :style="{ '--c': accent }">
                <span v-for="n in total" :key="n" class="pip" :class="{ 'pip-on': n <= done }"></span>
            </div>
            <div v-else-if="total" class="meter mx-auto mb-2" aria-hidden="true" :style="{ '--c': accent }">
                <span class="meter-fill d-block h-100" :style="{ width: `${(done / total) * 100}%` }"></span>
            </div>

            <div v-if="legend.length" class="legend d-flex justify-content-center flex-wrap gap-3 small font-monospace">
                <span v-for="l in legend" :key="l.label">
                    <i class="legend-dot" :style="{ '--c': css(l.colour) }"></i>{{ l.label }}
                </span>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Always dark, like the auth screen: it reads as a viewport into the data, in either theme */
.signal-stage {
    background: radial-gradient(ellipse at 50% 42%, #0d1220 0%, #07080c 60%, #040507 100%);
    border: 1px solid rgba(255, 255, 255, 0.06);
    box-shadow: 0 20px 50px -25px rgba(0, 0, 0, 0.6);
    color: #e6edf3;
}

canvas {
    display: block;
}

.hud-status {
    color: #8fa7ff;
    letter-spacing: 0.02em;
}

.caret {
    margin-left: 2px;
    animation: blink 1s steps(1) infinite;
}

.pip {
    width: 18px;
    height: 4px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.12);
    transition: background-color 0.3s ease, box-shadow 0.3s ease;
}

.pip-on {
    background: var(--c);
    box-shadow: 0 0 8px var(--c);
}

.meter {
    width: min(220px, 60%);
    height: 4px;
    border-radius: 2px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.12);
}

.meter-fill {
    background: var(--c);
    box-shadow: 0 0 8px var(--c);
    transition: width 0.3s ease;
}

.legend {
    color: #8b949e;
}

.legend-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-right: 6px;
    border-radius: 50%;
    vertical-align: middle;
    background: var(--c);
    box-shadow: 0 0 8px var(--c);
}

@keyframes blink {
    50% {
        opacity: 0;
    }
}

@media (prefers-reduced-motion: reduce) {
    .caret {
        animation: none;
    }
}
</style>
