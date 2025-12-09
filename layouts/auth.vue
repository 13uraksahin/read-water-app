<script setup lang="ts">
import { Droplets } from 'lucide-vue-next'

// Auth layout for login/register pages
const authStore = useAuthStore()
const { ensureInitialized } = useAuthInit()

// Ensure auth is initialized on mount
onMounted(async () => {
  await ensureInitialized()
})
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
    
    <!-- Auth layout after hydration -->
    <div v-else class="min-h-screen bg-background flex items-center justify-center p-4">
      <slot />
      
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

