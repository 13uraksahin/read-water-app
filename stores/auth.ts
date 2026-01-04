// =============================================================================
// Auth Store - Pinia
// =============================================================================

import { defineStore } from 'pinia'
import type { User, AuthResponse, LoginForm, SystemRole, TenantAssignment } from '~/types'

// Role-Permission mapping (must match backend)
const ROLE_PERMISSIONS: Record<string, string[]> = {
  PLATFORM_ADMIN: [
    'dashboard.read', 'tenant.create', 'tenant.read', 'tenant.update', 'tenant.delete',
    'user.create', 'user.read', 'user.update', 'user.delete',
    'meter.create', 'meter.read', 'meter.update', 'meter.delete',
    'module.create', 'module.read', 'module.update', 'module.delete',
    'reading.read', 'reading.export', 'valve.control',
    'customer.create', 'customer.read', 'customer.update', 'customer.delete',
    'subscription.create', 'subscription.read', 'subscription.update', 'subscription.delete',
    'profile.create', 'profile.read', 'profile.update', 'profile.delete',
    'decoder.create', 'decoder.read', 'decoder.update', 'decoder.delete',
    'alarm.read', 'alarm.update', 'alarm.acknowledge', 'alarm.resolve',
    'settings.read', 'settings.update',
  ],
  TENANT_ADMIN: [
    'dashboard.read', 'tenant.read', 'tenant.update',
    'user.create', 'user.read', 'user.update', 'user.delete',
    'meter.create', 'meter.read', 'meter.update', 'meter.delete',
    'module.create', 'module.read', 'module.update', 'module.delete',
    'reading.read', 'reading.export', 'valve.control',
    'customer.create', 'customer.read', 'customer.update', 'customer.delete',
    'subscription.create', 'subscription.read', 'subscription.update', 'subscription.delete',
    'profile.read', 'decoder.read',
    'alarm.read', 'alarm.update', 'alarm.acknowledge', 'alarm.resolve',
    'settings.read', 'settings.update',
  ],
  OPERATOR: [
    'dashboard.read',
    'meter.create', 'meter.read', 'meter.update',
    'module.create', 'module.read', 'module.update',
    'reading.read',
    'customer.create', 'customer.read', 'customer.update',
    'subscription.create', 'subscription.read', 'subscription.update',
    'profile.read', 'decoder.read',
    'alarm.read', 'alarm.update',
  ],
  VIEWER: [
    'dashboard.read', 'tenant.read', 'user.read',
    'meter.read', 'module.read', 'reading.read',
    'customer.read', 'subscription.read',
    'profile.read', 'decoder.read', 'alarm.read',
  ],
  FIELD_ENGINEER: [
    'dashboard.read',
    'meter.read', 'meter.update',
    'module.read', 'module.update',
    'reading.read', 'subscription.read',
    'alarm.read', 'alarm.acknowledge',
  ],
  CUSTOMER: [
    'dashboard.read', 'reading.read', 'meter.read',
    'subscription.read', 'alarm.read',
  ],
}

// Helper to get permissions for a role
const getPermissionsForRole = (role: string): string[] => {
  return ROLE_PERMISSIONS[role] || []
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  isHydrated: boolean
  isInitializing: boolean
  error: string | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    accessToken: null,
    refreshToken: null,
    isLoading: false,
    isHydrated: false,
    isInitializing: false,
    error: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken && !!state.user,
    
    currentUser: (state) => state.user,
    
    // Get all permissions for the current user (from primary tenant)
    // Falls back to role-based permissions if not available
    userPermissions: (state): string[] => {
      // If user has permissions directly, use them
      if (state.user?.permissions && state.user.permissions.length > 0) {
        return state.user.permissions
      }
      
      // Fallback: resolve from role (for backward compatibility with old localStorage data)
      if (state.user?.role) {
        return getPermissionsForRole(state.user.role)
      }
      
      // Fallback: resolve from primary tenant's role
      if (state.user?.tenants?.length) {
        const rolePriority = ['PLATFORM_ADMIN', 'TENANT_ADMIN', 'OPERATOR', 'FIELD_ENGINEER', 'VIEWER', 'CUSTOMER']
        const primaryTenant = state.user.tenants.reduce((best, current) => {
          const bestIndex = rolePriority.indexOf(best.role)
          const currentIndex = rolePriority.indexOf(current.role)
          return currentIndex < bestIndex ? current : best
        })
        return getPermissionsForRole(primaryTenant.role)
      }
      
      return []
    },
    
    // Get all permissions across all tenants
    allPermissions: (state): string[] => {
      if (!state.user?.tenants) return []
      // Resolve permissions from each tenant (use permissions or fallback to role)
      return [...new Set(state.user.tenants.flatMap(t => 
        t.permissions?.length ? t.permissions : getPermissionsForRole(t.role)
      ))]
    },
    
    userRoles: (state): SystemRole[] => {
      if (!state.user?.tenants) return []
      return state.user.tenants.map(t => t.role)
    },
    
    isPlatformAdmin: (state): boolean => {
      return state.user?.tenants?.some(t => t.role === 'PLATFORM_ADMIN') ?? false
    },
    
    isTenantAdmin: (state): boolean => {
      return state.user?.tenants?.some(t => t.role === 'TENANT_ADMIN') ?? false
    },
    
    isOperator: (state): boolean => {
      return state.user?.tenants?.some(t => t.role === 'OPERATOR') ?? false
    },
    
    isViewer: (state): boolean => {
      return state.user?.tenants?.some(t => t.role === 'VIEWER') ?? false
    },
    
    userTenants: (state): TenantAssignment[] => {
      return state.user?.tenants ?? []
    },
    
    primaryTenant: (state): TenantAssignment | null => {
      if (!state.user?.tenants?.length) return null
      // Return the tenant with highest role priority
      const rolePriority = ['PLATFORM_ADMIN', 'TENANT_ADMIN', 'OPERATOR', 'FIELD_ENGINEER', 'VIEWER', 'CUSTOMER']
      return state.user.tenants.reduce((best, current) => {
        const bestIndex = rolePriority.indexOf(best.role)
        const currentIndex = rolePriority.indexOf(current.role)
        return currentIndex < bestIndex ? current : best
      })
    },
    
    // Current tenant ID
    currentTenantId: (state): string | null => {
      return state.user?.tenantId ?? null
    },
  },

  actions: {
    async login(credentials: LoginForm) {
      this.isLoading = true
      this.error = null
      
      try {
        const apiBase = useApiUrl()
        const response = await $fetch<AuthResponse>(`${apiBase}/api/v1/auth/login`, {
          method: 'POST',
          body: credentials,
        })
        
        this.accessToken = response.accessToken
        this.refreshToken = response.refreshToken
        this.user = response.user
        
        // Store tokens and user in localStorage
        if (import.meta.client) {
          localStorage.setItem('accessToken', response.accessToken)
          localStorage.setItem('refreshToken', response.refreshToken)
          localStorage.setItem('user', JSON.stringify(response.user))
        }
        
        return true
      } catch (error: unknown) {
        const err = error as { data?: { message?: string } }
        this.error = err.data?.message || 'Login failed. Please check your credentials.'
        return false
      } finally {
        this.isLoading = false
      }
    },
    
    async logout() {
      this.user = null
      this.accessToken = null
      this.refreshToken = null
      this.error = null
      
      if (import.meta.client) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
      }
      
      navigateTo('/login')
    },
    
    async refreshAccessToken() {
      if (!this.refreshToken) return false
      
      try {
        const apiBase = useApiUrl()
        const response = await $fetch<AuthResponse>(`${apiBase}/api/v1/auth/refresh`, {
          method: 'POST',
          body: { refreshToken: this.refreshToken },
        })
        
        this.accessToken = response.accessToken
        this.refreshToken = response.refreshToken
        
        if (import.meta.client) {
          localStorage.setItem('accessToken', response.accessToken)
          localStorage.setItem('refreshToken', response.refreshToken)
        }
        
        return true
      } catch {
        await this.logout()
        return false
      }
    },
    
    async fetchCurrentUser() {
      if (!this.accessToken) return false
      
      try {
        const apiBase = useApiUrl()
        const user = await $fetch<User>(`${apiBase}/api/v1/auth/me`, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        })
        
        this.user = user
        
        // Update user in localStorage
        if (import.meta.client) {
          localStorage.setItem('user', JSON.stringify(user))
        }
        
        return true
      } catch {
        await this.logout()
        return false
      }
    },
    
    async initializeFromStorage() {
      // Prevent multiple initializations
      if (this.isHydrated || this.isInitializing) {
        return
      }
      
      if (import.meta.client) {
        this.isInitializing = true
        
        try {
          const accessToken = localStorage.getItem('accessToken')
          const refreshToken = localStorage.getItem('refreshToken')
          const userJson = localStorage.getItem('user')
          
          if (accessToken && refreshToken) {
            this.accessToken = accessToken
            this.refreshToken = refreshToken
            
            // Restore user from localStorage immediately for faster auth check
            if (userJson) {
              try {
                this.user = JSON.parse(userJson)
              } catch {
                // Invalid JSON, will fetch from API
              }
            }
            
            // Refresh user data from API in background (don't await to avoid blocking)
            // The user is already restored from localStorage so isAuthenticated will be true
            this.fetchCurrentUser()
          }
        } finally {
          // Mark as hydrated - client-side initialization is complete
          this.isHydrated = true
          this.isInitializing = false
        }
      }
    },
    
    hasRole(role: SystemRole): boolean {
      return this.user?.tenants?.some(t => t.role === role) ?? false
    },
    
    hasAnyRole(roles: SystemRole[]): boolean {
      return roles.some(role => this.hasRole(role))
    },
    
    hasTenantAccess(tenantId: string): boolean {
      return this.user?.tenants?.some(t => t.tenantId === tenantId) ?? false
    },
    
    // Permission checks
    hasPermission(permission: string): boolean {
      return this.userPermissions.includes(permission)
    },
    
    hasAnyPermission(permissions: string[]): boolean {
      return permissions.some(p => this.userPermissions.includes(p))
    },
    
    hasAllPermissions(permissions: string[]): boolean {
      return permissions.every(p => this.userPermissions.includes(p))
    },
    
    // Module-based permission checks
    canRead(module: string): boolean {
      return this.hasPermission(`${module}.read`)
    },
    
    canCreate(module: string): boolean {
      return this.hasPermission(`${module}.create`)
    },
    
    canUpdate(module: string): boolean {
      return this.hasPermission(`${module}.update`)
    },
    
    canDelete(module: string): boolean {
      return this.hasPermission(`${module}.delete`)
    },
    
    canAccessModule(module: string): boolean {
      return this.canRead(module)
    },
  },
})

