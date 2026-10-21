<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    meta: { type: String, default: '' },
    // small number beside the title, e.g. '03'
    index: { type: String, default: '' },
    // colour of the rule under the title and the glyphs while they decode
    accent: { type: String, default: '#58a6ff' }
})

const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*$@!?/<>'
const randomGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]

// Split text into characters; spaces become non-breaking so inline-block masks keep them.
const chars = (text) => [...text].map((ch) => (ch === ' ' ? ' ' : ch))

// The title may wrap between words, so its non-breaking spaces render as normal ones.
const titleChar = (ch) => (ch === ' ' ? ' ' : ch)

// Long text never takes much over half a second to reveal.
const stagger = (text, max) => Math.min(max, 520 / Math.max(text.length, 1))

// --- Title: decode scramble -------------------------------------------------
// Every character cycles through random glyphs, then settles left to right.
const target = computed(() => chars(props.title))
const reduced = prefersReducedMotion()
const shown = ref(target.value.map((ch) => (reduced || ch === ' ' ? ch : randomGlyph())))
let timer = 0

onMounted(() => {
    if (reduced) return

    const start = performance.now()
    const settleStep = Math.min(45, 700 / Math.max(target.value.length, 1))

    timer = setInterval(() => {
        const elapsed = performance.now() - start
        let done = true

        shown.value = target.value.map((ch, i) => {
            if (ch === ' ' || elapsed > 180 + i * settleStep) return ch
            done = false
            return randomGlyph()
        })

        if (done) clearInterval(timer)
    }, 40)
})

onBeforeUnmount(() => clearInterval(timer))

// --- Subtitle and meta: unchanged rise / typewriter -------------------------
const subtitleChars = computed(() => chars(props.subtitle))
const metaChars = computed(() => chars(props.meta))

const subtitleStep = computed(() => stagger(props.subtitle, 16))
const metaStep = computed(() => stagger(props.meta, 18))
</script>

<template>
    <div class="ring-caption text-center pt-2" :style="{ '--accent': accent }">
        <div class="cap-head d-inline-flex align-items-start gap-2 mw-100">
            <span v-if="index" class="cap-index font-monospace text-muted-github" aria-hidden="true">{{ index }}</span>

            <div class="cap-title-wrap">
                <p class="cap-title font-monospace fw-bold mb-0" :title="title">
                    <span class="visually-hidden">{{ title }}</span>
                    <span aria-hidden="true"><span v-for="(ch, i) in shown" :key="i"
                            :class="{ 'is-noise': ch !== target[i] }">{{ titleChar(ch) }}</span></span>
                </p>
                <span class="cap-rule d-block" aria-hidden="true"></span>
            </div>
        </div>

        <p v-if="subtitle" class="cap-sub font-monospace mt-2 mb-0">
            <span class="visually-hidden">{{ subtitle }}</span>
            <span aria-hidden="true">
                <span v-for="(ch, i) in subtitleChars" :key="i" class="cap-mask"><span class="cap-ch"
                        :style="{ '--d': `${420 + i * subtitleStep}ms` }">{{ ch }}</span></span>
            </span>
        </p>

        <p v-if="meta" class="cap-meta text-muted-github font-monospace mt-2 mb-0">
            <span class="visually-hidden">{{ meta }}</span>
            <span aria-hidden="true">
                <span v-for="(ch, i) in metaChars" :key="i" class="cap-type"
                    :style="{ '--d': `${560 + i * metaStep}ms` }">{{ ch }}</span>
            </span>
        </p>
    </div>
</template>

<style scoped>
/* --- Title: decoding glyphs over an accent rule ------------------------------ */
.cap-title-wrap {
    min-width: 0;
}

.cap-title {
    font-size: clamp(1.4rem, 3.4vw, 2.6rem);
    line-height: 1.05;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--app-text);
    /* Wraps between words, balanced; only a very long name reaches the two-line ellipsis */
    text-wrap: balance;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
}

/* Characters still decoding take the accent colour. */
.is-noise {
    color: var(--accent);
    opacity: 0.85;
}

.cap-index {
    padding-top: 0.3rem;
    font-size: 0.8rem;
    letter-spacing: 0.15em;
}

.cap-rule {
    height: 2px;
    margin-top: 0.45rem;
    background: linear-gradient(90deg, var(--accent), transparent);
    transform-origin: left;
    animation: cap-draw 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both;
}

/* --- Subtitle: characters rise out of masks --------------------------------- */
.cap-sub {
    color: var(--app-text);
    font-size: clamp(0.8rem, 1.4vw, 1.05rem);
}

.cap-mask {
    display: inline-block;
    overflow: clip;
    vertical-align: top;
}

.cap-ch {
    display: inline-block;
    animation: cap-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: var(--d);
}

/* --- Meta: typewriter -------------------------------------------------------- */
.cap-meta {
    font-size: 0.65rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
}

.cap-type {
    display: inline-block;
    animation: cap-type 0.01s steps(1) both;
    animation-delay: var(--d);
}

@keyframes cap-draw {
    from {
        transform: scaleX(0);
    }

    to {
        transform: scaleX(1);
    }
}

@keyframes cap-rise {
    from {
        transform: translateY(140%);
    }

    to {
        transform: none;
    }
}

@keyframes cap-type {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

@media (prefers-reduced-motion: reduce) {

    .cap-rule,
    .cap-ch,
    .cap-type {
        animation: none !important;
    }
}
</style>
