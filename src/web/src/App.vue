<template>
  <div class="app-layout">
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
        :compact="sidebarCollapsed"
        @click="navigateTo(route.path)"
      >
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
const sidebarCollapsed = ref(true)
const mobileOpen = ref(false)

function checkMobile() {
  const mobile = window.innerWidth < 768
  isMobile.value = mobile
  // On mobile, start collapsed; on desktop, start expanded
  if (mobile) {
    sidebarCollapsed.value = true
    mobileOpen.value = false
  } else {
    // Restore collapsed preference from localStorage on desktop
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

onMounted(() => {
  initTheme()
  checkMobile()
  window.addEventListener('resize', checkMobile)

  // Restore collapsed state on desktop
  const saved = localStorage.getItem('sidebar-collapsed')
  if (!isMobile.value && saved !== null) {
    sidebarCollapsed.value = saved === 'true'
  }

  // Restore from localStorage on desktop
  if (!isMobile.value) {
    sidebarCollapsed.value = localStorage.getItem('sidebar-collapsed') === 'true'
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
  display: flex;
  min-height: 100vh;
  background: var(--color-surface);
}

.main-content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
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
  padding-top: var(--space-3);
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
  background: var(--color-sidebar-muted, rgba(0,0,0,0.04));
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

  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: var(--z-modal);
    box-shadow: var(--shadow-lg);
  }

  .main-content {
    width: 100%;
  }
}
</style>
