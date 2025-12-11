<script setup lang="ts">
import { Radio, Plus, Search, Edit, Trash2, Link2, Link2Off, Warehouse, Activity } from 'lucide-vue-next'
import type { Device, DeviceStatus, DeviceProfile, PaginatedResponse } from '~/types'
import { formatDate, formatDateTime } from '~/lib/utils'

definePageMeta({
  middleware: ['auth'],
})

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const deviceStore = useDeviceStore()

// State
const devices = ref<Device[]>([])
const deviceProfiles = ref<DeviceProfile[]>([])
const isLoading = ref(true)
const showCreateDialog = ref(false)
const showDeleteConfirm = ref(false)
const deviceToDelete = ref<Device | null>(null)
const searchQuery = ref('')
const statusFilter = ref<DeviceStatus | ''>('')
const brandFilter = ref('')
const techFilter = ref('')

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
  { label: 'Warehouse', value: 'WAREHOUSE' },
  { label: 'Deployed', value: 'DEPLOYED' },
  { label: 'Maintenance', value: 'MAINTENANCE' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Passive', value: 'PASSIVE' },
]

// Brand options
const brandOptions = [
  { label: 'All Brands', value: '' },
  { label: 'Una', value: 'UNA' },
  { label: 'Ima', value: 'IMA' },
  { label: 'Itron', value: 'ITRON' },
  { label: 'Zenner', value: 'ZENNER' },
]

// Technology options
const techOptions = [
  { label: 'All Technologies', value: '' },
  { label: 'LoRaWAN', value: 'LORAWAN' },
  { label: 'Sigfox', value: 'SIGFOX' },
  { label: 'NB-IoT', value: 'NB_IOT' },
  { label: 'wM-Bus', value: 'WM_BUS' },
]

// Fetch devices
const fetchDevices = async () => {
  isLoading.value = true
  try {
    const response = await api.getList<Device>('/api/v1/devices', {
      page: pagination.value.page,
      limit: pagination.value.limit,
      search: searchQuery.value || undefined,
      status: statusFilter.value || undefined,
      brand: brandFilter.value || undefined,
      technology: techFilter.value || undefined,
    })
    
    devices.value = response.data
    pagination.value = {
      ...pagination.value,
      total: response.meta.total,
      totalPages: response.meta.totalPages,
    }
  } catch (error) {
    toast.error('Failed to fetch devices')
  } finally {
    isLoading.value = false
  }
}

// Fetch device profiles
const fetchProfiles = async () => {
  try {
    const response = await api.getList<DeviceProfile>('/api/v1/device-profiles', { limit: 100 })
    deviceProfiles.value = response.data
  } catch (error) {
    console.error('Failed to fetch device profiles:', error)
  }
}

// Initial fetch
onMounted(async () => {
  await Promise.all([fetchDevices(), fetchProfiles()])
})

// Watch for filter changes
watch([searchQuery, statusFilter, brandFilter, techFilter], () => {
  pagination.value.page = 1
  fetchDevices()
})

// Get status variant
const getStatusVariant = (status: DeviceStatus): 'success' | 'warning' | 'error' | 'info' | 'secondary' => {
  const variants: Record<DeviceStatus, 'success' | 'warning' | 'error' | 'info' | 'secondary'> = {
    WAREHOUSE: 'info',
    DEPLOYED: 'success',
    MAINTENANCE: 'warning',
    ACTIVE: 'success',
    PASSIVE: 'secondary',
    PLANNED: 'secondary',
  }
  return variants[status] || 'secondary'
}

// Get device identifier (DevEUI, ID, IMEI, etc)
const getDeviceIdentifier = (device: Device): string => {
  if (!device.dynamicFields) return device.serialNumber
  
  // Try common identifier fields
  const identifiers = ['DevEUI', 'ID', 'IMEI', 'MacAddress', 'EUI64']
  for (const key of identifiers) {
    if (device.dynamicFields[key]) {
      return device.dynamicFields[key]
    }
  }
  return device.serialNumber
}

// Navigate to device detail
const goToDevice = (id: string) => {
  navigateTo(`/devices/${id}`)
}

// Handle delete
const handleDeleteClick = (device: Device) => {
  if (device.status === 'DEPLOYED' && device.meter) {
    toast.error('Cannot delete deployed device. Unlink from meter first.')
    return
  }
  deviceToDelete.value = device
  showDeleteConfirm.value = true
}

const confirmDelete = async () => {
  if (!deviceToDelete.value) return
  
  try {
    await api.del(`/api/v1/devices/${deviceToDelete.value.id}`)
    toast.success('Device deleted successfully')
    await fetchDevices()
  } catch (error) {
    toast.error('Failed to delete device')
  } finally {
    showDeleteConfirm.value = false
    deviceToDelete.value = null
  }
}

// Handle create success
const handleCreateSuccess = () => {
  showCreateDialog.value = false
  fetchDevices()
  toast.success('Device created successfully')
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <Radio class="h-6 w-6 text-primary" />
          {{ t('devices.title', 'Device Inventory') }}
        </h1>
        <p class="text-muted-foreground">{{ t('devices.description', 'Manage communication devices and modules') }}</p>
      </div>
      
      <UiButton @click="showCreateDialog = true">
        <Plus class="h-4 w-4" />
        {{ t('devices.addDevice', 'Add Device') }}
      </UiButton>
    </div>
    
    <!-- Stats Overview -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <UiCard class="p-4">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-primary/10">
            <Radio class="h-5 w-5 text-primary" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ pagination.total }}</p>
            <p class="text-sm text-muted-foreground">Total Devices</p>
          </div>
        </div>
      </UiCard>
      
      <UiCard class="p-4">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-blue-500/10">
            <Warehouse class="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ devices.filter(d => d.status === 'WAREHOUSE').length }}</p>
            <p class="text-sm text-muted-foreground">In Warehouse</p>
          </div>
        </div>
      </UiCard>
      
      <UiCard class="p-4">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-green-500/10">
            <Link2 class="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ devices.filter(d => d.status === 'DEPLOYED').length }}</p>
            <p class="text-sm text-muted-foreground">Deployed</p>
          </div>
        </div>
      </UiCard>
      
      <UiCard class="p-4">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-yellow-500/10">
            <Activity class="h-5 w-5 text-yellow-500" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ devices.filter(d => d.status === 'MAINTENANCE').length }}</p>
            <p class="text-sm text-muted-foreground">In Maintenance</p>
          </div>
        </div>
      </UiCard>
    </div>
    
    <!-- Filters -->
    <UiCard class="p-4">
      <div class="flex flex-col lg:flex-row gap-4">
        <div class="flex-1 relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <UiInput
            v-model="searchQuery"
            placeholder="Search by serial, DevEUI, ID..."
            class="pl-10"
          />
        </div>
        
        <UiSelect
          v-model="statusFilter"
          :options="statusOptions"
          placeholder="Status"
          class="w-full sm:w-40"
        />
        
        <UiSelect
          v-model="brandFilter"
          :options="brandOptions"
          placeholder="Brand"
          class="w-full sm:w-36"
        />
        
        <UiSelect
          v-model="techFilter"
          :options="techOptions"
          placeholder="Technology"
          class="w-full sm:w-40"
        />
      </div>
    </UiCard>
    
    <!-- Devices table -->
    <UiCard>
      <UiTable>
        <UiTableHeader>
          <UiTableRow>
            <UiTableHead>Serial / Identifier</UiTableHead>
            <UiTableHead>Brand</UiTableHead>
            <UiTableHead>Model</UiTableHead>
            <UiTableHead>Technology</UiTableHead>
            <UiTableHead>Status</UiTableHead>
            <UiTableHead>Linked Meter</UiTableHead>
            <UiTableHead>Battery</UiTableHead>
            <UiTableHead>Last Comm</UiTableHead>
            <UiTableHead class="w-[80px]">Actions</UiTableHead>
          </UiTableRow>
        </UiTableHeader>
        <UiTableBody>
          <template v-if="isLoading">
            <UiTableRow v-for="i in 10" :key="i">
              <UiTableCell v-for="j in 9" :key="j">
                <UiSkeleton class="h-4 w-full" />
              </UiTableCell>
            </UiTableRow>
          </template>
          
          <template v-else-if="devices.length === 0">
            <UiTableRow>
              <UiTableCell :colspan="9" class="text-center py-12 text-muted-foreground">
                <Radio class="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p class="font-medium">{{ t('devices.noDevices', 'No devices found') }}</p>
                <p class="text-sm">{{ t('devices.noDevicesHint', 'Add a new device to your inventory') }}</p>
              </UiTableCell>
            </UiTableRow>
          </template>
          
          <template v-else>
            <UiTableRow
              v-for="device in devices"
              :key="device.id"
              clickable
              @click="goToDevice(device.id)"
            >
              <UiTableCell class="font-mono">
                <div class="flex flex-col">
                  <span class="font-medium">{{ device.serialNumber }}</span>
                  <span class="text-xs text-muted-foreground">{{ getDeviceIdentifier(device) }}</span>
                </div>
              </UiTableCell>
              <UiTableCell>
                {{ device.deviceProfile?.brand || '-' }}
              </UiTableCell>
              <UiTableCell>
                {{ device.deviceProfile?.modelCode || '-' }}
              </UiTableCell>
              <UiTableCell>
                <UiBadge variant="outline" class="text-xs">
                  {{ device.deviceProfile?.communicationTechnology?.replace(/_/g, '-') || '-' }}
                </UiBadge>
              </UiTableCell>
              <UiTableCell>
                <UiBadge :variant="getStatusVariant(device.status)">
                  {{ device.status }}
                </UiBadge>
              </UiTableCell>
              <UiTableCell>
                <template v-if="device.meter">
                  <div class="flex items-center gap-2">
                    <Link2 class="h-4 w-4 text-green-500" />
                    <span class="text-sm font-mono">{{ device.meter.serialNumber }}</span>
                  </div>
                </template>
                <template v-else>
                  <span class="text-muted-foreground flex items-center gap-2">
                    <Link2Off class="h-4 w-4" />
                    Not linked
                  </span>
                </template>
              </UiTableCell>
              <UiTableCell>
                <template v-if="device.lastBatteryLevel != null">
                  <span :class="{
                    'text-green-600': device.lastBatteryLevel > 50,
                    'text-yellow-600': device.lastBatteryLevel > 20 && device.lastBatteryLevel <= 50,
                    'text-red-600': device.lastBatteryLevel <= 20,
                  }">
                    {{ device.lastBatteryLevel }}%
                  </span>
                </template>
                <template v-else>
                  <span class="text-muted-foreground">-</span>
                </template>
              </UiTableCell>
              <UiTableCell>
                <span v-if="device.lastCommunicationAt" class="text-sm">
                  {{ formatDate(device.lastCommunicationAt) }}
                </span>
                <span v-else class="text-muted-foreground">Never</span>
              </UiTableCell>
              <UiTableCell @click.stop>
                <div class="flex items-center gap-1">
                  <UiButton
                    variant="ghost"
                    size="icon"
                    @click="goToDevice(device.id)"
                  >
                    <Edit class="h-4 w-4" />
                  </UiButton>
                  <UiButton
                    variant="ghost"
                    size="icon"
                    @click="handleDeleteClick(device)"
                    :disabled="device.status === 'DEPLOYED'"
                  >
                    <Trash2 class="h-4 w-4 text-destructive" />
                  </UiButton>
                </div>
              </UiTableCell>
            </UiTableRow>
          </template>
        </UiTableBody>
      </UiTable>
      
      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-border">
        <p class="text-sm text-muted-foreground">
          Showing {{ devices.length }} of {{ pagination.total }} devices
        </p>
        <div class="flex items-center gap-2">
          <UiButton
            variant="outline"
            size="sm"
            :disabled="pagination.page <= 1"
            @click="pagination.page--; fetchDevices()"
          >
            Previous
          </UiButton>
          <UiButton
            variant="outline"
            size="sm"
            :disabled="pagination.page >= pagination.totalPages"
            @click="pagination.page++; fetchDevices()"
          >
            Next
          </UiButton>
        </div>
      </div>
    </UiCard>
    
    <!-- Create Device Dialog -->
    <UiDialog
      v-model:open="showCreateDialog"
      title="Add New Device"
      description="Add a communication device to your inventory"
      class="max-w-2xl"
    >
      <DevicesCreateForm
        @success="handleCreateSuccess"
        @cancel="showCreateDialog = false"
      />
    </UiDialog>
    
    <!-- Delete Confirmation Dialog -->
    <UiDialog
      v-model:open="showDeleteConfirm"
      title="Delete Device"
      description="Are you sure you want to delete this device?"
    >
      <div class="space-y-4">
        <p class="text-muted-foreground">
          This action cannot be undone. The device "{{ deviceToDelete?.serialNumber }}" will be permanently removed from your inventory.
        </p>
        <div class="flex justify-end gap-3">
          <UiButton variant="outline" @click="showDeleteConfirm = false">
            Cancel
          </UiButton>
          <UiButton variant="destructive" @click="confirmDelete">
            Delete
          </UiButton>
        </div>
      </div>
    </UiDialog>
  </div>
</template>
