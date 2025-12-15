// =============================================================================
// Socket.IO Client Plugin
// =============================================================================

import { io, type Socket } from 'socket.io-client'
import type { Reading, Alarm } from '~/types'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()
  const readingsStore = useReadingsStore()
  const appStore = useAppStore()
  
  let socket: Socket | null = null
  let connectionAttempts = 0
  const maxRetries = 5
  
  // Determine socket URL based on current environment (auto-detect)
  const getSocketUrl = () => {
    // On client-side, auto-detect based on current hostname
    const hostname = window.location.hostname
    const isSecure = window.location.protocol === 'https:'
    
    // If accessing via tunnel domain or HTTPS, use tunnel API URL for socket
    if (hostname.includes('portall.com.tr') || isSecure) {
      return config.public.tunnelApiUrl || 'https://read-water-api.portall.com.tr'
    }
    
    // Otherwise use localhost
    return config.public.socketUrl
  }
  
  const connect = () => {
    if (socket?.connected) return
    
    const token = authStore.accessToken
    if (!token) {
      console.warn('[Socket] No auth token, skipping connection')
      return
    }
    
    const socketUrl = getSocketUrl()
    console.log('[Socket] Connecting to:', socketUrl)
    
    socket = io(`${socketUrl}/realtime`, {
      auth: { token },
      // Use polling first for Cloudflare tunnel compatibility, then upgrade to websocket
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: maxRetries,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // Cloudflare tunnel support
      withCredentials: true,
      forceNew: true,
    })
    
    // Connection events
    socket.on('connect', () => {
      console.log('[Socket] Connected to realtime server')
      connectionAttempts = 0
      
      // Subscribe to tenant-specific rooms
      const tenants = authStore.userTenants
      tenants.forEach(tenant => {
        socket?.emit('subscribe:tenant', { tenantId: tenant.tenantId })
      })
    })
    
    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason)
    })
    
    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message)
      connectionAttempts++
      
      if (connectionAttempts >= maxRetries) {
        console.error('[Socket] Max retries reached, giving up')
        socket?.disconnect()
      }
    })
    
    // Reading events
    socket.on('reading.new', (reading: Reading) => {
      console.log('[Socket] New reading received:', reading.id)
      readingsStore.addLiveReading(reading)
    })
    
    socket.on('reading.batch', (readings: Reading[]) => {
      console.log('[Socket] Batch readings received:', readings.length)
      readings.forEach(reading => readingsStore.addLiveReading(reading))
    })
    
    // Alarm events
    socket.on('alarm.new', (alarm: Alarm) => {
      console.log('[Socket] New alarm:', alarm.id)
      appStore.addNotification({
        type: 'error',
        title: 'Alarm Alert',
        message: alarm.message || 'New alarm triggered',
      })
    })
    
    socket.on('alarm.resolved', (alarm: Alarm) => {
      console.log('[Socket] Alarm resolved:', alarm.id)
      appStore.addNotification({
        type: 'success',
        title: 'Alarm Resolved',
        message: alarm.message || 'Alarm has been resolved',
      })
    })
    
    // Meter events
    socket.on('meter.status', (data: { meterId: string; status: string }) => {
      console.log('[Socket] Meter status change:', data.meterId, data.status)
    })
    
    socket.on('meter.valve', (data: { meterId: string; valveStatus: string }) => {
      console.log('[Socket] Valve status change:', data.meterId, data.valveStatus)
    })
  }
  
  const disconnect = () => {
    if (socket) {
      socket.disconnect()
      socket = null
      connectionAttempts = 0
    }
  }
  
  const emit = (event: string, data?: unknown) => {
    if (socket?.connected) {
      socket.emit(event, data)
    } else {
      console.warn('[Socket] Not connected, cannot emit:', event)
    }
  }
  
  const on = (event: string, callback: (...args: unknown[]) => void) => {
    socket?.on(event, callback)
  }
  
  const off = (event: string, callback?: (...args: unknown[]) => void) => {
    if (callback) {
      socket?.off(event, callback)
    } else {
      socket?.off(event)
    }
  }
  
  // Auto-connect when auth changes
  watch(
    () => authStore.accessToken,
    (token) => {
      if (token) {
        connect()
      } else {
        disconnect()
      }
    },
    { immediate: true }
  )
  
  return {
    provide: {
      socket: {
        connect,
        disconnect,
        emit,
        on,
        off,
        get connected() {
          return socket?.connected ?? false
        },
      },
    },
  }
})

