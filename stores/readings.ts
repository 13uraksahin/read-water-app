// =============================================================================
// Readings Store - Live Readings Management
// =============================================================================

import { defineStore } from 'pinia'
import type { Reading, PaginatedResponse } from '~/types'

interface ReadingsState {
  readings: Reading[]
  liveReadings: Reading[]
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const useReadingsStore = defineStore('readings', {
  state: (): ReadingsState => ({
    readings: [],
    liveReadings: [],
    isLoading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 30,
      total: 0,
      totalPages: 0,
    },
  }),

  getters: {
    latestReadings: (state): Reading[] => {
      // Combine live readings with historical, keeping unique by ID
      const combined = [...state.liveReadings, ...state.readings]
      const unique = new Map<string, Reading>()
      combined.forEach(r => {
        if (!unique.has(r.id)) {
          unique.set(r.id, r)
        }
      })
      return Array.from(unique.values()).slice(0, 100)
    },
    
    readingsByMeter: (state) => (meterId: string): Reading[] => {
      return state.readings.filter(r => r.meterId === meterId)
    },
  },

  actions: {
    async fetchReadings(params?: { page?: number; meterId?: string; tenantId?: string }) {
      const authStore = useAuthStore()
      if (!authStore.accessToken) return
      
      this.isLoading = true
      this.error = null
      
      try {
        const config = useRuntimeConfig()
        const queryParams = new URLSearchParams()
        
        queryParams.set('page', String(params?.page ?? this.pagination.page))
        queryParams.set('limit', String(this.pagination.limit))
        
        if (params?.meterId) queryParams.set('meterId', params.meterId)
        if (params?.tenantId) queryParams.set('tenantId', params.tenantId)
        
        const response = await $fetch<PaginatedResponse<Reading>>(
          `${config.public.apiBase}/api/v1/readings?${queryParams.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${authStore.accessToken}`,
            },
          }
        )
        
        this.readings = response.data
        this.pagination = {
          page: response.meta.page,
          limit: response.meta.limit,
          total: response.meta.total,
          totalPages: response.meta.totalPages,
        }
      } catch (error: unknown) {
        const err = error as { data?: { message?: string } }
        this.error = err.data?.message || 'Failed to fetch readings'
      } finally {
        this.isLoading = false
      }
    },
    
    addLiveReading(reading: Reading) {
      // Add to the beginning of live readings
      this.liveReadings.unshift(reading)
      
      // Keep only last 50 live readings
      if (this.liveReadings.length > 50) {
        this.liveReadings.pop()
      }
      
      // Notify app store
      const appStore = useAppStore()
      appStore.addNotification({
        type: 'info',
        title: 'New Reading',
        message: `Meter ${reading.meter?.serialNumber || reading.meterId}: ${reading.value} ${reading.unit}`,
      })
    },
    
    clearLiveReadings() {
      this.liveReadings = []
    },
    
    setPage(page: number) {
      this.pagination.page = page
      this.fetchReadings({ page })
    },
  },
})

