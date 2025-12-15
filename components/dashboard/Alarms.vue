<script setup lang="ts">
import { AlertTriangle, Battery, Thermometer, RotateCcw, Radio, Droplets, Wifi, AlertCircle, Loader2 } from 'lucide-vue-next'
import type { Component } from 'vue'

// Stores
const dashboardStore = useDashboardStore()
const appStore = useAppStore()

// Computed alarms from store
const alarms = computed(() => dashboardStore.alarms)
const isLoading = computed(() => dashboardStore.alarmsLoading)
const error = computed(() => dashboardStore.alarmsError)

// Alarm type icons
const alarmIcons: Record<string, Component> = {
  TAMPER: AlertTriangle,
  LOW_BATTERY: Battery,
  HIGH_TEMPERATURE: Thermometer,
  REVERSE_FLOW: RotateCcw,
  NO_SIGNAL: Radio,
  HIGH_USAGE: Droplets,
  COMMUNICATION_ERROR: Wifi,
  VALVE_ERROR: AlertCircle,
  TILT: AlertTriangle,
}

// Severity labels and colors
const getSeverityLabel = (severity: number): string => {
  if (severity >= 4) return 'HIGH'
  if (severity >= 2) return 'MEDIUM'
  return 'LOW'
}

const severityColors: Record<string, string> = {
  HIGH: 'text-red-500 bg-red-500/10',
  MEDIUM: 'text-orange-500 bg-orange-500/10',
  LOW: 'text-yellow-500 bg-yellow-500/10',
}

// Format relative time
const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 1000 / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

// Fetch alarms on mount
onMounted(() => {
  dashboardStore.fetchAlarms(appStore.activeTenantId ?? undefined)
})
</script>

<template>
  <div class="space-y-3">
    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
    
    <!-- Error state -->
    <div v-else-if="error" class="text-center py-8 text-red-500">
      <AlertTriangle class="h-8 w-8 mx-auto mb-2" />
      <p class="text-sm">{{ error }}</p>
    </div>
    
    <!-- Empty state -->
    <div v-else-if="alarms.length === 0" class="text-center py-8 text-muted-foreground">
      <AlertTriangle class="h-8 w-8 mx-auto mb-2 opacity-50" />
      <p>No active alarms</p>
    </div>
    
    <!-- Alarms list -->
    <template v-else>
      <div
        v-for="alarm in alarms"
        :key="alarm.id"
        class="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
      >
        <div :class="['p-2 rounded-lg', severityColors[getSeverityLabel(alarm.severity)]]">
          <component :is="alarmIcons[alarm.type] || AlertTriangle" class="h-4 w-4" />
        </div>
        
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">{{ alarm.message || `${alarm.type} on meter ${alarm.meterSerial}` }}</p>
          <div class="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span class="font-mono">{{ alarm.meterSerial }}</span>
            <span v-if="alarm.customerName">•</span>
            <span v-if="alarm.customerName" class="truncate">{{ alarm.customerName }}</span>
            <span>•</span>
            <span>{{ formatRelativeTime(alarm.createdAt) }}</span>
          </div>
        </div>
        
        <UiBadge 
          :variant="getSeverityLabel(alarm.severity) === 'HIGH' ? 'error' : getSeverityLabel(alarm.severity) === 'MEDIUM' ? 'warning' : 'secondary'" 
          class="shrink-0"
        >
          {{ getSeverityLabel(alarm.severity) }}
        </UiBadge>
      </div>
    </template>
    
    <NuxtLink
      to="/alarms"
      class="block text-center text-sm text-primary hover:underline pt-2"
    >
      View all alarms →
    </NuxtLink>
  </div>
</template>

