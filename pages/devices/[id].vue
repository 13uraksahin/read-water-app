<script setup lang="ts">
import {
  Radio,
  ArrowLeft,
  Edit,
  Battery,
  Signal,
  Calendar,
  Building2,
  Link2,
  Link2Off,
  Gauge,
  Activity,
  Settings,
  Code,
  Trash2,
} from 'lucide-vue-next'
import type { Device, DeviceProfile } from '~/types'
import { formatDate, formatDateTime } from '~/lib/utils'

definePageMeta({
  middleware: ['auth'],
})

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()

const deviceId = computed(() => route.params.id as string)

// State
const device = ref<Device | null>(null)
const isLoading = ref(true)
const showEditDialog = ref(false)
const showUnlinkConfirm = ref(false)
const showDeleteConfirm = ref(false)

// Fetch device details
const fetchDevice = async () => {
  isLoading.value = true
  try {
    const response = await api.get<Device>(`/api/v1/devices/${deviceId.value}`)
    device.value = response
  } catch (error) {
    toast.error('Failed to load device')
    router.push('/devices')
  } finally {
    isLoading.value = false
  }
}

// Get status variant
const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' => {
  switch (status) {
    case 'DEPLOYED':
      return 'success'
    case 'MAINTENANCE':
      return 'destructive'
    case 'WAREHOUSE':
      return 'secondary'
    default:
      return 'outline'
  }
}

// Get battery color class
const getBatteryColor = (level?: number): string => {
  if (level == null) return 'text-muted-foreground'
  if (level > 50) return 'text-green-600'
  if (level > 20) return 'text-yellow-600'
  return 'text-red-600'
}

// Get signal color class
const getSignalColor = (strength?: number): string => {
  if (strength == null) return 'text-muted-foreground'
  if (strength >= -70) return 'text-green-600'
  if (strength >= -90) return 'text-yellow-600'
  return 'text-red-600'
}

// Handle unlink
const handleUnlink = async () => {
  if (!device.value?.meter) return
  
  try {
    await api.post(`/api/v1/meters/${device.value.meter.id}/unlink-device`, {
      deviceStatus: 'WAREHOUSE',
    })
    toast.success('Device unlinked successfully')
    await fetchDevice()
  } catch (error) {
    toast.error('Failed to unlink device')
  } finally {
    showUnlinkConfirm.value = false
  }
}

// Handle delete
const handleDelete = async () => {
  if (!device.value) return
  
  if (device.value.status === 'DEPLOYED') {
    toast.error('Cannot delete deployed device')
    return
  }
  
  try {
    await api.del(`/api/v1/devices/${device.value.id}`)
    toast.success('Device deleted successfully')
    router.push('/devices')
  } catch (error) {
    toast.error('Failed to delete device')
  } finally {
    showDeleteConfirm.value = false
  }
}

// Handle edit success
const handleEditSuccess = () => {
  showEditDialog.value = false
  fetchDevice()
  toast.success('Device updated successfully')
}

// Initial fetch
onMounted(() => {
  fetchDevice()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Back button & header -->
    <div class="flex items-center gap-4">
      <UiButton variant="ghost" size="icon" @click="router.push('/devices')">
        <ArrowLeft class="h-5 w-5" />
      </UiButton>
      
      <div class="flex-1">
        <div v-if="isLoading" class="space-y-2">
          <UiSkeleton class="h-8 w-64" />
          <UiSkeleton class="h-4 w-48" />
        </div>
        <template v-else-if="device">
          <h1 class="text-2xl font-bold flex items-center gap-2">
            <Radio class="h-6 w-6 text-primary" />
            {{ device.serialNumber }}
          </h1>
          <p class="text-sm text-muted-foreground">
            {{ device.deviceProfile?.brand }} {{ device.deviceProfile?.modelCode }}
            <span class="mx-2">•</span>
            {{ device.deviceProfile?.communicationTechnology?.replace(/_/g, '-') }}
          </p>
        </template>
      </div>
      
      <div v-if="device" class="flex items-center gap-2">
        <UiBadge :variant="getStatusVariant(device.status)">
          {{ device.status }}
        </UiBadge>
        <UiButton variant="outline" @click="showEditDialog = true">
          <Edit class="h-4 w-4" />
          Edit
        </UiButton>
        <UiButton 
          variant="outline"
          class="text-destructive border-destructive hover:bg-destructive/10"
          :disabled="device.status === 'DEPLOYED'"
          @click="showDeleteConfirm = true"
        >
          <Trash2 class="h-4 w-4" />
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
    <template v-else-if="device">
      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <UiCard class="p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-primary/10">
              <Signal class="h-5 w-5 text-primary" />
            </div>
            <div>
              <p class="text-2xl font-bold" :class="getSignalColor(device.lastSignalStrength)">
                {{ device.lastSignalStrength ?? '-' }}
                <span v-if="device.lastSignalStrength != null" class="text-base"> dBm</span>
              </p>
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
              <p class="text-2xl font-bold" :class="getBatteryColor(device.lastBatteryLevel)">
                {{ device.lastBatteryLevel ?? '-' }}
                <span v-if="device.lastBatteryLevel != null" class="text-base">%</span>
              </p>
              <p class="text-sm text-muted-foreground">Battery Level</p>
            </div>
          </div>
        </UiCard>
        
        <UiCard class="p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-green-500/10">
              <Activity class="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p class="text-lg font-bold">
                {{ device.lastCommunicationAt ? formatDate(device.lastCommunicationAt) : 'Never' }}
              </p>
              <p class="text-sm text-muted-foreground">Last Communication</p>
            </div>
          </div>
        </UiCard>
        
        <UiCard class="p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg" :class="device.meter ? 'bg-green-500/10' : 'bg-muted'">
              <component :is="device.meter ? Link2 : Link2Off" class="h-5 w-5" :class="device.meter ? 'text-green-500' : 'text-muted-foreground'" />
            </div>
            <div>
              <p class="text-lg font-bold">
                {{ device.meter ? device.meter.serialNumber : 'Not Linked' }}
              </p>
              <p class="text-sm text-muted-foreground">Linked Meter</p>
            </div>
          </div>
        </UiCard>
      </div>
      
      <!-- Main content grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Device Info -->
        <UiCard class="lg:col-span-2">
          <UiCardHeader>
            <UiCardTitle>Device Information</UiCardTitle>
            <UiCardDescription>Technical specifications and configuration</UiCardDescription>
          </UiCardHeader>
          <UiCardContent>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <p class="text-sm text-muted-foreground">Serial Number</p>
                <p class="font-medium font-mono">{{ device.serialNumber }}</p>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Brand</p>
                <p class="font-medium">{{ device.deviceProfile?.brand || '-' }}</p>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Model</p>
                <p class="font-medium">{{ device.deviceProfile?.modelCode || '-' }}</p>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Technology</p>
                <UiBadge variant="outline">
                  {{ device.deviceProfile?.communicationTechnology?.replace(/_/g, '-') || '-' }}
                </UiBadge>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Integration</p>
                <p class="font-medium">{{ device.deviceProfile?.integrationType || '-' }}</p>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Battery Life (Est.)</p>
                <p class="font-medium">
                  {{ device.deviceProfile?.batteryLifeMonths ? `${device.deviceProfile.batteryLifeMonths} months` : '-' }}
                </p>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Created</p>
                <p class="font-medium">{{ formatDate(device.createdAt) }}</p>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Updated</p>
                <p class="font-medium">{{ formatDate(device.updatedAt) }}</p>
              </div>
            </div>
            
            <!-- Dynamic Fields (Keys) -->
            <div v-if="device.dynamicFields && Object.keys(device.dynamicFields).length > 0" class="mt-6 pt-6 border-t border-border">
              <h4 class="font-medium mb-4 flex items-center gap-2">
                <Settings class="h-4 w-4" />
                Communication Keys
              </h4>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="(value, key) in device.dynamicFields"
                  :key="key"
                  class="p-3 rounded-lg bg-muted/50"
                >
                  <p class="text-xs text-muted-foreground uppercase tracking-wide">{{ key }}</p>
                  <p class="font-mono text-sm break-all">{{ value }}</p>
                </div>
              </div>
            </div>
            
            <!-- Decoder Function -->
            <div v-if="device.deviceProfile?.decoderFunction" class="mt-6 pt-6 border-t border-border">
              <h4 class="font-medium mb-4 flex items-center gap-2">
                <Code class="h-4 w-4" />
                Decoder Function
              </h4>
              
              <div class="bg-muted rounded-lg p-4">
                <pre class="text-xs font-mono overflow-x-auto whitespace-pre-wrap">{{ device.deviceProfile.decoderFunction }}</pre>
              </div>
            </div>
          </UiCardContent>
        </UiCard>
        
        <!-- Linked Meter Card -->
        <UiCard>
          <UiCardHeader>
            <UiCardTitle class="flex items-center gap-2">
              <Gauge class="h-5 w-5" />
              Linked Meter
            </UiCardTitle>
          </UiCardHeader>
          <UiCardContent>
            <template v-if="device.meter">
              <div class="space-y-4">
                <div class="p-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
                  <div class="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                    <Link2 class="h-4 w-4" />
                    <span class="text-sm font-medium">Currently Linked</span>
                  </div>
                  
                  <p class="font-mono font-medium text-lg">{{ device.meter.serialNumber }}</p>
                  
                  <div class="mt-3 space-y-1 text-sm">
                    <p v-if="device.meter.meterProfile">
                      <span class="text-muted-foreground">Profile:</span>
                      {{ device.meter.meterProfile.brand }} {{ device.meter.meterProfile.modelCode }}
                    </p>
                    <p v-if="device.meter.customer">
                      <span class="text-muted-foreground">Customer:</span>
                      {{ device.meter.customer.details?.firstName || device.meter.customer.details?.organizationName }}
                    </p>
                    <p>
                      <span class="text-muted-foreground">Status:</span>
                      {{ device.meter.status }}
                    </p>
                  </div>
                </div>
                
                <UiButton
                  variant="link"
                  class="p-0 h-auto"
                  @click="navigateTo(`/meters/${device.meter?.id}`)"
                >
                  View Meter Details →
                </UiButton>
                
                <div class="pt-4 border-t border-border">
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
              <div class="text-center py-8">
                <Link2Off class="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p class="font-medium text-muted-foreground">Not Linked</p>
                <p class="text-sm text-muted-foreground mt-1">
                  This device is available in inventory
                </p>
                <p class="text-xs text-muted-foreground mt-2">
                  Link this device to a meter from the meter's detail page
                </p>
              </div>
            </template>
          </UiCardContent>
        </UiCard>
        
        <!-- Tenant Info -->
        <UiCard class="lg:col-span-3">
          <UiCardHeader>
            <UiCardTitle class="flex items-center gap-2">
              <Building2 class="h-5 w-5" />
              Tenant Information
            </UiCardTitle>
          </UiCardHeader>
          <UiCardContent>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p class="text-sm text-muted-foreground">Tenant</p>
                <p class="font-medium">{{ device.tenant?.name || device.tenantId }}</p>
              </div>
              
              <div v-if="device.tenant?.path">
                <p class="text-sm text-muted-foreground">Path</p>
                <p class="font-mono text-sm">{{ device.tenant.path }}</p>
              </div>
              
              <div v-if="device.tenant?.contactEmail">
                <p class="text-sm text-muted-foreground">Contact</p>
                <p class="font-medium">{{ device.tenant.contactEmail }}</p>
              </div>
            </div>
            
            <UiButton
              v-if="device.tenant"
              variant="link"
              class="p-0 h-auto mt-4"
              @click="navigateTo(`/iam/tenants/${device.tenantId}`)"
            >
              View Tenant Details →
            </UiButton>
          </UiCardContent>
        </UiCard>
      </div>
    </template>
    
    <!-- Edit Dialog -->
    <UiDialog v-model:open="showEditDialog" title="Edit Device" class="max-w-2xl">
      <DevicesCreateForm
        v-if="device"
        :device="device"
        mode="edit"
        @success="handleEditSuccess"
        @cancel="showEditDialog = false"
      />
    </UiDialog>
    
    <!-- Unlink Confirmation Dialog -->
    <UiDialog v-model:open="showUnlinkConfirm" title="Unlink Device">
      <div class="space-y-4">
        <p class="text-muted-foreground">
          Are you sure you want to unlink this device from the meter "{{ device?.meter?.serialNumber }}"?
        </p>
        <p class="text-sm text-muted-foreground">
          The device will be moved back to Warehouse status and can be linked to another meter.
        </p>
        <div class="flex justify-end gap-3">
          <UiButton variant="outline" @click="showUnlinkConfirm = false">
            Cancel
          </UiButton>
          <UiButton variant="destructive" @click="handleUnlink">
            Unlink Device
          </UiButton>
        </div>
      </div>
    </UiDialog>
    
    <!-- Delete Confirmation Dialog -->
    <UiDialog v-model:open="showDeleteConfirm" title="Delete Device">
      <div class="space-y-4">
        <p class="text-muted-foreground">
          Are you sure you want to delete this device "{{ device?.serialNumber }}"?
        </p>
        <p class="text-sm text-muted-foreground">
          This action cannot be undone.
        </p>
        <div class="flex justify-end gap-3">
          <UiButton variant="outline" @click="showDeleteConfirm = false">
            Cancel
          </UiButton>
          <UiButton variant="destructive" @click="handleDelete">
            Delete Device
          </UiButton>
        </div>
      </div>
    </UiDialog>
  </div>
</template>
