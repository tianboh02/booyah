<script setup>
import { getLangColor } from '@/utils/langColors'

defineProps({
    category: { type: Object, required: true }
})

defineEmits(['open', 'save'])

const shortStars = (n) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n))
</script>

<template>
    <section class="card h-100 p-3 rounded-3 shadow-sm" :aria-label="category.name">
        <header class="d-flex align-items-center justify-content-between gap-2 pb-2 mb-2 card-head">
            <div class="d-flex align-items-baseline gap-2 min-w-0">
                <span class="text-muted-github small font-monospace">{{ String(category.rank).padStart(2, '0') }}</span>
                <h2 class="h6 fw-bold section-title mb-0">{{ category.name }}</h2>
            </div>
            <span class="badge badge-github rounded-pill fw-normal px-2 py-1 text-nowrap">
                <span class="font-monospace">{{ category.builders }}</span> builders this month
            </span>
        </header>

        <ul v-if="category.projects.length" class="list-unstyled mb-0">
            <li v-for="p in category.projects" :key="p.id" class="project-row d-flex align-items-center gap-3 px-2">
                <button type="button" class="project-link btn btn-link p-0 text-start font-monospace text-truncate flex-grow-1"
                    :aria-label="`Open details for ${p.id}`" @click="$emit('open', p)">
                    <span class="text-muted-github">{{ p.owner }}/</span>{{ p.name }}
                </button>

                <span class="d-flex align-items-center gap-1 text-muted-github small lang-col">
                    <span class="rounded-circle d-inline-block flex-shrink-0"
                        :style="{ backgroundColor: getLangColor(p.language || 'No language'), width: '8px', height: '8px' }"></span>
                    {{ p.language || 'No language' }}
                </span>

                <span class="text-muted-github small font-monospace points-col text-end" title="Show HN points">▲ {{ p.hnPoints }}</span>

                <span class="text-muted-github small font-monospace stars-col text-end" title="GitHub stars">☆ {{ shortStars(p.stars) }}</span>

                <button type="button" class="btn btn-sm btn-link p-0 text-muted-github" :aria-label="`Save ${p.id}`"
                    @click="$emit('save', p)">🔖</button>
            </li>
        </ul>
        <p v-else class="text-muted-github small text-center py-4 mb-0">
            No projects in this category passed the checks this month.
        </p>
    </section>
</template>

<style scoped>
.min-w-0 {
    min-width: 0;
}

.card-head {
    border-bottom: 1px solid var(--card-border);
}

.section-title,
.project-link {
    color: var(--app-text);
}

.project-link {
    font-size: 0.9rem;
    text-decoration: none;
}

.project-link:hover {
    text-decoration: underline;
}

.project-row {
    min-height: 44px;
    border-radius: 0.4rem;
}

.project-row:hover {
    background-color: var(--badge-bg);
}

.lang-col {
    width: 6.5rem;
}

.points-col,
.stars-col {
    width: 3.5rem;
}
</style>
