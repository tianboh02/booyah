<!--
  src/components/trending/languages/compare/compareTray.vue

  What it does:  the bar that slides up from the bottom once a package is picked:
                   debug (JavaScript)  vs  serde (Rust)   [Clear] [Compare]
                 Each item has an × to remove it, and "Clear" empties the tray.
                 "Compare" only works when the tray is full (2 packages).
  Receives:      props  items (the picked packages: { id, name, registry, accent, languageId }),
                        limit (2), message (a short warning to show above the bar),
                        languages (the LANGUAGES list, to show each item's language name)
  Gives back:    emits  remove (an item's id), compare (open the compare view), clear (empty the tray)
  Used by:       languagesSection.vue.
-->
<script setup>
// ---------- Imports ----------
import { computed } from 'vue'

// ---------- Props & emits ----------
const props = defineProps({
  items: { type: Array, default: () => [] }, // [{ id, name, registry, accent, languageId }]
  limit: { type: Number, default: 2 },
  message: { type: String, default: '' },
  languages: { type: Array, required: true },
})
defineEmits(['remove', 'compare', 'clear'])

// ---------- Computed values ----------
const ready = computed(() => props.items.length === props.limit) // true once 2 are picked

// ---------- Functions ----------
/** A language's display name from its id, e.g. 'php' → 'PHP'. */
const languageName = (id) => (props.languages.find((l) => l.id === id) || {}).name
</script>

<template>
  <Transition name="tray">
    <div v-if="items.length" class="tray" role="region" aria-label="Compare tray">
      <!-- Short warning above the bar, e.g. "Compare holds 2 packages…" -->
      <Transition name="msg">
        <p v-if="message" class="tray-msg" role="status">{{ message }}</p>
      </Transition>

      <div class="tray-inner">
        <!-- The picked packages ("vs" between them), or a hint to pick one more -->
        <TransitionGroup name="item" tag="ul" class="tray-items">
          <li v-for="(item, i) in items" :key="item.id" class="entry">
            <span v-if="i > 0" class="vs">vs</span>
            <span class="item" :style="{ '--item-accent': item.accent }">
              <span class="item-dot"></span>
              <span class="item-name">{{ item.name }}</span>
              <span class="item-lang">({{ languageName(item.languageId) }})</span>
              <button
                type="button"
                class="remove"
                :aria-label="`Remove ${item.name} from compare`"
                @click="$emit('remove', item.id)"
              >
                ×
              </button>
            </span>
          </li>
          <li v-if="!ready" key="hint" class="hint">Pick one more to compare</li>
        </TransitionGroup>

        <!-- Clear + Compare buttons -->
        <div class="tray-actions">
          <button
            type="button"
            class="clear"
            aria-label="Clear all packages from compare"
            @click="$emit('clear')"
          >
            Clear
          </button>
          <button type="button" class="go" :disabled="!ready" @click="$emit('compare')">
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
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: 16px;
  z-index: 1040;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none; /* only the bar itself takes clicks */
}

.tray-inner {
  pointer-events: auto;
  max-width: 100%;
  display: flex;
  align-items: center;
  gap: 10px 14px;
  flex-wrap: wrap;
  justify-content: center;
  padding: 10px 10px 10px 16px;
  border: 1px solid var(--edge);
  border-radius: 18px;
  background: rgba(14, 16, 20, 0.92);
  box-shadow:
    0 18px 50px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(255, 255, 255, 0.02) inset;
  backdrop-filter: blur(14px);
}

/* ---------- Components: picked packages ---------- */
.tray-items {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  min-width: 0;
}

.entry {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.item {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 4px 4px 4px 10px;
  border: 1px solid color-mix(in srgb, var(--item-accent) 45%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--item-accent) 10%, transparent);
}

.item-dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--item-accent);
  box-shadow: 0 0 8px var(--item-accent);
}

.item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 22ch;
  color: var(--ink);
  font-family: var(--font-code);
  font-size: 0.88rem;
}

.item-lang {
  color: var(--ink-2);
  font-size: 0.8rem;
  white-space: nowrap;
}

.remove {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  color: var(--ink-2);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  transition:
    background-color 200ms var(--ease),
    color 200ms var(--ease);
}

.remove:hover {
  background: rgba(255, 255, 255, 0.14);
  color: var(--ink);
}

.vs {
  color: var(--ink-2);
  font-size: 0.8rem;
  font-weight: 600;
}

.hint {
  color: var(--ink-2);
  font-size: 0.82rem;
}

/* ---------- Components: buttons and message ---------- */
.tray-actions {
  display: flex;
  gap: 8px;
}

.clear {
  padding: 8px 14px;
  border: 1px solid var(--edge);
  border-radius: 12px;
  background: transparent;
  color: var(--ink-2);
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 200ms var(--ease),
    color 200ms var(--ease);
}

.clear:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--ink);
}

.go {
  padding: 8px 18px;
  border: 0;
  border-radius: 12px;
  background: var(--ink);
  color: var(--bg);
  font-weight: 700;
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
  margin: 0 0 8px;
  pointer-events: auto;
  width: fit-content;
  max-width: 100%;
  padding: 6px 12px;
  border: 1px solid color-mix(in srgb, var(--down) 45%, transparent);
  border-radius: 10px;
  background: rgba(40, 14, 14, 0.95);
  color: #ffb3ad;
  font-size: 0.82rem;
  text-align: center;
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
