<script setup lang="ts">
import { Bell, Search, ChevronDown } from 'lucide-vue-next'

const appStore = useAppStore()
const authStore = useAuthStore()

// Tenant selector
const showTenantSelector = ref(false)

const selectTenant = (tenantId: string) => {
  appStore.setActiveTenant(tenantId)
  showTenantSelector.value = false
}
</script>

<template>
  <header class="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6">
    <!-- Search -->
    <div class="flex items-center gap-4">
      <div class="relative hidden md:block">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search meters, customers..."
          class="w-80 h-9 pl-10 pr-4 bg-muted/50 border border-input rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </div>
    
    <!-- Right side -->
    <div class="flex items-center gap-4">
      <!-- Tenant selector -->
      <div class="relative" v-if="appStore.tenants.length > 1">
        <button
          class="flex items-center gap-2 px-3 py-1.5 text-sm bg-muted/50 hover:bg-muted rounded-lg transition-colors"
          @click="showTenantSelector = !showTenantSelector"
        >
          <span class="text-muted-foreground">Tenant:</span>
          <span class="font-medium">{{ appStore.activeTenant?.name || 'Select' }}</span>
          <ChevronDown class="h-4 w-4 text-muted-foreground" />
        </button>
        
        <Transition name="dropdown">
          <div
            v-if="showTenantSelector"
            class="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-lg shadow-lg py-1 z-50"
          >
            <button
              v-for="tenant in appStore.tenants"
              :key="tenant.id"
              class="w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors"
              :class="{ 'bg-primary/10 text-primary': tenant.id === appStore.activeTenantId }"
              @click="selectTenant(tenant.id)"
            >
              {{ tenant.name }}
            </button>
          </div>
        </Transition>
      </div>
      
      <!-- Notifications -->
      <button class="relative p-2 hover:bg-muted rounded-lg transition-colors">
        <Bell class="h-5 w-5 text-muted-foreground" />
        <span
          v-if="appStore.unreadNotifications > 0"
          class="absolute -top-0.5 -right-0.5 h-4 w-4 bg-destructive text-destructive-foreground text-xs font-medium rounded-full flex items-center justify-center"
        >
          {{ appStore.unreadNotifications > 9 ? '9+' : appStore.unreadNotifications }}
        </span>
      </button>
      
      <!-- User avatar (mobile) -->
      <UiAvatar
        v-if="authStore.currentUser"
        :fallback="authStore.currentUser?.firstName?.charAt(0)"
        class="lg:hidden"
        size="sm"
      />
    </div>
  </header>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>

