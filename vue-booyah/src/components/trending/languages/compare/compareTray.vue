<!--
  src/components/trending/languages/compare/compareTray.vue

  What it does:  the bar that slides up from the bottom once a package is picked:
                   debug (JavaScript)  vs  serde (Rust)   [Clear] [Compare]
                 Each item has an × to remove it, and "Clear" empties the tray.
                 With 1 package picked, the 2nd slot shows the package the wheel is on (dashed,
                 "scroll to change") and follows the wheel as you scroll. Compare uses it straight
                 away; its "+" locks it in. "Compare" works once there are 2 (picked or suggested).
  Receives:      props  items (the picked packages: { id, name, registry, accent, languageId }),
                        limit (2), message (a short warning to show above the bar),
                        languages (the LANGUAGES list, to show each item's language name),
                        suggestion (the wheel's package offered as the 2nd pick, or null)
  Gives back:    emits  remove (an item's id), compare (open the compare view), clear (empty the tray),
                        pin (the suggested package's name, to lock it into the tray)
  Used by:       languagesSection.vue.
-->
<script setup>
// ---------- Imports ----------
import { computed } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { lineAccent } from '@/utils/trending/languages'

// ---------- Props & emits ----------
const props = defineProps({
  items: { type: Array, default: () => [] }, // [{ id, name, registry, accent, languageId }]
  limit: { type: Number, default: 2 },
  message: { type: String, default: '' },
  languages: { type: Array, required: true },
  suggestion: { type: Object, default: null }, // the wheel's package, offered as the 2nd pick
})
defineEmits(['remove', 'compare', 'clear', 'pin'])

const { theme } = useTheme() // 'dark' | 'light', from the navbar toggle

// ---------- Computed values ----------
const ready = computed(() => props.items.length === props.limit) // true once 2 are picked
// the suggested 2nd package is shown only while one slot is still empty
const showSuggestion = computed(() => !ready.value && props.suggestion !== null)
// Compare works with 2 picked, or 1 picked + the suggestion
const canCompare = computed(() => ready.value || showSuggestion.value)

// ---------- Functions ----------
/** A language's display name from its id, e.g. 'php' → 'PHP'. */
const languageName = (id) => (props.languages.find((l) => l.id === id) || {}).name

/** An item's dot/outline colour: its accent, darker on the light theme (see lineAccent()). */
const itemAccent = (item) => {
  const lang = props.languages.find((l) => l.id === item.languageId)
  return lang ? lineAccent(lang, theme.value) : item.accent
}
</script>

<template>
  <Transition name="tray">
    <div v-if="items.length" class="tray position-fixed d-flex flex-column align-items-center pe-none" role="region"
      aria-label="Compare tray">
      <!-- Short warning above the bar, e.g. "Compare holds 2 packages…" -->
      <Transition name="msg">
        <p v-if="message" class="tray-msg m-0 mb-2 pe-auto mw-100 text-center" role="status">{{ message }}</p>
      </Transition>

      <div class="tray-inner d-flex align-items-center flex-wrap justify-content-center pe-auto mw-100">
        <!-- The picked packages ("vs" between them), or a hint to pick one more -->
        <TransitionGroup name="item" tag="ul"
          class="tray-items d-flex align-items-center flex-wrap m-0 list-unstyled min-w-0">
          <li v-for="(item, i) in items" :key="item.id" class="entry d-flex align-items-center min-w-0">
            <span v-if="i > 0" class="vs text-muted-github fw-semibold">vs</span>
            <span
              class="item d-flex align-items-center min-w-0 rounded-pill"
              :style="{ '--item-accent': itemAccent(item), '--item-fill': item.accent }"
            >
              <span class="item-dot flex-shrink-0 rounded-circle"></span>
              <span class="item-name text-truncate font-monospace">{{ item.name }}</span>
              <span class="item-lang text-muted-github text-nowrap">({{ languageName(item.languageId) }})</span>
              <button
                type="button"
                class="remove d-grid p-0 border-0 rounded-circle fs-6 lh-1"
                :aria-label="`Remove ${item.name} from compare`"
                @click="$emit('remove', item.id)"
              >
                ×
              </button>
            </span>
          </li>
          <!-- The 2nd slot, filled from the wheel: changes as you scroll, "+" locks it in -->
          <li v-if="showSuggestion" key="suggestion" class="entry d-flex align-items-center min-w-0">
            <span class="vs text-muted-github fw-semibold">vs</span>
            <span
              class="item suggested d-flex align-items-center min-w-0 rounded-pill"
              :style="{ '--item-accent': itemAccent(suggestion), '--item-fill': suggestion.accent }"
              title="Follows the package selected in the wheel"
            >
              <span class="item-dot flex-shrink-0 rounded-circle"></span>
              <span class="item-name text-truncate font-monospace" aria-live="polite">{{ suggestion.name }}</span>
              <span class="item-lang text-muted-github text-nowrap">({{ languageName(suggestion.languageId) }})</span>
              <span class="item-hint d-none d-sm-inline text-nowrap" aria-hidden="true">↕ scroll to change</span>
              <button
                type="button"
                class="remove d-grid p-0 border-0 rounded-circle fs-6 fw-bold lh-1"
                :aria-label="`Keep ${suggestion.name} as the second package`"
                title="Keep this one"
                @click="$emit('pin', suggestion.name)"
              >
                +
              </button>
            </span>
          </li>
          <li v-else-if="!ready" key="hint" class="hint text-muted-github">
            Scroll the wheel to pick a second package
          </li>
        </TransitionGroup>

        <!-- Clear + Compare buttons -->
        <div class="tray-actions d-flex gap-2">
          <button
            type="button"
            class="clear fw-semibold"
            aria-label="Clear all packages from compare"
            @click="$emit('clear')"
          >
            Clear
          </button>
          <button type="button" class="go border-0 fw-bold" :disabled="!canCompare" @click="$emit('compare')">
            Compare
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ---------- Layout ----------
   The outer .tray is fixed to the bottom of the window and lets clicks pass through;
   only the bar itself (.tray-inner) takes clicks. */
.tray {
  left: 16px;
  right: 16px;
  bottom: 16px;
  z-index: 1040;
}

.tray-inner {
  gap: 10px 14px;
  padding: 10px 10px 10px 16px;
  border: 1px solid var(--edge);
  border-radius: 18px;
  background: color-mix(in srgb, var(--card) 92%, transparent);
  box-shadow:
    0 18px 50px color-mix(in srgb, var(--shadow) 55%, transparent),
    0 0 0 1px color-mix(in srgb, var(--ink) 2%, transparent) inset;
  backdrop-filter: blur(14px);
}

/* ---------- Components: picked packages ---------- */
.tray-items {
  gap: 8px 10px;
}

.entry {
  gap: 10px;
}

.item {
  gap: 6px;
  padding: 4px 4px 4px 10px;
  border: 1px solid color-mix(in srgb, var(--item-accent) 45%, transparent);
  background: color-mix(in srgb, var(--item-accent) 10%, transparent);
}

.item-dot {
  width: 8px;
  height: 8px;
  background: var(--item-accent);
  box-shadow: 0 0 8px var(--item-accent);
}

/* light theme: no coloured glow (it smudges on white) */
:root[data-bs-theme='light'] .item-dot {
  box-shadow: none;
}

.item-name {
  max-width: 22ch;
  color: var(--ink);
  font-size: 0.88rem;
}

.item-lang {
  font-size: 0.8rem;
}

.remove {
  place-items: center;
  width: 24px;
  height: 24px;
  background: color-mix(in srgb, var(--ink) 6%, transparent);
  color: var(--ink-2);
  cursor: pointer;
  transition:
    background-color 200ms var(--ease),
    color 200ms var(--ease);
}

.remove:hover {
  background: color-mix(in srgb, var(--ink) 14%, transparent);
  color: var(--ink);
}

/* light theme: a stronger tint of the bright accent (--item-fill), so the picked packages
   stand out from the white tray; the outline and dot keep the darker --item-accent */
:root[data-bs-theme='light'] .item {
  background: color-mix(in srgb, var(--item-fill) 26%, transparent);
}

:root[data-bs-theme='light'] .item.suggested {
  background: color-mix(in srgb, var(--item-fill) 10%, transparent);
}

/* the suggested 2nd package: dashed outline so it reads as "not locked in yet" */
.item.suggested {
  border-style: dashed;
  background: color-mix(in srgb, var(--item-accent) 5%, transparent);
}

.item-hint {
  color: var(--ink-3);
  font-size: 0.72rem;
}

.vs {
  font-size: 0.8rem;
}

.hint {
  font-size: 0.82rem;
}

/* ---------- Components: buttons and message ---------- */
.clear {
  padding: 8px 14px;
  border: 1px solid var(--edge);
  border-radius: 12px;
  background: transparent;
  color: var(--ink-2);
  cursor: pointer;
  transition:
    background-color 200ms var(--ease),
    color 200ms var(--ease);
}

.clear:hover {
  background: color-mix(in srgb, var(--ink) 8%, transparent);
  color: var(--ink);
}

.go {
  padding: 8px 18px;
  border-radius: 12px;
  background: var(--ink);
  color: var(--bg);
  cursor: pointer;
  transition:
    opacity 200ms var(--ease),
    transform 200ms var(--ease);
}

.go:hover:not(:disabled) {
  transform: translateY(-1px);
}

.go:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.tray-msg {
  width: fit-content;
  padding: 6px 12px;
  border: 1px solid color-mix(in srgb, var(--down) 45%, transparent);
  border-radius: 10px;
  background: var(--error-bg);
  color: var(--error-ink);
  font-size: 0.82rem;
}

/* ---------- Animations (Vue <Transition> classes) ----------
   tray  the bar slides up / down     item  packages pop in and out     msg  the warning fades */
.tray-enter-active,
.tray-leave-active {
  transition:
    transform 400ms var(--ease),
    opacity 400ms var(--ease);
}

.tray-enter-from,
.tray-leave-to {
  opacity: 0;
  transform: translateY(24px);
}

.item-enter-active,
.item-leave-active {
  transition:
    opacity 250ms var(--ease),
    transform 250ms var(--ease);
}

.item-enter-from,
.item-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.item-leave-active {
  position: absolute;
}

.item-move {
  transition: transform 250ms var(--ease);
}

.msg-enter-active,
.msg-leave-active {
  transition:
    opacity 200ms var(--ease),
    transform 200ms var(--ease);
}

.msg-enter-from,
.msg-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

/* ---------- Keyboard focus ---------- */
button:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}

/* ---------- Responsive (phone): full-width bar, Compare stretches ---------- */
@media (max-width: 575.98px) {
  .tray {
    left: 10px;
    right: 10px;
    bottom: 10px;
  }

  .tray-inner {
    width: 100%;
    padding: 10px;
  }

  .item-name {
    max-width: 14ch;
  }

  .tray-actions {
    width: 100%;
  }

  .go {
    flex: 1;
  }
}

/* ---------- Reduced motion ---------- */
@media (prefers-reduced-motion: reduce) {
  .tray-enter-active,
  .tray-leave-active,
  .item-enter-active,
  .item-leave-active,
  .item-move,
  .msg-enter-active,
  .msg-leave-active,
  .remove,
  .clear,
  .go {
    transition: none;
  }
}
</style>
