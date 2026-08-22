<template>
  <div class="app-layout" :class="{ 'sidebar-open': isAuthenticated && !sidebarCollapsed }">
    <!-- Mobile hamburger -->
    <button class="mobile-menu-btn" @click="toggleMobileSidebar" title="菜单">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>

    <!-- Sidebar (only shown when authenticated) -->
    <BaseSidebar
      v-if="isAuthenticated"
      brand="WordFlow"
      :collapsed="sidebarCollapsed"
      @update:collapsed="sidebarCollapsed = $event"
    >
      <SidebarItem
        v-for="route in navRoutes"
        :key="route.path"
        :active="isNavActive(route)"
        @click="navigateTo(route.path)"
      >
        <template #icon>
          <span class="nav-icon" v-html="getRouteIcon(route)" />
        </template>
        {{ route.meta.title }}
      </SidebarItem>

      <!-- User Info Footer -->
      <template #footer>
        <div class="sidebar-footer-user">
          <button class="sidebar-user" @click="navigateTo('/profile')">
            <div class="sidebar-user-avatar">
              <img v-if="user?.avatar" :src="user.avatar" :alt="user.username" />
              <span v-else class="avatar-initials">{{ initials }}</span>
            </div>
            <span class="sidebar-user-name">{{ user?.username || '用户' }}</span>
          </button>
        </div>
      </template>
    </BaseSidebar>

    <!-- Collapse toggle button (OUTSIDE sidebar, always visible) -->
    <button
      v-if="isAuthenticated"
      class="sidebar-toggle-btn"
      :class="{ 'is-collapsed': sidebarCollapsed }"
      :title="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
      @click="toggleSidebar"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline :points="sidebarCollapsed ? '9 18 15 12 9 6' : '15 18 9 12 15 6'" />
      </svg>
    </button>

    <!-- Mobile sidebar overlay -->
    <Transition name="overlay">
      <div
        v-if="isAuthenticated && mobileOpen"
        class="sidebar-overlay"
        @click.self="mobileOpen = false"
      />
    </Transition>

    <!-- Main Content -->
    <main class="main-content">
      <router-view v-slot="{ Component, route }">
        <Transition name="page" mode="out-in">
          <div :key="route.path" v-if="Component">
            <component :is="Component" />
          </div>
        </Transition>
      </router-view>
    </main>

    <!-- Global Toast -->
    <BaseToast :toasts="toasts" @dismiss="dismiss" />

    <!-- Settings Dialog (全局设置弹窗) -->
    <SettingsDialog v-model="settingsDialogVisible" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { BaseSidebar, SidebarItem, BaseToast, SettingsDialog } from './components'
import { useToast } from './composables/useToast'
import { useTheme } from './composables/useTheme'
import { useAuthStore } from './stores/auth'
import { routes } from './router'
import { uploadApi } from './api/upload'
import type { RouteRecordRaw } from 'vue-router'

const router = useRouter()
const route = useRoute()
const { toasts, dismiss } = useToast()
const { initTheme } = useTheme()
const auth = useAuthStore()

// 设置弹窗可见性
const settingsDialogVisible = ref(false)

// ── Sidebar state ──────────────────────────────────────────────
const isMobile = ref(false)
const sidebarCollapsed = ref(false)
const sidebarWidth = ref(224)
const mobileOpen = ref(false)

// Restore saved sidebar width
const SAVED_WIDTH = localStorage.getItem('sidebar-width')
if (SAVED_WIDTH) {
  const w = parseInt(SAVED_WIDTH, 10)
  if (w >= 180 && w <= 400) sidebarWidth.value = w
}

// Apply sidebar width as CSS variable on root
watch(sidebarWidth, (w) => {
  document.documentElement.style.setProperty('--app-sidebar-width', `${w}px`)
}, { immediate: true })

function checkMobile() {
  const mobile = window.innerWidth < 768
  isMobile.value = mobile
  if (mobile) {
    sidebarCollapsed.value = true
    mobileOpen.value = false
  } else {
    const saved = localStorage.getItem('sidebar-collapsed')
    sidebarCollapsed.value = saved === 'true'
    mobileOpen.value = false
  }
}

function toggleMobileSidebar() {
  if (sidebarCollapsed.value) {
    sidebarCollapsed.value = false
    mobileOpen.value = true
  } else {
    sidebarCollapsed.value = true
    mobileOpen.value = false
  }
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

onMounted(() => {
  initTheme()
  checkMobile()
  window.addEventListener('resize', checkMobile)

  // Restore collapsed state on desktop
  const saved = localStorage.getItem('sidebar-collapsed')
  if (!isMobile.value && saved !== null) {
    sidebarCollapsed.value = saved === 'true'
  }

  // 路由兼容：如果用户直接访问 /settings，自动打开弹窗并显示首页在背后
  if (route.path === '/settings' || route.path.startsWith('/settings/')) {
    settingsDialogVisible.value = true
    router.replace('/dashboard')
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

watch(() => route.path, (p) => {
  if (p === '/settings' || route.path.startsWith('/settings/')) {
    settingsDialogVisible.value = true
    router.replace('/dashboard')
  }
  // Close mobile sidebar on navigation
  if (isMobile.value) {
    mobileOpen.value = false
  }
})

watch(sidebarCollapsed, (v) => {
  localStorage.setItem('sidebar-collapsed', String(v))
})

const currentRoute = computed(() => route.path)
const isAuthenticated = computed(() => auth.isAuthenticated)
const user = computed(() => {
  const u = auth.user as unknown as Record<string, unknown> | null
  if (!u) return auth.user
  const raw = (u.avatar as string | undefined) || (u.avatarUrl as string | undefined)
  if (!raw) return auth.user
  const normalized = uploadApi.normalizeAvatarUrl(raw)
  if (!normalized || normalized === raw) return auth.user
  return { ...u, avatar: normalized } as unknown as typeof auth.user
})

const initials = computed(() => {
  const name = user.value?.username || '?'
  return name.charAt(0).toUpperCase()
})

// 过滤显示在侧边栏的路由：有 title 且 hidden !== true
const navRoutes = computed(() =>
  routes.filter((r): r is typeof r & { meta: { title: string; hidden?: boolean; icon?: string } } =>
    Boolean(r.meta?.title) && !r.meta?.hidden
  )
)

// SVG icons for each route
const ICON_MAP: Record<string, string> = {
  // Dashboard / 首页
  'house': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L12 3l9 6.5"/><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/></svg>',
  // Materials / 素材库
  'library': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v16a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
  // Vocabulary / 词汇
  'book-text': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  // Examples / 例句库
  'quote': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c0-4.97 3.582-9 8-9v9H3z"/><path d="M14 21c0-4.97 3.582-9 8-9v9h-8z" transform="rotate(180 18 16.5)"/></svg>',
  // Exam / 真题
  'graduation-cap': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 2.5 3 6 3s6-2 6-3v-5"/></svg>',
  // AI Practice / AI练习
  'sparkles': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M5 16l.75 2.25L8 19l-2.25.75L5 22l-.75-2.25L2 19l2.25-.75L5 16z"/></svg>',
  // Mistakes / 错题本
  'alert-circle': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  // Settings / 设置
  'settings': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
}

function getRouteIcon(r: RouteRecordRaw): string {
  const iconKey = (r.meta?.icon as string) || ''
  return ICON_MAP[iconKey] || ICON_MAP['house']
}

// 判断导航项是否高亮：除了完全匹配，还要处理子路由（/exam/* 都高亮真题）
function isNavActive(navRoute: RouteRecordRaw): boolean {
  const p = currentRoute.value
  if (navRoute.path === p) return true
  // 父路径匹配（/exam 匹配 /exam/book/1 等）
  if (p.startsWith(navRoute.path + '/')) return true
  return false
}

function navigateTo(path: string) {
  // 设置 → 开弹窗，不跳路由
  if (path === '/settings') {
    settingsDialogVisible.value = true
    return
  }
  router.push(path)
}
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  background: var(--color-surface);
}

/* Main content offset for fixed sidebar */
.main-content {
  padding-left: var(--app-sidebar-width, 224px);
  transition: padding-left 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 100vh;
}

.app-layout:not(.sidebar-open) .main-content {
  padding-left: 0;
}

/* ── Collapse toggle button (fixed, outside sidebar) ─────────── */

.sidebar-toggle-btn {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  left: var(--app-sidebar-width, 224px);
  z-index: var(--z-sticky);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 44px;
  border: 1px solid var(--color-border);
  border-left: none;
  border-radius: 0 6px 6px 0;
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: left 0.22s cubic-bezier(0.4, 0, 0.2, 1), background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 2px 0 4px -2px rgba(0, 0, 0, 0.06);
}

.sidebar-toggle-btn:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
  box-shadow: 2px 0 8px -2px rgba(0, 0, 0, 0.12);
}

.sidebar-toggle-btn.is-collapsed {
  left: 0;
  border: 1px solid var(--color-border);
  border-radius: 0 6px 6px 0;
  box-shadow: 2px 0 6px -2px rgba(0, 0, 0, 0.1);
}

.sidebar-toggle-btn.is-collapsed:hover {
  background: var(--color-surface-muted);
}

/* Page Transition */
.page-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.page-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Sidebar Footer User */
.sidebar-footer-user {
  padding-top: var(--space-2);
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color 0.16s ease;
}

.sidebar-user:hover {
  background: var(--color-sidebar-accent, rgba(0,0,0,0.04));
}

.sidebar-user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  font-weight: 600;
  flex-shrink: 0;
}

.sidebar-user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sidebar-user-name {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-sidebar-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Nav icon */
.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon :deep(svg) {
  width: 18px;
  height: 18px;
}

/* ── Mobile ─────────────────────────────────────────────────── */
.mobile-menu-btn {
  display: none;
  position: fixed;
  top: var(--space-3);
  left: var(--space-3);
  z-index: var(--z-sticky);
  padding: var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
}

.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: var(--z-overlay);
}

@media (max-width: 768px) {
  .mobile-menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sidebar-overlay {
    display: block;
  }

  .sidebar-toggle-btn {
    display: none;
  }

  .main-content {
    padding-left: 0 !important;
  }

  .sidebar {
    box-shadow: var(--shadow-lg);
  }
}

/* ── Overlay transition ─────────────────────────────────────── */
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.2s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}
</style>
