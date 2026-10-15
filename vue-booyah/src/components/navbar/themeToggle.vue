<script setup>
import { useTheme } from '@/composables/useTheme'
const { theme, toggleTheme } = useTheme()
</script>

<template>
    <button @click="toggleTheme" type="button" class="btn p-1 rounded-pill d-inline-flex align-items-center border"
        :class="theme === 'dark' ? 'bg-dark border-secondary' : 'bg-white border-secondary-subtle'"
        style="width: 56px; height: 32px;" :title="`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`">
        <span class="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
            :class="theme === 'dark' ? 'bg-white text-dark' : 'bg-dark text-white'" :style="{
                width: '22px',
                height: '22px',
                transform: theme === 'light' ? 'translateX(24px)' : 'translateX(0)',
                transition: 'all 0.25s ease'
            }">
            <svg v-if="theme === 'dark'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.5">
                <circle cx="12" cy="12" r="4" />
                <path
                    d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
            <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
        </span>
    </button>
</template>