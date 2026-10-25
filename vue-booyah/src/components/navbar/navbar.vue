<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import defaultAvatar from '@/assets/login.png'
import logoSvg from '@/assets/booyah-logo1.png'
import ThemeToggle from '@/components/navbar/themeToggle.vue'
import { useTheme } from '@/composables/useTheme'
import ShinyButton from '../landing/ShinyButton.vue'
import { redirectToGitHub } from '@/composables/useGitHubLogin'
import { navHidden } from '@/composables/useLandingNav'

const route = useRoute()
const router = useRouter()
const { initTheme } = useTheme()

const isLogin = ref(false)
const currentUser = ref({})
const menuEl = ref(null)

const checkAuth = () => {
    const token = localStorage.getItem('auth_token')
    const userStr = localStorage.getItem('user')

    if (token && userStr) {
        isLogin.value = true
        try {
            currentUser.value = JSON.parse(userStr)
        } catch (e) {
            currentUser.value = {}
        }
    } else {
        isLogin.value = false
        currentUser.value = {}
    }
}

// Check auth synchronously immediately during component setup (before DOM render)
checkAuth()

const userAvatar = computed(() => currentUser.value.avatar || defaultAvatar)
const userHandle = computed(() => currentUser.value.name || 'User')
const userExperience = computed(() => currentUser.value.experience || 'Newcomer')
const showNav = computed(() => isLogin.value && route.path !== '/setup')

// Only show login button if user is NOT logged in and on landing page
const showLogin = computed(() => !isLogin.value && route.path === '/')

function closeMenu() {
    if (menuEl.value && menuEl.value.classList.contains('show')) {
        if (window.bootstrap?.Collapse) {
            const bsCollapse = window.bootstrap.Collapse.getInstance(menuEl.value) || new window.bootstrap.Collapse(menuEl.value, { toggle: false })
            bsCollapse.hide()
        } else {
            menuEl.value.classList.remove('show')
        }
    }
}

onMounted(() => {
    initTheme()
    window.addEventListener('booyah:user-updated', checkAuth)
})

onBeforeUnmount(() => {
    window.removeEventListener('booyah:user-updated', checkAuth)
})

watch(
    () => route.path,
    () => {
        checkAuth()
        closeMenu()
    }
)

function logout() {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    isLogin.value = false
    currentUser.value = {}
    router.push('/')
}
</script>

<template>
    <header class="sticky-top app-header border-bottom mb-3"
        :class="{ 'is-landing': showLogin, 'nav-hidden': showLogin && navHidden }">
        <nav class="navbar navbar-expand-lg px-3 px-md-5 py-3">
            <div class="container-fluid px-0 d-flex align-items-center justify-content-between">

                <!-- Logo -->
                <RouterLink to="/" class="navbar-brand me-3 me-lg-4 p-0 d-flex align-items-center">
                    <img class="rounded-3" :src="logoSvg" width="32" height="32" alt="booyah logo" />
                </RouterLink>

                <!-- Navigation Links -->
                <div v-if="showNav" ref="menuEl" class="collapse navbar-collapse order-3 order-lg-1 mt-2 mt-lg-0"
                    id="navbarSupportedContent">
                    <ul class="navbar-nav me-auto gap-1 align-items-lg-center p-3 p-lg-0 mobile-menu-card">
                        <li class="nav-item">
                            <RouterLink to="/discovery" class="nav-link custom-nav-link text-nowrap rounded-3 px-3 py-2"
                                active-class="active">Discovery</RouterLink>
                        </li>
                        <li class="nav-item">
                            <RouterLink to="/trending" class="nav-link custom-nav-link text-nowrap rounded-3 px-3 py-2"
                                active-class="active">Trending</RouterLink>
                        </li>
                        <li class="nav-item">
                            <RouterLink to="/learn" class="nav-link custom-nav-link text-nowrap rounded-3 px-3 py-2"
                                active-class="active">Learn</RouterLink>
                        </li>
                        <li class="nav-item">
                            <RouterLink to="/jobs" class="nav-link custom-nav-link text-nowrap rounded-3 px-3 py-2"
                                active-class="active">Jobs</RouterLink>
                        </li>
                        <li class="nav-item">
                            <RouterLink to="/my-projects" class="nav-link custom-nav-link text-nowrap rounded-3 px-3 py-2"
                                active-class="active">My Projects</RouterLink>
                        </li>
                        <li class="nav-item">
                            <RouterLink to="/saved-projects" class="nav-link custom-nav-link text-nowrap rounded-3 px-3 py-2"
                                active-class="active">Saved</RouterLink>
                        </li>
                    </ul>
                </div>

                <!-- Right Actions Group -->
                <div class="d-flex align-items-center gap-3 order-2 ms-auto">
                    <div v-if="showLogin" class="d-flex align-items-center py-1">
                        <ShinyButton small @click="redirectToGitHub" />
                    </div>

                    <ThemeToggle />

                    <!-- User Profile Dropdown -->
                    <div v-if="showNav" class="dropdown d-flex align-items-center">
                        <button type="button"
                            class="avatar-btn d-inline-flex align-items-center gap-2 rounded-pill ps-1 pe-2 py-1 text-decoration-none border-0"
                            id="profileDropdown" data-bs-toggle="dropdown" aria-expanded="false" title="Account menu">
                            <img class="rounded-circle object-fit-cover avatar-img" :src="userAvatar" width="32"
                                height="32" alt="profile pic" />

                            <svg class="avatar-chevron" width="12" height="12" viewBox="0 0 16 16" fill="none"
                                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                                aria-hidden="true">
                                <path d="M4 6l4 4 4-4" />
                            </svg>
                        </button>

                        <ul class="dropdown-menu dropdown-menu-end shadow-lg p-2 mt-2 custom-dropdown-menu"
                            aria-labelledby="profileDropdown">
                            <!-- Header Section -->
                            <li class="p-1 mb-1">
                                <div class="user-profile-header p-2 rounded-3 d-flex align-items-center gap-2">
                                    <img class="rounded-circle object-fit-cover flex-shrink-0" :src="userAvatar"
                                        width="38" height="38" alt="user avatar" />
                                    <div class="d-flex flex-column flex-grow-1 min-w-0">
                                        <div class="fw-bold header-user-name text-truncate small fs-6 mb-1"
                                            :title="userHandle">{{
                                            userHandle }}</div>
                                        <div class="d-flex align-items-center gap-1">
                                            <span class="experience-badge badge rounded-pill px-2 py-1 small fw-normal">
                                                ✨ {{ userExperience }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </li>

                            <li>
                                <hr class="dropdown-divider my-2 border-secondary opacity-25" />
                            </li>

                            <!-- Menu Items -->
                            <li>
                                <RouterLink to="/settings"
                                    class="dropdown-item rounded-2 d-flex align-items-center gap-2 py-2 px-3 custom-dropdown-item"
                                    active-class="active">
                                    <svg class="flex-shrink-0" width="16" height="16" viewBox="0 0 16 16"
                                        fill="currentColor" aria-hidden="true">
                                        <path
                                            d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z" />
                                        <path
                                            d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.185 1.185l-.159.291a1.873 1.873 0 0 0 1.116 2.693l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.693-1.115l-.291.16c-.764.415-1.6-.42-1.185-1.185l.159-.291a1.873 1.873 0 0 0-1.116-2.693l-.318-.094c-.835-.246-.835-1.428 0-1.674l.319-.094a1.873 1.873 0 0 0 1.115-2.693l-.16-.291c-.415-.764.42-1.6 1.185-1.184l.291.159a1.873 1.873 0 0 0 2.693-1.116l.094-.318z" />
                                    </svg>
                                    Settings
                                </RouterLink>
                            </li>

                            <li>
                                <a class="dropdown-item rounded-2 d-flex align-items-center gap-2 py-2 px-3 cursor-pointer logout-item"
                                    @click="logout()">
                                    <svg class="flex-shrink-0" width="16" height="16" viewBox="0 0 16 16" fill="none"
                                        stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
                                        stroke-linejoin="round" aria-hidden="true">
                                        <path
                                            d="M6 14H3.333A1.333 1.333 0 012 12.667V3.333A1.333 1.333 0 013.333 2H6" />
                                        <path d="M10.667 11.333L14 8l-3.333-3.333" />
                                        <path d="M14 8H6" />
                                    </svg>
                                    Log out
                                </a>
                            </li>
                        </ul>
                    </div>

                    <!-- Mobile Toggler -->
                    <button v-if="showNav" class="navbar-toggler border-0 shadow-none p-1 ms-1 d-lg-none" type="button"
                        data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent"
                        aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                </div>

            </div>
        </nav>
    </header>
</template>

<style scoped>
.app-header {
    background-color: var(--app-bg);
    border-color: var(--card-border) !important;
    transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.45s;
    overflow: visible;
}

.app-header.is-landing {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
}

.app-header.nav-hidden {
    transform: translateY(-110%);
}

.app-header .navbar-collapse.collapse {
    visibility: visible;
}

.header-user-name {
    color: var(--app-text);
}

.dropdown-toggle-no-caret::after {
    display: none !important;
}

/* Avatar Button Styles */
.avatar-btn {
    cursor: pointer;
    background-color: color-mix(in srgb, var(--card-bg) 60%, transparent);
    border: 1px solid var(--card-border) !important;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.avatar-btn:hover {
    background-color: var(--card-bg);
    border-color: color-mix(in srgb, var(--app-text) 30%, transparent) !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.avatar-btn:active,
.avatar-btn[aria-expanded="true"] {
    transform: translateY(0);
    border-color: #58a6ff !important;
    background-color: color-mix(in srgb, #58a6ff 12%, var(--card-bg));
    box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.25);
}

.avatar-chevron {
    color: var(--app-text);
    opacity: 0.6;
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease, color 0.2s ease;
}

.avatar-btn:hover .avatar-chevron {
    opacity: 1;
}

.avatar-btn[aria-expanded="true"] .avatar-chevron {
    transform: rotate(180deg);
    opacity: 1;
    color: #58a6ff;
}

/* Custom Dropdown Overrides */
/* fixed width so a long display name truncates with … instead of stretching the menu */
.custom-dropdown-menu {
    width: 210px;
    background-color: var(--card-bg);
    border: 1px solid var(--card-border);
}

.user-profile-header {
    background-color: color-mix(in srgb, var(--app-text) 5%, var(--card-bg));
    border: 1px solid color-mix(in srgb, var(--app-text) 8%, transparent);
}

.experience-badge {
    background-color: color-mix(in srgb, #58a6ff 15%, transparent);
    color: #58a6ff;
    border: 1px solid color-mix(in srgb, #58a6ff 35%, transparent);
    font-size: 0.7rem;
}

.custom-dropdown-item {
    color: var(--app-text);
    transition: background-color 0.15s ease, color 0.15s ease;
}

.custom-dropdown-item:hover,
.custom-dropdown-item:focus {
    background-color: color-mix(in srgb, var(--app-text) 10%, transparent);
    color: var(--app-text);
}

.custom-dropdown-item.active,
.custom-dropdown-item:active {
    background-color: color-mix(in srgb, var(--app-text) 16%, transparent) !important;
    color: var(--app-text) !important;
    font-weight: 600;
}

/* Red Log Out Button Style */
.logout-item {
    color: #f85149 !important;
    transition: background-color 0.15s ease, color 0.15s ease;
}

.logout-item:hover,
.logout-item:focus {
    background-color: rgba(248, 81, 73, 0.12) !important;
    color: #ff6b6b !important;
}

/* Nav Link Design */
.custom-nav-link {
    color: var(--app-text);
    opacity: 0.75;
    font-weight: 500;
    font-size: 0.925rem;
    border: 1px solid transparent;
    transition: all 0.2s ease;
}

.custom-nav-link:hover {
    opacity: 1;
    color: var(--app-text);
    background-color: color-mix(in srgb, var(--card-bg) 60%, transparent);
}

.custom-nav-link.active {
    opacity: 1;
    color: var(--app-text);
    background-color: var(--card-bg);
    border-color: var(--card-border);
}

.cursor-pointer {
    cursor: pointer;
}

@media (max-width: 991.98px) {
    .mobile-menu-card {
        background-color: var(--card-bg);
        border: 1px solid var(--card-border);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        border-radius: 0.75rem !important;
    }
}
</style>