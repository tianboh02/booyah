<script setup>
import GitHubSSO from './GitHubSSO.vue';


</script>

<template>
    <div class="landing-container my-2">
        <p class="tagline">For developers in Singapore</p>

        <h1 class="headline">
            Decide what to build or learn next, based on what developers are actually building, installing and hiring
            for.
        </h1>

        <p class="description">
            Booyah reads live signals from GitHub, Hacker News and the package registries, then points you at the skills
            and projects worth your time.
        </p>

        <GitHubSSO/>

        <p class="disclaimer">
            Booyah reads your repositories to tailor results, and makes data requests with your own GitHub account, so
            they count toward your GitHub usage limit.
        </p>
    </div>
</template>

<style scoped>
.landing-container {
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #ffffff;
    background-color: #0b0c0e;
    text-align: left;
}

.tagline {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.875rem;
    color: #6b8aff;
    margin-bottom: 1.5rem;
}

.headline {
    max-width: 870px;
    font-size: 3.75rem;
    font-weight: 600;
    line-height: 1.08;
    letter-spacing: -0.035em;
    color: #f3f4f6;
    margin-bottom: 1.75rem;
}

.description {
    font-size: 1.125rem;
    line-height: 1.5;
    color: #9ca3af;
    margin-bottom: 2rem;
    max-width: 580px;
}

.btn-github {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background-color: #3b82f6;
    color: #ffffff;
    font-size: 0.95rem;
    font-weight: 500;
    padding: 0.65rem 1.15rem;
    border-radius: 0.5rem;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s ease;
    margin-bottom: 1.5rem;
}

.btn-github:hover {
    background-color: #2563eb;
}

.disclaimer {
    font-size: 0.8rem;
    line-height: 1.4;
    color: #4b5563;
    max-width: 480px;
}
</style>
