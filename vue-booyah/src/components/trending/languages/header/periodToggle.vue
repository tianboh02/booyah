<!--
  src/components/trending/languages/header/periodToggle.vue

  What it does:  a pill-shaped toggle with a thumb that slides to the chosen option.
                 Works with v-model. Used for Daily / Weekly / Monthly (the top bar and the
                 compare popup) and for Downloads / Growth (the compare chart).
  Receives:      props  modelValue (the chosen option), periods (the options, in order),
                        labels (option → { label }), ariaLabel (for screen readers)
  Gives back:    emits  update:modelValue (the newly chosen option)
  Used by:       header/languageBar.vue and compare/compareView.vue.
-->
<script setup>
// ---------- Imports ----------
import { computed } from 'vue'

// ---------- Props & emits ----------
const props = defineProps({
  modelValue: { type: String, required: true },
  periods: { type: Array, required: true }, // the option values, in order
  labels: { type: Object, required: true }, // value → { label }
  ariaLabel: { type: String, default: 'Time period' },
})
const emit = defineEmits(['update:modelValue'])

// ---------- Computed values ----------
// Position of the chosen option (0, 1, 2…); the thumb's CSS slides by this many widths
const index = computed(() => Math.max(0, props.periods.indexOf(props.modelValue)))

// ---------- Functions ----------

/** ← → move the choice and keep keyboard focus on it (standard radio-group behaviour). */
function onKey(event) {
  let next
  if (event.key === 'ArrowRight') next = (index.value + 1) % props.periods.length
  else if (event.key === 'ArrowLeft')
    next = (index.value - 1 + props.periods.length) % props.periods.length
  else return
  event.preventDefault()
  emit('update:modelValue', props.periods[next])
  const buttons = event.currentTarget.querySelectorAll('button')
  if (buttons[next]) buttons[next].focus()
}
</script>

<template>
  <!-- The pill: a sliding thumb behind one button per option -->
  <div
    class="segmented"
    role="radiogroup"
    :aria-label="ariaLabel"
    :style="{ '--count': periods.length, '--index': index }"
    @keydown="onKey"
  >
    <span class="thumb"></span>
    <button
      v-for="p in periods"
      :key="p"
      type="button"
      role="radio"
      :aria-checked="modelValue === p"
      :tabindex="modelValue === p ? 0 : -1"
      :class="{ active: modelValue === p }"
      @click="$emit('update:modelValue', p)"
    >
      {{ labels[p].label }}
    </button>
  </div>
</template>

<style scoped>
/* ---------- Layout ---------- */
/* equal-width columns, one per option (--count is set in the template) */
.segmented {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--count), 1fr);
  padding: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--edge);
}

/* ---------- Components ---------- */
/* the thumb is one column wide and slides --index columns to the right */
.thumb {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  width: calc((100% - 6px) / var(--count));
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 22%, rgba(255, 255, 255, 0.04));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 55%, transparent);
  transform: translateX(calc(var(--index) * 100%));
  transition:
    transform 350ms var(--ease),
    background-color 400ms var(--ease);
}

button {
  position: relative;
  padding: 7px 16px;
  border: 0;
  background: none;
  color: var(--ink-2);
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 250ms var(--ease);
}

button.active {
  color: var(--ink);
}

/* ---------- Keyboard focus ---------- */
button:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
  border-radius: 999px;
}

/* ---------- Responsive (phone) ---------- */
/* a little less side padding so "Monthly" never touches the pill's edge */
@media (max-width: 575.98px) {
  button {
    padding: 7px 10px;
  }
}

/* ---------- Reduced motion ---------- */
@media (prefers-reduced-motion: reduce) {
  .thumb {
    transition: none;
  }
}
</style>
