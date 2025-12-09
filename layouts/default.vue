<script setup lang="ts">
import { Droplets } from 'lucide-vue-next'

const authStore = useAuthStore()
const appStore = useAppStore()
const { ensureInitialized } = useAuthInit()

// Initialize stores on mount
onMounted(async () => {
  // Ensure auth is initialized
  await ensureInitialized()
  
  appStore.initializeFromStorage()
  
  // Fetch tenants when authenticated
  if (authStore.isAuthenticated) {
    appStore.fetchTenants()
  }
})

// Watch for auth changes
watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      appStore.fetchTenants()
    }
  }
)
</script>

<template>
  <ClientOnly>
    <!-- Show loading state until hydrated -->
    <div v-if="!authStore.isHydrated" class="min-h-screen bg-background flex items-center justify-center">
      <div class="flex flex-col items-center gap-4">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center shadow-lg shadow-primary/25 animate-pulse">
          <Droplets class="w-8 h-8 text-white" />
        </div>
        <div class="text-muted-foreground text-sm">Loading...</div>
      </div>
    </div>
    
    <!-- Main layout after hydration -->
    <div v-else class="min-h-screen bg-background">
      <!-- Sidebar -->
      <LayoutSidebar />
      
      <!-- Main content -->
      <div class="lg:pl-64">
        <!-- Header -->
        <LayoutHeader />
        
        <!-- Page content -->
        <main class="p-6 mt-16 lg:mt-0">
          <slot />
        </main>
      </div>
      
      <!-- Toast notifications -->
      <LayoutToast />
    </div>
    
    <!-- SSR fallback - loading state -->
    <template #fallback>
      <div class="min-h-screen bg-background flex items-center justify-center">
        <div class="flex flex-col items-center gap-4">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center shadow-lg shadow-primary/25 animate-pulse">
            <Droplets class="w-8 h-8 text-white" />
          </div>
          <div class="text-muted-foreground text-sm">Loading...</div>
        </div>
      </div>
    </template>
  </ClientOnly>
</template>

