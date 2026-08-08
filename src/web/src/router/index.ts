import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginPage.vue'),
    meta: { title: '登录', guestOnly: true, hidden: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/RegisterPage.vue'),
    meta: { title: '注册', guestOnly: true, hidden: true }
  },
  {
    path: '/auth/callback',
    name: 'AuthCallback',
    component: () => import('../views/AuthCallbackPage.vue'),
    meta: { title: '认证回调', hidden: true }
  },
  {
    path: '/',
    name: 'Root',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/DashboardPage.vue'),
    meta: { title: '首页', icon: 'house', requiresAuth: true }
  },
  {
    path: '/content',
    name: 'Content',
    component: () => import('../views/ContentPage.vue'),
    meta: { title: '内容', icon: 'book-open', requiresAuth: true }
  },
  {
    path: '/content/:id',
    name: 'ContentDetail',
    component: () => import('../views/ContentDetailPage.vue'),
    meta: { title: '内容详情', hidden: true, requiresAuth: true }
  },
  {
    path: '/vocabulary',
    name: 'Vocabulary',
    component: () => import('../views/VocabularyPage.vue'),
    meta: { title: '词汇', icon: 'book-text', requiresAuth: true }
  },
  {
    path: '/examples',
    name: 'Examples',
    component: () => import('../views/ExamplesPage.vue'),
    meta: { title: '例句库', icon: 'quote', requiresAuth: true }
  },
  {
    path: '/practice',
    name: 'Practice',
    component: () => import('../views/PracticePage.vue'),
    meta: { title: '练习', icon: 'pencil', requiresAuth: true }
  },
  {
    path: '/mistakes',
    name: 'Mistakes',
    component: () => import('../views/MistakesPage.vue'),
    meta: { title: '错题本', icon: 'alert-circle', requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/ProfilePage.vue'),
    meta: { title: '个人中心', requiresAuth: true, hidden: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsPage.vue'),
    meta: { title: '设置', icon: 'settings', requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/dashboard'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0, behavior: 'smooth' }
  }
})

// Navigation guards
router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()
  const isAuthenticated = auth.isAuthenticated

  // Not authenticated: only allow login/register/callback pages
  if (!isAuthenticated && to.meta.requiresAuth) {
    next('/login')
    return
  }

  // Already authenticated: redirect guest-only pages to dashboard
  if (isAuthenticated && to.meta.guestOnly) {
    next('/dashboard')
    return
  }

  next()
})

export default router
export { routes }
