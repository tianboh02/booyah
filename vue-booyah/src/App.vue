<script setup>
import { useRoute, useRouter, RouterLink, RouterView } from 'vue-router'
import { onMounted, ref, watch, computed } from 'vue'
import defaultAvatar from './assets/login.png'

const route = useRoute()
const router = useRouter()

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
const userHandle = computed(() => currentUser.value.username || 'User')
const userExperience = computed(() => currentUser.value.experience || 'New')

// Shows navigation only when logged in AND not on the setup page
const showNav = computed(() => isLogin.value && route.path !== '/setup')

// 1. Check on initial page load
onMounted(() => {
  checkAuth()
})

// 2. Watch for route changes (e.g. after login redirect or finishing setup)
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
  router.push("/")
}
</script>

<template>
  <div class="px-4 px-md-5">

    <header class="mb-3">
      <nav class="navbar navbar-expand-md navbar-dark">
        <!-- Brand Logo -->
        <div class="navbar-brand">
          <img class="rounded-4" src="./assets/booyah-logo.svg" width="50" height="50" alt="booyah logo">
        </div>

        <!-- Mobile Profile & Toggler (Hidden on /setup) -->
        <div class="d-flex align-items-center gap-2 ms-auto d-md-none" v-if="showNav">
          <div class="dropdown">
            <a href="#" class="d-block dropdown-toggle-no-caret" id="profileDropdownMobile" data-bs-toggle="dropdown"
              aria-expanded="false">
              <img class="rounded-4" :src="userAvatar" width="36" height="36" alt="profile pic">
            </a>
            <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow p-2"
              aria-labelledby="profileDropdownMobile">
              <li class="px-3 py-2">
                <div class="fw-bold text-white">{{ userHandle }}</div>
                <div class="text-secondary small">{{ userExperience }}</div>
              </li>
              <li>
                <hr class="dropdown-divider my-2">
              </li>
              <li>
                <RouterLink to="/settings" class="dropdown-item rounded-2 py-2" active-class="active">
                  Settings
                </RouterLink>
              </li>
              <li><a class="dropdown-item rounded-2 py-2" @click="logout()">Log out</a></li>
            </ul>
          </div>

          <button class="navbar-toggler border-0 shadow-none p-2" type="button" data-bs-toggle="collapse"
            data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false"
            aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>
        </div>

        <!-- Collapsible Navigation & Desktop Profile (Hidden on /setup) -->
        <div class="collapse navbar-collapse mt-2 mt-md-0 mobile-nav-card" id="navbarSupportedContent" v-if="showNav">
          <ul class="navbar-nav me-auto gap-1">
            <li class="nav-item">
              <RouterLink to="/discovery" class="nav-link custom-nav-link rounded-3 px-3 py-2" active-class="active">
                Discovery
              </RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink to="/trending" class="nav-link custom-nav-link rounded-3 px-3 py-2" active-class="active">
                Trending
              </RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink to="/jobs" class="nav-link custom-nav-link rounded-3 px-3 py-2" active-class="active">
                Jobs
              </RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink to="/my-projects" class="nav-link custom-nav-link rounded-3 px-3 py-2" active-class="active">
                My Project
              </RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink to="/saved-projects" class="nav-link custom-nav-link rounded-3 px-3 py-2"
                active-class="active">
                Saved
              </RouterLink>
            </li>
          </ul>

          <!-- Desktop Profile Dropdown -->
          <div class="dropdown d-none d-md-block ms-auto">
            <a href="#" class="d-block text-decoration-none dropdown-toggle-no-caret" id="profileDropdown"
              data-bs-toggle="dropdown" aria-expanded="false">
              <img class="rounded-4" :src="userAvatar" width="40" height="40" alt="profile pic">
            </a>

            <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow p-2" aria-labelledby="profileDropdown">
              <li class="px-3 py-2">
                <div class="fw-bold text-white">{{ userHandle }}</div>
                <div class="text-secondary small">{{ userExperience }}</div>
              </li>
              <li>
                <hr class="dropdown-divider my-2">
              </li>
              <li>
                <RouterLink to="/settings" class="dropdown-item rounded-2 d-flex align-items-center gap-2 py-2"
                  active-class="active">
                  Settings
                </RouterLink>
              </li>
              <li>
                <a class="dropdown-item rounded-2 d-flex align-items-center gap-2 py-2" @click="logout()">
                  Log out
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </header>

    <RouterView />
  </div>
</template>

<style scoped>
.dropdown-toggle-no-caret::after {
  display: none !important;
}

.custom-nav-link {
  transition: background-color 0.2s ease, color 0.2s ease;
}

.custom-nav-link:hover {
  background-color: rgba(255, 255, 255, 0.08);
  color: #ffffff !important;
}
</style>