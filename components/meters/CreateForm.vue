<script setup lang="ts">
import { Radio, Plus, Warehouse, Link2 } from 'lucide-vue-next'
import {
  MeterStatus,
  ModuleStatus,
  type MeterProfile,
  type Subscription,
  type Tenant,
  type Module,
  type ModuleProfile,
  type Meter,
  COMMUNICATION_TECH_FIELDS,
} from '~/types'
import { SearchableSelect } from '~/components/ui/searchable-select'

const props = defineProps<{
  meter?: Meter
  mode?: 'create' | 'edit'
}>()

const emit = defineEmits<{
  success: []
  cancel: []
}>()

const api = useApi()
const toast = useToast()

// Form state
const isLoading = ref(false)
const isSubmitting = ref(false)
const currentStep = ref(1)
const totalSteps = 2 // Reduced steps - no address step since address is on Subscription

// Computed: Is edit mode
const isEditMode = computed(() => props.mode === 'edit')

// Lookups
const tenants = ref<Tenant[]>([])
const meterProfiles = ref<MeterProfile[]>([])
const availableModules = ref<Module[]>([])
const moduleProfiles = ref<ModuleProfile[]>([])

// Form data - Updated for Subscription model
const formData = reactive({
  // Step 1: Basic Info
  tenantId: props.meter?.tenantId || '',
  subscriptionId: props.meter?.subscriptionId || '',
  meterProfileId: props.meter?.meterProfileId || '',
  serialNumber: props.meter?.serialNumber || '',
  initialIndex: props.meter?.initialIndex || 0,
  status: props.meter?.status || MeterStatus.ACTIVE,
  installationDate: props.meter?.installationDate 
    ? new Date(props.meter.installationDate).toISOString().slice(0, 16) 
    : new Date().toISOString().slice(0, 16),
  
  // Step 2: Module Configuration
  moduleOption: 'none' as 'none' | 'select' | 'create',
  selectedModuleId: props.meter?.activeModuleId || '',
  // For inline module creation
  newModule: {
    moduleProfileId: '',
    serialNumber: '',
    dynamicFields: {} as Record<string, string>,
  },
})

// Validation errors
const errors = reactive<Record<string, string>>({})

// Options
const statusOptions = Object.values(MeterStatus).map(s => ({ label: s.replace(/_/g, ' '), value: s }))

// Module options for display
const moduleOptions = [
  { value: 'none', label: 'None (Mechanical Only)', description: 'Create meter without communication module' },
  { value: 'select', label: 'Select from Warehouse', description: 'Choose an available module from warehouse' },
  { value: 'create', label: 'Create New Module', description: 'Register a new module inline' },
]

// Selected meter profile
const selectedMeterProfile = computed(() => {
  return meterProfiles.value.find(p => p.id === formData.meterProfileId)
})

// Selected subscription (tracked via SubscriptionSelectDialog)
const selectedSubscription = ref<Subscription | null>(null)

// Selected module profile for new module
const selectedModuleProfile = computed(() => {
  return moduleProfiles.value.find(p => p.id === formData.newModule.moduleProfileId)
})

// Field definitions for new module
const newModuleFieldDefs = computed(() => {
  if (!selectedModuleProfile.value) return []
  
  if (selectedModuleProfile.value.fieldDefinitions?.length) {
    return selectedModuleProfile.value.fieldDefinitions
  }
  
  const tech = selectedModuleProfile.value.communicationTechnology
  if (tech && COMMUNICATION_TECH_FIELDS[tech]) {
    return COMMUNICATION_TECH_FIELDS[tech]
  }
  
  return []
})

// Watch module profile changes for new module
watch(() => formData.newModule.moduleProfileId, () => {
  formData.newModule.dynamicFields = {}
  newModuleFieldDefs.value.forEach(def => {
    formData.newModule.dynamicFields[def.name] = ''
  })
})

// Fetch lookups
const fetchLookups = async () => {
  isLoading.value = true
  try {
    const [tenantsRes, profilesRes, moduleProfilesRes] = await Promise.all([
      api.getList<Tenant>('/api/v1/tenants', { limit: 100 }),
      api.getList<MeterProfile>('/api/v1/profiles', { limit: 100 }),
      api.getList<ModuleProfile>('/api/v1/module-profiles', { limit: 100 }),
    ])
    
    tenants.value = tenantsRes.data
    meterProfiles.value = profilesRes.data
    moduleProfiles.value = moduleProfilesRes.data
    
    // Set default tenant if only one
    if (!isEditMode.value && tenants.value.length === 1 && tenants.value[0]) {
      formData.tenantId = tenants.value[0].id
    }
  } catch (error) {
    toast.error('Failed to load form data')
  } finally {
    isLoading.value = false
  }
}

// Fetch available modules for warehouse selection
const fetchAvailableModules = async () => {
  if (!formData.tenantId || !formData.meterProfileId) {
    availableModules.value = []
    return
  }
  
  try {
    const response = await api.get<Module[]>(
      `/api/v1/modules/available?tenantId=${formData.tenantId}&meterProfileId=${formData.meterProfileId}`
    )
    availableModules.value = response
  } catch (error) {
    console.error('Failed to fetch available modules:', error)
    // Fallback: fetch all warehouse modules for tenant
    try {
      const response = await api.getList<Module>('/api/v1/modules', {
        tenantId: formData.tenantId,
        status: ModuleStatus.WAREHOUSE,
        limit: 100,
      })
      availableModules.value = response.data
    } catch {
      availableModules.value = []
    }
  }
}

// Watch tenant and profile changes
watch(() => formData.tenantId, () => {
  // Clear subscription when tenant changes
  formData.subscriptionId = ''
  selectedSubscription.value = null
  if (formData.meterProfileId) {
    fetchAvailableModules()
  }
})

watch(() => formData.meterProfileId, () => {
  if (formData.tenantId) {
    fetchAvailableModules()
  }
})

// Get module identifier for display
const getModuleIdentifier = (module: Module): string => {
  if (!module.dynamicFields) return module.serialNumber
  const identifiers = ['DevEUI', 'ID', 'IMEI', 'MacAddress']
  for (const key of identifiers) {
    if (module.dynamicFields[key]) return module.dynamicFields[key]
  }
  return module.serialNumber
}

// Handle subscription selection from dialog
const handleSubscriptionSelect = (subscription: Subscription | null) => {
  selectedSubscription.value = subscription
}

// Validate current step
const validateStep = (step: number): boolean => {
  Object.keys(errors).forEach(key => delete errors[key])
  
  if (step === 1) {
    // Only validate create-only fields when not in edit mode
    if (!isEditMode.value && !formData.tenantId) errors.tenantId = 'Tenant is required'
    // Subscription is OPTIONAL - meters can be created without subscription (warehouse stock)
    if (!formData.meterProfileId) errors.meterProfileId = 'Meter profile is required'
    if (!formData.serialNumber) errors.serialNumber = 'Serial number is required'
    if (!formData.status) errors.status = 'Status is required'
  }
  
  if (step === 2 && formData.moduleOption === 'create') {
    if (!formData.newModule.moduleProfileId) {
      errors.newModuleProfile = 'Module profile is required'
    }
    if (!formData.newModule.serialNumber) {
      errors.newModuleSerial = 'Module serial number is required'
    }
    // Validate dynamic fields
    newModuleFieldDefs.value.forEach(def => {
      const value = formData.newModule.dynamicFields[def.name] || ''
      if (def.required && !value) {
        errors[`module_field_${def.name}`] = `${def.label || def.name} is required`
      }
    })
  }
  
  return Object.keys(errors).length === 0
}

// Navigation
const nextStep = () => {
  if (validateStep(currentStep.value)) {
    currentStep.value++
  }
}

const prevStep = () => {
  currentStep.value--
}

// Submit form
const handleSubmit = async () => {
  if (!validateStep(currentStep.value)) {
    toast.error('Please fix the validation errors')
    return
  }
  
  isSubmitting.value = true
  
  try {
    // Build meter payload - updated for Subscription model
    const meterPayload = {
      // Fields only allowed on create
      ...(isEditMode.value ? {} : {
        tenantId: formData.tenantId,
        initialIndex: formData.initialIndex,
        installationDate: formData.installationDate,
      }),
      // Fields allowed on both create and update
      // Only include subscriptionId if it's set (optional)
      ...(formData.subscriptionId ? { subscriptionId: formData.subscriptionId } : {}),
      meterProfileId: formData.meterProfileId,
      serialNumber: formData.serialNumber,
      status: formData.status,
    }
    
    let meterId: string
    
    if (isEditMode.value && props.meter) {
      await api.patch(`/api/v1/meters/${props.meter.id}`, meterPayload)
      meterId = props.meter.id
      toast.success('Meter updated successfully')
    } else {
      const meterResponse = await api.post<{ id: string }>('/api/v1/meters', meterPayload)
      meterId = meterResponse.id
      toast.success('Meter created successfully')
    }
    
    // Handle module linking if needed (only on create or if module option changed)
    if (!isEditMode.value && formData.moduleOption !== 'none') {
      if (formData.moduleOption === 'select' && formData.selectedModuleId) {
        // Link existing module
        await api.post(`/api/v1/meters/${meterId}/link-module`, {
          moduleId: formData.selectedModuleId,
        })
        toast.success('Module linked to meter')
      } else if (formData.moduleOption === 'create') {
        // Create new module first
        const modulePayload = {
          tenantId: formData.tenantId,
          moduleProfileId: formData.newModule.moduleProfileId,
          serialNumber: formData.newModule.serialNumber,
          status: ModuleStatus.WAREHOUSE,
          dynamicFields: formData.newModule.dynamicFields,
        }
        
        const moduleResponse = await api.post<{ id: string }>('/api/v1/modules', modulePayload)
        
        // Then link it
        await api.post(`/api/v1/meters/${meterId}/link-module`, {
          moduleId: moduleResponse.id,
        })
        toast.success('Module created and linked to meter')
      }
    }
    
    emit('success')
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.error(`Failed to ${isEditMode.value ? 'update' : 'create'} meter`, err.message)
  } finally {
    isSubmitting.value = false
  }
}

// Initial load
onMounted(() => {
  fetchLookups()
})
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <UiSpinner size="lg" />
    </div>
    
    <template v-else>
      <!-- Progress Steps -->
      <div class="flex items-center justify-center mb-8">
        <div class="flex items-center gap-2">
          <template v-for="step in totalSteps" :key="step">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors"
              :class="step <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
            >
              {{ step }}
            </div>
            <div
              v-if="step < totalSteps"
              class="w-12 h-0.5 transition-colors"
              :class="step < currentStep ? 'bg-primary' : 'bg-muted'"
            />
          </template>
        </div>
      </div>
      
      <!-- Step 1: Basic Information -->
      <div v-show="currentStep === 1" class="space-y-4">
        <h3 class="font-medium text-lg">Basic Information</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <UiLabel :error="!!errors.tenantId">Tenant *</UiLabel>
            <SearchableSelect
              v-model="formData.tenantId"
              :options="tenants.map(t => ({ label: t.name, value: t.id }))"
              placeholder="Select tenant"
              search-placeholder="Search tenants..."
              empty-text="No tenants found"
              :error="!!errors.tenantId"
              :disabled="isEditMode"
            />
            <p v-if="errors.tenantId" class="text-xs text-destructive mt-1">{{ errors.tenantId }}</p>
            <p v-else-if="isEditMode" class="text-xs text-muted-foreground mt-1">
              Tenant cannot be changed after creation
            </p>
          </div>
          
          <div>
            <UiLabel :error="!!errors.subscriptionId">Subscription (Service Point)</UiLabel>
            <SubscriptionsSelectDialog
              v-model="formData.subscriptionId"
              :tenant-id="formData.tenantId"
              :disabled="isEditMode"
              @select="handleSubscriptionSelect"
            />
            <p v-if="errors.subscriptionId" class="text-xs text-destructive mt-1">{{ errors.subscriptionId }}</p>
            <p v-else class="text-xs text-muted-foreground mt-1">
              Optional. Leave empty to add meter to warehouse.
            </p>
          </div>
          
          <div>
            <UiLabel :error="!!errors.meterProfileId">Meter Profile *</UiLabel>
            <SearchableSelect
              v-model="formData.meterProfileId"
              :options="meterProfiles.map(p => ({ 
                label: `${p.brand} ${p.modelCode}`, 
                value: p.id,
                description: `${p.meterType?.replace(/_/g, ' ')} • ${p.communicationModule}`
              }))"
              placeholder="Select profile"
              search-placeholder="Search by brand, model..."
              empty-text="No profiles found"
              :error="!!errors.meterProfileId"
            />
            <p v-if="errors.meterProfileId" class="text-xs text-destructive mt-1">{{ errors.meterProfileId }}</p>
          </div>
          
          <div>
            <UiLabel :error="!!errors.serialNumber">Serial Number *</UiLabel>
            <UiInput
              v-model="formData.serialNumber"
              placeholder="e.g. WM-001234"
              :error="!!errors.serialNumber"
            />
            <p v-if="errors.serialNumber" class="text-xs text-destructive mt-1">{{ errors.serialNumber }}</p>
          </div>
          
          <div>
            <UiLabel>Initial Index (m³)</UiLabel>
            <UiInput 
              v-model.number="formData.initialIndex" 
              type="number" 
              min="0" 
              step="0.001" 
              :disabled="isEditMode"
            />
            <p v-if="isEditMode" class="text-xs text-muted-foreground mt-1">
              Initial index cannot be changed after creation
            </p>
          </div>
          
          <div>
            <UiLabel :error="!!errors.status">Status *</UiLabel>
            <SearchableSelect
              v-model="formData.status"
              :options="statusOptions"
              placeholder="Select status"
              search-placeholder="Search status..."
              empty-text="No status found"
              :error="!!errors.status"
            />
          </div>
          
          <div>
            <UiLabel>Installation Date</UiLabel>
            <UiInput 
              v-model="formData.installationDate" 
              type="datetime-local" 
              :disabled="isEditMode"
            />
            <p v-if="isEditMode" class="text-xs text-muted-foreground mt-1">
              Installation date cannot be changed after creation
            </p>
          </div>
        </div>
        
        <!-- Selected Profile Info -->
        <div v-if="selectedMeterProfile" class="p-4 rounded-lg bg-muted/50">
          <p class="text-sm font-medium mb-2">Selected Profile: {{ selectedMeterProfile.brand }} {{ selectedMeterProfile.modelCode }}</p>
          <div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>Type: {{ selectedMeterProfile.meterType?.replace(/_/g, ' ') }}</span>
            <span>•</span>
            <span>Module: {{ selectedMeterProfile.communicationModule }}</span>
            <span>•</span>
            <span>IP: {{ selectedMeterProfile.ipRating }}</span>
          </div>
        </div>
        
        <!-- Selected Subscription Info -->
        <div v-if="selectedSubscription" class="p-4 rounded-lg bg-muted/50">
          <p class="text-sm font-medium mb-2">Address (from Subscription)</p>
          <div class="text-sm text-muted-foreground">
            <p v-if="selectedSubscription.address?.city">
              {{ selectedSubscription.address.city }}, {{ selectedSubscription.address.district }}
            </p>
            <p v-if="selectedSubscription.address?.street">
              {{ selectedSubscription.address.street }} {{ selectedSubscription.address.buildingNo }}
            </p>
          </div>
        </div>
        
        <!-- No Subscription Notice -->
        <div v-else-if="formData.tenantId && !formData.subscriptionId" class="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
          <p class="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">Warehouse Stock</p>
          <p class="text-sm text-amber-700 dark:text-amber-300">
            This meter will be added to the warehouse without a service point. You can link it to a subscription later.
          </p>
        </div>
      </div>
      
      <!-- Step 2: Module Configuration -->
      <div v-show="currentStep === 2" class="space-y-6">
        <div>
          <h3 class="font-medium text-lg flex items-center gap-2">
            <Radio class="h-5 w-5" />
            Module Configuration
          </h3>
          <p class="text-sm text-muted-foreground mt-1">
            Configure the communication module for this meter (optional)
          </p>
        </div>
        
        <!-- Module Option Selection -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            v-for="option in moduleOptions"
            :key="option.value"
            class="p-4 rounded-lg border-2 cursor-pointer transition-colors"
            :class="formData.moduleOption === option.value 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50'"
            @click="formData.moduleOption = option.value as typeof formData.moduleOption"
          >
            <div class="flex items-center gap-3 mb-2">
              <component
                :is="option.value === 'none' ? 'div' : option.value === 'select' ? Warehouse : Plus"
                class="h-5 w-5"
                :class="formData.moduleOption === option.value ? 'text-primary' : 'text-muted-foreground'"
              />
              <span class="font-medium">{{ option.label }}</span>
            </div>
            <p class="text-sm text-muted-foreground">{{ option.description }}</p>
          </div>
        </div>
        
        <!-- Select from Warehouse -->
        <div v-if="formData.moduleOption === 'select'" class="space-y-4 p-4 rounded-lg border border-border">
          <h4 class="font-medium flex items-center gap-2">
            <Warehouse class="h-4 w-4" />
            Select Module from Warehouse
          </h4>
          
          <div v-if="availableModules.length === 0" class="text-center py-8 text-muted-foreground">
            <Warehouse class="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No available modules in warehouse</p>
            <p class="text-sm">Make sure you've selected a tenant and meter profile</p>
          </div>
          
          <div v-else class="space-y-2">
            <UiLabel>Available Modules</UiLabel>
            <div class="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
              <div
                v-for="module in availableModules"
                :key="module.id"
                class="p-3 rounded-lg border cursor-pointer transition-colors"
                :class="formData.selectedModuleId === module.id 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'"
                @click="formData.selectedModuleId = module.id"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium font-mono">{{ module.serialNumber }}</p>
                    <p class="text-xs text-muted-foreground">{{ getModuleIdentifier(module) }}</p>
                  </div>
                  <div class="text-right">
                    <UiBadge variant="outline" class="text-xs">
                      {{ module.moduleProfile?.brand }} {{ module.moduleProfile?.modelCode }}
                    </UiBadge>
                    <p class="text-xs text-muted-foreground mt-1">
                      {{ module.moduleProfile?.communicationTechnology?.replace(/_/g, '-') }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Create New Module -->
        <div v-if="formData.moduleOption === 'create'" class="space-y-4 p-4 rounded-lg border border-border">
          <h4 class="font-medium flex items-center gap-2">
            <Plus class="h-4 w-4" />
            Create New Module
          </h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <UiLabel :error="!!errors.newModuleProfile">Module Profile *</UiLabel>
              <SearchableSelect
                v-model="formData.newModule.moduleProfileId"
                :options="moduleProfiles.map(p => ({ 
                  label: `${p.brand} ${p.modelCode}`, 
                  value: p.id,
                  description: p.communicationTechnology?.replace(/_/g, '-')
                }))"
                placeholder="Select module profile"
                search-placeholder="Search module profiles..."
                empty-text="No module profiles found"
                :error="!!errors.newModuleProfile"
              />
              <p v-if="errors.newModuleProfile" class="text-xs text-destructive mt-1">{{ errors.newModuleProfile }}</p>
            </div>
            
            <div>
              <UiLabel :error="!!errors.newModuleSerial">Module Serial Number *</UiLabel>
              <UiInput
                v-model="formData.newModule.serialNumber"
                placeholder="e.g. MOD-001234"
                :error="!!errors.newModuleSerial"
              />
              <p v-if="errors.newModuleSerial" class="text-xs text-destructive mt-1">{{ errors.newModuleSerial }}</p>
            </div>
          </div>
          
          <!-- Dynamic Fields for New Module -->
          <div v-if="newModuleFieldDefs.length > 0" class="space-y-4 pt-4 border-t border-border">
            <p class="text-sm font-medium">Communication Keys</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-for="def in newModuleFieldDefs" :key="def.name">
                <UiLabel :error="!!errors[`module_field_${def.name}`]">
                  {{ def.label || def.name }}
                  <span v-if="def.required" class="text-destructive">*</span>
                  <span v-if="def.length" class="text-xs text-muted-foreground ml-1">({{ def.length }} chars)</span>
                </UiLabel>
                <UiInput
                  v-model="formData.newModule.dynamicFields[def.name]"
                  :placeholder="`Enter ${def.label || def.name}`"
                  :error="!!errors[`module_field_${def.name}`]"
                  :maxlength="def.length"
                  class="font-mono uppercase"
                />
                <p v-if="errors[`module_field_${def.name}`]" class="text-xs text-destructive mt-1">
                  {{ errors[`module_field_${def.name}`] }}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Edit mode note -->
        <div v-if="isEditMode" class="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <p>
            <strong>Note:</strong> To link or unlink modules, use the module management section on the meter detail page.
          </p>
        </div>
      </div>
      
      <!-- Navigation Actions -->
      <div class="flex justify-between pt-4 border-t border-border">
        <div>
          <UiButton v-if="currentStep > 1" type="button" variant="outline" @click="prevStep">
            Previous
          </UiButton>
        </div>
        
        <div class="flex gap-3">
          <UiButton type="button" variant="outline" @click="emit('cancel')">
            Cancel
          </UiButton>
          
          <UiButton
            v-if="currentStep < totalSteps"
            type="button"
            @click="nextStep"
          >
            Next
          </UiButton>
          
          <UiButton
            v-else
            type="submit"
            :loading="isSubmitting"
          >
            {{ isEditMode ? 'Update Meter' : 'Create Meter' }}
          </UiButton>
        </div>
      </div>
    </template>
  </form>
</template>
