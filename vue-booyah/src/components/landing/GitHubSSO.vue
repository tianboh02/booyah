<script setup>
const VITE_GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;

const redirectToGitHub = () => {
    console.log(VITE_GITHUB_CLIENT_ID)
    const rootUrl = 'https://github.com/login/oauth/authorize';
    const options = {
        client_id: VITE_GITHUB_CLIENT_ID,
        scope: 'read:user user:email repo', // Request access permissions
    };

    const q = new URLSearchParams(options).toString();
    window.location.href = `${rootUrl}?${q}`;
};
</script>

<template>
    <button
        class="github-sso-btn btn text-white d-inline-flex align-items-center justify-content-center gap-2 px-4 py-2 rounded-2 fw-semibold"
        @click="redirectToGitHub" type="button">
        <!-- Official GitHub SVG Icon -->
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path fill-rule="evenodd" clip-rule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
        <span style="font-size: 14px; letter-spacing: -0.01em; line-height: 20px;">Sign in with GitHub</span>
    </button>
</template>

<style scoped>
.github-sso-btn {
    background-color: #24292f;
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Micro-interaction animation states */
.github-sso-btn:hover {
    background-color: #32383f;
    border-color: rgba(255, 255, 255, 0.3) !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transform: translateY(-1px);
}

.github-sso-btn:active {
    background-color: #1b1f23;
    border-color: rgba(255, 255, 255, 0.1) !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    transform: translateY(0);
}
</style>