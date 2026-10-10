<script setup>

const VITE_GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;

const redirectToGitHub = () => {
    console.log(VITE_GITHUB_CLIENT_ID)
    const rootUrl = 'https://github.com/login/oauth/authorize';
    const options = {
        client_id: VITE_GITHUB_CLIENT_ID,
        scope: 'read:user user:email', // Request access permissions
    };

    const q = new URLSearchParams(options).toString();
    window.location.href = `${rootUrl}?${q}`;
};
</script>

<template>
    <button class="btn-github" @click="redirectToGitHub">
        Sign in with GitHub
    </button>
</template>

<style scoped></style>
