<script setup>
import { compact } from '@/utils/trending/helpers/format'
import { readCodeUrl } from '@/utils/learnPath'
import DiscoveryLangPill from '@/components/discovery/discoveryLangPill.vue'

// Projects to learn from: each row links to the repo and opens its code in github.dev.
defineProps({
    projects: { type: Array, required: true }
})
</script>

<template>
    <div class="list-group">
        <div v-for="(p, i) in projects" :key="p.ghUrl" :style="{ '--i': i }"
            class="list-group-item project-row rise-in d-flex flex-column flex-sm-row align-items-sm-center gap-2 py-3">
            <div class="flex-grow-1 min-w-0">
                <a :href="p.ghUrl" target="_blank" rel="noopener" class="fw-semibold text-decoration-none project-link">
                    {{ p.name }}
                </a>
                <p class="text-muted-github small mb-1 line-clamp-2">{{ p.description }}</p>
                <span class="d-inline-flex align-items-center gap-2 small text-muted-github">
                    <DiscoveryLangPill v-if="p.language" :lang="p.language" static class="px-0" />
                    <span>★ {{ compact(p.stars) }}</span>
                </span>
            </div>
            <a :href="readCodeUrl(p.ghUrl)" target="_blank" rel="noopener"
                class="btn btn-sm btn-outline-primary text-nowrap align-self-start align-self-sm-center">
                Read the code
            </a>
        </div>
    </div>
</template>

<style scoped>
.project-row {
    background-color: var(--card-bg);
    border-color: var(--card-border);
    color: var(--app-text);
}

.project-link {
    color: var(--brand-blue);
}
</style>
