import { createRouter, createWebHistory } from 'vue-router'
import LandingView from '@/views/LandingView.vue'
import DiscoveryView from '@/views/DiscoveryView.vue'
import AuthView from '@/views/AuthView.vue'
import JobsView from '@/views/JobsView.vue'
import TrendingView from '@/views/TrendingView.vue'
import MyProjectView from '@/views/MyProjectView.vue'
import SavedView from '@/views/SavedView.vue'
import SettingsView from '@/views/SettingsView.vue'
import SetupView from '@/views/SetupView.vue'
import axios from 'axios'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: LandingView,
      meta: { isPublic: true }
    },
    {
      path: '/authenticating',
      name: 'authenticating',
      component: AuthView,
      meta: { isPublic: true }
    },
    {
      path: '/setup',
      name: 'setup',
      component: SetupView,
      meta: { isPublic: false }
    },
    {
      path: '/discovery',
      name: 'discovery',
      component: DiscoveryView,
      meta: { isPublic: false }
    },
    {
      path: '/trending',
      name: 'trending',
      component: TrendingView,
      meta: { isPublic: false }
    },
    {
      path: '/jobs',
      name: 'jobs',
      component: JobsView,
      meta: { isPublic: false }
    },
    {
      path: '/my-projects',
      name: 'my-projects',
      component: MyProjectView,
      meta: { isPublic: false }
    },
    {
      path: '/saved-projects',
      name: 'saved-projects',
      component: SavedView,
      meta: { isPublic: false }
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
      meta: { isPublic: false }
    },
  ],
})

function getUserExperience() {
  try {
    const userStr = localStorage.getItem('user')
    if (!userStr) return null
    const user = JSON.parse(userStr)
    return user?.experience ?? null
  } catch {
    return null
  }
}

function clearAuth() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user')
}

// Global Navigation Guard
router.beforeEach(async (to) => {
  const isAuthenticated = !!(localStorage.getItem('auth_token') && localStorage.getItem('user'))
  const isPublicRoute = to.meta.isPublic === true

  // 1. Unauthenticated users restricted to public routes
  if (!isAuthenticated) {
    if (!isPublicRoute) {
      return { name: 'landing' }
    }
    return true
  }

  const userAuthKey = localStorage.getItem('auth_token')

  // 2. Validate token against GitHub API
  try {
    await axios.get('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${userAuthKey}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Accept': 'application/vnd.github+json'
      }
    })
  } catch (error) {
    console.warn('Auth token expired or invalid. Clearing session.', error)
    clearAuth()

    // Alert user on the current page BEFORE navigating away
    alert('Session has expired, please login again.')

    if (!isPublicRoute) {
      return { name: 'landing' }
    }
    return true
  }

  const rawExperience = getUserExperience()
  const exp = rawExperience ? rawExperience.toLowerCase() : null

  // 3. Authenticated user without experience set -> force setup page
  if (exp === null) {
    if (to.name !== 'setup') {
      return { name: 'setup' }
    }
    return true // Allow remaining on setup page without looping
  }

  // 4. Authenticated user with experience trying to access public or setup pages
  if (isPublicRoute || to.name === 'setup') {
    if (exp === 'new') {
      return { name: 'discovery' }
    }
    if (exp === 'practitioner') {
      return { name: 'my-projects' }
    }
    return { name: 'discovery' }
  }

  // 5. Authenticated user navigating to valid protected pages
  return true
})

export default router