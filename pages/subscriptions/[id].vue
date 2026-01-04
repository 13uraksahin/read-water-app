<script setup lang="ts">
import { 
  FileText, 
  ArrowLeft, 
  MapPin, 
  Droplets, 
  Edit, 
  Trash2, 
  Plus, 
  Unlink, 
  Radio, 
  Link2,
  Gauge, 
  ExternalLink,
  Navigation,
} from 'lucide-vue-next'
import type { Subscription, Meter, Module } from '~/types'

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

// Meter/Module linking state
const showLinkMeterDialog = ref(false)
const showLinkModuleDialog = ref(false)
const availableMeters = ref<Meter[]>([])
const availableModules = ref<Module[]>([])
const selectedMeterId = ref('')
const selectedModuleId = ref('')
const targetMeterForModule = ref<Meter | null>(null)
const isLoadingMeters = ref(false)
const isLoadingModules = ref(false)
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

// Fetch available modules (warehouse stock without meter link)
const fetchAvailableModules = async (meterId: string) => {
  if (!subscription.value?.tenantId) return
  
  isLoadingModules.value = true
  try {
    // First try the dedicated endpoint
    const response = await api.get<Module[]>(
      `/api/v1/modules/available?tenantId=${subscription.value.tenantId}&meterId=${meterId}`
    )
    availableModules.value = response
  } catch {
    // Fallback: fetch warehouse modules
    try {
      const response = await api.getList<Module>('/api/v1/modules', {
        tenantId: subscription.value.tenantId,
        status: 'WAREHOUSE',
        limit: 100,
      })
      availableModules.value = response.data
    } catch (error) {
      console.error('Failed to fetch available modules:', error)
      availableModules.value = []
    }
  } finally {
    isLoadingModules.value = false
  }
}

// Open link meter dialog
const openLinkMeterDialog = () => {
  selectedMeterId.value = ''
  fetchAvailableMeters()
  showLinkMeterDialog.value = true
}

// Open link module dialog
const openLinkModuleDialog = (meter: Meter) => {
  selectedModuleId.value = ''
  targetMeterForModule.value = meter
  fetchAvailableModules(meter.id)
  showLinkModuleDialog.value = true
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

// Link module to meter
const linkModule = async () => {
  if (!selectedModuleId.value || !targetMeterForModule.value) {
    toast.error('Please select a module')
    return
  }
  
  isLinking.value = true
  try {
    await api.post(`/api/v1/meters/${targetMeterForModule.value.id}/link-module`, {
      moduleId: selectedModuleId.value,
    })
    toast.success('Module linked successfully')
    showLinkModuleDialog.value = false
    targetMeterForModule.value = null
    fetchSubscription()
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.error(err.message || 'Failed to link module')
  } finally {
    isLinking.value = false
  }
}

// Unlink module from meter
const unlinkModule = async (meterId: string) => {
  isLinking.value = true
  try {
    await api.post(`/api/v1/meters/${meterId}/unlink-module`, {
      moduleStatus: 'WAREHOUSE',
    })
    toast.success('Module unlinked successfully')
    fetchSubscription()
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.error(err.message || 'Failed to unlink module')
  } finally {
    isLinking.value = false
  }
}

// Get module identifier for display
const getModuleIdentifier = (module: Module): string => {
  if (!module.dynamicFields) return module.serialNumber
  const identifiers = ['DevEUI', 'ID', 'IMEI', 'MacAddress']
  for (const key of identifiers) {
    if (module.dynamicFields[key]) return module.dynamicFields[key]
  }
  return module.serialNumber
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

// Google Maps URL
const googleMapsUrl = computed(() => {
  if (!subscription.value?.latitude || !subscription.value?.longitude) return null
  const lat = Number(subscription.value.latitude).toFixed(6)
  const lng = Number(subscription.value.longitude).toFixed(6)
  return `https://www.google.com/maps?q=${lat},${lng}`
})

// Total consumption
const totalConsumption = computed(() => {
  if (!subscription.value?.meters?.length) return 0
  return subscription.value.meters.reduce((sum, meter) => {
    const current = Number(meter.lastReadingValue ?? meter.initialIndex ?? 0)
    const initial = Number(meter.initialIndex ?? 0)
    return sum + (current - initial)
  }, 0)
})

// Total modules
const totalModules = computed(() => {
  if (!subscription.value?.meters?.length) return 0
  return subscription.value.meters.filter(m => m.activeModule).length
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
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <UiCard v-for="i in 4" :key="i" class="p-4">
          <UiSkeleton class="h-20 w-full" />
        </UiCard>
      </div>
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
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <UiCard class="p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-primary/10">
              <Gauge class="h-5 w-5 text-primary" />
            </div>
            <div>
              <p class="text-2xl font-bold">{{ subscription.meters?.length || 0 }}</p>
              <p class="text-sm text-muted-foreground">Linked Meters</p>
            </div>
          </div>
        </UiCard>
        
        <UiCard class="p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-blue-500/10">
              <Radio class="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p class="text-2xl font-bold">{{ totalModules }}</p>
              <p class="text-sm text-muted-foreground">Linked Modules</p>
            </div>
          </div>
        </UiCard>
        
        <UiCard class="p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-green-500/10">
              <TrendingUp class="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p class="text-2xl font-bold">{{ totalConsumption.toFixed(2) }} m³</p>
              <p class="text-sm text-muted-foreground">Total Consumption</p>
            </div>
          </div>
        </UiCard>
        
        <UiCard class="p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg" :class="subscription.isActive ? 'bg-green-500/10' : 'bg-muted'">
              <FileText class="h-5 w-5" :class="subscription.isActive ? 'text-green-500' : 'text-muted-foreground'" />
            </div>
            <div>
              <p class="text-2xl font-bold">{{ subscription.isActive ? 'Active' : 'Inactive' }}</p>
              <p class="text-sm text-muted-foreground">Status</p>
            </div>
          </div>
        </UiCard>
      </div>
      
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
              <span class="text-muted-foreground">Consumption Group</span>
              <UiBadge :variant="subscription.consumptionGroup === 'HIGH_CONSUMPTION' ? 'destructive' : 'secondary'">
                {{ subscription.consumptionGroup === 'HIGH_CONSUMPTION' ? 'High Consumption' : 'Normal Consumption' }}
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
        
        <!-- Address with Map -->
        <UiCard class="p-6">
          <h2 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin class="h-5 w-5 text-primary" />
            Service Address
          </h2>
          
          <div class="space-y-4">
            <p class="text-sm">{{ addressDisplay }}</p>
            
            <!-- Map Preview with Hover -->
            <div 
              v-if="subscription.latitude && subscription.longitude" 
              class="relative rounded-lg overflow-hidden border border-border"
            >
              <UiHoverCard>
                <UiHoverCardTrigger as-child>
                  <div class="h-40 bg-muted/50 flex items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                    <div class="text-center">
                      <MapPin class="h-8 w-8 mx-auto text-primary mb-2" />
                      <p class="text-sm text-muted-foreground font-mono">
                        {{ Number(subscription.latitude).toFixed(6) }}, {{ Number(subscription.longitude).toFixed(6) }}
                      </p>
                      <p class="text-xs text-muted-foreground mt-1">Hover for preview</p>
                    </div>
                  </div>
                </UiHoverCardTrigger>
                <UiHoverCardContent class="w-80 p-0" side="top">
                  <div class="p-4 space-y-3">
                    <div class="flex items-center gap-2">
                      <MapPin class="h-4 w-4 text-primary" />
                      <h4 class="font-semibold">Location Preview</h4>
                    </div>
                    <div class="h-40 rounded-lg overflow-hidden bg-muted">
                      <iframe
                        v-if="subscription.latitude && subscription.longitude"
                        width="100%"
                        height="100%"
                        frameborder="0"
                        style="border:0"
                        :src="`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6ceM4M1fh0sFxm4&q=${Number(subscription.latitude).toFixed(6)},${Number(subscription.longitude).toFixed(6)}&zoom=15`"
                        allowfullscreen
                        loading="lazy"
                      />
                    </div>
                    <p class="text-xs text-muted-foreground">
                      {{ addressDisplay }}
                    </p>
                  </div>
                </UiHoverCardContent>
              </UiHoverCard>
              
              <!-- Google Maps Link -->
              <a
                v-if="googleMapsUrl"
                :href="googleMapsUrl"
                target="_blank"
                class="absolute top-2 right-2 p-2 bg-background/80 rounded-lg hover:bg-background transition-colors flex items-center gap-1 text-xs"
              >
                <Navigation class="h-3 w-3" />
                Open in Maps
                <ExternalLink class="h-3 w-3" />
              </a>
            </div>
            
            <div v-else class="h-40 bg-muted/50 rounded-lg flex items-center justify-center">
              <div class="text-center text-muted-foreground">
                <MapPin class="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p class="text-sm">No coordinates available</p>
              </div>
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
            <div class="flex items-center gap-3">
              <UiAvatar size="lg" :fallback="getCustomerName.charAt(0)" />
              <div>
                <NuxtLink 
                  :to="`/customers/${subscription.customerId}`" 
                  class="text-primary hover:underline font-medium text-lg"
                >
                  {{ getCustomerName }}
                </NuxtLink>
                <p class="text-sm text-muted-foreground">
                  {{ subscription.customer?.customerType === 'INDIVIDUAL' ? 'Individual' : 'Organization' }}
                </p>
              </div>
            </div>
            
            <div v-if="subscription.customer?.customerType === 'INDIVIDUAL'" class="flex justify-between pt-2">
              <span class="text-muted-foreground">TC ID</span>
              <span class="font-mono">{{ subscription.customer?.details?.tcIdNo || '-' }}</span>
            </div>
            
            <div v-else class="flex justify-between pt-2">
              <span class="text-muted-foreground">Tax ID</span>
              <span class="font-mono">{{ subscription.customer?.details?.taxId || '-' }}</span>
            </div>
            
            <div class="flex justify-between">
              <span class="text-muted-foreground">Contact</span>
              <span>{{ subscription.customer?.details?.phone || subscription.customer?.details?.contactPhone || '-' }}</span>
            </div>
            
            <UiButton
              variant="outline"
              class="w-full mt-2"
              @click="navigateTo(`/customers/${subscription.customerId}`)"
            >
              View Customer Details
            </UiButton>
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
              
              <!-- Module Info Row -->
              <div class="pl-4 border-l-2 border-border">
                <div v-if="meter.activeModule" class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <Radio class="h-4 w-4 text-green-500" />
                    <div>
                      <NuxtLink 
                        :to="`/modules/${meter.activeModule.id}`" 
                        class="text-sm font-medium text-primary hover:underline"
                      >
                        {{ meter.activeModule.serialNumber }}
                      </NuxtLink>
                      <p class="text-xs text-muted-foreground">
                        {{ meter.activeModule.moduleProfile?.brand }} • 
                        {{ meter.activeModule.moduleProfile?.communicationTechnology?.replace(/_/g, '-') }}
                      </p>
                    </div>
                  </div>
                  <UiButton 
                    size="sm" 
                    variant="ghost" 
                    class="text-destructive hover:text-destructive"
                    @click="unlinkModule(meter.id)"
                    :disabled="isLinking"
                  >
                    <Unlink class="h-4 w-4" />
                  </UiButton>
                </div>
                
                <div v-else class="flex items-center justify-between">
                  <div class="flex items-center gap-2 text-muted-foreground">
                    <Radio class="h-4 w-4 opacity-50" />
                    <span class="text-sm">No module linked</span>
                  </div>
                  <UiButton 
                    size="sm" 
                    variant="ghost"
                    @click="openLinkModuleDialog(meter)"
                  >
                    <Link2 class="h-4 w-4 mr-1" />
                    Link Module
                  </UiButton>
                </div>
              </div>
            </div>
          </div>
          
          <div v-else class="text-center py-6 text-muted-foreground">
            <Droplets class="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No meters linked</p>
            <p class="text-sm mt-1">Click "Link Meter" to assign a meter from warehouse</p>
          </div>
        </UiCard>
      </div>
      
      <!-- Consumption Chart -->
      <ConsumptionAnalysis
        source-type="subscription"
        :source-id="subscriptionId"
        title="Consumption History"
        description="Water consumption over time for this subscription"
      />
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
            Select a meter from warehouse to link to this subscription.
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
    
    <!-- Link Module Dialog -->
    <UiDialog v-model:open="showLinkModuleDialog">
      <UiDialogContent class="max-w-lg">
        <UiDialogHeader>
          <UiDialogTitle class="flex items-center gap-2">
            <Radio class="h-5 w-5 text-primary" />
            Link Module to Meter
          </UiDialogTitle>
        </UiDialogHeader>
        
        <div class="py-4 space-y-4">
          <div v-if="targetMeterForModule" class="p-3 bg-muted/50 rounded-lg">
            <p class="text-sm text-muted-foreground">Linking module to meter:</p>
            <p class="font-medium font-mono">{{ targetMeterForModule.serialNumber }}</p>
          </div>
          
          <div v-if="isLoadingModules" class="flex items-center justify-center py-8">
            <UiSpinner size="lg" />
          </div>
          
          <div v-else-if="availableModules.length === 0" class="text-center py-8 text-muted-foreground">
            <Radio class="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No modules available in warehouse</p>
            <p class="text-sm mt-1">Create a module first or unlink from another meter</p>
          </div>
          
          <div v-else class="space-y-2 max-h-64 overflow-y-auto">
            <div
              v-for="module in availableModules"
              :key="module.id"
              class="p-3 rounded-lg border cursor-pointer transition-colors"
              :class="selectedModuleId === module.id 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'"
              @click="selectedModuleId = module.id"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium font-mono">{{ module.serialNumber }}</p>
                  <p class="text-xs text-muted-foreground font-mono">{{ getModuleIdentifier(module) }}</p>
                </div>
                <div class="text-right">
                  <UiBadge variant="outline" class="text-xs">
                    {{ module.moduleProfile?.brand }}
                  </UiBadge>
                  <p class="text-xs text-muted-foreground mt-1">
                    {{ module.moduleProfile?.communicationTechnology?.replace(/_/g, '-') }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <UiDialogFooter>
          <UiButton variant="outline" @click="showLinkModuleDialog = false; targetMeterForModule = null">Cancel</UiButton>
          <UiButton 
            @click="linkModule" 
            :disabled="!selectedModuleId || isLinking"
          >
            {{ isLinking ? 'Linking...' : 'Link Module' }}
          </UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>
