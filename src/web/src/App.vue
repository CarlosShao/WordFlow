<template>
  <div class="app-layout">
    <!-- Sidebar -->
    <BaseSidebar brand="English Learner">
      <SidebarItem
        v-for="route in navRoutes"
        :key="route.path"
        :active="currentRoute === route.path"
        @click="navigateTo(route.path)"
      >
        {{ route.meta.title }}
      </SidebarItem>
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
import { routes } from './router'

const router = useRouter()
const route = useRoute()
const { toasts, dismiss } = useToast()
const { initTheme } = useTheme()

onMounted(() => {
  initTheme()
})

const currentRoute = computed(() => route.path)

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
</style>
