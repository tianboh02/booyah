import { createRouter, createWebHistory } from 'vue-router'
import LandingView from '@/views/LandingView.vue'
import DiscoveryView from '@/views/DiscoveryView.vue'
import AuthView from '@/views/AuthView.vue'
import JobsView from '@/views/JobsView.vue'
import TrendingView from '@/views/TrendingView.vue'
import LearnView from '@/views/LearnView.vue'
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
      path: '/learn',
      name: 'learn',
      component: LearnView,
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

  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0, left: 0 }
  }
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
  // notify navbar.vue instantly when session/token expires
  window.dispatchEvent(new Event('booyah:user-updated'))
}

// Global Navigation Guard, prevent unauth access
router.beforeEach(async (to) => {
  const isAuthenticated = !!(localStorage.getItem('auth_token') && localStorage.getItem('user'))
  const isPublicRoute = to.meta.isPublic === true

  // Unauthenticated users only can go landing page
  if (!isAuthenticated) {
    if (!isPublicRoute) {
      return { name: 'landing' }
    }
    return true
  }

  const userAuthKey = localStorage.getItem('auth_token')

  // validate token against GitHub API to ensure token still validate. token expires after 8hrs
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

    alert('Session has expired, please login again.')

    if (!isPublicRoute) {
      return { name: 'landing' }
    }
    return true
  }

  const rawExperience = getUserExperience()
  const exp = rawExperience ? rawExperience.toLowerCase() : null

  // Authenticated user without experience set -> force setup page
  if (exp === null) {
    if (to.name !== 'setup') {
      return { name: 'setup' }
    }
    return true
  }

  // Authenticated user with experience trying to access public or setup pages
  if (isPublicRoute || to.name === 'setup') {
    if (exp === 'newcomer') {
      return { name: 'discovery' }
    }
    if (exp === 'practitioner') {
      return { name: 'my-projects' }
    }
    return { name: 'discovery' }
  }

  return true
})

export default router