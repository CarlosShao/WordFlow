<template>
  <div class="app-layout">
    <!-- Sidebar (only shown when authenticated) -->
    <BaseSidebar v-if="isAuthenticated" brand="English Learner">
      <SidebarItem
        v-for="route in navRoutes"
        :key="route.path"
        :active="currentRoute === route.path"
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

    <!-- Main Content -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </main>

    <!-- Global Toast -->
    <BaseToast :toasts="toasts" @dismiss="dismiss" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { BaseSidebar, SidebarItem, BaseToast } from './components'
import { useToast } from './composables/useToast'
import { useTheme } from './composables/useTheme'
import { useAuthStore } from './stores/auth'
import { routes } from './router'

const router = useRouter()
const route = useRoute()
const { toasts, dismiss } = useToast()
const { initTheme } = useTheme()
const auth = useAuthStore()

onMounted(() => {
  initTheme()
})

const currentRoute = computed(() => route.path)
const isAuthenticated = computed(() => auth.isAuthenticated)
const user = computed(() => auth.user)

const initials = computed(() => {
  const name = user.value?.username || '?'
  return name.charAt(0).toUpperCase()
})

const navRoutes = computed(() =>
  routes
    .filter((r): r is typeof r & { meta: { title: string; hidden?: boolean } } => Boolean(r.meta?.title) && !r.meta?.hidden)
)

function navigateTo(path: string) {
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
</style>
