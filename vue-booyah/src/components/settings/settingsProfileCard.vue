<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useUserSettings } from '@/utils/userSettings'
import { vSpotlight } from '@/utils/motion'
import SettingsAvatar from '@/components/settings/settingsAvatar.vue'
import SettingsSaveBar from '@/components/settings/settingsSaveBar.vue'

const MAX = 40

const { displayName, handle, shownName, avatarUrl, initial, saveDisplayName } = useUserSettings()

const draft = ref(displayName.value)
const status = ref('idle') // 'idle' | 'saving' | 'saved'
const serverError = ref('')
let savedTimer = null

// if the name changes from somewhere else, follow it
watch(displayName, (v) => (draft.value = v))

const trimmed = computed(() => draft.value.trim())
const dirty = computed(() => trimmed.value !== displayName.value)

const validation = computed(() => {
    if (!dirty.value) return ''
    if (trimmed.value.length === 0) return 'Enter a name to show across Booyah.'
    if (trimmed.value.length > MAX) return `Keep it to ${MAX} characters or fewer.`
    return ''
})

// the greeting preview uses the same wording as the setup page
const previewName = computed(() => trimmed.value || handle.value || 'there')
const previewInitial = computed(() => (trimmed.value || shownName.value || '?').charAt(0).toUpperCase())

const nearLimit = computed(() => draft.value.length >= MAX - 5)

function reset() {
    draft.value = displayName.value
    serverError.value = ''
}

async function save() {
    if (!dirty.value || validation.value || status.value !== 'idle') return

    status.value = 'saving'
    serverError.value = ''

    try {
        await saveDisplayName(trimmed.value)
        status.value = 'saved'
        savedTimer = setTimeout(() => (status.value = 'idle'), 2200)
    } catch (e) {
        console.error('settings: could not save display name', e)
        serverError.value = e.response?.data?.message || 'Could not save your name. Please try again.'
        status.value = 'idle'
    }
}

onBeforeUnmount(() => clearTimeout(savedTimer))
</script>

<template>
    <section v-spotlight class="settings-card card rounded-4 p-4">
        <h2 class="h5 fw-bold card-heading mb-1">Profile</h2>
        <p class="text-muted-github mb-4">How your name appears in Booyah.</p>

        <!-- Live preview, so people see what they are changing -->
        <div class="preview d-flex align-items-center gap-3 rounded-3 p-3 mb-4">
            <SettingsAvatar :src="avatarUrl" :initial="previewInitial" :size="48" />
            <p class="preview-text mb-0">
                Hi <Transition name="name" mode="out-in"><strong :key="previewName" class="preview-name">{{ previewName
                        }}</strong></Transition>, welcome to Booyah
            </p>
        </div>

        <!-- Bootstrap floating label input -->
        <div class="form-floating">
            <input id="displayName" v-model="draft" type="text" class="form-control github-control"
                :class="{ 'is-invalid': validation }" placeholder="Display name" autocomplete="nickname"
                maxlength="60" @keydown.enter.prevent="save" @keydown.esc="reset" />
            <label for="displayName">Display name</label>
            <div class="invalid-feedback">{{ validation }}</div>
        </div>

        <div class="d-flex justify-content-between align-items-start gap-3 mt-2">
            <p class="text-muted-github small mb-0">
                <template v-if="handle">Your GitHub username <span class="font-monospace">@{{ handle }}</span> can't be changed here.</template>
                <template v-else>Shown in your welcome message and across Booyah.</template>
            </p>
            <span class="counter small font-monospace flex-shrink-0" :class="{ 'is-near': nearLimit, 'is-over': draft.length > MAX }">
                {{ draft.length }}/{{ MAX }}
            </span>
        </div>

        <SettingsSaveBar :dirty="dirty" :status="status" :disabled="!!validation" :error="serverError" @save="save"
            @reset="reset" />
    </section>
</template>

<style scoped>
.settings-card {
    position: relative;
    overflow: hidden;
    isolation: isolate;
    background-color: var(--card-bg);
    border: 1px solid var(--card-border);
    transition: border-color 0.3s ease;
}

.settings-card::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
    background: radial-gradient(320px circle at var(--mx, 50%) var(--my, 50%),
            color-mix(in srgb, #58a6ff 14%, transparent),
            transparent 70%);
}

.settings-card:hover::before {
    opacity: 1;
}

.card-heading,
.preview-name {
    color: var(--app-text);
}

.preview {
    background-color: color-mix(in srgb, #58a6ff 7%, transparent);
    border: 1px dashed color-mix(in srgb, #58a6ff 35%, var(--card-border));
}

.preview-text {
    color: var(--app-text);
    min-width: 0;
    overflow-wrap: anywhere;
}

.preview-name {
    display: inline-block;
}

.name-enter-active,
.name-leave-active {
    transition: opacity 0.12s ease, transform 0.15s ease;
}

.name-enter-from {
    opacity: 0;
    transform: translateY(4px);
}

.name-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}

.github-control:focus {
    border-color: #58a6ff !important;
    box-shadow: 0 0 0 3px rgba(56, 139, 253, 0.3);
}

.counter {
    color: #8b949e;
    transition: color 0.2s ease;
}

.counter.is-near {
    color: #e3b341;
}

.counter.is-over {
    color: #f85149;
}

@media (prefers-reduced-motion: reduce) {

    .name-enter-active,
    .name-leave-active,
    .settings-card::before {
        transition: none !important;
    }
}
</style>
