// =============================================================================
// Module Store - Communication Module State Management
// =============================================================================
// Manages modules (IoT communication units) state
// =============================================================================

import { defineStore } from 'pinia'
import type { Module, ModuleProfile, ModuleStatus, PaginatedResponse } from '~/types'

interface ModuleState {
  modules: Module[]
  currentModule: Module | null
  moduleProfiles: ModuleProfile[]
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  filters: {
    status: ModuleStatus | ''
    brand: string
    technology: string
    search: string
  }
}

export const useModuleStore = defineStore('module', {
  state: (): ModuleState => ({
    modules: [],
    currentModule: null,
    moduleProfiles: [],
    isLoading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 30,
      total: 0,
      totalPages: 0,
    },
    filters: {
      status: '',
      brand: '',
      technology: '',
      search: '',
    },
  }),

  getters: {
    // Filter modules by status
    warehouseModules: (state) => state.modules.filter(m => m.status === 'WAREHOUSE'),
    deployedModules: (state) => state.modules.filter(m => m.status === 'DEPLOYED' || m.status === 'ACTIVE'),
    maintenanceModules: (state) => state.modules.filter(m => m.status === 'MAINTENANCE'),

    // Get module profile by ID
    getProfileById: (state) => (id: string) => state.moduleProfiles.find(p => p.id === id),
  },

  actions: {
    // Fetch modules
    async fetchModules(tenantId?: string) {
      const authStore = useAuthStore()
      if (!authStore.accessToken) return

      this.isLoading = true
      this.error = null

      try {
        const apiBase = useApiUrl()
        const params = new URLSearchParams()
        
        if (tenantId) params.append('tenantId', tenantId)
        if (this.filters.status) params.append('status', this.filters.status)
        if (this.filters.brand) params.append('brand', this.filters.brand)
        if (this.filters.search) params.append('search', this.filters.search)
        params.append('page', this.pagination.page.toString())
        params.append('limit', this.pagination.limit.toString())

        const queryString = params.toString() ? `?${params.toString()}` : ''
        const response = await $fetch<PaginatedResponse<Module>>(
          `${apiBase}/api/v1/modules${queryString}`,
          {
            headers: {
              Authorization: `Bearer ${authStore.accessToken}`,
            },
          }
        )

        this.modules = response.data
        this.pagination = {
          page: response.meta.page,
          limit: response.meta.limit,
          total: response.meta.total,
          totalPages: response.meta.totalPages,
        }
      } catch (error: unknown) {
        console.error('Failed to fetch modules:', error)
        this.error = error instanceof Error ? error.message : 'Failed to fetch modules'
      } finally {
        this.isLoading = false
      }
    },

    // Fetch single module
    async fetchModule(id: string) {
      const authStore = useAuthStore()
      if (!authStore.accessToken) return null

      this.isLoading = true
      this.error = null

      try {
        const apiBase = useApiUrl()
        const module = await $fetch<Module>(
          `${apiBase}/api/v1/modules/${id}`,
          {
            headers: {
              Authorization: `Bearer ${authStore.accessToken}`,
            },
          }
        )

        this.currentModule = module
        return module
      } catch (error: unknown) {
        console.error('Failed to fetch module:', error)
        this.error = error instanceof Error ? error.message : 'Failed to fetch module'
        return null
      } finally {
        this.isLoading = false
      }
    },

    // Fetch module profiles
    async fetchModuleProfiles() {
      const authStore = useAuthStore()
      if (!authStore.accessToken) return

      try {
        const apiBase = useApiUrl()
        const response = await $fetch<PaginatedResponse<ModuleProfile>>(
          `${apiBase}/api/v1/module-profiles?limit=100`,
          {
            headers: {
              Authorization: `Bearer ${authStore.accessToken}`,
            },
          }
        )

        this.moduleProfiles = response.data
      } catch (error: unknown) {
        console.error('Failed to fetch module profiles:', error)
      }
    },

    // Create module
    async createModule(data: Partial<Module>) {
      const authStore = useAuthStore()
      if (!authStore.accessToken) throw new Error('Not authenticated')

      const apiBase = useApiUrl()
      const module = await $fetch<Module>(
        `${apiBase}/api/v1/modules`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
          body: data,
        }
      )

      this.modules.unshift(module)
      return module
    },

    // Update module
    async updateModule(id: string, data: Partial<Module>) {
      const authStore = useAuthStore()
      if (!authStore.accessToken) throw new Error('Not authenticated')

      const apiBase = useApiUrl()
      const module = await $fetch<Module>(
        `${apiBase}/api/v1/modules/${id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
          body: data,
        }
      )

      const index = this.modules.findIndex(m => m.id === id)
      if (index !== -1) {
        this.modules[index] = module
      }

      if (this.currentModule?.id === id) {
        this.currentModule = module
      }

      return module
    },

    // Delete module
    async deleteModule(id: string) {
      const authStore = useAuthStore()
      if (!authStore.accessToken) throw new Error('Not authenticated')

      const apiBase = useApiUrl()
      await $fetch(
        `${apiBase}/api/v1/modules/${id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authStore.accessToken}`,
          },
        }
      )

      this.modules = this.modules.filter(m => m.id !== id)
      if (this.currentModule?.id === id) {
        this.currentModule = null
      }
    },

    // Set filters
    setFilters(filters: Partial<ModuleState['filters']>) {
      this.filters = { ...this.filters, ...filters }
      this.pagination.page = 1
    },

    // Set page
    setPage(page: number) {
      this.pagination.page = page
    },

    // Reset state
    reset() {
      this.modules = []
      this.currentModule = null
      this.error = null
      this.pagination = {
        page: 1,
        limit: 30,
        total: 0,
        totalPages: 0,
      }
      this.filters = {
        status: '',
        brand: '',
        technology: '',
        search: '',
      }
    },
  },
})
