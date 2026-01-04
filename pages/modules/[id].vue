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
  Wifi,
  Zap,
  Star,
  Clock,
  User,
  FileText,
  MapPin,
} from 'lucide-vue-next'
import type { Module, ModuleProfile, ModuleCommunicationConfig, Scenario } from '~/types'
import { formatDate, formatDateTime } from '~/lib/utils'

definePageMeta({
  middleware: ['auth'],
})

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()

const moduleId = computed(() => route.params.id as string)

// State
const module = ref<Module | null>(null)
const isLoading = ref(true)
const showEditDialog = ref(false)
const showUnlinkConfirm = ref(false)
const showDeleteConfirm = ref(false)

// Fetch module details
const fetchModule = async () => {
  isLoading.value = true
  try {
    const response = await api.get<Module>(`/api/v1/modules/${moduleId.value}`)
    module.value = response
  } catch (error) {
    toast.error('Failed to load module')
    router.push('/modules')
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

// Get communication configs from module profile
const profileCommunicationConfigs = computed((): ModuleCommunicationConfig[] => {
  if (!module.value?.moduleProfile) return []
  
  const profile = module.value.moduleProfile
  
  // Check for new format: communicationConfigs in specifications
  const specs = profile.specifications as Record<string, unknown> | undefined
  if (specs?.communicationConfigs && Array.isArray(specs.communicationConfigs)) {
    return specs.communicationConfigs as ModuleCommunicationConfig[]
  }
  
  // Fallback: Legacy single technology format
  if (profile.communicationTechnology) {
    return [{
      technology: profile.communicationTechnology,
      fieldDefinitions: profile.fieldDefinitions || [],
    }]
  }
  
  return []
})

// Check if profile has multiple technologies
const hasMultipleTechnologies = computed(() => profileCommunicationConfigs.value.length > 1)

// Get the selected technology config for this module
const selectedTechnologyConfig = computed(() => {
  if (!module.value?.selectedTechnology) {
    // Fallback to first or primary technology
    return profileCommunicationConfigs.value[0] || null
  }
  return profileCommunicationConfigs.value.find(c => c.technology === module.value?.selectedTechnology) || null
})

// Get scenarios from the selected technology
const availableScenarios = computed((): Scenario[] => {
  return selectedTechnologyConfig.value?.scenarios || []
})

// Check if profile has scenarios
const hasScenarios = computed(() => availableScenarios.value.length > 0)

// Check if a scenario is active for this module
const isScenarioActive = (scenarioId: string): boolean => {
  return module.value?.activeScenarioIds?.includes(scenarioId) || false
}

// Format message interval for display
const formatInterval = (minutes?: number): string => {
  if (!minutes) return ''
  if (minutes >= 1440) {
    const days = Math.round(minutes / 1440)
    return `${days}d`
  }
  if (minutes >= 60) {
    const hours = Math.round(minutes / 60)
    return `${hours}h`
  }
  return `${minutes}m`
}

// Get field value from dynamicFields
const getFieldValue = (fieldName: string): string => {
  return module.value?.dynamicFields?.[fieldName] || '-'
}

// Get customer name
const getCustomerName = computed(() => {
  const customer = module.value?.meter?.subscription?.customer
  if (!customer) return null
  const details = customer.details as Record<string, string> | undefined
  if (customer.type === 'INDIVIDUAL') {
    return `${details?.firstName || ''} ${details?.lastName || ''}`.trim() || 'N/A'
  }
  return details?.organizationName || 'N/A'
})

// Get customer TC/Tax ID
const getCustomerId = computed(() => {
  const customer = module.value?.meter?.subscription?.customer
  if (!customer) return null
  const details = customer.details as Record<string, string> | undefined
  return details?.tcIdNo || details?.taxId || '-'
})

// Format address
const formatAddress = (address: Record<string, string> | undefined) => {
  if (!address) return 'N/A'
  const parts = [
    address.neighborhood,
    address.street,
    address.buildingNo && `No: ${address.buildingNo}`,
    address.district,
    address.city,
  ].filter(Boolean)
  return parts.join(', ') || 'N/A'
}

// Handle unlink
const handleUnlink = async () => {
  if (!module.value?.meter) return
  
  try {
    await api.post(`/api/v1/meters/${module.value.meter.id}/unlink-module`, {
      moduleStatus: 'WAREHOUSE',
    })
    toast.success('Module unlinked successfully')
    await fetchModule()
  } catch (error) {
    toast.error('Failed to unlink module')
  } finally {
    showUnlinkConfirm.value = false
  }
}

// Handle delete
const handleDelete = async () => {
  if (!module.value) return
  
  if (module.value.status === 'DEPLOYED') {
    toast.error('Cannot delete deployed module')
    return
  }
  
  try {
    await api.del(`/api/v1/modules/${module.value.id}`)
    toast.success('Module deleted successfully')
    router.push('/modules')
  } catch (error) {
    toast.error('Failed to delete module')
  } finally {
    showDeleteConfirm.value = false
  }
}

// Handle edit success
const handleEditSuccess = () => {
  showEditDialog.value = false
  fetchModule()
  toast.success('Module updated successfully')
}

// Initial fetch
onMounted(() => {
  fetchModule()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Back button & header -->
    <div class="flex items-center gap-4">
      <UiButton variant="ghost" size="icon" @click="router.push('/modules')">
        <ArrowLeft class="h-5 w-5" />
      </UiButton>
      
      <div class="flex-1">
        <div v-if="isLoading" class="space-y-2">
          <UiSkeleton class="h-8 w-64" />
          <UiSkeleton class="h-4 w-48" />
        </div>
        <template v-else-if="module">
          <h1 class="text-2xl font-bold flex items-center gap-2">
            <Radio class="h-6 w-6 text-primary" />
            {{ module.serialNumber }}
          </h1>
          <div class="text-sm text-muted-foreground flex items-center flex-wrap gap-1">
            <span>{{ module.moduleProfile?.brand }} {{ module.moduleProfile?.modelCode }}</span>
            <span class="mx-1">•</span>
            <span v-if="hasMultipleTechnologies" class="flex items-center gap-1">
              <UiBadge 
                v-for="config in profileCommunicationConfigs" 
                :key="config.technology" 
                variant="outline" 
                class="text-xs"
              >
                {{ config.technology?.replace(/_/g, '-') }}
              </UiBadge>
            </span>
            <span v-else>
              {{ module.moduleProfile?.communicationTechnology?.replace(/_/g, '-') }}
            </span>
          </div>
        </template>
      </div>
      
      <div v-if="module" class="flex items-center gap-2">
        <UiBadge :variant="getStatusVariant(module.status)">
          {{ module.status }}
        </UiBadge>
        <UiButton variant="outline" @click="showEditDialog = true">
          <Edit class="h-4 w-4" />
          Edit
        </UiButton>
        <UiButton 
          variant="outline"
          class="text-destructive border-destructive hover:bg-destructive/10"
          :disabled="module.status === 'DEPLOYED'"
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
    <template v-else-if="module">
      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <UiCard class="p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-primary/10">
              <Signal class="h-5 w-5 text-primary" />
            </div>
            <div>
              <p class="text-2xl font-bold" :class="getSignalColor(module.lastSignalStrength)">
                {{ module.lastSignalStrength ?? '-' }}
                <span v-if="module.lastSignalStrength != null" class="text-base"> dBm</span>
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
              <p class="text-2xl font-bold" :class="getBatteryColor(module.lastBatteryLevel)">
                {{ module.lastBatteryLevel ?? '-' }}
                <span v-if="module.lastBatteryLevel != null" class="text-base">%</span>
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
                {{ module.lastCommunicationAt ? formatDate(module.lastCommunicationAt) : 'Never' }}
              </p>
              <p class="text-sm text-muted-foreground">Last Communication</p>
            </div>
          </div>
        </UiCard>
        
        <UiCard class="p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg" :class="module.meter ? 'bg-green-500/10' : 'bg-muted'">
              <component :is="module.meter ? Link2 : Link2Off" class="h-5 w-5" :class="module.meter ? 'text-green-500' : 'text-muted-foreground'" />
            </div>
            <div>
              <p class="text-lg font-bold">
                {{ module.meter ? module.meter.serialNumber : 'Not Linked' }}
              </p>
              <p class="text-sm text-muted-foreground">Linked Meter</p>
            </div>
          </div>
        </UiCard>
      </div>
      
      <!-- Main content grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Module Info -->
        <UiCard class="lg:col-span-2">
          <UiCardHeader>
            <UiCardTitle>Module Information</UiCardTitle>
            <UiCardDescription>Technical specifications and configuration</UiCardDescription>
          </UiCardHeader>
          <UiCardContent>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <p class="text-sm text-muted-foreground">Serial Number</p>
                <p class="font-medium font-mono">{{ module.serialNumber }}</p>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Brand</p>
                <p class="font-medium">{{ module.moduleProfile?.brand || '-' }}</p>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Model</p>
                <p class="font-medium">{{ module.moduleProfile?.modelCode || '-' }}</p>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Technology</p>
                <UiBadge variant="outline" :class="{ 'border-primary text-primary': module.selectedTechnology }">
                  {{ module.selectedTechnology?.replace(/_/g, '-') || module.moduleProfile?.communicationTechnology?.replace(/_/g, '-') || '-' }}
                </UiBadge>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Integration</p>
                <p class="font-medium">{{ module.moduleProfile?.integrationType || '-' }}</p>
              </div>
              
              <div v-if="hasScenarios">
                <p class="text-sm text-muted-foreground">Active Scenarios</p>
                <p class="font-medium">{{ module.activeScenarioIds?.length || 0 }} / {{ availableScenarios.length }}</p>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Battery Life (Est.)</p>
                <p class="font-medium">
                  {{ module.moduleProfile?.batteryLifeMonths ? `${module.moduleProfile.batteryLifeMonths} months` : '-' }}
                </p>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Created</p>
                <p class="font-medium">{{ formatDate(module.createdAt) }}</p>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Updated</p>
                <p class="font-medium">{{ formatDate(module.updatedAt) }}</p>
              </div>
            </div>
            
            <!-- Communication Keys (from Profile) -->
            <div v-if="profileCommunicationConfigs.length > 0 && module.dynamicFields && Object.keys(module.dynamicFields).length > 0" class="mt-6 pt-6 border-t border-border">
              <h4 class="font-medium mb-4 flex items-center gap-2">
                <Wifi class="h-4 w-4" />
                Communication Keys
                <UiBadge v-if="hasMultipleTechnologies" variant="outline" class="ml-2">
                  {{ profileCommunicationConfigs.length }} Technologies
                </UiBadge>
              </h4>
              
              <!-- Multiple technologies - grouped display -->
              <div v-if="hasMultipleTechnologies" class="space-y-4">
                <div
                  v-for="config in profileCommunicationConfigs"
                  :key="config.technology"
                  class="rounded-lg border border-border overflow-hidden"
                >
                  <!-- Technology Header -->
                  <div class="flex items-center gap-3 p-3 bg-muted/50 border-b border-border">
                    <UiBadge variant="outline">
                      {{ config.technology?.replace(/_/g, '-') }}
                    </UiBadge>
                  </div>
                  
                  <!-- Technology Fields -->
                  <div class="p-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div
                        v-for="fieldDef in config.fieldDefinitions"
                        :key="fieldDef.name"
                        class="p-3 rounded-lg bg-muted/30"
                      >
                        <p class="text-xs text-muted-foreground uppercase tracking-wide">{{ fieldDef.label || fieldDef.name }}</p>
                        <p class="font-mono text-sm break-all">{{ getFieldValue(fieldDef.name) }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Single technology - simple layout -->
              <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="(value, key) in module.dynamicFields"
                  :key="key"
                  class="p-3 rounded-lg bg-muted/50"
                >
                  <p class="text-xs text-muted-foreground uppercase tracking-wide">{{ key }}</p>
                  <p class="font-mono text-sm break-all">{{ value }}</p>
                </div>
              </div>
            </div>
            
            <!-- Fallback: Just show dynamic fields if no profile configs -->
            <div v-else-if="module.dynamicFields && Object.keys(module.dynamicFields).length > 0" class="mt-6 pt-6 border-t border-border">
              <h4 class="font-medium mb-4 flex items-center gap-2">
                <Settings class="h-4 w-4" />
                Communication Keys
              </h4>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="(value, key) in module.dynamicFields"
                  :key="key"
                  class="p-3 rounded-lg bg-muted/50"
                >
                  <p class="text-xs text-muted-foreground uppercase tracking-wide">{{ key }}</p>
                  <p class="font-mono text-sm break-all">{{ value }}</p>
                </div>
              </div>
            </div>
            
            <!-- Messaging Scenarios -->
            <div v-if="hasScenarios" class="mt-6 pt-6 border-t border-border">
              <h4 class="font-medium mb-4 flex items-center gap-2">
                <Zap class="h-4 w-4" />
                Messaging Scenarios
                <UiBadge variant="outline" class="ml-2">
                  {{ module.activeScenarioIds?.length || 0 }} active
                </UiBadge>
              </h4>
              
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div
                  v-for="scenario in availableScenarios"
                  :key="scenario.id"
                  class="p-4 rounded-lg border transition-all"
                  :class="isScenarioActive(scenario.id)
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border bg-muted/30 opacity-60'"
                >
                  <div class="flex items-start justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <Star 
                        v-if="scenario.isDefault" 
                        class="h-4 w-4" 
                        :class="isScenarioActive(scenario.id) ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'"
                      />
                      <span class="font-medium" :class="{ 'text-primary': isScenarioActive(scenario.id) }">
                        {{ scenario.name }}
                      </span>
                    </div>
                    <UiBadge 
                      :variant="isScenarioActive(scenario.id) ? 'default' : 'outline'"
                      class="text-xs"
                    >
                      {{ isScenarioActive(scenario.id) ? 'Active' : 'Inactive' }}
                    </UiBadge>
                  </div>
                  
                  <div class="space-y-1 text-sm">
                    <div v-if="scenario.messageInterval" class="flex items-center gap-2 text-muted-foreground">
                      <Clock class="h-3 w-3" />
                      <span>Interval: {{ formatInterval(scenario.messageInterval) }}</span>
                    </div>
                    <div v-if="scenario.expectedBatteryMonths" class="flex items-center gap-2 text-muted-foreground">
                      <Battery class="h-3 w-3" />
                      <span>Battery: {{ scenario.expectedBatteryMonths }} months</span>
                    </div>
                    <p v-if="scenario.description" class="text-xs text-muted-foreground mt-2">
                      {{ scenario.description }}
                    </p>
                  </div>
                  
                  <div v-if="scenario.decoderFunction" class="mt-3 pt-3 border-t border-border/50">
                    <div class="flex items-center gap-1 text-xs text-muted-foreground">
                      <Code class="h-3 w-3" />
                      <span>Decoder configured</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Decoder Function -->
            <div v-if="module.moduleProfile?.decoderFunction" class="mt-6 pt-6 border-t border-border">
              <h4 class="font-medium mb-4 flex items-center gap-2">
                <Code class="h-4 w-4" />
                Decoder Function
              </h4>
              
              <div class="bg-muted rounded-lg p-4">
                <pre class="text-xs font-mono overflow-x-auto whitespace-pre-wrap">{{ module.moduleProfile.decoderFunction }}</pre>
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
            <template v-if="module.meter">
              <div class="space-y-4">
                <div class="p-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
                  <div class="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                    <Link2 class="h-4 w-4" />
                    <span class="text-sm font-medium">Currently Linked</span>
                  </div>
                  
                  <p class="font-mono font-medium text-lg">{{ module.meter.serialNumber }}</p>
                  
                  <div class="mt-3 space-y-1 text-sm">
                    <p v-if="module.meter.meterProfile">
                      <span class="text-muted-foreground">Profile:</span>
                      {{ module.meter.meterProfile.brand }} {{ module.meter.meterProfile.modelCode }}
                    </p>
                    <p v-if="module.meter.subscription?.customer">
                      <span class="text-muted-foreground">Customer:</span>
                      {{ module.meter.subscription.customer.details?.firstName || module.meter.subscription.customer.details?.organizationName }}
                    </p>
                    <p>
                      <span class="text-muted-foreground">Status:</span>
                      {{ module.meter.status }}
                    </p>
                  </div>
                </div>
                
                <UiButton
                  variant="link"
                  class="p-0 h-auto"
                  @click="navigateTo(`/meters/${module.meter?.id}`)"
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
                    Unlink Module
                  </UiButton>
                </div>
              </div>
            </template>
            
            <template v-else>
              <div class="text-center py-8">
                <Link2Off class="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p class="font-medium text-muted-foreground">Not Linked</p>
                <p class="text-sm text-muted-foreground mt-1">
                  This module is available in warehouse
                </p>
                <p class="text-xs text-muted-foreground mt-2">
                  Link this module to a meter from the meter's detail page
                </p>
              </div>
            </template>
          </UiCardContent>
        </UiCard>
      </div>
      
      <!-- Customer & Subscription Cards (when linked) -->
      <div v-if="module.meter?.subscription" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Customer Card -->
        <UiCard>
          <UiCardHeader>
            <UiCardTitle class="flex items-center gap-2">
              <User class="h-5 w-5" />
              Customer
            </UiCardTitle>
          </UiCardHeader>
          <UiCardContent>
            <div class="space-y-4">
              <div class="flex items-start gap-4">
                <UiAvatar size="lg" :fallback="getCustomerName?.charAt(0)" />
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-lg truncate">{{ getCustomerName }}</p>
                  <p class="text-sm text-muted-foreground">
                    {{ module.meter.subscription.customer?.type === 'INDIVIDUAL' ? 'Individual' : 'Organization' }}
                  </p>
                  <p class="font-mono text-sm mt-1">{{ getCustomerId }}</p>
                </div>
              </div>
              
              <UiButton
                variant="link"
                class="p-0 h-auto"
                @click="navigateTo(`/customers/${module.meter?.subscription?.customerId}`)"
              >
                View Customer Details →
              </UiButton>
            </div>
          </UiCardContent>
        </UiCard>
        
        <!-- Subscription Card -->
        <UiCard>
          <UiCardHeader>
            <UiCardTitle class="flex items-center gap-2">
              <FileText class="h-5 w-5" />
              Subscription
            </UiCardTitle>
          </UiCardHeader>
          <UiCardContent>
            <div class="space-y-4">
              <div>
                <p class="text-sm text-muted-foreground">Subscription Number</p>
                <p class="font-mono font-medium">{{ module.meter.subscription.subscriptionNumber || module.meter.subscription.id.slice(0, 8) }}</p>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Consumption Group</p>
                <UiBadge variant="outline">
                  {{ module.meter.subscription.consumptionGroup?.replace(/_/g, ' ') || 'Normal' }}
                </UiBadge>
              </div>
              
              <div v-if="module.meter.subscription.address" class="flex items-start gap-2">
                <MapPin class="h-4 w-4 text-muted-foreground mt-0.5" />
                <p class="text-sm">{{ formatAddress(module.meter.subscription.address as Record<string, string>) }}</p>
              </div>
              
              <UiButton
                variant="link"
                class="p-0 h-auto"
                @click="navigateTo(`/subscriptions/${module.meter?.subscription?.id}`)"
              >
                View Subscription Details →
              </UiButton>
            </div>
          </UiCardContent>
        </UiCard>
      </div>
      
      <!-- Tenant Info -->
      <UiCard>
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
              <p class="font-medium">{{ module.tenant?.name || module.tenantId }}</p>
            </div>
            
            <div v-if="module.tenant?.path">
              <p class="text-sm text-muted-foreground">Path</p>
              <p class="font-mono text-sm">{{ module.tenant.path }}</p>
            </div>
            
            <div v-if="module.tenant?.contactEmail">
              <p class="text-sm text-muted-foreground">Contact</p>
              <p class="font-medium">{{ module.tenant.contactEmail }}</p>
            </div>
          </div>
          
          <UiButton
            v-if="module.tenant"
            variant="link"
            class="p-0 h-auto mt-4"
            @click="navigateTo(`/iam/tenants/${module.tenantId}`)"
          >
            View Tenant Details →
          </UiButton>
        </UiCardContent>
      </UiCard>
      
      <!-- Consumption Chart (when linked to meter) -->
      <ConsumptionAnalysis
        v-if="module.meter"
        source-type="module"
        :source-id="moduleId"
        title="Consumption History"
        description="Water consumption recorded via this module"
      />
      
      <!-- Module Messages Table -->
      <ModulesMessagesTable :module-id="moduleId" />
    </template>
    
    <!-- Edit Dialog -->
    <UiDialog v-model:open="showEditDialog">
      <UiDialogContent class="max-w-2xl">
        <UiDialogHeader>
          <UiDialogTitle>Edit Module</UiDialogTitle>
        </UiDialogHeader>
        <div class="overflow-y-auto flex-1 -mx-6 px-6">
          <ModulesCreateForm
            v-if="module"
            :module="module"
            mode="edit"
            @success="handleEditSuccess"
            @cancel="showEditDialog = false"
          />
        </div>
      </UiDialogContent>
    </UiDialog>
    
    <!-- Unlink Confirmation Dialog -->
    <UiDialog v-model:open="showUnlinkConfirm">
      <UiDialogContent>
        <UiDialogHeader>
          <UiDialogTitle>Unlink Module</UiDialogTitle>
        </UiDialogHeader>
        <div class="space-y-4">
          <p class="text-muted-foreground">
            Are you sure you want to unlink this module from the meter "{{ module?.meter?.serialNumber }}"?
          </p>
          <p class="text-sm text-muted-foreground">
            The module will be moved back to Warehouse status and can be linked to another meter.
          </p>
          <div class="flex justify-end gap-3">
            <UiButton variant="outline" @click="showUnlinkConfirm = false">
              Cancel
            </UiButton>
            <UiButton variant="destructive" @click="handleUnlink">
              Unlink Module
            </UiButton>
          </div>
        </div>
      </UiDialogContent>
    </UiDialog>
    
    <!-- Delete Confirmation Dialog -->
    <UiDialog v-model:open="showDeleteConfirm">
      <UiDialogContent>
        <UiDialogHeader>
          <UiDialogTitle>Delete Module</UiDialogTitle>
        </UiDialogHeader>
        <div class="space-y-4">
          <p class="text-muted-foreground">
            Are you sure you want to delete this module "{{ module?.serialNumber }}"?
          </p>
          <p class="text-sm text-muted-foreground">
            This action cannot be undone.
          </p>
          <div class="flex justify-end gap-3">
            <UiButton variant="outline" @click="showDeleteConfirm = false">
              Cancel
            </UiButton>
            <UiButton variant="destructive" @click="handleDelete">
              Delete Module
            </UiButton>
          </div>
        </div>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>
