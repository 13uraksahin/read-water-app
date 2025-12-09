<script setup lang="ts">
import { AlertTriangle, Battery, Thermometer, RotateCcw, Radio } from 'lucide-vue-next'

// Mock alarms data
const mockAlarms = ref([
  {
    id: '1',
    type: 'TAMPER',
    severity: 'HIGH',
    message: 'Tamper detection on meter WM-002',
    meterSerial: 'WM-002',
    createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5 min ago
  },
  {
    id: '2',
    type: 'LOW_BATTERY',
    severity: 'MEDIUM',
    message: 'Low battery level (15%) on meter WM-007',
    meterSerial: 'WM-007',
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
  },
  {
    id: '3',
    type: 'REVERSE_FLOW',
    severity: 'HIGH',
    message: 'Reverse flow detected on meter WM-012',
    meterSerial: 'WM-012',
    createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
  },
  {
    id: '4',
    type: 'NO_SIGNAL',
    severity: 'LOW',
    message: 'No signal for 24h on meter WM-015',
    meterSerial: 'WM-015',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
])

// Alarm type icons
const alarmIcons: Record<string, typeof AlertTriangle> = {
  TAMPER: AlertTriangle,
  LOW_BATTERY: Battery,
  HIGH_TEMPERATURE: Thermometer,
  REVERSE_FLOW: RotateCcw,
  NO_SIGNAL: Radio,
}

// Severity colors
const severityColors: Record<string, string> = {
  HIGH: 'text-red-500 bg-red-500/10',
  MEDIUM: 'text-orange-500 bg-orange-500/10',
  LOW: 'text-yellow-500 bg-yellow-500/10',
}

// Format relative time
const formatRelativeTime = (date: Date): string => {
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
</script>

<template>
  <div class="space-y-3">
    <div v-if="mockAlarms.length === 0" class="text-center py-8 text-muted-foreground">
      <AlertTriangle class="h-8 w-8 mx-auto mb-2 opacity-50" />
      <p>No active alarms</p>
    </div>
    
    <div
      v-for="alarm in mockAlarms"
      :key="alarm.id"
      class="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
    >
      <div :class="['p-2 rounded-lg', severityColors[alarm.severity]]">
        <component :is="alarmIcons[alarm.type] || AlertTriangle" class="h-4 w-4" />
      </div>
      
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium truncate">{{ alarm.message }}</p>
        <div class="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span class="font-mono">{{ alarm.meterSerial }}</span>
          <span>•</span>
          <span>{{ formatRelativeTime(alarm.createdAt) }}</span>
        </div>
      </div>
      
      <UiBadge :variant="alarm.severity === 'HIGH' ? 'error' : alarm.severity === 'MEDIUM' ? 'warning' : 'secondary'" class="shrink-0">
        {{ alarm.severity }}
      </UiBadge>
    </div>
    
    <NuxtLink
      to="/alarms"
      class="block text-center text-sm text-primary hover:underline pt-2"
    >
      View all alarms →
    </NuxtLink>
  </div>
</template>

