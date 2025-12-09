// =============================================================================
// Auth Store - Pinia
// =============================================================================

import { defineStore } from 'pinia'
import type { User, AuthResponse, LoginForm, SystemRole, TenantAssignment } from '~/types'

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
    
    userTenants: (state): TenantAssignment[] => {
      return state.user?.tenants ?? []
    },
    
    primaryTenant: (state): TenantAssignment | null => {
      if (!state.user?.tenants?.length) return null
      // Return the tenant with highest role priority
      const rolePriority = ['PLATFORM_ADMIN', 'TENANT_ADMIN', 'OPERATOR', 'VIEWER', 'FIELD_ENGINEER', 'CUSTOMER']
      return state.user.tenants.reduce((best, current) => {
        const bestIndex = rolePriority.indexOf(best.role)
        const currentIndex = rolePriority.indexOf(current.role)
        return currentIndex < bestIndex ? current : best
      })
    },
  },

  actions: {
    async login(credentials: LoginForm) {
      this.isLoading = true
      this.error = null
      
      try {
        const config = useRuntimeConfig()
        const response = await $fetch<AuthResponse>(`${config.public.apiBase}/api/v1/auth/login`, {
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
        const config = useRuntimeConfig()
        const response = await $fetch<AuthResponse>(`${config.public.apiBase}/api/v1/auth/refresh`, {
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
        const config = useRuntimeConfig()
        const user = await $fetch<User>(`${config.public.apiBase}/api/v1/auth/me`, {
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
  },
})

