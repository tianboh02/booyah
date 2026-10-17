<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import API from '@/api'
import { getLangColor } from '@/utils/langColors'
import { vSpotlight, vTilt } from '@/utils/motion'

const route = useRoute()
const router = useRouter()

// 'New' | 'Practitioner' — owned by SetupView (v-model:experience) so the
// background scene can react to it. Used exactly like before: selectedExperience.value
const props = defineProps({
    experience: {
        type: String,
        default: 'New'
    }
})
const emit = defineEmits(['update:experience'])
// The form keeps its own selection, so the cards and Continue always agree with
// the radio buttons. It also stays in sync with the parent when one is connected.
const selectedExperience = ref(props.experience)
watch(() => props.experience, (v) => (selectedExperience.value = v))
watch(selectedExperience, (v) => emit('update:experience', v))

const isLoading = ref(false)
const errorMessage = ref('')

// Launch animation state
const launching = ref(false)
const submitBtn = ref(null)
const wx = ref(0)
const wy = ref(0)

const options = [
    {
        value: 'New',
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

const current = computed(() => options.find(o => o.value === selectedExperience.value) || options[0])

// Mini previews of each destination
const trendChips = ['Vue', 'Python', 'TypeScript', 'Go', 'Dart'].map((name, i) => ({
    name,
    color: getLangColor(name),
    i
}))

const previewBars = [
    { name: 'JavaScript', w: 100, color: getLangColor('JavaScript') },
    { name: 'Vue', w: 68, color: getLangColor('Vue') },
    { name: 'Dart', w: 42, color: getLangColor('Dart') }
]

// Expands a colored circle from the Continue button before navigating
async function playLaunch() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const rect = submitBtn.value?.getBoundingClientRect()
    if (rect) {
        wx.value = rect.left + rect.width / 2
        wy.value = rect.top + rect.height / 2
    }
    launching.value = true
    await new Promise(resolve => setTimeout(resolve, reduce ? 0 : 850))
}

const handleSubmit = async () => {
    if (!selectedExperience.value || isLoading.value) return

    isLoading.value = true
    errorMessage.value = ''

    try {
        // 1. Retrieve user object from localStorage
        const userStr = localStorage.getItem('user')
        const currentUser = userStr ? JSON.parse(userStr) : {}

        // 2. Axios PUT request sending currentUser.id to match backend req.body.userID
        const response = await API.put('/auth/updateExperience', {
            userID: currentUser.id,
            experience: selectedExperience.value
        })

        console.log('Update success:', response.data)

        // 3. Sync local storage user object
        currentUser.experience = selectedExperience.value
        localStorage.setItem('user', JSON.stringify(currentUser))

        // 4. Play the launch animation, then route based on selection
        await playLaunch()

        if (selectedExperience.value.toLowerCase() === 'new') {
            router.push('/discovery')
        } else {
            router.push('/my-projects')
        }

    } catch (error) {
        console.error('API Error:', error)
        errorMessage.value = error.response?.data?.message || 'An error occurred while saving.'
    } finally {
        isLoading.value = false
    }
}
</script>

<template>
    <div class="form-wrap container pb-5">

        <div class="d-flex align-items-baseline justify-content-between mb-3 mt-4 intro-fade">
            <h2 class="h5 fw-bold header-title mb-0">Experience level</h2>
            <span class="text-muted-github small">Required</span>
        </div>

        <!-- Error Alert -->
        <div v-if="errorMessage" class="alert alert-danger py-2 small mb-4" role="alert">
            {{ errorMessage }}
        </div>

        <form @submit.prevent="handleSubmit">
            <div class="row g-3" role="radiogroup" aria-label="Experience level">

                <div v-for="(opt, idx) in options" :key="opt.value" class="col-md-6 d-flex">
                    <label v-tilt="4" v-spotlight class="option-card w-100 p-3 rounded-4 border position-relative"
                        :class="{
                            selected: selectedExperience === opt.value,
                            dim: selectedExperience !== opt.value
                        }" :style="{ '--accent': opt.accent, '--accent2': opt.accent2, '--n': idx }">

                        <!-- Spinning gradient border, visible when selected -->
                        <span class="glow-border" aria-hidden="true"></span>

                        <div class="d-flex align-items-center gap-3 mb-2">
                            <input class="radio-input" type="radio" name="experience" :id="'exp' + opt.value"
                                :value="opt.value" v-model="selectedExperience">
                            <span class="radio-dot flex-shrink-0" aria-hidden="true"></span>
                            <div class="fw-semibold option-title fs-5">{{ opt.title }}</div>
                        </div>

                        <p class="text-muted-github mb-3 option-blurb">{{ opt.blurb }}</p>

                        <!-- Live preview of where this path leads -->
                        <div class="preview mb-3" aria-hidden="true">
                            <!-- Discovery: skills take turns "trending" -->
                            <div v-if="opt.value === 'New'" class="d-flex flex-wrap gap-2">
                                <span v-for="c in trendChips" :key="c.name" class="trend-chip small"
                                    :style="{ '--c': c.color, '--k': c.i }">
                                    <span class="chip-dot"></span>{{ c.name }}
                                    <span class="chip-up">▲</span>
                                </span>
                            </div>

                            <!-- My Project: language bars fill in -->
                            <div v-else class="d-flex flex-column gap-2">
                                <div v-for="(b, bi) in previewBars" :key="b.name"
                                    class="d-flex align-items-center gap-2">
                                    <span class="text-muted-github small bar-name text-truncate">{{ b.name }}</span>
                                    <div class="mini-track flex-grow-1 rounded-pill">
                                        <div class="mini-fill rounded-pill"
                                            :style="{ '--w': b.w + '%', '--bc': b.color, '--k': bi }"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="font-monospace small text-muted-github mt-auto">Lands on {{ opt.lands }}</div>
                    </label>
                </div>

            </div>

            <!-- Footer -->
            <div class="setup-footer d-flex align-items-center justify-content-between gap-3 flex-wrap mt-4 pt-4">

                <Transition name="swap" mode="out-in">
                    <div :key="current.lands" class="landing-note d-flex align-items-center gap-2">
                        <svg class="check" width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#3fb950"
                            stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M3 8.5l3.2 3.2L13 5" />
                        </svg>
                        <span class="landing-text">You'll land on <strong>{{ current.lands }}</strong></span>
                    </div>
                </Transition>

                <!-- Submit Button -->
                <button ref="submitBtn" type="submit" class="continue-btn btn btn-primary px-4 py-2 fw-semibold"
                    :disabled="!selectedExperience || isLoading">
                    <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                    <span>{{ isLoading ? 'Saving...' : 'Continue' }}</span>
                    <svg v-if="!isLoading" class="btn-arrow ms-2" width="16" height="16" viewBox="0 0 16 16" fill="none"
                        stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
                        aria-hidden="true">
                        <path d="M3 8h10M9 4l4 4-4 4" />
                    </svg>
                </button>
            </div>
        </form>

        <!-- Launch transition: a circle blooms out of the Continue button -->
        <div class="warp" :class="{ on: launching }"
            :style="{ '--wx': wx + 'px', '--wy': wy + 'px', '--wc': current.accent }" aria-hidden="true">
            <span class="warp-text fw-bold">Opening {{ current.lands }}…</span>
        </div>
    </div>
</template>

<style scoped>
@property --angle {
    syntax: '<angle>';
    inherits: false;
    initial-value: 0deg;
}

.form-wrap {
    max-width: 800px;
}

.header-title,
.option-title {
    color: var(--app-text);
}

.intro-fade {
    opacity: 0;
    animation: rise 0.7s ease 1.1s forwards;
}

@keyframes rise {
    from {
        opacity: 0;
        transform: translateY(12px);
    }

    to {
        opacity: 1;
        transform: none;
    }
}

/* --- Option cards ------------------------------------------------------------ */
.option-card {
    --s: 1;
    display: flex;
    flex-direction: column;
    cursor: pointer;
    overflow: hidden;
    isolation: isolate;
    background-color: color-mix(in srgb, var(--card-bg) 80%, transparent);
    backdrop-filter: blur(10px);
    border-color: var(--card-border) !important;
    transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) scale(var(--s));
    transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease,
        border-color 0.3s ease, box-shadow 0.4s ease, background-color 0.4s ease;
    /* staggered entrance */
    opacity: 0;
    animation: card-in 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    animation-delay: calc(var(--n) * 140ms + 1.2s);
}

@keyframes card-in {
    from {
        opacity: 0;
        transform: translateY(40px) scale(0.96);
    }

    to {
        opacity: 1;
        transform: perspective(900px) scale(1);
    }
}

.option-card.dim {
    --s: 0.975;
}

.option-card.dim:hover {
    border-color: color-mix(in srgb, var(--accent) 55%, var(--card-border)) !important;
}

.option-card.selected {
    --s: 1.02;
    border-color: transparent !important;
    background-color: color-mix(in srgb, var(--accent) 9%, var(--card-bg));
    box-shadow: 0 20px 50px -20px color-mix(in srgb, var(--accent) 60%, transparent);
}

/* Cursor spotlight, behind content */
.option-card::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
    background: radial-gradient(300px circle at var(--mx, 50%) var(--my, 50%),
            color-mix(in srgb, var(--accent) 20%, transparent),
            transparent 70%);
}

.option-card:hover::before {
    opacity: 1;
}

/* Spinning gradient ring */
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

.option-blurb {
    line-height: 1.5;
}

/* --- Previews ----------------------------------------------------------------- */
.preview {
    opacity: 0.55;
    filter: saturate(0.6);
    transition: opacity 0.4s ease, filter 0.4s ease;
}

.option-card.selected .preview,
.option-card:hover .preview {
    opacity: 1;
    filter: none;
}

/* Discovery chips take turns lighting up as "trending" */
.trend-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    color: var(--app-text);
    border: 1px solid var(--card-border);
    animation: lit 6s ease-in-out infinite;
    animation-delay: calc(var(--k) * 1.1s);
}

.chip-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--c);
}

.chip-up {
    font-size: 0.6rem;
    color: #3fb950;
    width: 0;
    overflow: hidden;
    opacity: 0;
    animation: lit-arrow 6s ease-in-out infinite;
    animation-delay: calc(var(--k) * 1.1s);
}

@keyframes lit {

    0%,
    22%,
    100% {
        border-color: var(--card-border);
        background-color: transparent;
        transform: none;
    }

    6%,
    16% {
        border-color: var(--c);
        background-color: color-mix(in srgb, var(--c) 18%, transparent);
        transform: translateY(-3px);
    }
}

@keyframes lit-arrow {

    0%,
    22%,
    100% {
        width: 0;
        opacity: 0;
    }

    6%,
    16% {
        width: 0.8rem;
        opacity: 1;
    }
}

/* My Project bars grow, hold, then fade and replay */
.bar-name {
    width: 76px;
}

.mini-track {
    height: 8px;
    background-color: var(--card-border);
    overflow: hidden;
}

.mini-fill {
    height: 100%;
    width: var(--w);
    background-color: var(--bc);
    transform-origin: left;
    animation: grow 5s cubic-bezier(0.22, 1, 0.36, 1) infinite;
    animation-delay: calc(var(--k) * 0.18s);
}

@keyframes grow {
    0% {
        transform: scaleX(0);
        opacity: 1;
    }

    30%,
    88% {
        transform: scaleX(1);
        opacity: 1;
    }

    100% {
        transform: scaleX(1);
        opacity: 0;
    }
}

/* --- Footer -------------------------------------------------------------------- */
.setup-footer {
    border-top: 1px solid var(--card-border);
    opacity: 0;
    animation: rise 0.7s ease 1.7s forwards;
}

.landing-text {
    color: var(--app-text);
}

.check path {
    stroke-dasharray: 20;
    stroke-dashoffset: 20;
    animation: draw 0.5s ease 0.15s forwards;
}

@keyframes draw {
    to {
        stroke-dashoffset: 0;
    }
}

.swap-enter-active,
.swap-leave-active {
    transition: opacity 0.2s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.swap-enter-from {
    opacity: 0;
    transform: translateY(10px);
}

.swap-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

/* Continue button: shine sweep + arrow nudge */
.continue-btn {
    position: relative;
    overflow: hidden;
    border-radius: 0.85rem;
    transition: transform 0.2s ease, box-shadow 0.3s ease;
}

.continue-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(100deg, transparent 30%, rgba(255, 255, 255, 0.35) 50%, transparent 70%);
    transform: translateX(-120%);
    animation: shine 4s ease-in-out 2.4s infinite;
}

@keyframes shine {

    0%,
    55% {
        transform: translateX(-120%);
    }

    100% {
        transform: translateX(120%);
    }
}

.continue-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 24px -10px rgba(59, 130, 246, 0.9);
}

.continue-btn:active:not(:disabled) {
    transform: translateY(0) scale(0.98);
}

.btn-arrow {
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.continue-btn:hover .btn-arrow {
    transform: translateX(4px);
}

/* --- Launch transition ------------------------------------------------------------ */
.warp {
    position: fixed;
    inset: 0;
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    background-color: var(--wc);
    clip-path: circle(0px at var(--wx) var(--wy));
    transition: clip-path 0.8s cubic-bezier(0.7, 0, 0.3, 1);
}

.warp.on {
    pointer-events: all;
    clip-path: circle(150vmax at var(--wx) var(--wy));
}

.warp-text {
    font-size: clamp(1.4rem, 4vw, 2.4rem);
    color: #0d1117;
    letter-spacing: -0.01em;
    opacity: 0;
    transform: translateY(14px);
    transition: opacity 0.4s ease 0.4s, transform 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.4s;
}

.warp.on .warp-text {
    opacity: 1;
    transform: none;
}

@media (prefers-reduced-motion: reduce) {

    .option-card,
    .intro-fade,
    .setup-footer {
        animation: none !important;
        opacity: 1;
    }

    .glow-border,
    .trend-chip,
    .chip-up,
    .mini-fill,
    .continue-btn::after,
    .radio-input:checked+.radio-dot::after {
        animation: none !important;
    }

    .warp,
    .warp-text {
        transition: none !important;
    }
}
</style>