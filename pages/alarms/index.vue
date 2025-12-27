<script setup lang="ts">
import { AlertTriangle, RefreshCw, Download, Filter, Battery, Thermometer, RotateCcw, Radio, CheckCircle } from 'lucide-vue-next'
import { formatDateTime } from '~/lib/utils'

interface Alarm {
  id: string
  type: string
  status: string
  severity: number
  message: string | null
  createdAt: string
  meter?: {
    id: string
    serialNumber: string
    latitude: number | null
    longitude: number | null
    address: Record<string, unknown> | null
  }
  tenant?: {
    id: string
    name: string
  }
}

definePageMeta({
  middleware: ['auth'],
})

const api = useApi()
const toast = useToast()

// State
const alarms = ref<Alarm[]>([])
const isLoading = ref(true)
const pagination = ref({
  page: 1,
  limit: 30,
  total: 0,
  totalPages: 0,
})

// Filter state
const showFilters = ref(false)
const filterStatus = ref('')
const filterType = ref('')

// Alarm type icons
const alarmIcons: Record<string, typeof AlertTriangle> = {
  TAMPER: AlertTriangle,
  LOW_BATTERY: Battery,
  HIGH_TEMPERATURE: Thermometer,
  REVERSE_FLOW: RotateCcw,
  NO_SIGNAL: Radio,
  TILT: AlertTriangle,
}

// Severity to label
const getSeverityLabel = (severity: number): string => {
  if (severity >= 4) return 'HIGH'
  if (severity >= 2) return 'MEDIUM'
  return 'LOW'
}

// Severity colors for badge
const severityVariants: Record<string, 'error' | 'warning' | 'secondary'> = {
  HIGH: 'error',
  MEDIUM: 'warning',
  LOW: 'secondary',
}

// Severity colors for icon background
const severityColors: Record<string, string> = {
  HIGH: 'text-red-500 bg-red-500/10',
  MEDIUM: 'text-orange-500 bg-orange-500/10',
  LOW: 'text-yellow-500 bg-yellow-500/10',
}

// Fetch alarms
const fetchAlarms = async () => {
  isLoading.value = true
  try {
    const params: Record<string, string | number> = {
      page: pagination.value.page,
      limit: pagination.value.limit,
    }
    if (filterStatus.value) params.status = filterStatus.value
    if (filterType.value) params.type = filterType.value

    const response = await api.getList<Alarm>('/api/v1/alarms', params)
    alarms.value = response.data
    pagination.value = {
      ...pagination.value,
      total: response.meta.total,
      totalPages: response.meta.totalPages,
    }
  } catch (error) {
    toast.error('Failed to fetch alarms')
  } finally {
    isLoading.value = false
  }
}

// Alarm counts by severity
const alarmCounts = computed(() => ({
  total: pagination.value.total,
  high: alarms.value.filter(a => a.severity >= 4).length,
  medium: alarms.value.filter(a => a.severity >= 2 && a.severity < 4).length,
  low: alarms.value.filter(a => a.severity < 2).length,
  active: alarms.value.filter(a => a.status === 'ACTIVE').length,
}))

// Filtered alarms (local filtering after API filter)
const filteredAlarms = computed(() => alarms.value)

// Refresh alarms
const refreshAlarms = () => {
  fetchAlarms()
}

// Acknowledge alarm
const acknowledgeAlarm = async (alarmId: string) => {
  try {
    await api.post(`/api/v1/alarms/${alarmId}/acknowledge`, {})
    toast.success('Alarm acknowledged')
    fetchAlarms()
  } catch (error) {
    toast.error('Failed to acknowledge alarm')
  }
}

// Get meter location string
const getMeterLocation = (alarm: Alarm): string => {
  if (alarm.meter?.address) {
    const addr = alarm.meter.address as Record<string, string>
    return [addr.city, addr.district].filter(Boolean).join(', ') || '-'
  }
  return '-'
}

// Watch for filter changes
watch([filterStatus, filterType], () => {
  pagination.value.page = 1
  fetchAlarms()
})

// Fetch on mount (NuxtPage key ensures re-mount on navigation)
onMounted(() => {
  fetchAlarms()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle class="h-6 w-6 text-primary" />
          Alarms
        </h1>
        <p class="text-muted-foreground">View and manage meter alarms</p>
      </div>
      
      <div class="flex items-center gap-2">
        <!-- Refresh button -->
        <UiButton variant="outline" size="sm" @click="refreshAlarms">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
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
    
    <!-- Stats cards -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
      <UiCard class="p-4">
        <p class="text-sm text-muted-foreground">Total Alarms</p>
        <p class="text-2xl font-bold">{{ alarmCounts.total }}</p>
      </UiCard>
      <UiCard class="p-4">
        <p class="text-sm text-muted-foreground">High Severity</p>
        <p class="text-2xl font-bold text-red-500">{{ alarmCounts.high }}</p>
      </UiCard>
      <UiCard class="p-4">
        <p class="text-sm text-muted-foreground">Medium Severity</p>
        <p class="text-2xl font-bold text-orange-500">{{ alarmCounts.medium }}</p>
      </UiCard>
      <UiCard class="p-4">
        <p class="text-sm text-muted-foreground">Low Severity</p>
        <p class="text-2xl font-bold text-yellow-500">{{ alarmCounts.low }}</p>
      </UiCard>
      <UiCard class="p-4">
        <p class="text-sm text-muted-foreground">Active</p>
        <p class="text-2xl font-bold text-primary">{{ alarmCounts.active }}</p>
      </UiCard>
    </div>
    
    <!-- Filters panel -->
    <Transition name="slide">
      <UiCard v-if="showFilters" class="p-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <UiLabel>Status</UiLabel>
            <UiSelect
              v-model="filterStatus"
              :options="[
                { label: 'All statuses', value: '' },
                { label: 'Active', value: 'ACTIVE' },
                { label: 'Acknowledged', value: 'ACKNOWLEDGED' },
                { label: 'Resolved', value: 'RESOLVED' },
              ]"
              placeholder="All statuses"
            />
          </div>
          <div>
            <UiLabel>Alarm Type</UiLabel>
            <UiSelect
              v-model="filterType"
              :options="[
                { label: 'All types', value: '' },
                { label: 'Tamper', value: 'TAMPER' },
                { label: 'Low Battery', value: 'LOW_BATTERY' },
                { label: 'Reverse Flow', value: 'REVERSE_FLOW' },
                { label: 'No Signal', value: 'NO_SIGNAL' },
                { label: 'Tilt', value: 'TILT' },
              ]"
              placeholder="All types"
            />
          </div>
          <div class="flex items-end gap-2">
            <UiButton @click="filterStatus = ''; filterType = ''">Clear Filters</UiButton>
          </div>
        </div>
      </UiCard>
    </Transition>
    
    <!-- Alarms table -->
    <UiCard>
      <UiTable>
        <UiTableHeader>
          <UiTableRow>
            <UiTableHead>Type</UiTableHead>
            <UiTableHead>Message</UiTableHead>
            <UiTableHead>Meter</UiTableHead>
            <UiTableHead>Location</UiTableHead>
            <UiTableHead>Tenant</UiTableHead>
            <UiTableHead>Time</UiTableHead>
            <UiTableHead>Severity</UiTableHead>
            <UiTableHead>Status</UiTableHead>
            <UiTableHead>Actions</UiTableHead>
          </UiTableRow>
        </UiTableHeader>
        <UiTableBody>
          <template v-if="isLoading">
            <UiTableRow v-for="i in 5" :key="i">
              <UiTableCell v-for="j in 9" :key="j">
                <UiSkeleton class="h-4 w-full" />
              </UiTableCell>
            </UiTableRow>
          </template>
          
          <template v-else-if="filteredAlarms.length === 0">
            <UiTableRow>
              <UiTableCell :colspan="9" class="text-center py-8 text-muted-foreground">
                <AlertTriangle class="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No alarms found</p>
              </UiTableCell>
            </UiTableRow>
          </template>
          
          <template v-else>
            <UiTableRow
              v-for="alarm in filteredAlarms"
              :key="alarm.id"
              :class="alarm.status !== 'ACTIVE' ? 'bg-muted/30' : ''"
            >
              <UiTableCell>
                <div :class="['p-2 rounded-lg w-fit', severityColors[getSeverityLabel(alarm.severity)]]">
                  <component :is="alarmIcons[alarm.type] || AlertTriangle" class="h-4 w-4" />
                </div>
              </UiTableCell>
              <UiTableCell class="max-w-[200px] truncate">
                {{ alarm.message || alarm.type }}
              </UiTableCell>
              <UiTableCell>
                <NuxtLink v-if="alarm.meter" :to="`/meters/${alarm.meter.id}`" class="text-primary hover:underline font-mono text-sm">
                  {{ alarm.meter.serialNumber }}
                </NuxtLink>
                <span v-else class="text-muted-foreground">-</span>
              </UiTableCell>
              <UiTableCell class="text-sm text-muted-foreground">
                {{ getMeterLocation(alarm) }}
              </UiTableCell>
              <UiTableCell class="text-sm">
                {{ alarm.tenant?.name || '-' }}
              </UiTableCell>
              <UiTableCell class="font-mono text-xs">
                {{ formatDateTime(alarm.createdAt) }}
              </UiTableCell>
              <UiTableCell>
                <UiBadge :variant="severityVariants[getSeverityLabel(alarm.severity)]">
                  {{ getSeverityLabel(alarm.severity) }}
                </UiBadge>
              </UiTableCell>
              <UiTableCell>
                <UiBadge :variant="alarm.status === 'ACTIVE' ? 'outline' : 'secondary'">
                  {{ alarm.status }}
                </UiBadge>
              </UiTableCell>
              <UiTableCell>
                <UiButton
                  v-if="alarm.status === 'ACTIVE'"
                  variant="ghost"
                  size="sm"
                  @click="acknowledgeAlarm(alarm.id)"
                >
                  <CheckCircle class="h-4 w-4" />
                </UiButton>
              </UiTableCell>
            </UiTableRow>
          </template>
        </UiTableBody>
      </UiTable>
      
      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-border">
        <p class="text-sm text-muted-foreground">
          Page {{ pagination.page }} of {{ pagination.totalPages }}
        </p>
        <div class="flex items-center gap-2">
          <UiButton
            variant="outline"
            size="sm"
            :disabled="pagination.page <= 1"
            @click="pagination.page--; fetchAlarms()"
          >
            Previous
          </UiButton>
          <UiButton
            variant="outline"
            size="sm"
            :disabled="pagination.page >= pagination.totalPages"
            @click="pagination.page++; fetchAlarms()"
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
