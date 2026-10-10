import { createRouter, createWebHistory } from 'vue-router'
import LandingView from '@/views/LandingView.vue'
import DashboardView from '@/views/DashboardView.vue'
import AuthView from '@/views/AuthView.vue'

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
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView
    },
        { //routes for JobsView 
      path: '/jobs',
      name: 'jobs',
      component: () => import('../views/JobsView.vue'),
    },
  ],
})

// Global Navigation Guard
router.beforeEach((to, from, next) => {
  const isAuthenticated = !!(localStorage.getItem('auth_token') && localStorage.getItem('user'))
  const isPublicRoute = to.meta.isPublic === true

  if (!isPublicRoute && !isAuthenticated) {
    return next({ name: 'landing' })
  }

  if (isAuthenticated && to.name === 'landing') {
    return next({ name: 'dashboard' })
  }
  next()
})

export default router