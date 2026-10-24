<script setup>
defineProps({ small: Boolean })
defineEmits(['click'])
</script>

<template>
  <div class="shiny" :class="{ sm: small }">
    <button type="button" @click="$emit('click')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
      <span>Sign in with GitHub</span>
    </button>
  </div>
</template>

<style scoped>
.shiny { position: relative; display: inline-block; margin-top: 1.8rem; padding: 2px; border-radius: 14px; overflow: hidden; }
.shiny::before {
  content: ''; position: absolute; inset: -60%;
  background: conic-gradient(from 0deg, transparent 0 60%, var(--g3, #22d3ee), var(--g1, #8b5cf6), transparent);
  animation: bl-spin 3s linear infinite;
}
@keyframes bl-spin { to { transform: rotate(360deg); } }
.shiny button {
  position: relative; border: 0; cursor: pointer; font: 700 1.05rem system-ui; color: #fff;
  padding: 0.95rem 1.7rem; border-radius: 12px; background: linear-gradient(135deg, #1b1340, #10204f);
  display: inline-flex; align-items: center; gap: 0.6rem;
}
[data-bs-theme='light'] .shiny button { background: linear-gradient(135deg, #2a1b7a, #183c96); }
.shiny.sm { margin-top: 0; border-radius: 11px; }
.shiny.sm button { font-size: 14px; padding: 0.4rem 1.05rem; border-radius: 9px; }
</style>