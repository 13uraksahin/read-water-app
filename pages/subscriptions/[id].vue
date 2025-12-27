<script setup lang="ts">
import { FileText, ArrowLeft, MapPin, User, Building2, Droplets, Edit, Trash2, Plus, Unlink, Radio, Link2 } from 'lucide-vue-next'
import type { Subscription, Meter, Device, MeterStatus, DeviceStatus } from '~/types'

definePageMeta({
  middleware: ['auth'],
})

const route = useRoute()
const api = useApi()
const toast = useToast()

const subscriptionId = computed(() => route.params.id as string)

// State
const subscription = ref<Subscription | null>(null)
const isLoading = ref(true)
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)

// Meter/Device linking state
const showLinkMeterDialog = ref(false)
const showLinkDeviceDialog = ref(false)
const availableMeters = ref<Meter[]>([])
const availableDevices = ref<Device[]>([])
const selectedMeterId = ref('')
const selectedDeviceId = ref('')
const targetMeterForDevice = ref<Meter | null>(null)
const isLoadingMeters = ref(false)
const isLoadingDevices = ref(false)
const isLinking = ref(false)

// Fetch subscription
const fetchSubscription = async () => {
  isLoading.value = true
  try {
    subscription.value = await api.get<Subscription>(`/api/v1/subscriptions/${subscriptionId.value}`)
  } catch (error) {
    toast.error('Failed to fetch subscription')
    navigateTo('/subscriptions')
  } finally {
    isLoading.value = false
  }
}

// Delete subscription
const deleteSubscription = async () => {
  try {
    await api.del(`/api/v1/subscriptions/${subscriptionId.value}`)
    toast.success('Subscription deleted successfully')
    navigateTo('/subscriptions')
  } catch (error) {
    toast.error('Failed to delete subscription')
  }
}

// Fetch available meters (warehouse stock without subscription)
const fetchAvailableMeters = async () => {
  if (!subscription.value?.tenantId) return
  
  isLoadingMeters.value = true
  try {
    const response = await api.getList<Meter>('/api/v1/meters', {
      tenantId: subscription.value.tenantId,
      status: 'WAREHOUSE',
      limit: 100,
    })
    // Filter meters that don't have a subscription
    availableMeters.value = response.data.filter(m => !m.subscriptionId)
  } catch (error) {
    console.error('Failed to fetch available meters:', error)
    availableMeters.value = []
  } finally {
    isLoadingMeters.value = false
  }
}

// Fetch available devices (warehouse stock without meter link)
const fetchAvailableDevices = async (meterId: string) => {
  if (!subscription.value?.tenantId) return
  
  isLoadingDevices.value = true
  try {
    // First try the dedicated endpoint
    const response = await api.get<Device[]>(
      `/api/v1/devices/available?tenantId=${subscription.value.tenantId}&meterId=${meterId}`
    )
    availableDevices.value = response
  } catch {
    // Fallback: fetch warehouse devices
    try {
      const response = await api.getList<Device>('/api/v1/devices', {
        tenantId: subscription.value.tenantId,
        status: 'WAREHOUSE',
        limit: 100,
      })
      availableDevices.value = response.data
    } catch (error) {
      console.error('Failed to fetch available devices:', error)
      availableDevices.value = []
    }
  } finally {
    isLoadingDevices.value = false
  }
}

// Open link meter dialog
const openLinkMeterDialog = () => {
  selectedMeterId.value = ''
  fetchAvailableMeters()
  showLinkMeterDialog.value = true
}

// Open link device dialog
const openLinkDeviceDialog = (meter: Meter) => {
  selectedDeviceId.value = ''
  targetMeterForDevice.value = meter
  fetchAvailableDevices(meter.id)
  showLinkDeviceDialog.value = true
}

// Link meter to subscription
const linkMeter = async () => {
  if (!selectedMeterId.value) {
    toast.error('Please select a meter')
    return
  }
  
  isLinking.value = true
  try {
    await api.post(`/api/v1/subscriptions/${subscriptionId.value}/link-meter/${selectedMeterId.value}`)
    toast.success('Meter linked successfully')
    showLinkMeterDialog.value = false
    fetchSubscription()
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.error(err.message || 'Failed to link meter')
  } finally {
    isLinking.value = false
  }
}

// Unlink meter from subscription
const unlinkMeter = async (meterId: string) => {
  isLinking.value = true
  try {
    await api.post(`/api/v1/subscriptions/${subscriptionId.value}/unlink-meter/${meterId}`)
    toast.success('Meter unlinked successfully')
    fetchSubscription()
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.error(err.message || 'Failed to unlink meter')
  } finally {
    isLinking.value = false
  }
}

// Link device to meter
const linkDevice = async () => {
  if (!selectedDeviceId.value || !targetMeterForDevice.value) {
    toast.error('Please select a device')
    return
  }
  
  isLinking.value = true
  try {
    await api.post(`/api/v1/meters/${targetMeterForDevice.value.id}/link-device`, {
      deviceId: selectedDeviceId.value,
    })
    toast.success('Device linked successfully')
    showLinkDeviceDialog.value = false
    targetMeterForDevice.value = null
    fetchSubscription()
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.error(err.message || 'Failed to link device')
  } finally {
    isLinking.value = false
  }
}

// Unlink device from meter
const unlinkDevice = async (meterId: string) => {
  isLinking.value = true
  try {
    await api.post(`/api/v1/meters/${meterId}/unlink-device`, {
      deviceStatus: 'WAREHOUSE',
    })
    toast.success('Device unlinked successfully')
    fetchSubscription()
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.error(err.message || 'Failed to unlink device')
  } finally {
    isLinking.value = false
  }
}

// Get device identifier for display
const getDeviceIdentifier = (device: Device): string => {
  if (!device.dynamicFields) return device.serialNumber
  const identifiers = ['DevEUI', 'ID', 'IMEI', 'MacAddress']
  for (const key of identifiers) {
    if (device.dynamicFields[key]) return device.dynamicFields[key]
  }
  return device.serialNumber
}

// Initial fetch
onMounted(() => {
  fetchSubscription()
})

// Get customer name
const getCustomerName = computed(() => {
  if (!subscription.value?.customer) return 'N/A'
  const customer = subscription.value.customer
  if (customer.customerType === 'INDIVIDUAL') {
    return `${customer.details?.firstName || ''} ${customer.details?.lastName || ''}`.trim() || 'N/A'
  }
  return customer.details?.organizationName || 'N/A'
})

// Get address display
const addressDisplay = computed(() => {
  if (!subscription.value?.address) return '-'
  const addr = subscription.value.address
  const parts = [
    addr.street,
    addr.buildingNo && `No: ${addr.buildingNo}`,
    addr.floor && `Floor: ${addr.floor}`,
    addr.doorNo && `Door: ${addr.doorNo}`,
    addr.neighborhood,
    addr.district,
    addr.city,
    addr.postalCode,
  ].filter(Boolean)
  return parts.join(', ') || '-'
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <UiButton variant="ghost" size="icon" @click="navigateTo('/subscriptions')">
          <ArrowLeft class="h-5 w-5" />
        </UiButton>
        <div>
          <h1 class="text-2xl font-bold flex items-center gap-2">
            <FileText class="h-6 w-6 text-primary" />
            Subscription Details
          </h1>
          <div class="flex items-center gap-2 text-muted-foreground">
            <span v-if="subscription" class="font-mono text-sm">#{{ subscription.subscriptionNumber }}</span>
            <span v-else>View and manage subscription information</span>
          </div>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <UiButton variant="outline" @click="showEditDialog = true">
          <Edit class="h-4 w-4" />
          Edit
        </UiButton>
        <UiButton variant="destructive" @click="showDeleteDialog = true">
          <Trash2 class="h-4 w-4" />
          Delete
        </UiButton>
      </div>
    </div>
    
    <!-- Loading state -->
    <template v-if="isLoading">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UiCard class="p-6">
          <UiSkeleton class="h-4 w-32 mb-4" />
          <UiSkeleton class="h-20 w-full" />
        </UiCard>
        <UiCard class="p-6">
          <UiSkeleton class="h-4 w-32 mb-4" />
          <UiSkeleton class="h-20 w-full" />
        </UiCard>
      </div>
    </template>
    
    <!-- Content -->
    <template v-else-if="subscription">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Subscription Info -->
        <UiCard class="p-6">
          <h2 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText class="h-5 w-5 text-primary" />
            Subscription Information
          </h2>
          
          <div class="space-y-4">
            <div class="flex justify-between">
              <span class="text-muted-foreground">Subscription Number</span>
              <span class="font-mono font-medium">{{ subscription.subscriptionNumber }}</span>
            </div>
            
            <div class="flex justify-between">
              <span class="text-muted-foreground">Type</span>
              <div class="flex items-center gap-2">
                <User v-if="subscription.subscriptionType === 'INDIVIDUAL'" class="h-4 w-4" />
                <Building2 v-else class="h-4 w-4" />
                <span>{{ subscription.subscriptionType }}</span>
              </div>
            </div>
            
            <div class="flex justify-between">
              <span class="text-muted-foreground">Group</span>
              <UiBadge :variant="subscription.subscriptionGroup === 'HIGH_CONSUMPTION' ? 'warning' : 'secondary'">
                {{ subscription.subscriptionGroup === 'HIGH_CONSUMPTION' ? 'High Consumption' : 'Normal Consumption' }}
              </UiBadge>
            </div>
            
            <div class="flex justify-between">
              <span class="text-muted-foreground">Status</span>
              <UiBadge :variant="subscription.isActive ? 'success' : 'secondary'">
                {{ subscription.isActive ? 'Active' : 'Inactive' }}
              </UiBadge>
            </div>
            
            <div class="flex justify-between">
              <span class="text-muted-foreground">Start Date</span>
              <span>{{ new Date(subscription.startDate).toLocaleDateString() }}</span>
            </div>
            
            <div v-if="subscription.endDate" class="flex justify-between">
              <span class="text-muted-foreground">End Date</span>
              <span>{{ new Date(subscription.endDate).toLocaleDateString() }}</span>
            </div>
          </div>
        </UiCard>
        
        <!-- Address -->
        <UiCard class="p-6">
          <h2 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin class="h-5 w-5 text-primary" />
            Service Address
          </h2>
          
          <div class="space-y-2">
            <p class="text-sm">{{ addressDisplay }}</p>
            
            <div v-if="subscription.latitude && subscription.longitude" class="text-xs text-muted-foreground mt-2">
              Coordinates: {{ Number(subscription.latitude).toFixed(6) }}, {{ Number(subscription.longitude).toFixed(6) }}
            </div>
            
            <div v-if="subscription.addressCode" class="text-xs text-muted-foreground">
              UAVT Code: {{ subscription.addressCode }}
            </div>
          </div>
        </UiCard>
        
        <!-- Customer Info -->
        <UiCard class="p-6">
          <h2 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <User class="h-5 w-5 text-primary" />
            Customer
          </h2>
          
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-muted-foreground">Name</span>
              <NuxtLink 
                :to="`/customers/${subscription.customerId}`" 
                class="text-primary hover:underline font-medium"
              >
                {{ getCustomerName }}
              </NuxtLink>
            </div>
            
            <div v-if="subscription.customer?.customerType === 'INDIVIDUAL'" class="flex justify-between">
              <span class="text-muted-foreground">TC ID</span>
              <span class="font-mono">{{ subscription.customer?.details?.tcIdNo || '-' }}</span>
            </div>
            
            <div v-else class="flex justify-between">
              <span class="text-muted-foreground">Tax ID</span>
              <span class="font-mono">{{ subscription.customer?.details?.taxId || '-' }}</span>
            </div>
            
            <div class="flex justify-between">
              <span class="text-muted-foreground">Contact</span>
              <span>{{ subscription.customer?.details?.phone || subscription.customer?.details?.contactPhone || '-' }}</span>
            </div>
          </div>
        </UiCard>
        
        <!-- Linked Meters -->
        <UiCard class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold flex items-center gap-2">
              <Droplets class="h-5 w-5 text-primary" />
              Linked Meters ({{ subscription.meters?.length || 0 }})
            </h2>
            <UiButton size="sm" variant="outline" @click="openLinkMeterDialog">
              <Plus class="h-4 w-4 mr-1" />
              Link Meter
            </UiButton>
          </div>
          
          <div v-if="subscription.meters?.length" class="space-y-3">
            <div 
              v-for="meter in subscription.meters" 
              :key="meter.id"
              class="p-4 bg-muted/50 rounded-lg space-y-3"
            >
              <!-- Meter Info Row -->
              <div class="flex items-center justify-between">
                <div>
                  <NuxtLink 
                    :to="`/meters/${meter.id}`" 
                    class="font-medium text-primary hover:underline"
                  >
                    {{ meter.serialNumber }}
                  </NuxtLink>
                  <p class="text-sm text-muted-foreground">
                    {{ meter.meterProfile?.brand }} {{ meter.meterProfile?.modelCode }}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <div class="text-right mr-2">
                    <UiBadge :variant="meter.status === 'ACTIVE' ? 'success' : 'secondary'" class="mb-1">
                      {{ meter.status }}
                    </UiBadge>
                    <p v-if="meter.lastReadingValue" class="text-sm text-muted-foreground">
                      {{ Number(meter.lastReadingValue).toFixed(2) }} m³
                    </p>
                  </div>
                  <UiButton 
                    size="sm" 
                    variant="ghost" 
                    class="text-destructive hover:text-destructive"
                    @click="unlinkMeter(meter.id)"
                    :disabled="isLinking"
                  >
                    <Unlink class="h-4 w-4" />
                  </UiButton>
                </div>
              </div>
              
              <!-- Device Info Row -->
              <div class="pl-4 border-l-2 border-border">
                <div v-if="meter.activeDevice" class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <Radio class="h-4 w-4 text-green-500" />
                    <div>
                      <NuxtLink 
                        :to="`/devices/${meter.activeDevice.id}`" 
                        class="text-sm font-medium text-primary hover:underline"
                      >
                        {{ meter.activeDevice.serialNumber }}
                      </NuxtLink>
                      <p class="text-xs text-muted-foreground">
                        {{ meter.activeDevice.deviceProfile?.brand }} • 
                        {{ meter.activeDevice.deviceProfile?.communicationTechnology?.replace(/_/g, '-') }}
                      </p>
                    </div>
                  </div>
                  <UiButton 
                    size="sm" 
                    variant="ghost" 
                    class="text-destructive hover:text-destructive"
                    @click="unlinkDevice(meter.id)"
                    :disabled="isLinking"
                  >
                    <Unlink class="h-4 w-4" />
                  </UiButton>
                </div>
                
                <div v-else class="flex items-center justify-between">
                  <div class="flex items-center gap-2 text-muted-foreground">
                    <Radio class="h-4 w-4 opacity-50" />
                    <span class="text-sm">No device linked</span>
                  </div>
                  <UiButton 
                    size="sm" 
                    variant="ghost"
                    @click="openLinkDeviceDialog(meter)"
                  >
                    <Link2 class="h-4 w-4 mr-1" />
                    Link Device
                  </UiButton>
                </div>
              </div>
            </div>
          </div>
          
          <div v-else class="text-center py-6 text-muted-foreground">
            <Droplets class="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No meters linked</p>
            <p class="text-sm mt-1">Click "Link Meter" to assign a meter from inventory</p>
          </div>
        </UiCard>
      </div>
    </template>
    
    <!-- Delete Confirmation Dialog -->
    <UiDialog v-model:open="showDeleteDialog">
      <UiDialogContent>
        <UiDialogHeader>
          <UiDialogTitle>Delete Subscription</UiDialogTitle>
        </UiDialogHeader>
        <p class="py-4">
          Are you sure you want to delete this subscription? This action cannot be undone.
          <span v-if="subscription?.meters?.length" class="block mt-2 text-destructive font-medium">
            Warning: This subscription has {{ subscription.meters.length }} linked meters. You must unlink them first.
          </span>
        </p>
        <UiDialogFooter>
          <UiButton variant="outline" @click="showDeleteDialog = false">Cancel</UiButton>
          <UiButton 
            variant="destructive" 
            :disabled="(subscription?.meters?.length || 0) > 0"
            @click="deleteSubscription"
          >
            Delete
          </UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>
    
    <!-- Edit Dialog -->
    <UiDialog v-model:open="showEditDialog">
      <UiDialogContent class="max-w-2xl">
        <UiDialogHeader>
          <UiDialogTitle>Edit Subscription</UiDialogTitle>
        </UiDialogHeader>
        <div v-if="subscription" class="overflow-y-auto flex-1 -mx-6 px-6">
          <SubscriptionsCreateForm 
            :subscription="subscription"
            @success="showEditDialog = false; fetchSubscription()" 
            @cancel="showEditDialog = false" 
          />
        </div>
      </UiDialogContent>
    </UiDialog>
    
    <!-- Link Meter Dialog -->
    <UiDialog v-model:open="showLinkMeterDialog">
      <UiDialogContent class="max-w-lg">
        <UiDialogHeader>
          <UiDialogTitle class="flex items-center gap-2">
            <Droplets class="h-5 w-5 text-primary" />
            Link Meter to Subscription
          </UiDialogTitle>
        </UiDialogHeader>
        
        <div class="py-4 space-y-4">
          <p class="text-sm text-muted-foreground">
            Select a meter from warehouse inventory to link to this subscription.
          </p>
          
          <div v-if="isLoadingMeters" class="flex items-center justify-center py-8">
            <UiSpinner size="lg" />
          </div>
          
          <div v-else-if="availableMeters.length === 0" class="text-center py-8 text-muted-foreground">
            <Droplets class="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No meters available in warehouse</p>
            <p class="text-sm mt-1">Create a meter first or unlink from another subscription</p>
          </div>
          
          <div v-else class="space-y-2 max-h-64 overflow-y-auto">
            <div
              v-for="meter in availableMeters"
              :key="meter.id"
              class="p-3 rounded-lg border cursor-pointer transition-colors"
              :class="selectedMeterId === meter.id 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'"
              @click="selectedMeterId = meter.id"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium font-mono">{{ meter.serialNumber }}</p>
                  <p class="text-sm text-muted-foreground">
                    {{ meter.meterProfile?.brand }} {{ meter.meterProfile?.modelCode }}
                  </p>
                </div>
                <UiBadge variant="outline">{{ meter.status }}</UiBadge>
              </div>
            </div>
          </div>
        </div>
        
        <UiDialogFooter>
          <UiButton variant="outline" @click="showLinkMeterDialog = false">Cancel</UiButton>
          <UiButton 
            @click="linkMeter" 
            :disabled="!selectedMeterId || isLinking"
          >
            {{ isLinking ? 'Linking...' : 'Link Meter' }}
          </UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>
    
    <!-- Link Device Dialog -->
    <UiDialog v-model:open="showLinkDeviceDialog">
      <UiDialogContent class="max-w-lg">
        <UiDialogHeader>
          <UiDialogTitle class="flex items-center gap-2">
            <Radio class="h-5 w-5 text-primary" />
            Link Device to Meter
          </UiDialogTitle>
        </UiDialogHeader>
        
        <div class="py-4 space-y-4">
          <div v-if="targetMeterForDevice" class="p-3 bg-muted/50 rounded-lg">
            <p class="text-sm text-muted-foreground">Linking device to meter:</p>
            <p class="font-medium font-mono">{{ targetMeterForDevice.serialNumber }}</p>
          </div>
          
          <div v-if="isLoadingDevices" class="flex items-center justify-center py-8">
            <UiSpinner size="lg" />
          </div>
          
          <div v-else-if="availableDevices.length === 0" class="text-center py-8 text-muted-foreground">
            <Radio class="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No devices available in warehouse</p>
            <p class="text-sm mt-1">Create a device first or unlink from another meter</p>
          </div>
          
          <div v-else class="space-y-2 max-h-64 overflow-y-auto">
            <div
              v-for="device in availableDevices"
              :key="device.id"
              class="p-3 rounded-lg border cursor-pointer transition-colors"
              :class="selectedDeviceId === device.id 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'"
              @click="selectedDeviceId = device.id"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium font-mono">{{ device.serialNumber }}</p>
                  <p class="text-xs text-muted-foreground font-mono">{{ getDeviceIdentifier(device) }}</p>
                </div>
                <div class="text-right">
                  <UiBadge variant="outline" class="text-xs">
                    {{ device.deviceProfile?.brand }}
                  </UiBadge>
                  <p class="text-xs text-muted-foreground mt-1">
                    {{ device.deviceProfile?.communicationTechnology?.replace(/_/g, '-') }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <UiDialogFooter>
          <UiButton variant="outline" @click="showLinkDeviceDialog = false; targetMeterForDevice = null">Cancel</UiButton>
          <UiButton 
            @click="linkDevice" 
            :disabled="!selectedDeviceId || isLinking"
          >
            {{ isLinking ? 'Linking...' : 'Link Device' }}
          </UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>

