import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/DashboardPage.vue'),
    meta: { title: '首页', icon: 'house' }
  },
  {
    path: '/content',
    name: 'Content',
    component: () => import('../views/ContentPage.vue'),
    meta: { title: '内容', icon: 'book-open' }
  },
  {
    path: '/content/:id',
    name: 'ContentDetail',
    component: () => import('../views/ContentDetailPage.vue'),
    meta: { title: '内容详情', hidden: true }
  },
  {
    path: '/vocabulary',
    name: 'Vocabulary',
    component: () => import('../views/VocabularyPage.vue'),
    meta: { title: '词汇', icon: 'book-text' }
  },
  {
    path: '/examples',
    name: 'Examples',
    component: () => import('../views/ExamplesPage.vue'),
    meta: { title: '例句库', icon: 'quote' }
  },
  {
    path: '/practice',
    name: 'Practice',
    component: () => import('../views/PracticePage.vue'),
    meta: { title: '练习', icon: 'pencil' }
  },
  {
    path: '/mistakes',
    name: 'Mistakes',
    component: () => import('../views/MistakesPage.vue'),
    meta: { title: '错题本', icon: 'alert-circle' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsPage.vue'),
    meta: { title: '设置', icon: 'settings' }
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

export default router
export { routes }
