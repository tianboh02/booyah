<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { getLangColor } from '@/utils/langColors'

defineProps({
    project: { type: Object, required: true },
    saved: { type: Boolean, default: false },
    saving: { type: Boolean, default: false }
})

defineEmits(['close', 'save'])

// native <dialog>: the browser provides the backdrop mask, Esc-to-close and focus trap
const dialog = ref(null)

onMounted(() => {
    document.body.classList.add('overflow-hidden')
    dialog.value.showModal()
})

onBeforeUnmount(() => document.body.classList.remove('overflow-hidden'))
</script>

<template>
    <!-- clicking the dimmed backdrop lands on the <dialog> itself, which closes it -->
    <dialog ref="dialog" class="project-dialog" aria-labelledby="project-dialog-title" @close="$emit('close')"
        @click.self="dialog.close()">
        <div class="card p-4 rounded-3 shadow">
            <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                    <p class="small mb-1 category-name">{{ project.categoryName }}</p>
                    <h2 id="project-dialog-title" class="h5 fw-bold font-monospace section-title mb-0 text-break">
                        <span class="text-muted-github">{{ project.owner }}/</span>{{ project.name }}
                    </h2>
                </div>
                <button type="button" class="btn-close" aria-label="Close" @click="dialog.close()"></button>
            </div>

            <p class="section-title mb-3">{{ project.description }}</p>

            <div class="d-flex flex-wrap align-items-center gap-3 text-muted-github small p-3 rounded-3 meta mb-4">
                <span class="d-flex align-items-center gap-1">
                    <span class="rounded-circle d-inline-block"
                        :style="{ backgroundColor: getLangColor(project.language || 'No language'), width: '8px', height: '8px' }"></span>
                    {{ project.language || 'No language' }}
                </span>
                <span>☆ <span class="font-monospace">{{ project.stars.toLocaleString('en-US') }}</span> stars</span>
                <span>
                    Seen on Show HN · <span class="font-monospace">{{ project.hnPoints }}</span> points
                    <a :href="project.hnUrl" target="_blank" rel="noopener noreferrer" class="ms-1">View HN post</a>
                </span>
            </div>

            <div class="d-flex justify-content-end flex-wrap gap-2">
                <button type="button" class="save-btn btn d-inline-flex align-items-center gap-2"
                    :class="saved ? 'btn-outline-primary active' : 'btn-outline-secondary'" :aria-pressed="saved"
                    :disabled="saving" @click="$emit('save', project)">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"
                        stroke-linejoin="round" aria-hidden="true">
                        <path d="M3.5 2.5h9v11.2L8 10.6l-4.5 3.1z" />
                    </svg>
                    {{ saved ? 'Saved' : 'Save' }}
                </button>
                <a :href="project.ghUrl" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
                    View on GitHub
                </a>
            </div>
        </div>
    </dialog>
</template>

<style scoped>
.project-dialog {
    width: min(640px, 92vw);
    max-width: none;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
}

.project-dialog .card {
    max-height: 90vh;
    overflow-y: auto;
}

.section-title {
    color: var(--app-text);
}

.category-name {
    color: var(--bs-primary);
}

.meta {
    background-color: var(--badge-bg);
    border: 1px solid var(--card-border);
}

.save-btn svg path {
    fill: transparent;
    transition: fill 0.25s ease;
}

.save-btn.active svg path {
    fill: currentColor;
}

.project-dialog[open] {
    animation: project-pop 0.2s ease-out;
}

.project-dialog::backdrop {
    background-color: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
}

@keyframes project-pop {
    from {
        opacity: 0;
        transform: scale(0.85);
    }
}

@media (prefers-reduced-motion: reduce) {
    .project-dialog[open] {
        animation: none;
    }
}
</style>