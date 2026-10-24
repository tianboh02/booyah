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

const userAvatar = computed(() => currentUser.value.avatar || defaultAvatar)
const userHandle = computed(() => currentUser.value.name || 'User')
const userExperience = computed(() => currentUser.value.experience || 'Newcomer')
const showNav = computed(() => isLogin.value && route.path !== '/setup')
const showLogin = computed(() => route.path == '/')

onMounted(() => {
    initTheme()
    checkAuth()
    window.addEventListener('booyah:user-updated', checkAuth)
})

onBeforeUnmount(() => {
    window.removeEventListener('booyah:user-updated', checkAuth)
})

watch(
    () => route.path,
    () => {
        checkAuth()
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
    <header class="sticky-top app-header border-bottom mb-3" :class="{ 'is-landing': showLogin, 'nav-hidden': showLogin && navHidden }">
        <nav class="navbar navbar-expand-md px-4 px-md-5">
            <!-- Logo -->
            <div class="navbar-brand me-auto me-md-4">
                <img class="rounded-4" :src="logoSvg" width="30" height="30" alt="booyah logo" />
            </div>

            <div v-if="showNav" class="collapse navbar-collapse mt-2 mt-md-0" id="navbarSupportedContent">
                <ul class="navbar-nav me-auto gap-1">
                    <li class="nav-item">
                        <RouterLink to="/discovery" class="nav-link custom-nav-link rounded-3 px-3 py-2"
                            active-class="active">Discovery</RouterLink>
                    </li>
                    <li class="nav-item">
                        <RouterLink to="/trending" class="nav-link custom-nav-link rounded-3 px-3 py-2"
                            active-class="active">Trending</RouterLink>
                    </li>
                    <li class="nav-item">
                        <RouterLink to="/jobs" class="nav-link custom-nav-link rounded-3 px-3 py-2"
                            active-class="active">Jobs</RouterLink>
                    </li>
                    <li class="nav-item">
                        <RouterLink to="/my-projects" class="nav-link custom-nav-link rounded-3 px-3 py-2"
                            active-class="active">My Project</RouterLink>
                    </li>
                    <li class="nav-item">
                        <RouterLink to="/saved-projects" class="nav-link custom-nav-link rounded-3 px-3 py-2"
                            active-class="active">Saved</RouterLink>
                    </li>
                </ul>
            </div>

            <!-- Right Side Controls (Always Visible) -->
            <div class="d-flex align-items-center gap-3 ms-auto">
                <!-- Theme Toggle Switch (Always Visible) -->
                <div v-if="showLogin">
                    <ShinyButton small @click="redirectToGitHub" />
                </div>
                <ThemeToggle />

                <!-- User Profile Dropdown (Logged In Only) -->
                <div v-if="showNav" class="dropdown">
                    <a href="#" class="d-block text-decoration-none dropdown-toggle-no-caret" id="profileDropdown"
                        data-bs-toggle="dropdown" aria-expanded="false">
                        <img class="rounded-4" :src="userAvatar" width="40" height="40" alt="profile pic" />
                    </a>

                    <ul class="dropdown-menu dropdown-menu-end shadow p-2" aria-labelledby="profileDropdown">
                        <li class="px-3 py-2">
                            <div class="fw-bold header-user-name">{{ userHandle }}</div>
                            <div class="text-muted-github small">{{ userExperience }}</div>
                        </li>
                        <li>
                            <hr class="dropdown-divider my-2" />
                        </li>
                        <li>
                            <RouterLink to="/settings"
                                class="dropdown-item rounded-2 d-flex align-items-center gap-2 py-2"
                                active-class="active">
                                Settings
                            </RouterLink>
                        </li>
                        <li>
                            <a class="dropdown-item rounded-2 d-flex align-items-center gap-2 py-2 cursor-pointer"
                                @click="logout()">
                                Log out
                            </a>
                        </li>
                    </ul>
                </div>

                <!-- Mobile Toggler Hamburger Button (Logged In Only) -->
                <button v-if="showNav" class="navbar-toggler border-0 shadow-none p-1 d-md-none" type="button"
                    data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent"
                    aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>
            </div>
        </nav>
    </header>
</template>

<style scoped>
.app-header {
    background-color: var(--app-bg);
    border-color: var(--card-border) !important;
    transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.45s;
}

.app-header.is-landing { position: fixed; top: 0; left: 0; right: 0; }
.app-header.nav-hidden { transform: translateY(-110%); } 
/* Tailwind also has a class called .collapse (visibility: collapse), and it picks up
   Bootstrap's "collapse navbar-collapse" menu. That hides the page links even though
   Bootstrap is showing them. This puts the visibility back. The menu still opens and
   closes normally on mobile, because Bootstrap does that with display, not visibility. */
.app-header .navbar-collapse.collapse {
    visibility: visible;
}

.header-user-name {
    color: var(--app-text);
}

.dropdown-toggle-no-caret::after {
    display: none !important;
}

.custom-nav-link {
    color: var(--app-text);
    opacity: 0.8;
    transition: all 0.2s ease;
}

.custom-nav-link:hover,
.custom-nav-link.active {
    opacity: 1;
    background-color: var(--card-bg);
    color: var(--app-text);
}

.cursor-pointer {
    cursor: pointer;
}
</style>