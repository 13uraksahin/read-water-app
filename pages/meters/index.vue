<script setup lang="ts">
import { Gauge, Plus, Search, Filter, Download } from 'lucide-vue-next'
import type { Meter, MeterStatus, PaginatedResponse } from '~/types'
import { formatDate } from '~/lib/utils'

definePageMeta({
  middleware: ['auth'],
})

const api = useApi()
const toast = useToast()
const appStore = useAppStore()

// State
const meters = ref<Meter[]>([])
const isLoading = ref(true)
const showCreateDialog = ref(false)
const searchQuery = ref('')
const statusFilter = ref<MeterStatus | ''>('')

// Pagination
const pagination = ref({
  page: 1,
  limit: 30,
  total: 0,
  totalPages: 0,
})

// Status options
const statusOptions = [
  { label: 'All Statuses', value: '' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Passive', value: 'PASSIVE' },
  { label: 'Warehouse', value: 'WAREHOUSE' },
  { label: 'Maintenance', value: 'MAINTENANCE' },
  { label: 'Planned', value: 'PLANNED' },
  { label: 'Deployed', value: 'DEPLOYED' },
]

// Fetch meters
const fetchMeters = async () => {
  isLoading.value = true
  try {
    const response = await api.getList<Meter>('/api/v1/meters', {
      page: pagination.value.page,
      limit: pagination.value.limit,
      search: searchQuery.value || undefined,
      status: statusFilter.value || undefined,
    })
    
    meters.value = response.data
    pagination.value = {
      ...pagination.value,
      total: response.meta.total,
      totalPages: response.meta.totalPages,
    }
  } catch (error) {
    toast.error('Failed to fetch meters')
  } finally {
    isLoading.value = false
  }
}

// Initial fetch
onMounted(() => {
  fetchMeters()
})

// Watch for filter changes
watch([searchQuery, statusFilter], () => {
  pagination.value.page = 1
  fetchMeters()
})

// Watch for tenant changes and refetch
watch(() => appStore.activeTenantId, () => {
  pagination.value.page = 1
  fetchMeters()
})

// Status badge variant
const getStatusVariant = (status: MeterStatus) => {
  const variants: Record<MeterStatus, string> = {
    ACTIVE: 'success',
    PASSIVE: 'secondary',
    WAREHOUSE: 'info',
    MAINTENANCE: 'warning',
    PLANNED: 'secondary',
    DEPLOYED: 'info',
  }
  return variants[status] || 'secondary'
}

// Navigate to meter detail
const goToMeter = (id: string) => {
  navigateTo(`/meters/${id}`)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <Gauge class="h-6 w-6 text-primary" />
          Meters
        </h1>
        <p class="text-muted-foreground">Manage water meters across all tenants</p>
      </div>
      
      <UiButton @click="showCreateDialog = true">
        <Plus class="h-4 w-4" />
        Add Meter
      </UiButton>
    </div>
    
    <!-- Filters -->
    <UiCard class="p-4">
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="flex-1 relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <UiInput
            v-model="searchQuery"
            placeholder="Search by serial number, device ID..."
            class="pl-10"
          />
        </div>
        
        <UiSelect
          v-model="statusFilter"
          :options="statusOptions"
          placeholder="Filter by status"
          class="w-full sm:w-48"
        />
        
        <UiButton variant="outline">
          <Download class="h-4 w-4" />
          Export
        </UiButton>
      </div>
    </UiCard>
    
    <!-- Meters table -->
    <UiCard>
      <UiTable>
        <UiTableHeader>
          <UiTableRow>
            <UiTableHead>Serial Number</UiTableHead>
            <UiTableHead>Customer</UiTableHead>
            <UiTableHead>Profile</UiTableHead>
            <UiTableHead>Status</UiTableHead>
            <UiTableHead>Current Index</UiTableHead>
            <UiTableHead>Last Reading</UiTableHead>
            <UiTableHead>Location</UiTableHead>
          </UiTableRow>
        </UiTableHeader>
        <UiTableBody>
          <template v-if="isLoading">
            <UiTableRow v-for="i in 10" :key="i">
              <UiTableCell v-for="j in 7" :key="j">
                <UiSkeleton class="h-4 w-full" />
              </UiTableCell>
            </UiTableRow>
          </template>
          
          <template v-else-if="meters.length === 0">
            <UiTableRow>
              <UiTableCell :colspan="7" class="text-center py-12 text-muted-foreground">
                <Gauge class="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p class="font-medium">No meters found</p>
                <p class="text-sm">Add a new meter to get started</p>
              </UiTableCell>
            </UiTableRow>
          </template>
          
          <template v-else>
            <UiTableRow
              v-for="meter in meters"
              :key="meter.id"
              clickable
              @click="goToMeter(meter.id)"
            >
              <UiTableCell class="font-medium font-mono">
                {{ meter.serialNumber }}
              </UiTableCell>
              <UiTableCell>
                {{ meter.customer?.details?.firstName || meter.customer?.details?.organizationName || 'N/A' }}
              </UiTableCell>
              <UiTableCell>
                <span v-if="meter.meterProfile">
                  {{ meter.meterProfile.brand }} {{ meter.meterProfile.modelCode }}
                </span>
                <span v-else class="text-muted-foreground">N/A</span>
              </UiTableCell>
              <UiTableCell>
                <UiBadge :variant="getStatusVariant(meter.status) as 'success' | 'warning' | 'error' | 'info' | 'secondary'">
                  {{ meter.status }}
                </UiBadge>
              </UiTableCell>
              <UiTableCell class="font-mono">
                {{ Number(meter.lastReadingValue ?? meter.initialIndex ?? 0).toLocaleString() }} m³
              </UiTableCell>
              <UiTableCell>
                <span v-if="meter.lastReadingTime" class="text-sm">
                  {{ formatDate(meter.lastReadingTime) }}
                </span>
                <span v-else class="text-muted-foreground">Never</span>
              </UiTableCell>
              <UiTableCell>
                <span v-if="meter.latitude != null && meter.longitude != null" class="text-xs font-mono">
                  {{ Number(meter.latitude).toFixed(4) }}, {{ Number(meter.longitude).toFixed(4) }}
                </span>
                <span v-else class="text-muted-foreground">-</span>
              </UiTableCell>
            </UiTableRow>
          </template>
        </UiTableBody>
      </UiTable>
      
      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-border">
        <p class="text-sm text-muted-foreground">
          Showing {{ meters.length }} of {{ pagination.total }} meters
        </p>
        <div class="flex items-center gap-2">
          <UiButton
            variant="outline"
            size="sm"
            :disabled="pagination.page <= 1"
            @click="pagination.page--; fetchMeters()"
          >
            Previous
          </UiButton>
          <UiButton
            variant="outline"
            size="sm"
            :disabled="pagination.page >= pagination.totalPages"
            @click="pagination.page++; fetchMeters()"
          >
            Next
          </UiButton>
        </div>
      </div>
    </UiCard>
    
    <!-- Create Meter Dialog -->
    <UiDialog v-model:open="showCreateDialog" title="Add New Meter" description="Create a new water meter with connectivity configuration" class="max-w-2xl">
      <MetersCreateForm @success="showCreateDialog = false; fetchMeters()" @cancel="showCreateDialog = false" />
    </UiDialog>
  </div>
</template>

