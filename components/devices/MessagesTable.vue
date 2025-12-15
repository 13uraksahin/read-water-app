<script setup lang="ts">
import { Radio, Activity, Signal, Battery, Thermometer, Clock, RefreshCw } from 'lucide-vue-next'
import type { Reading } from '~/types'
import { formatDateTime } from '~/lib/utils'

const props = defineProps<{
  deviceId: string
}>()

const api = useApi()

// State
const readings = ref<Reading[]>([])
const isLoading = ref(true)
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const isRefreshing = ref(false)

// Fetch device messages (readings from this device)
const fetchMessages = async (showRefresh = false) => {
  if (showRefresh) {
    isRefreshing.value = true
  } else {
    isLoading.value = true
  }
  
  try {
    const response = await api.getList<Reading>('/api/v1/readings', {
      sourceDeviceId: props.deviceId,
      page: page.value,
      limit: limit.value,
    })
    readings.value = response.data
    total.value = response.meta?.total || 0
  } catch (error) {
    console.error('Failed to fetch device messages:', error)
  } finally {
    isLoading.value = false
    isRefreshing.value = false
  }
}

// Get signal color
const getSignalColor = (strength?: number): string => {
  if (strength == null) return 'text-muted-foreground'
  if (strength >= -70) return 'text-green-600'
  if (strength >= -90) return 'text-yellow-600'
  return 'text-red-600'
}

// Get battery color
const getBatteryColor = (level?: number): string => {
  if (level == null) return 'text-muted-foreground'
  if (level > 50) return 'text-green-600'
  if (level > 20) return 'text-yellow-600'
  return 'text-red-600'
}

// Pagination
const totalPages = computed(() => Math.ceil(total.value / limit.value))
const hasNextPage = computed(() => page.value < totalPages.value)
const hasPrevPage = computed(() => page.value > 1)

const goToPage = (p: number) => {
  page.value = p
  fetchMessages()
}

// Initial fetch
watch(() => props.deviceId, fetchMessages, { immediate: true })
</script>

<template>
  <UiCard>
    <UiCardHeader>
      <div class="flex items-center justify-between">
        <div>
          <UiCardTitle class="flex items-center gap-2">
            <Radio class="h-5 w-5" />
            Device Messages
          </UiCardTitle>
          <UiCardDescription>
            Communication history and readings from this device
            <span v-if="total > 0" class="ml-2">({{ total.toLocaleString() }} total)</span>
          </UiCardDescription>
        </div>
        
        <UiButton variant="outline" size="sm" :loading="isRefreshing" @click="fetchMessages(true)">
          <RefreshCw class="h-4 w-4" />
          Refresh
        </UiButton>
      </div>
    </UiCardHeader>
    
    <UiTable>
      <UiTableHeader>
        <UiTableRow>
          <UiTableHead>
            <div class="flex items-center gap-1">
              <Clock class="h-4 w-4" />
              Time
            </div>
          </UiTableHead>
          <UiTableHead>Meter</UiTableHead>
          <UiTableHead>Value (m³)</UiTableHead>
          <UiTableHead>Consumption</UiTableHead>
          <UiTableHead>
            <div class="flex items-center gap-1">
              <Signal class="h-4 w-4" />
              Signal
            </div>
          </UiTableHead>
          <UiTableHead>
            <div class="flex items-center gap-1">
              <Battery class="h-4 w-4" />
              Battery
            </div>
          </UiTableHead>
          <UiTableHead>
            <div class="flex items-center gap-1">
              <Thermometer class="h-4 w-4" />
              Temp
            </div>
          </UiTableHead>
          <UiTableHead>Source</UiTableHead>
        </UiTableRow>
      </UiTableHeader>
      
      <UiTableBody>
        <!-- Loading State -->
        <template v-if="isLoading">
          <UiTableRow v-for="i in 5" :key="i">
            <UiTableCell v-for="j in 8" :key="j">
              <UiSkeleton class="h-4 w-full" />
            </UiTableCell>
          </UiTableRow>
        </template>
        
        <!-- Empty State -->
        <template v-else-if="readings.length === 0">
          <UiTableRow>
            <UiTableCell :colspan="8" class="text-center py-12 text-muted-foreground">
              <Radio class="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p class="font-medium">No messages recorded</p>
              <p class="text-sm">This device hasn't sent any communications yet</p>
            </UiTableCell>
          </UiTableRow>
        </template>
        
        <!-- Data Rows -->
        <template v-else>
          <UiTableRow 
            v-for="reading in readings" 
            :key="reading.id"
            class="hover:bg-muted/50 cursor-pointer"
            @click="navigateTo(`/meters/${reading.meterId}`)"
          >
            <UiTableCell class="font-mono text-sm">
              {{ formatDateTime(reading.time) }}
            </UiTableCell>
            <UiTableCell>
              <NuxtLink 
                :to="`/meters/${reading.meterId}`"
                class="text-primary hover:underline font-mono text-sm"
                @click.stop
              >
                {{ reading.meter?.serialNumber || reading.meterId?.slice(0, 8) }}...
              </NuxtLink>
            </UiTableCell>
            <UiTableCell class="font-mono font-medium">
              {{ Number(reading.value ?? 0).toFixed(3) }}
            </UiTableCell>
            <UiTableCell class="font-mono">
              <span class="text-green-600">+{{ Number(reading.consumption ?? 0).toFixed(4) }}</span>
            </UiTableCell>
            <UiTableCell>
              <span :class="getSignalColor(reading.signalStrength)" class="font-mono">
                {{ reading.signalStrength ?? '-' }}
                <span v-if="reading.signalStrength" class="text-xs text-muted-foreground"> dBm</span>
              </span>
            </UiTableCell>
            <UiTableCell>
              <span :class="getBatteryColor(reading.batteryLevel)" class="font-mono">
                {{ reading.batteryLevel != null ? `${reading.batteryLevel}%` : '-' }}
              </span>
            </UiTableCell>
            <UiTableCell class="font-mono">
              {{ reading.temperature != null ? `${Number(reading.temperature).toFixed(1)}°C` : '-' }}
            </UiTableCell>
            <UiTableCell>
              <UiBadge variant="outline" class="text-xs">
                {{ reading.communicationTechnology?.replace(/_/g, '-') || reading.source || '-' }}
              </UiBadge>
            </UiTableCell>
          </UiTableRow>
        </template>
      </UiTableBody>
    </UiTable>
    
    <!-- Pagination -->
    <div v-if="totalPages > 1" class="p-4 border-t border-border flex items-center justify-between">
      <p class="text-sm text-muted-foreground">
        Showing {{ (page - 1) * limit + 1 }} - {{ Math.min(page * limit, total) }} of {{ total.toLocaleString() }}
      </p>
      
      <div class="flex items-center gap-2">
        <UiButton
          variant="outline"
          size="sm"
          :disabled="!hasPrevPage"
          @click="goToPage(page - 1)"
        >
          Previous
        </UiButton>
        
        <span class="text-sm px-2">
          Page {{ page }} of {{ totalPages }}
        </span>
        
        <UiButton
          variant="outline"
          size="sm"
          :disabled="!hasNextPage"
          @click="goToPage(page + 1)"
        >
          Next
        </UiButton>
      </div>
    </div>
  </UiCard>
</template>
