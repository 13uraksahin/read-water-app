<script setup lang="ts">
import { Activity, RefreshCw, Download, Filter, Wifi, WifiOff } from 'lucide-vue-next'
import { formatDateTime, formatWaterUsage } from '~/lib/utils'

definePageMeta({
  middleware: ['auth'],
})

const readingsStore = useReadingsStore()
const appStore = useAppStore()
const { $socket } = useNuxtApp()

// Connection status
const isConnected = ref(false)

// Filter state
const showFilters = ref(false)
const filterMeter = ref('')
const filterTenant = ref('')

// Fetch readings on mount
onMounted(() => {
  readingsStore.fetchReadings()
  
  // Check socket connection
  if ($socket) {
    isConnected.value = $socket.connected
  }
})

// Watch for tenant changes and refetch
watch(() => appStore.activeTenantId, () => {
  readingsStore.fetchReadings()
})

// Combined readings (live + historical)
const displayReadings = computed(() => {
  return readingsStore.latestReadings
})

// Pagination
const currentPage = computed(() => readingsStore.pagination.page)
const totalPages = computed(() => readingsStore.pagination.totalPages)

const goToPage = (page: number) => {
  readingsStore.setPage(page)
}

// Refresh readings
const refreshReadings = () => {
  readingsStore.fetchReadings()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <Activity class="h-6 w-6 text-primary" />
          Live Readings
        </h1>
        <p class="text-muted-foreground">Real-time water meter readings</p>
      </div>
      
      <div class="flex items-center gap-2">
        <!-- Connection status -->
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm" :class="isConnected ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'">
          <Wifi v-if="isConnected" class="h-4 w-4" />
          <WifiOff v-else class="h-4 w-4" />
          <span>{{ isConnected ? 'Live' : 'Offline' }}</span>
        </div>
        
        <!-- Refresh button -->
        <UiButton variant="outline" size="sm" @click="refreshReadings">
          <RefreshCw class="h-4 w-4" />
          Refresh
        </UiButton>
        
        <!-- Filter button -->
        <UiButton variant="outline" size="sm" @click="showFilters = !showFilters">
          <Filter class="h-4 w-4" />
          Filter
        </UiButton>
        
        <!-- Export button -->
        <UiButton variant="outline" size="sm">
          <Download class="h-4 w-4" />
          Export
        </UiButton>
      </div>
    </div>
    
    <!-- Filters panel -->
    <Transition name="slide">
      <UiCard v-if="showFilters" class="p-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <UiLabel>Meter</UiLabel>
            <UiInput v-model="filterMeter" placeholder="Filter by meter..." />
          </div>
          <div>
            <UiLabel>Tenant</UiLabel>
            <UiInput v-model="filterTenant" placeholder="Filter by tenant..." />
          </div>
          <div class="flex items-end">
            <UiButton @click="refreshReadings">Apply Filters</UiButton>
          </div>
        </div>
      </UiCard>
    </Transition>
    
    <!-- Live readings indicator -->
    <div v-if="readingsStore.liveReadings.length > 0" class="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm">
      <span class="relative flex h-2 w-2">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
        <span class="relative inline-flex rounded-full h-2 w-2 bg-primary" />
      </span>
      <span>{{ readingsStore.liveReadings.length }} new readings received</span>
    </div>
    
    <!-- Readings table -->
    <UiCard>
      <UiTable>
        <UiTableHeader>
          <UiTableRow>
            <UiTableHead>Time</UiTableHead>
            <UiTableHead>Meter</UiTableHead>
            <UiTableHead>Customer</UiTableHead>
            <UiTableHead>Value</UiTableHead>
            <UiTableHead>Consumption</UiTableHead>
            <UiTableHead>Signal</UiTableHead>
            <UiTableHead>Battery</UiTableHead>
            <UiTableHead>Technology</UiTableHead>
          </UiTableRow>
        </UiTableHeader>
        <UiTableBody>
          <template v-if="readingsStore.isLoading">
            <UiTableRow v-for="i in 10" :key="i">
              <UiTableCell v-for="j in 8" :key="j">
                <UiSkeleton class="h-4 w-full" />
              </UiTableCell>
            </UiTableRow>
          </template>
          
          <template v-else-if="displayReadings.length === 0">
            <UiTableRow>
              <UiTableCell :colspan="8" class="text-center py-8 text-muted-foreground">
                No readings found
              </UiTableCell>
            </UiTableRow>
          </template>
          
          <template v-else>
            <UiTableRow
              v-for="reading in displayReadings"
              :key="reading.id"
              :class="readingsStore.liveReadings.some(r => r.id === reading.id) ? 'bg-primary/5' : ''"
            >
              <UiTableCell class="font-mono text-xs">
                {{ formatDateTime(reading.time) }}
              </UiTableCell>
              <UiTableCell>
                <NuxtLink :to="`/meters/${reading.meterId}`" class="text-primary hover:underline font-medium">
                  {{ reading.meter?.serialNumber || reading.meterId.slice(0, 8) }}
                </NuxtLink>
              </UiTableCell>
              <UiTableCell>
                {{ reading.meter?.customer?.details?.firstName || 'N/A' }}
              </UiTableCell>
              <UiTableCell class="font-mono">
                {{ formatWaterUsage(reading.value, reading.unit) }}
              </UiTableCell>
              <UiTableCell class="font-mono">
                {{ formatWaterUsage(reading.consumption, reading.unit) }}
              </UiTableCell>
              <UiTableCell>
                <span v-if="reading.signalStrength" class="font-mono text-xs">
                  {{ reading.signalStrength }} dBm
                </span>
                <span v-else class="text-muted-foreground">-</span>
              </UiTableCell>
              <UiTableCell>
                <UiBadge
                  v-if="reading.batteryLevel"
                  :variant="reading.batteryLevel < 20 ? 'warning' : reading.batteryLevel < 50 ? 'secondary' : 'success'"
                >
                  {{ reading.batteryLevel }}%
                </UiBadge>
                <span v-else class="text-muted-foreground">-</span>
              </UiTableCell>
              <UiTableCell>
                <UiBadge variant="outline">
                  {{ reading.communicationTechnology || 'Unknown' }}
                </UiBadge>
              </UiTableCell>
            </UiTableRow>
          </template>
        </UiTableBody>
      </UiTable>
      
      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-border">
        <p class="text-sm text-muted-foreground">
          Page {{ currentPage }} of {{ totalPages }}
        </p>
        <div class="flex items-center gap-2">
          <UiButton
            variant="outline"
            size="sm"
            :disabled="currentPage <= 1"
            @click="goToPage(currentPage - 1)"
          >
            Previous
          </UiButton>
          <UiButton
            variant="outline"
            size="sm"
            :disabled="currentPage >= totalPages"
            @click="goToPage(currentPage + 1)"
          >
            Next
          </UiButton>
        </div>
      </div>
    </UiCard>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>

