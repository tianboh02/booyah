<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useUserSettings } from '@/utils/userSettings'
import { vSpotlight } from '@/utils/motion'
import SettingsSaveBar from '@/components/settings/settingsSaveBar.vue'

const { experience, saveExperience } = useUserSettings()

// Same options and values as the setup page ('New' | 'Practitioner')
const options = [
    {
        value: 'Newcomer',
        title: 'Newcomer',
        blurb: "See what's worth learning and building right now",
        lands: 'Discovery',
        accent: '#41b883',
        accent2: '#58a6ff'
    },
    {
        value: 'Practitioner',
        title: 'Practitioner',
        blurb: 'Track the ecosystem against your own work',
        lands: 'My Project',
        accent: '#58a6ff',
        accent2: '#6b8aff'
    }
]

const draft = ref(experience.value)
const status = ref('idle') // 'idle' | 'saving' | 'saved'
const serverError = ref('')
let savedTimer = null

watch(experience, (v) => (draft.value = v))

const dirty = computed(() => draft.value !== experience.value)
const current = computed(() => options.find(o => o.value === draft.value) || options[0])

function reset() {
    draft.value = experience.value
    serverError.value = ''
}

async function save() {
    if (!dirty.value || status.value !== 'idle') return

    status.value = 'saving'
    serverError.value = ''

    try {
        await saveExperience(draft.value)
        status.value = 'saved'
        savedTimer = setTimeout(() => (status.value = 'idle'), 2200)
    } catch (e) {
        console.error('settings: could not save experience', e)
        serverError.value = e.response?.data?.message || 'Could not save your experience level. Please try again.'
        status.value = 'idle'
    }
}

onBeforeUnmount(() => clearTimeout(savedTimer))
</script>

<template>
    <section class="settings-card card rounded-4 p-4">
        <h2 class="h5 fw-bold card-heading mb-1">Experience level</h2>
        <p class="text-muted-github mb-4">Decides which tab you land on after signing in.</p>

        <div class="row g-3" role="radiogroup" aria-label="Experience level">
            <div v-for="opt in options" :key="opt.value" class="col-sm-6 d-flex">
                <label v-spotlight class="option-card w-100 p-3 rounded-4 border position-relative"
                    :class="{ selected: draft === opt.value }"
                    :style="{ '--accent': opt.accent, '--accent2': opt.accent2 }">

                    <span class="glow-border" aria-hidden="true"></span>

                    <div class="d-flex align-items-center gap-3 mb-2">
                        <input class="radio-input" type="radio" name="settings-experience"
                            :id="'settings-exp-' + opt.value" :value="opt.value" v-model="draft">
                        <span class="radio-dot flex-shrink-0" aria-hidden="true"></span>
                        <div class="fw-semibold option-title fs-5">{{ opt.title }}</div>
                    </div>

                    <p class="text-muted-github small mb-3">{{ opt.blurb }}</p>
                    <div class="font-monospace small text-muted-github mt-auto">Lands on {{ opt.lands }}</div>
                </label>
            </div>
        </div>

        <!-- What happens next, updates as you pick -->
        <Transition name="swap" mode="out-in">
            <p :key="current.lands" class="landing-note small d-flex align-items-center gap-2 mt-3 mb-0">
                <span class="note-dot rounded-circle" :style="{ backgroundColor: current.accent }"></span>
                Next time you sign in, you'll land on <strong>{{ current.lands }}</strong>.
            </p>
        </Transition>

        <SettingsSaveBar :dirty="dirty" :status="status" :error="serverError" @save="save" @reset="reset" />
    </section>
</template>

<style scoped>
@property --angle {
    syntax: '<angle>';
    inherits: false;
    initial-value: 0deg;
}

.settings-card {
    position: relative;
    overflow: hidden;
    background-color: var(--card-bg);
    border: 1px solid var(--card-border);
}

.card-heading,
.option-title {
    color: var(--app-text);
}

/* --- Option cards (same look as the setup page) ----------------------------- */
.option-card {
    display: flex;
    flex-direction: column;
    cursor: pointer;
    overflow: hidden;
    isolation: isolate;
    background-color: color-mix(in srgb, var(--card-bg) 80%, transparent);
    border-color: var(--card-border) !important;
    transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.3s ease,
        box-shadow 0.4s ease, background-color 0.4s ease;
}

.option-card:hover:not(.selected) {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--accent) 55%, var(--card-border)) !important;
}

.option-card.selected {
    border-color: transparent !important;
    background-color: color-mix(in srgb, var(--accent) 9%, var(--card-bg));
    box-shadow: 0 16px 40px -20px color-mix(in srgb, var(--accent) 60%, transparent);
}

.option-card::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
    background: radial-gradient(260px circle at var(--mx, 50%) var(--my, 50%),
            color-mix(in srgb, var(--accent) 20%, transparent),
            transparent 70%);
}

.option-card:hover::before {
    opacity: 1;
}

.glow-border {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 2px;
    background: conic-gradient(from var(--angle), var(--accent), transparent 30%, var(--accent2) 55%, transparent 80%, var(--accent));
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
    opacity: 0;
    transition: opacity 0.4s ease;
    animation: spin-angle 5s linear infinite;
    pointer-events: none;
}

.option-card.selected .glow-border {
    opacity: 1;
}

@keyframes spin-angle {
    to {
        --angle: 360deg;
    }
}

/* --- Custom radio ------------------------------------------------------------ */
.radio-input {
    position: absolute;
    opacity: 0;
    width: 1px;
    height: 1px;
}

.radio-dot {
    position: relative;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid var(--card-border);
    transition: border-color 0.25s ease, box-shadow 0.25s ease;
}

.radio-dot::before {
    content: '';
    position: absolute;
    inset: 4px;
    border-radius: 50%;
    background-color: var(--accent);
    transform: scale(0);
    transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.radio-dot::after {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 50%;
    border: 2px solid var(--accent);
    opacity: 0;
}

.radio-input:checked+.radio-dot {
    border-color: var(--accent);
}

.radio-input:checked+.radio-dot::before {
    transform: scale(1);
}

.radio-input:checked+.radio-dot::after {
    animation: ping 0.7s ease-out;
}

.radio-input:focus-visible+.radio-dot {
    box-shadow: 0 0 0 4px rgba(56, 139, 253, 0.4);
}

@keyframes ping {
    from {
        transform: scale(1);
        opacity: 0.8;
    }

    to {
        transform: scale(2.2);
        opacity: 0;
    }
}

/* --- Note ------------------------------------------------------------------------ */
.landing-note {
    color: var(--app-text);
}

.note-dot {
    width: 8px;
    height: 8px;
    flex-shrink: 0;
    transition: background-color 0.3s ease;
}

.swap-enter-active,
.swap-leave-active {
    transition: opacity 0.2s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.swap-enter-from {
    opacity: 0;
    transform: translateY(8px);
}

.swap-leave-to {
    opacity: 0;
    transform: translateY(-8px);
}

@media (prefers-reduced-motion: reduce) {

    .option-card,
    .swap-enter-active,
    .swap-leave-active {
        transition: none !important;
    }

    .glow-border,
    .radio-input:checked+.radio-dot::after {
        animation: none !important;
    }
}
</style>
