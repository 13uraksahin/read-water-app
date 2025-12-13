// =============================================================================
// Device Store - Inventory Management for Communication Units
// =============================================================================

import { defineStore } from 'pinia'
import type { Device, DeviceProfile, DeviceStatus, PaginatedResponse, CreateDeviceForm } from '~/types'

interface DeviceState {
  devices: Device[]
  deviceProfiles: DeviceProfile[]
  isLoading: boolean
  isLoadingProfiles: boolean
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  filters: {
    status?: DeviceStatus
    brand?: string
    technology?: string
    search?: string
  }
}

export const useDeviceStore = defineStore('devices', {
  state: (): DeviceState => ({
    devices: [],
    deviceProfiles: [],
    isLoading: false,
    isLoadingProfiles: false,
    pagination: {
      page: 1,
      limit: 30,
      total: 0,
      totalPages: 0,
    },
    filters: {},
  }),

  getters: {
    // Get devices by status
    warehouseDevices: (state): Device[] => {
      return state.devices.filter(d => d.status === 'WAREHOUSE')
    },
    
    deployedDevices: (state): Device[] => {
      return state.devices.filter(d => d.status === 'DEPLOYED')
    },
    
    maintenanceDevices: (state): Device[] => {
      return state.devices.filter(d => d.status === 'MAINTENANCE')
    },
    
    // Get device profile by ID
    getProfileById: (state) => (id: string): DeviceProfile | undefined => {
      return state.deviceProfiles.find(p => p.id === id)
    },
    
    // Get devices compatible with a meter profile
    getAvailableDevicesForProfile: (state) => (meterProfileId: string): Device[] => {
      // Filter devices that are in WAREHOUSE and have compatible profiles
      return state.devices.filter(device => {
        if (device.status !== 'WAREHOUSE') return false
        const profile = state.deviceProfiles.find(p => p.id === device.deviceProfileId)
        if (!profile) return false
        return profile.compatibleMeterProfiles?.some(mp => mp.id === meterProfileId) ?? false
      })
    },
  },

  actions: {
    // Fetch all devices with filters
    async fetchDevices(resetPage = false) {
      const api = useApi()
      
      if (resetPage) {
        this.pagination.page = 1
      }
      
      this.isLoading = true
      try {
        const params: Record<string, string | number | undefined> = {
          page: this.pagination.page,
          limit: this.pagination.limit,
          status: this.filters.status,
          brand: this.filters.brand,
          technology: this.filters.technology,
          search: this.filters.search,
        }
        
        const response = await api.getList<Device>('/api/v1/devices', params)
        
        this.devices = response.data
        this.pagination = {
          ...this.pagination,
          total: response.meta.total,
          totalPages: response.meta.totalPages,
        }
      } catch (error) {
        console.error('Failed to fetch devices:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    // Fetch device profiles
    async fetchDeviceProfiles() {
      const api = useApi()
      
      this.isLoadingProfiles = true
      try {
        const response = await api.getList<DeviceProfile>('/api/v1/device-profiles', {
          limit: 100,
        })
        
        this.deviceProfiles = response.data
      } catch (error) {
        console.error('Failed to fetch device profiles:', error)
        throw error
      } finally {
        this.isLoadingProfiles = false
      }
    },
    
    // Fetch available devices for linking to a meter
    async fetchAvailableDevices(tenantId: string, meterProfileId: string): Promise<Device[]> {
      const api = useApi()
      
      try {
        const response = await api.get<Device[]>(
          `/api/v1/devices/available?tenantId=${tenantId}&meterProfileId=${meterProfileId}`
        )
        return response
      } catch (error) {
        console.error('Failed to fetch available devices:', error)
        throw error
      }
    },
    
    // Get single device
    async fetchDevice(id: string): Promise<Device> {
      const api = useApi()
      
      try {
        const response = await api.get<Device>(`/api/v1/devices/${id}`)
        return response
      } catch (error) {
        console.error('Failed to fetch device:', error)
        throw error
      }
    },
    
    // Create new device
    async createDevice(data: CreateDeviceForm): Promise<Device> {
      const api = useApi()
      
      try {
        const response = await api.post<Device>('/api/v1/devices', { ...data })
        // Refresh list
        await this.fetchDevices()
        return response
      } catch (error) {
        console.error('Failed to create device:', error)
        throw error
      }
    },
    
    // Update device (uses PATCH for partial updates)
    async updateDevice(id: string, data: Partial<CreateDeviceForm>): Promise<Device> {
      const api = useApi()
      
      try {
        const response = await api.patch<Device>(`/api/v1/devices/${id}`, { ...data })
        // Refresh list
        await this.fetchDevices()
        return response
      } catch (error) {
        console.error('Failed to update device:', error)
        throw error
      }
    },
    
    // Delete device
    async deleteDevice(id: string): Promise<void> {
      const api = useApi()
      
      try {
        await api.del(`/api/v1/devices/${id}`)
        // Refresh list
        await this.fetchDevices()
      } catch (error) {
        console.error('Failed to delete device:', error)
        throw error
      }
    },
    
    // Link device to meter
    async linkDeviceToMeter(meterId: string, deviceId: string): Promise<void> {
      const api = useApi()
      
      try {
        await api.post(`/api/v1/meters/${meterId}/link-device`, { deviceId })
        // Refresh devices list
        await this.fetchDevices()
      } catch (error) {
        console.error('Failed to link device:', error)
        throw error
      }
    },
    
    // Unlink device from meter
    async unlinkDeviceFromMeter(meterId: string, deviceStatus: 'WAREHOUSE' | 'MAINTENANCE' = 'WAREHOUSE'): Promise<void> {
      const api = useApi()
      
      try {
        await api.post(`/api/v1/meters/${meterId}/unlink-device`, { deviceStatus })
        // Refresh devices list
        await this.fetchDevices()
      } catch (error) {
        console.error('Failed to unlink device:', error)
        throw error
      }
    },
    
    // Set filters
    setFilters(filters: Partial<DeviceState['filters']>) {
      this.filters = { ...this.filters, ...filters }
    },
    
    // Clear filters
    clearFilters() {
      this.filters = {}
    },
    
    // Set page
    setPage(page: number) {
      this.pagination.page = page
    },
  },
})
