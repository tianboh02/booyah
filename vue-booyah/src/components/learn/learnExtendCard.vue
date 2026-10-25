<script setup>
import { compact } from '@/utils/trending/helpers/format'
import { getLangColor } from '@/utils/langColors'
import { vSpotlight } from '@/utils/motion'
import DiscoveryLangPill from '@/components/discovery/discoveryLangPill.vue'

// One of your repos with concrete ways to extend it (from learnPath.extendIdeas): [{ text, url? }].
defineProps({
    repo: { type: Object, required: true },
    ideas: { type: Array, required: true }
})
</script>

<template>
    <article v-spotlight class="extend spot-card card h-100 p-3 rounded-3 shadow-sm"
        :style="{ '--accent': getLangColor(repo.language) }">
        <header class="d-flex align-items-center justify-content-between gap-2 mb-1">
            <a :href="repo.html_url" target="_blank" rel="noopener"
                class="fw-semibold text-decoration-none text-truncate repo-link">{{ repo.name }}</a>
            <span class="small text-muted-github text-nowrap">★ {{ compact(repo.stargazers_count) }}</span>
        </header>
        <div class="mb-2">
            <DiscoveryLangPill v-if="repo.language" :lang="repo.language" static class="px-0" />
        </div>
        <ul class="list-unstyled small mb-0 d-flex flex-column gap-2">
            <li v-for="idea in ideas" :key="idea.text" class="d-flex gap-2">
                <span class="idea-mark flex-shrink-0" aria-hidden="true">→</span>
                <a v-if="idea.url" :href="idea.url" target="_blank" rel="noopener" class="idea-link">{{ idea.text }}</a>
                <span v-else>{{ idea.text }}</span>
            </li>
        </ul>
    </article>
</template>

<style scoped>
.extend {
    color: var(--app-text);
}

.repo-link,
.idea-link {
    color: var(--brand-blue);
}

.idea-mark {
    color: var(--accent);
}
</style>
