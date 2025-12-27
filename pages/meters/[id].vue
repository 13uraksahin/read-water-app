<script setup lang="ts">
import {
  Gauge,
  ArrowLeft,
  Edit,
  Radio,
  Battery,
  Signal,
  MapPin,
  Calendar,
  User,
  Building2,
  FileText,
  Droplets,
  Activity,
  Power,
  Link2,
  Link2Off,
  Warehouse,
  Plus,
  Settings,
} from 'lucide-vue-next'
import type { Meter, Reading, Device, DeviceProfile, DeviceStatus, Address } from '~/types'
import { formatDate, formatDateTime, formatWaterUsage } from '~/lib/utils'

definePageMeta({
  middleware: ['auth'],
})

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()

const meterId = computed(() => route.params.id as string)

// State
const meter = ref<Meter | null>(null)
const readings = ref<Reading[]>([])
const availableDevices = ref<Device[]>([])
const deviceProfiles = ref<DeviceProfile[]>([])
const isLoading = ref(true)
const isLoadingReadings = ref(true)
const showEditDialog = ref(false)
const showLinkDialog = ref(false)
const showUnlinkConfirm = ref(false)
const isLinking = ref(false)
const isUnlinking = ref(false)

// Link device form state
const linkMode = ref<'select' | 'create'>('select')
const selectedDeviceId = ref('')
const newDevice = reactive({
  deviceProfileId: '',
  serialNumber: '',
  dynamicFields: {} as Record<string, string>,
})

// Fetch meter details
const fetchMeter = async () => {
  isLoading.value = true
  try {
    const response = await api.get<Meter>(`/api/v1/meters/${meterId.value}`)
    meter.value = response
  } catch (error) {
    toast.error('Failed to load meter')
    router.push('/meters')
  } finally {
    isLoading.value = false
  }
}

// Fetch reading history
const fetchReadings = async () => {
  isLoadingReadings.value = true
  try {
    const response = await api.getList<Reading>('/api/v1/readings', {
      meterId: meterId.value,
      limit: 20,
    })
    readings.value = response.data
  } catch (error) {
    console.error('Failed to fetch readings:', error)
  } finally {
    isLoadingReadings.value = false
  }
}

// Fetch available devices for linking
const fetchAvailableDevices = async () => {
  if (!meter.value) return
  
  try {
    const response = await api.get<Device[]>(
      `/api/v1/devices/available?tenantId=${meter.value.tenantId}&meterProfileId=${meter.value.meterProfileId}`
    )
    availableDevices.value = response
  } catch {
    // Fallback
    try {
      const response = await api.getList<Device>('/api/v1/devices', {
        tenantId: meter.value.tenantId,
        status: 'WAREHOUSE',
        limit: 100,
      })
      availableDevices.value = response.data
    } catch {
      availableDevices.value = []
    }
  }
}

// Fetch device profiles
const fetchDeviceProfiles = async () => {
  try {
    const response = await api.getList<DeviceProfile>('/api/v1/device-profiles', { limit: 100 })
    deviceProfiles.value = response.data
  } catch (error) {
    console.error('Failed to fetch device profiles:', error)
  }
}

// Get status variant
const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' => {
  switch (status) {
    case 'ACTIVE':
      return 'success'
    case 'MAINTENANCE':
      return 'destructive'
    case 'WAREHOUSE':
    case 'PLANNED':
      return 'secondary'
    default:
      return 'outline'
  }
}

// Get valve status variant
const getValveVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'success' => {
  switch (status) {
    case 'OPEN':
      return 'success'
    case 'CLOSED':
      return 'destructive'
    default:
      return 'secondary'
  }
}

// Format address from subscription
const formatAddress = (address?: Address): string => {
  if (!address) return '-'
  const parts = [
    address.street,
    address.buildingNo,
    address.neighborhood,
    address.district,
    address.city,
  ].filter(Boolean)
  return parts.join(', ') || '-'
}

// Consumption
const totalConsumption = computed(() => {
  if (!meter.value) return 0
  return Number(meter.value.lastReadingValue ?? meter.value.initialIndex ?? 0) - Number(meter.value.initialIndex ?? 0)
})

// Get device identifier
const getDeviceIdentifier = (device: Device): string => {
  if (!device.dynamicFields) return device.serialNumber
  const identifiers = ['DevEUI', 'ID', 'IMEI', 'MacAddress']
  for (const key of identifiers) {
    if (device.dynamicFields[key]) return device.dynamicFields[key]
  }
  return device.serialNumber
}

// Get battery color
const getBatteryColor = (level?: number): string => {
  if (level == null) return 'text-muted-foreground'
  if (level > 50) return 'text-green-600'
  if (level > 20) return 'text-yellow-600'
  return 'text-red-600'
}

// Link device
const handleLinkDevice = async () => {
  if (!meter.value) return
  
  isLinking.value = true
  
  try {
    let deviceId = selectedDeviceId.value
    
    if (linkMode.value === 'create') {
      // Create new device first
      const devicePayload = {
        tenantId: meter.value.tenantId,
        deviceProfileId: newDevice.deviceProfileId,
        serialNumber: newDevice.serialNumber,
        status: 'WAREHOUSE',
        dynamicFields: newDevice.dynamicFields,
      }
      
      const deviceResponse = await api.post<{ id: string }>('/api/v1/devices', devicePayload)
      deviceId = deviceResponse.id
    }
    
    // Link device to meter
    await api.post(`/api/v1/meters/${meterId.value}/link-device`, { deviceId })
    
    toast.success('Device linked successfully')
    showLinkDialog.value = false
    resetLinkForm()
    await fetchMeter()
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.error('Failed to link device', err.message)
  } finally {
    isLinking.value = false
  }
}

// Unlink device
const handleUnlinkDevice = async () => {
  if (!meter.value?.activeDevice) return
  
  isUnlinking.value = true
  
  try {
    await api.post(`/api/v1/meters/${meterId.value}/unlink-device`, {
      deviceStatus: 'WAREHOUSE',
    })
    
    toast.success('Device unlinked successfully')
    showUnlinkConfirm.value = false
    await fetchMeter()
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.error('Failed to unlink device', err.message)
  } finally {
    isUnlinking.value = false
  }
}

// Reset link form
const resetLinkForm = () => {
  linkMode.value = 'select'
  selectedDeviceId.value = ''
  newDevice.deviceProfileId = ''
  newDevice.serialNumber = ''
  newDevice.dynamicFields = {}
}

// Open link dialog
const openLinkDialog = async () => {
  await Promise.all([fetchAvailableDevices(), fetchDeviceProfiles()])
  showLinkDialog.value = true
}

// Initial fetch
onMounted(() => {
  fetchMeter()
  fetchReadings()
})

// Handle edit success
const handleEditSuccess = () => {
  showEditDialog.value = false
  fetchMeter()
  toast.success('Meter updated successfully')
}
</script>

<template>
  <div class="space-y-6">
    <!-- Back button & header -->
    <div class="flex items-center gap-4">
      <UiButton variant="ghost" size="icon" @click="router.push('/meters')">
        <ArrowLeft class="h-5 w-5" />
      </UiButton>
      
      <div class="flex-1">
        <div v-if="isLoading" class="space-y-2">
          <UiSkeleton class="h-8 w-64" />
          <UiSkeleton class="h-4 w-48" />
        </div>
        <template v-else-if="meter">
          <h1 class="text-2xl font-bold flex items-center gap-2">
            <Gauge class="h-6 w-6 text-primary" />
            {{ meter.serialNumber }}
          </h1>
          <p class="text-sm text-muted-foreground">
            {{ meter.meterProfile?.brand }} {{ meter.meterProfile?.modelCode }}
          </p>
        </template>
      </div>
      
      <div v-if="meter" class="flex items-center gap-2">
        <UiBadge :variant="getStatusVariant(meter.status)">
          {{ meter.status.replace(/_/g, ' ') }}
        </UiBadge>
        <UiButton @click="showEditDialog = true">
          <Edit class="h-4 w-4" />
          Edit
        </UiButton>
      </div>
    </div>
    
    <!-- Loading state -->
    <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <UiCard class="lg:col-span-2 p-6">
        <UiSkeleton class="h-6 w-48 mb-4" />
        <div class="grid grid-cols-2 gap-4">
          <UiSkeleton v-for="i in 8" :key="i" class="h-12" />
        </div>
      </UiCard>
      <UiCard class="p-6">
        <UiSkeleton class="h-6 w-32 mb-4" />
        <div class="space-y-3">
          <UiSkeleton v-for="i in 4" :key="i" class="h-10" />
        </div>
      </UiCard>
    </div>
    
    <!-- Content -->
    <template v-else-if="meter">
      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <UiCard class="p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-primary/10">
              <Droplets class="h-5 w-5 text-primary" />
            </div>
            <div>
              <p class="text-2xl font-bold">{{ Number(meter.lastReadingValue ?? meter.initialIndex ?? 0).toFixed(3) }}</p>
              <p class="text-sm text-muted-foreground">Current Index (m³)</p>
            </div>
          </div>
        </UiCard>
        
        <UiCard class="p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-blue-500/10">
              <Activity class="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p class="text-2xl font-bold">{{ totalConsumption.toFixed(3) }}</p>
              <p class="text-sm text-muted-foreground">Total Consumption (m³)</p>
            </div>
          </div>
        </UiCard>
        
        <UiCard class="p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-green-500/10">
              <Signal class="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p class="text-2xl font-bold">{{ meter.activeDevice?.lastSignalStrength ?? '-' }}</p>
              <p class="text-sm text-muted-foreground">Signal Strength</p>
            </div>
          </div>
        </UiCard>
        
        <UiCard class="p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-yellow-500/10">
              <Battery class="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p class="text-2xl font-bold" :class="getBatteryColor(meter.activeDevice?.lastBatteryLevel)">
                {{ meter.activeDevice?.lastBatteryLevel != null ? `${meter.activeDevice.lastBatteryLevel}%` : '-' }}
              </p>
              <p class="text-sm text-muted-foreground">Battery Level</p>
            </div>
          </div>
        </UiCard>
      </div>
      
      <!-- Main content grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Technical Info -->
        <UiCard class="lg:col-span-2">
          <UiCardHeader>
            <UiCardTitle>Technical Information</UiCardTitle>
            <UiCardDescription>Meter specifications and configuration</UiCardDescription>
          </UiCardHeader>
          <UiCardContent>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <p class="text-sm text-muted-foreground">Serial Number</p>
                <p class="font-medium font-mono">{{ meter.serialNumber }}</p>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Profile</p>
                <p class="font-medium">
                  {{ meter.meterProfile?.brand }} {{ meter.meterProfile?.modelCode }}
                </p>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Meter Type</p>
                <p class="font-medium">{{ meter.meterProfile?.meterType?.replace(/_/g, ' ') || '-' }}</p>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Initial Index</p>
                <p class="font-medium">{{ Number(meter.initialIndex ?? 0).toFixed(3) }} m³</p>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Installation Date</p>
                <p class="font-medium">
                  {{ meter.installationDate ? formatDate(meter.installationDate) : '-' }}
                </p>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Valve Status</p>
                <UiBadge :variant="getValveVariant(meter.valveStatus || 'UNKNOWN')">
                  <Power class="h-3 w-3 mr-1" />
                  {{ meter.valveStatus || 'UNKNOWN' }}
                </UiBadge>
              </div>
            </div>
          </UiCardContent>
        </UiCard>
        
        <!-- Connected Device Card (NEW) -->
        <UiCard>
          <UiCardHeader>
            <UiCardTitle class="flex items-center gap-2">
              <Radio class="h-5 w-5" />
              Connected Device
            </UiCardTitle>
          </UiCardHeader>
          <UiCardContent>
            <template v-if="meter.activeDevice">
              <!-- Device is linked -->
              <div class="space-y-4">
                <div class="p-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
                  <div class="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                    <Link2 class="h-4 w-4" />
                    <span class="text-sm font-medium">Device Linked</span>
                  </div>
                  
                  <p class="font-mono font-medium">{{ meter.activeDevice.serialNumber }}</p>
                  <p class="text-xs text-muted-foreground mt-1">
                    {{ getDeviceIdentifier(meter.activeDevice) }}
                  </p>
                </div>
                
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-muted-foreground">Brand</span>
                    <span>{{ meter.activeDevice.deviceProfile?.brand }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-muted-foreground">Model</span>
                    <span>{{ meter.activeDevice.deviceProfile?.modelCode }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-muted-foreground">Technology</span>
                    <UiBadge variant="outline" class="text-xs">
                      {{ meter.activeDevice.deviceProfile?.communicationTechnology?.replace(/_/g, '-') }}
                    </UiBadge>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-muted-foreground">Battery</span>
                    <span :class="getBatteryColor(meter.activeDevice.lastBatteryLevel)">
                      {{ meter.activeDevice.lastBatteryLevel != null ? `${meter.activeDevice.lastBatteryLevel}%` : '-' }}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-muted-foreground">Last Comm</span>
                    <span>{{ meter.activeDevice.lastCommunicationAt ? formatDate(meter.activeDevice.lastCommunicationAt) : 'Never' }}</span>
                  </div>
                </div>
                
                <div class="pt-4 border-t border-border space-y-2">
                  <UiButton
                    variant="link"
                    class="w-full justify-start p-0 h-auto"
                    @click="navigateTo(`/devices/${meter.activeDevice!.id}`)"
                  >
                    View Device Details →
                  </UiButton>
                  
                  <UiButton
                    variant="outline"
                    class="w-full text-destructive border-destructive hover:bg-destructive/10"
                    @click="showUnlinkConfirm = true"
                  >
                    <Link2Off class="h-4 w-4" />
                    Unlink Device
                  </UiButton>
                </div>
              </div>
            </template>
            
            <template v-else>
              <!-- No device linked -->
              <div class="text-center py-6">
                <div class="p-4 rounded-full bg-muted w-fit mx-auto mb-4">
                  <Link2Off class="h-8 w-8 text-muted-foreground" />
                </div>
                <p class="font-medium text-muted-foreground">No Device Linked</p>
                <p class="text-sm text-muted-foreground mt-1">
                  This meter doesn't have a communication device
                </p>
                
                <UiButton class="mt-4" @click="openLinkDialog">
                  <Link2 class="h-4 w-4" />
                  Link Device
                </UiButton>
              </div>
            </template>
          </UiCardContent>
        </UiCard>
      </div>
      
      <!-- Associations -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Subscription & Customer -->
        <UiCard>
          <UiCardHeader>
            <UiCardTitle class="flex items-center gap-2">
              <User class="h-4 w-4" />
              Subscription
            </UiCardTitle>
          </UiCardHeader>
          <UiCardContent>
            <template v-if="meter.subscription">
              <p class="font-medium">
                {{ meter.subscription.customer?.details?.firstName 
                  ? `${meter.subscription.customer.details.firstName} ${meter.subscription.customer.details.lastName || ''}`
                  : meter.subscription.customer?.details?.organizationName || 'Unknown' }}
              </p>
              <p class="text-sm text-muted-foreground">
                {{ meter.subscription.subscriptionType }} - {{ meter.subscription.subscriptionGroup?.replace(/_/g, ' ') }}
              </p>
              <UiButton
                variant="link"
                size="sm"
                class="p-0 h-auto mt-1"
                @click="navigateTo(`/subscriptions/${meter.subscriptionId}`)"
              >
                View Subscription →
              </UiButton>
            </template>
            <p v-else class="text-muted-foreground">Not assigned to subscription</p>
          </UiCardContent>
        </UiCard>
        
        <!-- Tenant -->
        <UiCard>
          <UiCardHeader>
            <UiCardTitle class="flex items-center gap-2">
              <Building2 class="h-4 w-4" />
              Tenant
            </UiCardTitle>
          </UiCardHeader>
          <UiCardContent>
            <p class="font-medium">{{ meter.tenant?.name || meter.tenantId }}</p>
            <UiButton
              variant="link"
              size="sm"
              class="p-0 h-auto mt-1"
              @click="navigateTo(`/iam/tenants/${meter.tenantId}`)"
            >
              View Tenant →
            </UiButton>
          </UiCardContent>
        </UiCard>
        
        <!-- Location (from Subscription) -->
        <UiCard>
          <UiCardHeader>
            <UiCardTitle class="flex items-center gap-2">
              <MapPin class="h-4 w-4" />
              Location
            </UiCardTitle>
          </UiCardHeader>
          <UiCardContent>
            <p class="text-sm">{{ formatAddress(meter.subscription?.address) }}</p>
            <p v-if="meter.subscription?.latitude && meter.subscription?.longitude" class="text-xs text-muted-foreground mt-1 font-mono">
              {{ Number(meter.subscription.latitude).toFixed(6) }}, {{ Number(meter.subscription.longitude).toFixed(6) }}
            </p>
          </UiCardContent>
        </UiCard>
      </div>
      
      <!-- Consumption Chart -->
      <MetersConsumptionChart :meter-id="meterId" />
      
      <!-- Reading History -->
      <UiCard>
        <UiCardHeader>
          <UiCardTitle>Reading History</UiCardTitle>
          <UiCardDescription>Recent meter readings</UiCardDescription>
        </UiCardHeader>
        <UiTable>
          <UiTableHeader>
            <UiTableRow>
              <UiTableHead>Time</UiTableHead>
              <UiTableHead>Value</UiTableHead>
              <UiTableHead>Consumption</UiTableHead>
              <UiTableHead>Signal</UiTableHead>
              <UiTableHead>Battery</UiTableHead>
              <UiTableHead>Source</UiTableHead>
            </UiTableRow>
          </UiTableHeader>
          <UiTableBody>
            <template v-if="isLoadingReadings">
              <UiTableRow v-for="i in 5" :key="i">
                <UiTableCell v-for="j in 6" :key="j">
                  <UiSkeleton class="h-4 w-full" />
                </UiTableCell>
              </UiTableRow>
            </template>
            
            <template v-else-if="readings.length === 0">
              <UiTableRow>
                <UiTableCell :colspan="6" class="text-center py-8 text-muted-foreground">
                  <Activity class="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No readings recorded yet</p>
                </UiTableCell>
              </UiTableRow>
            </template>
            
            <template v-else>
              <UiTableRow v-for="reading in readings" :key="reading.id">
                <UiTableCell class="text-sm">
                  {{ formatDateTime(reading.time) }}
                </UiTableCell>
                <UiTableCell class="font-mono">
                  {{ Number(reading.value ?? 0).toFixed(3) }} {{ reading.unit || 'm³' }}
                </UiTableCell>
                <UiTableCell class="font-mono">
                  {{ Number(reading.consumption ?? 0).toFixed(3) }} {{ reading.unit || 'm³' }}
                </UiTableCell>
                <UiTableCell>
                  {{ reading.signalStrength || '-' }}
                </UiTableCell>
                <UiTableCell>
                  {{ reading.batteryLevel ? `${reading.batteryLevel}%` : '-' }}
                </UiTableCell>
                <UiTableCell>
                  <UiBadge variant="outline" class="text-xs">
                    {{ reading.communicationTechnology || reading.source || '-' }}
                  </UiBadge>
                </UiTableCell>
              </UiTableRow>
            </template>
          </UiTableBody>
        </UiTable>
      </UiCard>
    </template>
    
    <!-- Edit Dialog -->
    <UiDialog v-model:open="showEditDialog">
      <UiDialogContent class="max-w-2xl">
        <UiDialogHeader>
          <UiDialogTitle>Edit Meter</UiDialogTitle>
        </UiDialogHeader>
        <div class="overflow-y-auto flex-1 -mx-6 px-6">
          <MetersCreateForm
            v-if="meter"
            :meter="meter"
            mode="edit"
            @success="handleEditSuccess"
            @cancel="showEditDialog = false"
          />
        </div>
      </UiDialogContent>
    </UiDialog>
    
    <!-- Link Device Dialog -->
    <UiDialog v-model:open="showLinkDialog">
      <UiDialogContent class="max-w-2xl">
        <UiDialogHeader>
          <UiDialogTitle>Link Device</UiDialogTitle>
        </UiDialogHeader>
      <div class="space-y-6">
        <!-- Mode Selection -->
        <div class="grid grid-cols-2 gap-4">
          <div
            class="p-4 rounded-lg border-2 cursor-pointer transition-colors"
            :class="linkMode === 'select' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'"
            @click="linkMode = 'select'"
          >
            <div class="flex items-center gap-2 mb-2">
              <Warehouse class="h-5 w-5" :class="linkMode === 'select' ? 'text-primary' : 'text-muted-foreground'" />
              <span class="font-medium">Select from Inventory</span>
            </div>
            <p class="text-sm text-muted-foreground">Choose an available device from warehouse</p>
          </div>
          
          <div
            class="p-4 rounded-lg border-2 cursor-pointer transition-colors"
            :class="linkMode === 'create' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'"
            @click="linkMode = 'create'"
          >
            <div class="flex items-center gap-2 mb-2">
              <Plus class="h-5 w-5" :class="linkMode === 'create' ? 'text-primary' : 'text-muted-foreground'" />
              <span class="font-medium">Create New Device</span>
            </div>
            <p class="text-sm text-muted-foreground">Register a new device inline</p>
          </div>
        </div>
        
        <!-- Select from Inventory -->
        <div v-if="linkMode === 'select'" class="space-y-4">
          <div v-if="availableDevices.length === 0" class="text-center py-8 text-muted-foreground">
            <Warehouse class="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No available devices in warehouse</p>
          </div>
          
          <div v-else class="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
            <div
              v-for="device in availableDevices"
              :key="device.id"
              class="p-3 rounded-lg border cursor-pointer transition-colors"
              :class="selectedDeviceId === device.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'"
              @click="selectedDeviceId = device.id"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium font-mono">{{ device.serialNumber }}</p>
                  <p class="text-xs text-muted-foreground">{{ getDeviceIdentifier(device) }}</p>
                </div>
                <div class="text-right">
                  <UiBadge variant="outline" class="text-xs">
                    {{ device.deviceProfile?.brand }} {{ device.deviceProfile?.modelCode }}
                  </UiBadge>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Create New Device -->
        <div v-if="linkMode === 'create'" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <UiLabel>Device Profile *</UiLabel>
              <UiSelect
                v-model="newDevice.deviceProfileId"
                :options="deviceProfiles.map(p => ({ 
                  label: `${p.brand} ${p.modelCode} (${p.communicationTechnology?.replace(/_/g, '-')})`, 
                  value: p.id 
                }))"
                placeholder="Select device profile"
              />
            </div>
            
            <div>
              <UiLabel>Serial Number *</UiLabel>
              <UiInput v-model="newDevice.serialNumber" placeholder="e.g. DEV-001234" />
            </div>
          </div>
          
          <!-- Dynamic fields would go here based on selected profile -->
        </div>
        
        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4 border-t border-border">
          <UiButton variant="outline" @click="showLinkDialog = false; resetLinkForm()">
            Cancel
          </UiButton>
          <UiButton
            :loading="isLinking"
            :disabled="(linkMode === 'select' && !selectedDeviceId) || (linkMode === 'create' && (!newDevice.deviceProfileId || !newDevice.serialNumber))"
            @click="handleLinkDevice"
          >
            <Link2 class="h-4 w-4" />
            Link Device
          </UiButton>
        </div>
      </div>
      </UiDialogContent>
    </UiDialog>
    
    <!-- Unlink Confirmation Dialog -->
    <UiDialog v-model:open="showUnlinkConfirm">
      <UiDialogContent>
        <UiDialogHeader>
          <UiDialogTitle>Unlink Device</UiDialogTitle>
        </UiDialogHeader>
        <div class="space-y-4">
          <p class="text-muted-foreground">
            Are you sure you want to unlink the device "{{ meter?.activeDevice?.serialNumber }}" from this meter?
          </p>
          <p class="text-sm text-muted-foreground">
            The device will be moved back to Warehouse status and can be linked to another meter.
          </p>
          <div class="flex justify-end gap-3">
            <UiButton variant="outline" @click="showUnlinkConfirm = false">
              Cancel
            </UiButton>
            <UiButton variant="destructive" :loading="isUnlinking" @click="handleUnlinkDevice">
              Unlink Device
            </UiButton>
          </div>
        </div>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>
