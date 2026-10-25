<script setup>
import { computed } from 'vue'
import { isKnownLanguage, resourcesFor } from '@/utils/learnResources'
import { getLangColor } from '@/utils/langColors'
import { vSpotlight, vTilt } from '@/utils/motion'

// Where to learn the chosen language: "Start here" cards (docs, roadmap, practice), then video cards.
const props = defineProps({
    lang: { type: String, required: true }
})

const resources = computed(() => resourcesFor(props.lang))

const starters = computed(() => {
    const r = resources.value
    return [
        {
            kind: 'Docs',
            title: isKnownLanguage(props.lang) ? `Official ${props.lang} guide` : `${props.lang} on GitHub Topics`,
            purpose: isKnownLanguage(props.lang) ? 'The language from its own authors' : 'Projects tagged with it',
            url: r.docs
        },
        r.roadmap && { kind: 'Roadmap', title: 'roadmap.sh', purpose: 'What to learn, in order', url: r.roadmap },
        r.exercism && { kind: 'Practice', title: 'Exercism', purpose: 'Exercises with feedback', url: r.exercism }
    ].filter(Boolean)
})
</script>

<template>
    <div :style="{ '--accent': getLangColor(lang) }">
        <p class="small text-muted-github fw-semibold mb-2">Start here</p>
        <div class="row row-cols-1 row-cols-sm-3 g-3 mb-4">
            <div v-for="(s, i) in starters" :key="s.url" class="col rise-in" :style="{ '--i': i }">
                <a v-spotlight :href="s.url" target="_blank" rel="noopener"
                    class="resource spot-card card h-100 p-3 rounded-3 shadow-sm text-decoration-none">
                    <span class="d-flex align-items-center justify-content-between mb-2">
                        <span class="badge badge-github rounded-pill fw-normal">{{ s.kind }}</span>
                        <span class="text-muted-github small" aria-hidden="true">↗</span>
                    </span>
                    <span class="fw-semibold">{{ s.title }}</span>
                    <span class="text-muted-github small">{{ s.purpose }}</span>
                </a>
            </div>
        </div>

        <p class="small text-muted-github fw-semibold mb-2">Watch</p>
        <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-3">
            <div v-for="(v, i) in resources.videos" :key="v.url" class="col rise-in"
                :style="{ '--i': starters.length + i }">
                <a v-tilt="5" v-spotlight :href="v.url" target="_blank" rel="noopener"
                    class="resource video spot-card card h-100 rounded-3 shadow-sm text-decoration-none">
                    <div v-if="v.thumb" class="ratio ratio-16x9">
                        <img :src="v.thumb" alt=""class="object-fit-cover rounded-top-3" loading="lazy" />
                    </div>
                    <div class="p-3">
                        <span class="fw-semibold line-clamp-2">{{ v.title }}</span>
                        <span class="text-muted-github small">▶ {{ v.by }}</span>
                    </div>
                </a>
            </div>
        </div>
    </div>
</template>

<style scoped>
.resource {
    color: var(--app-text);
}

.resource:hover {
    color: var(--app-text);
}

/* v-tilt writes --rx / --ry; combine them with the shared hover lift */
.video {
    transform: perspective(700px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
}

.video:hover {
    transform: perspective(700px) translateY(-3px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
}

@media (prefers-reduced-motion: reduce) {
    .video:hover {
        transform: none;
    }
}
</style>
