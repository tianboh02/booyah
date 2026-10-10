<script setup>
import { useRoute, useRouter, RouterLink, RouterView } from 'vue-router'
import { onMounted, ref, watch } from 'vue'

const route = useRoute()
const router = useRouter()

const isLogin = ref(false)

// Helper function to update login state
const checkAuth = () => {
  if (localStorage.getItem('auth_token') && localStorage.getItem('user')) {
    isLogin.value = true
  } else {
    isLogin.value = false
  }
}

// 1. Check on initial page load
onMounted(() => {
  checkAuth()
})

// 2. Watch for route changes (triggers as soon as user logs in and gets redirected)
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

        <!-- Mobile Profile & Toggler (Visible on mobile screens) -->
        <div class="d-flex align-items-center gap-2 ms-auto d-md-none" v-if="isLogin">
          <div class="dropdown">
            <a href="#" class="d-block dropdown-toggle-no-caret" id="profileDropdownMobile" data-bs-toggle="dropdown"
              aria-expanded="false">
              <img class="rounded-4" src="./assets/login.png" width="36" height="36" alt="profile pic">
            </a>
            <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow p-2"
              aria-labelledby="profileDropdownMobile">
              <li class="px-3 py-2">
                <div class="fw-bold text-white">@marclau</div>
                <div class="text-secondary small">Practitioner</div>
              </li>
              <li>
                <hr class="dropdown-divider my-2">
              </li>
              <li><a class="dropdown-item rounded-2 py-2" href="#">Settings</a></li>
              <li><a class="dropdown-item rounded-2 py-2" @click="logout()">Log out</a></li>
            </ul>
          </div>

          <button class="navbar-toggler border-0 shadow-none p-2" type="button" data-bs-toggle="collapse"
            data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false"
            aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>
        </div>

        <!-- Collapsible Navigation & Desktop Profile -->
        <div class="collapse navbar-collapse mt-2 mt-md-0 mobile-nav-card" id="navbarSupportedContent" v-if="isLogin">
          <ul class="navbar-nav me-auto gap-1">
            <li class="nav-item">
              <a class="nav-link custom-nav-link active rounded-3 px-3 py-2" href="#">Discovery</a>
            </li>
            <li class="nav-item">
              <a class="nav-link custom-nav-link rounded-3 px-3 py-2" href="#">Trending</a>
            </li>
            <li class="nav-item">
              <a class="nav-link custom-nav-link rounded-3 px-3 py-2" href="#">Jobs</a>
            </li>
            <li class="nav-item">
              <a class="nav-link custom-nav-link rounded-3 px-3 py-2" href="#">My Project</a>
            </li>
            <li class="nav-item">
              <a class="nav-link custom-nav-link rounded-3 px-3 py-2" href="#">Saved</a>
            </li>
          </ul>

          <!-- Desktop Profile Dropdown (Visible on md and larger) -->
          <div class="dropdown d-none d-md-block ms-auto">
            <a href="#" class="d-block text-decoration-none dropdown-toggle-no-caret" id="profileDropdown"
              data-bs-toggle="dropdown" aria-expanded="false">
              <img class="rounded-4" src="./assets/login.png" width="40" height="40" alt="profile pic">
            </a>

            <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow p-2" aria-labelledby="profileDropdown">
              <!-- User Info -->
              <li class="px-3 py-2">
                <div class="fw-bold text-white">@marclau</div>
                <div class="text-secondary small">Practitioner</div>
              </li>
              <li>
                <hr class="dropdown-divider my-2">
              </li>

              <!-- Menu Options -->
              <li>
                <a class="dropdown-item rounded-2 d-flex align-items-center gap-2 py-2" href="#">
                  Settings
                </a>
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

      <!-- <nav>
        <RouterLink to="/home">Home</RouterLink>
        <RouterLink to="/about">About</RouterLink>
      </nav> -->
    </header>

    <RouterView />
  </div>
</template>

<style scoped>
/* Hide Bootstrap default arrow on dropdown toggle */
.dropdown-toggle-no-caret::after {
  display: none !important;
}

/* Rounded hover feedback for nav links */
.custom-nav-link {
  transition: background-color 0.2s ease, color 0.2s ease;
}

.custom-nav-link:hover {
  background-color: rgba(255, 255, 255, 0.08);
  color: #ffffff !important;
}
</style>