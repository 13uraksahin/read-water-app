<script setup lang="ts">
import {
  LayoutDashboard,
  Activity,
  Users,
  Gauge,
  FileText,
  Settings,
  Building2,
  Code2,
  Radio,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Moon,
  Sun,
  Globe,
  Bell,
} from 'lucide-vue-next'
import { cn } from '~/lib/utils'

const { t, locale, locales, setLocale } = useI18n()
const route = useRoute()
const colorMode = useColorMode()
const authStore = useAuthStore()
const { canAccessModule, MODULES } = usePermissions()

// Navigation item type
interface NavItem {
  labelKey: string
  icon: any
  to?: string
  exact?: boolean
  module?: string // Permission module to check
  children?: {
    labelKey: string
    to: string
    module?: string // Permission module for child
  }[]
}

// Navigation items with permission modules
const allNavItems: NavItem[] = [
  {
    labelKey: 'nav.dashboard',
    icon: LayoutDashboard,
    to: '/',
    exact: true,
    module: MODULES.DASHBOARD,
  },
  {
    labelKey: 'nav.liveReadings',
    icon: Activity,
    to: '/readings',
    module: MODULES.READINGS,
  },
  {
    labelKey: 'nav.customers',
    icon: Users,
    to: '/customers',
    module: MODULES.CUSTOMERS,
  },
  {
    labelKey: 'nav.subscriptions',
    icon: FileText,
    to: '/subscriptions',
    module: MODULES.SUBSCRIPTIONS,
  },
  {
    labelKey: 'nav.meters',
    icon: Gauge,
    to: '/meters',
    module: MODULES.METERS,
  },
  {
    labelKey: 'nav.devices',
    icon: Radio,
    to: '/devices',
    module: MODULES.DEVICES,
  },
  {
    labelKey: 'nav.profiles',
    icon: FileText,
    to: '/profiles',
    module: MODULES.PROFILES,
  },
  {
    labelKey: 'nav.decoders',
    icon: Code2,
    to: '/decoders',
    module: MODULES.DECODERS,
  },
  {
    labelKey: 'nav.alarms',
    icon: Bell,
    to: '/alarms',
    module: MODULES.ALARMS,
  },
  {
    labelKey: 'nav.iam',
    icon: Building2,
    children: [
      { labelKey: 'nav.tenants', to: '/iam/tenants', module: MODULES.TENANTS },
      { labelKey: 'nav.users', to: '/iam/users', module: MODULES.USERS },
    ],
  },
  {
    labelKey: 'nav.settings',
    icon: Settings,
    to: '/settings',
    module: MODULES.SETTINGS,
  },
]

// Filter navigation items based on permissions
const navItems = computed(() => {
  return allNavItems
    .map(item => {
      // If item has children, filter children by permissions
      if (item.children) {
        const visibleChildren = item.children.filter(child => {
          if (!child.module) return true
          return canAccessModule(child.module)
        })
        
        // Only show parent if there are visible children
        if (visibleChildren.length === 0) return null
        
        return {
          ...item,
          children: visibleChildren,
        }
      }
      
      // For regular items, check module permission
      if (item.module && !canAccessModule(item.module)) {
        return null
      }
      
      return item
    })
    .filter((item): item is NavItem => item !== null)
})

// Expanded menu items
const expandedItems = ref<string[]>(['nav.iam'])

// Language selector
const showLanguageMenu = ref(false)
const availableLocales = computed(() => 
  (locales.value as { code: string; name: string }[]).filter(l => l.code !== locale.value)
)

const currentLocaleName = computed(() => {
  const current = (locales.value as { code: string; name: string }[]).find(l => l.code === locale.value)
  return current?.name || locale.value
})

const changeLanguage = (code: string) => {
  setLocale(code as 'en' | 'tr' | 'fr')
  showLanguageMenu.value = false
}

const toggleExpand = (labelKey: string) => {
  const index = expandedItems.value.indexOf(labelKey)
  if (index > -1) {
    expandedItems.value.splice(index, 1)
  } else {
    expandedItems.value.push(labelKey)
  }
}

const isActive = (item: { exact?: boolean; to?: string }) => {
  if (item.exact) {
    return route.path === item.to
  }
  return item.to && route.path.startsWith(item.to)
}

const isChildActive = (children: { to: string }[]) => {
  return children.some(child => route.path.startsWith(child.to))
}

const toggleTheme = () => {
  colorMode.preference = colorMode.preference === 'dark' ? 'light' : 'dark'
}

const handleLogout = () => {
  authStore.logout()
}

// Mobile sidebar state
const isMobileSidebarOpen = ref(false)
</script>

<template>
  <div>
    <!-- Mobile header -->
    <div class="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-40 flex items-center justify-between px-4">
      <NuxtLink to="/" class="flex items-center gap-2">
        <div class="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <span class="text-primary-foreground font-bold text-sm">RW</span>
        </div>
        <span class="font-semibold text-lg">{{ $t('app.name') }}</span>
      </NuxtLink>
      
      <button @click="isMobileSidebarOpen = true" class="p-2 hover:bg-accent rounded-lg">
        <Menu class="h-5 w-5" />
      </button>
    </div>
    
    <!-- Mobile sidebar overlay -->
    <Transition name="fade">
      <div
        v-if="isMobileSidebarOpen"
        class="lg:hidden fixed inset-0 bg-black/50 z-40"
        @click="isMobileSidebarOpen = false"
      />
    </Transition>
    
    <!-- Sidebar -->
    <aside
      :class="cn(
        'fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border flex flex-col transition-transform duration-300',
        'lg:translate-x-0',
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )"
    >
      <!-- Logo -->
      <div class="h-16 flex items-center justify-between px-4 border-b border-border">
        <NuxtLink to="/" class="flex items-center gap-2">
          <div class="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center shadow-lg shadow-primary/25">
            <span class="text-white font-bold text-sm">RW</span>
          </div>
          <span class="font-semibold text-lg text-gradient">{{ $t('app.name') }}</span>
        </NuxtLink>
        
        <button class="lg:hidden p-1.5 hover:bg-accent rounded-lg" @click="isMobileSidebarOpen = false">
          <X class="h-5 w-5" />
        </button>
      </div>
      
      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto py-4 px-3 no-scrollbar">
        <ul class="space-y-1">
          <li v-for="item in navItems" :key="item.labelKey">
            <!-- Regular nav item -->
            <NuxtLink
              v-if="!item.children"
              :to="item.to!"
              :class="cn(
                'sidebar-link',
                isActive(item) && 'active'
              )"
              @click="isMobileSidebarOpen = false"
            >
              <component :is="item.icon" class="h-5 w-5" />
              <span>{{ $t(item.labelKey) }}</span>
            </NuxtLink>
            
            <!-- Expandable nav item -->
            <div v-else>
              <button
                :class="cn(
                  'sidebar-link w-full justify-between',
                  isChildActive(item.children) && 'text-primary'
                )"
                @click="toggleExpand(item.labelKey)"
              >
                <span class="flex items-center gap-3">
                  <component :is="item.icon" class="h-5 w-5" />
                  <span>{{ $t(item.labelKey) }}</span>
                </span>
                <ChevronDown
                  v-if="expandedItems.includes(item.labelKey)"
                  class="h-4 w-4"
                />
                <ChevronRight v-else class="h-4 w-4" />
              </button>
              
              <Transition name="slide">
                <ul v-if="expandedItems.includes(item.labelKey)" class="mt-1 ml-4 pl-4 border-l border-border space-y-1">
                  <li v-for="child in item.children" :key="child.to">
                    <NuxtLink
                      :to="child.to"
                      :class="cn(
                        'sidebar-link text-sm',
                        route.path.startsWith(child.to) && 'active'
                      )"
                      @click="isMobileSidebarOpen = false"
                    >
                      {{ $t(child.labelKey) }}
                    </NuxtLink>
                  </li>
                </ul>
              </Transition>
            </div>
          </li>
        </ul>
      </nav>
      
      <!-- Footer -->
      <div class="p-3 border-t border-border space-y-2">
        <!-- Language selector -->
        <div class="relative">
          <button
            class="sidebar-link w-full justify-between"
            @click="showLanguageMenu = !showLanguageMenu"
          >
            <span class="flex items-center gap-3">
              <Globe class="h-5 w-5" />
              <span>{{ currentLocaleName }}</span>
            </span>
            <ChevronDown v-if="showLanguageMenu" class="h-4 w-4" />
            <ChevronRight v-else class="h-4 w-4" />
          </button>
          
          <Transition name="slide">
            <div v-if="showLanguageMenu" class="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
              <button
                v-for="loc in availableLocales"
                :key="loc.code"
                class="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                @click="changeLanguage(loc.code)"
              >
                {{ loc.name }}
              </button>
            </div>
          </Transition>
        </div>
        
        <!-- Theme toggle -->
        <button
          class="sidebar-link w-full"
          @click="toggleTheme"
        >
          <Moon v-if="colorMode.preference === 'dark'" class="h-5 w-5" />
          <Sun v-else class="h-5 w-5" />
          <span>{{ colorMode.preference === 'dark' ? $t('nav.darkMode') : $t('nav.lightMode') }}</span>
        </button>
        
        <!-- User info -->
        <div class="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
          <UiAvatar
            :fallback="authStore.currentUser?.firstName?.charAt(0)"
            size="sm"
          />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">
              {{ authStore.currentUser?.firstName }} {{ authStore.currentUser?.lastName }}
            </p>
            <p class="text-xs text-muted-foreground truncate">
              {{ authStore.primaryTenant?.role }}
            </p>
          </div>
          <button
            class="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
            :title="$t('nav.logout')"
            @click="handleLogout"
          >
            <LogOut class="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
