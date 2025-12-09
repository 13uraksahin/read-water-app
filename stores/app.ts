// =============================================================================
// App Store - Global Application State
// =============================================================================

import { defineStore } from 'pinia'
import type { DashboardStats, Tenant } from '~/types'

interface AppState {
  // UI State
  sidebarCollapsed: boolean
  isLoading: boolean
  
  // Tenant context
  activeTenantId: string | null
  tenants: Tenant[]
  
  // Dashboard stats
  stats: DashboardStats | null
  
  // Notifications
  notifications: Notification[]
}

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  read: boolean
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    sidebarCollapsed: false,
    isLoading: false,
    activeTenantId: null,
    tenants: [],
    stats: null,
    notifications: [],
  }),

  getters: {
    activeTenant: (state): Tenant | null => {
      if (!state.activeTenantId) return null
      return state.tenants.find(t => t.id === state.activeTenantId) ?? null
    },
    
    unreadNotifications: (state): number => {
      return state.notifications.filter(n => !n.read).length
    },
    
    tenantTree: (state): Tenant[] => {
      // Build hierarchical tree from flat tenant list
      const map = new Map<string, Tenant & { children: Tenant[] }>()
      const roots: Tenant[] = []
      
      // First pass: create map
      state.tenants.forEach(tenant => {
        map.set(tenant.id, { ...tenant, children: [] })
      })
      
      // Second pass: build tree
      state.tenants.forEach(tenant => {
        const node = map.get(tenant.id)!
        if (tenant.parentId && map.has(tenant.parentId)) {
          map.get(tenant.parentId)!.children.push(node)
        } else {
          roots.push(node)
        }
      })
      
      return roots
    },
  },

  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },
    
    setActiveTenant(tenantId: string | null) {
      this.activeTenantId = tenantId
      if (import.meta.client && tenantId) {
        localStorage.setItem('activeTenantId', tenantId)
      }
    },
    
    async fetchTenants() {
      const authStore = useAuthStore()
      if (!authStore.accessToken) return
      
      try {
        const config = useRuntimeConfig()
        const response = await $fetch<{ data: Tenant[] }>(`${config.public.apiBase}/api/v1/tenants`, {
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
        })
        
        this.tenants = response.data
        
        // Set default active tenant if not set
        if (!this.activeTenantId && this.tenants.length > 0) {
          this.setActiveTenant(this.tenants[0].id)
        }
      } catch (error) {
        console.error('Failed to fetch tenants:', error)
      }
    },
    
    async fetchStats() {
      const authStore = useAuthStore()
      if (!authStore.accessToken) return
      
      try {
        const config = useRuntimeConfig()
        const params = this.activeTenantId ? `?tenantId=${this.activeTenantId}` : ''
        const stats = await $fetch<DashboardStats>(`${config.public.apiBase}/api/v1/dashboard/stats${params}`, {
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
        })
        
        this.stats = stats
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      }
    },
    
    addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
      this.notifications.unshift({
        ...notification,
        id: crypto.randomUUID(),
        timestamp: new Date(),
        read: false,
      })
      
      // Keep only last 50 notifications
      if (this.notifications.length > 50) {
        this.notifications.pop()
      }
    },
    
    markNotificationRead(id: string) {
      const notification = this.notifications.find(n => n.id === id)
      if (notification) {
        notification.read = true
      }
    },
    
    markAllNotificationsRead() {
      this.notifications.forEach(n => (n.read = true))
    },
    
    clearNotifications() {
      this.notifications = []
    },
    
    initializeFromStorage() {
      if (import.meta.client) {
        const activeTenantId = localStorage.getItem('activeTenantId')
        if (activeTenantId) {
          this.activeTenantId = activeTenantId
        }
        
        const sidebarCollapsed = localStorage.getItem('sidebarCollapsed')
        if (sidebarCollapsed) {
          this.sidebarCollapsed = sidebarCollapsed === 'true'
        }
      }
    },
  },
})

