// =============================================================================
// Dashboard Store - Real-time Dashboard Data
// =============================================================================
// Manages dashboard state: stats, map data, alarms, and consumption chart
// Fetches from real API endpoints
// =============================================================================

import { defineStore } from 'pinia'
import type { DashboardStats, MeterMapData, MeterStatus } from '~/types'

// =============================================================================
// Types
// =============================================================================

export interface DashboardAlarm {
  id: string
  type: string
  status: string
  severity: number
  message: string | null
  createdAt: string
  meterSerial: string
  customerName: string | null
}

export interface ConsumptionDataPoint {
  date: string
  timestamp: number
  consumption: number
}

export type MeterMapStatus = 'alarm' | 'high_usage' | 'normal' | 'offline'

export interface MapMeterData extends MeterMapData {
  mapStatus: MeterMapStatus
  batteryLevel: number | null
  signalStrength: number | null
  lastCommunicationAt: string | null
}

interface DashboardState {
  // Stats
  stats: DashboardStats | null
  statsLoading: boolean
  statsError: string | null

  // Map data
  mapData: MapMeterData[]
  mapLoading: boolean
  mapError: string | null

  // Alarms
  alarms: DashboardAlarm[]
  alarmsLoading: boolean
  alarmsError: string | null

  // Consumption chart
  consumptionData: ConsumptionDataPoint[]
  consumptionLoading: boolean
  consumptionError: string | null
  consumptionDays: number

  // Last refresh timestamps
  lastStatsRefresh: Date | null
  lastMapRefresh: Date | null
  lastAlarmsRefresh: Date | null
  lastConsumptionRefresh: Date | null
}

// =============================================================================
// Store
// =============================================================================

export const useDashboardStore = defineStore('dashboard', {
  state: (): DashboardState => ({
    // Stats
    stats: null,
    statsLoading: false,
    statsError: null,

    // Map data
    mapData: [],
    mapLoading: false,
    mapError: null,

    // Alarms
    alarms: [],
    alarmsLoading: false,
    alarmsError: null,

    // Consumption chart
    consumptionData: [],
    consumptionLoading: false,
    consumptionError: null,
    consumptionDays: 30,

    // Last refresh timestamps
    lastStatsRefresh: null,
    lastMapRefresh: null,
    lastAlarmsRefresh: null,
    lastConsumptionRefresh: null,
  }),

  getters: {
    // Stats getters
    totalMeters: (state) => state.stats?.totalMeters ?? 0,
    totalCustomers: (state) => state.stats?.totalCustomers ?? 0,
    totalWaterUsage: (state) => state.stats?.totalWaterUsage ?? 0,
    activeAlarms: (state) => state.stats?.activeAlarms ?? 0,
    metersInMaintenance: (state) => state.stats?.metersInMaintenance ?? 0,
    metersOffline: (state) => state.stats?.metersOffline ?? 0,
    totalDevices: (state) => state.stats?.totalDevices ?? 0,
    devicesInWarehouse: (state) => state.stats?.devicesInWarehouse ?? 0,
    devicesDeployed: (state) => state.stats?.devicesDeployed ?? 0,

    // Map getters
    metersWithAlarms: (state) => state.mapData.filter(m => m.mapStatus === 'alarm'),
    metersOfflineOnMap: (state) => state.mapData.filter(m => m.mapStatus === 'offline'),
    metersWithHighUsage: (state) => state.mapData.filter(m => m.mapStatus === 'high_usage'),
    metersNormal: (state) => state.mapData.filter(m => m.mapStatus === 'normal'),

    // Computed center for map (average of all meter positions)
    mapCenter: (state) => {
      if (state.mapData.length === 0) {
        return { lat: 39.9334, lng: 32.8597 } // Default: Ankara
      }
      const sum = state.mapData.reduce(
        (acc, m) => ({
          lat: acc.lat + m.latitude,
          lng: acc.lng + m.longitude,
        }),
        { lat: 0, lng: 0 }
      )
      return {
        lat: sum.lat / state.mapData.length,
        lng: sum.lng / state.mapData.length,
      }
    },

    // Loading state
    isLoading: (state) =>
      state.statsLoading || state.mapLoading || state.alarmsLoading || state.consumptionLoading,

    // Has any error
    hasError: (state) =>
      !!(state.statsError || state.mapError || state.alarmsError || state.consumptionError),

    // Formatted chart data for ApexCharts
    chartSeries: (state) => [
      {
        name: 'Water Consumption',
        data: state.consumptionData.map(d => ({
          x: d.timestamp,
          y: d.consumption,
        })),
      },
    ],
  },

  actions: {
    // =========================================================================
    // Fetch Stats
    // =========================================================================
    async fetchStats(tenantId?: string) {
      const authStore = useAuthStore()
      if (!authStore.accessToken) return

      this.statsLoading = true
      this.statsError = null

      try {
        const apiBase = useApiUrl()
        const params = tenantId ? `?tenantId=${tenantId}` : ''
        const stats = await $fetch<DashboardStats>(
          `${apiBase}/api/v1/dashboard/stats${params}`,
          {
            headers: {
              Authorization: `Bearer ${authStore.accessToken}`,
            },
          }
        )

        this.stats = stats
        this.lastStatsRefresh = new Date()
      } catch (error: unknown) {
        console.error('Failed to fetch stats:', error)
        this.statsError = error instanceof Error ? error.message : 'Failed to fetch stats'
      } finally {
        this.statsLoading = false
      }
    },

    // =========================================================================
    // Fetch Map Data
    // =========================================================================
    async fetchMapData(tenantId?: string) {
      const authStore = useAuthStore()
      if (!authStore.accessToken) return

      this.mapLoading = true
      this.mapError = null

      try {
        const apiBase = useApiUrl()
        const params = tenantId ? `?tenantId=${tenantId}` : ''
        const data = await $fetch<MapMeterData[]>(
          `${apiBase}/api/v1/dashboard/map${params}`,
          {
            headers: {
              Authorization: `Bearer ${authStore.accessToken}`,
            },
          }
        )

        this.mapData = data
        this.lastMapRefresh = new Date()
      } catch (error: unknown) {
        console.error('Failed to fetch map data:', error)
        this.mapError = error instanceof Error ? error.message : 'Failed to fetch map data'
      } finally {
        this.mapLoading = false
      }
    },

    // =========================================================================
    // Fetch Alarms
    // =========================================================================
    async fetchAlarms(tenantId?: string, limit = 20) {
      const authStore = useAuthStore()
      if (!authStore.accessToken) return

      this.alarmsLoading = true
      this.alarmsError = null

      try {
        const apiBase = useApiUrl()
        const params = new URLSearchParams()
        if (tenantId) params.append('tenantId', tenantId)
        params.append('limit', limit.toString())

        const queryString = params.toString() ? `?${params.toString()}` : ''
        const data = await $fetch<DashboardAlarm[]>(
          `${apiBase}/api/v1/dashboard/alarms${queryString}`,
          {
            headers: {
              Authorization: `Bearer ${authStore.accessToken}`,
            },
          }
        )

        this.alarms = data
        this.lastAlarmsRefresh = new Date()
      } catch (error: unknown) {
        console.error('Failed to fetch alarms:', error)
        this.alarmsError = error instanceof Error ? error.message : 'Failed to fetch alarms'
      } finally {
        this.alarmsLoading = false
      }
    },

    // =========================================================================
    // Fetch Consumption Chart
    // =========================================================================
    async fetchConsumptionChart(tenantId?: string, days = 30) {
      const authStore = useAuthStore()
      if (!authStore.accessToken) return

      this.consumptionLoading = true
      this.consumptionError = null
      this.consumptionDays = days

      try {
        const apiBase = useApiUrl()
        const params = new URLSearchParams()
        if (tenantId) params.append('tenantId', tenantId)
        params.append('days', days.toString())

        const queryString = params.toString() ? `?${params.toString()}` : ''
        const data = await $fetch<ConsumptionDataPoint[]>(
          `${apiBase}/api/v1/dashboard/consumption${queryString}`,
          {
            headers: {
              Authorization: `Bearer ${authStore.accessToken}`,
            },
          }
        )

        this.consumptionData = data
        this.lastConsumptionRefresh = new Date()
      } catch (error: unknown) {
        console.error('Failed to fetch consumption chart:', error)
        this.consumptionError = error instanceof Error ? error.message : 'Failed to fetch consumption chart'
      } finally {
        this.consumptionLoading = false
      }
    },

    // =========================================================================
    // Fetch All Dashboard Data
    // =========================================================================
    async fetchAll(tenantId?: string) {
      // Fetch all in parallel
      await Promise.all([
        this.fetchStats(tenantId),
        this.fetchMapData(tenantId),
        this.fetchAlarms(tenantId),
        this.fetchConsumptionChart(tenantId),
      ])
    },

    // =========================================================================
    // Real-time Updates (called from socket)
    // =========================================================================
    handleNewReading(reading: { meterId: string; consumption: number }) {
      // Update stats
      if (this.stats) {
        this.stats.totalReadings++
        this.stats.totalWaterUsage += reading.consumption
      }

      // Could also update map status here if needed
    },

    handleNewAlarm(alarm: DashboardAlarm) {
      // Add to front of alarms list
      this.alarms.unshift(alarm)
      
      // Keep only the limit
      if (this.alarms.length > 20) {
        this.alarms.pop()
      }

      // Update stats
      if (this.stats) {
        this.stats.activeAlarms++
      }

      // Update map status for affected meter
      const meterIndex = this.mapData.findIndex(m => m.serialNumber === alarm.meterSerial)
      if (meterIndex !== -1) {
        this.mapData[meterIndex].hasAlarm = true
        this.mapData[meterIndex].mapStatus = 'alarm'
      }
    },

    handleAlarmResolved(alarmId: string) {
      const index = this.alarms.findIndex(a => a.id === alarmId)
      if (index !== -1) {
        this.alarms.splice(index, 1)
        
        // Update stats
        if (this.stats && this.stats.activeAlarms > 0) {
          this.stats.activeAlarms--
        }
      }
    },

    // =========================================================================
    // Reset State
    // =========================================================================
    reset() {
      this.stats = null
      this.mapData = []
      this.alarms = []
      this.consumptionData = []
      this.statsError = null
      this.mapError = null
      this.alarmsError = null
      this.consumptionError = null
    },
  },
})
