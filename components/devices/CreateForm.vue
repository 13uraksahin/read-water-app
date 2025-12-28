<script setup lang="ts">
import { Info, Wifi, Zap, Star } from 'lucide-vue-next'
import {
  DeviceStatus,
  CommunicationTechnology,
  COMMUNICATION_TECH_FIELDS,
  type DeviceProfile,
  type Device,
  type Tenant,
  type TechFieldDefinition,
  type DeviceCommunicationConfig,
  type Scenario,
} from '~/types'
import { SearchableSelect } from '~/components/ui/searchable-select'

const props = defineProps<{
  device?: Device
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

// Computed: Is edit mode
const isEditMode = computed(() => props.mode === 'edit')

// Lookups
const tenants = ref<Tenant[]>([])
const deviceProfiles = ref<DeviceProfile[]>([])

// Form data
const formData = reactive({
  tenantId: props.device?.tenantId || '',
  deviceProfileId: props.device?.deviceProfileId || '',
  serialNumber: props.device?.serialNumber || '',
  status: props.device?.status || DeviceStatus.WAREHOUSE,
  // Selected technology (required if profile has multiple technologies)
  selectedTechnology: props.device?.selectedTechnology || '' as CommunicationTechnology | '',
  // Active scenario IDs (multi-select)
  activeScenarioIds: props.device?.activeScenarioIds || [] as string[],
  // Dynamic fields will be populated based on profile
  dynamicFields: { ...(props.device?.dynamicFields || {}) } as Record<string, string>,
  metadata: props.device?.metadata || {},
})

// Validation errors
const errors = reactive<Record<string, string>>({})

// Status options (limited on create)
const statusOptions = computed(() => {
  if (isEditMode.value) {
    return Object.values(DeviceStatus).map(s => ({ label: s.replace(/_/g, ' '), value: s }))
  }
  // Only allow WAREHOUSE on create
  return [
    { label: 'Warehouse', value: DeviceStatus.WAREHOUSE },
  ]
})

// Selected device profile
const selectedProfile = computed(() => {
  return deviceProfiles.value.find(p => p.id === formData.deviceProfileId)
})

// Get communication configs from profile (new format or legacy)
const profileCommunicationConfigs = computed((): DeviceCommunicationConfig[] => {
  if (!selectedProfile.value) return []
  
  // Check for new format: communicationConfigs in specifications
  const specs = selectedProfile.value.specifications as Record<string, unknown> | undefined
  if (specs?.communicationConfigs && Array.isArray(specs.communicationConfigs)) {
    return specs.communicationConfigs as DeviceCommunicationConfig[]
  }
  
  // Fallback: Legacy single technology format
  if (selectedProfile.value.communicationTechnology) {
    const fieldDefs = selectedProfile.value.fieldDefinitions?.length 
      ? selectedProfile.value.fieldDefinitions
      : COMMUNICATION_TECH_FIELDS[selectedProfile.value.communicationTechnology] || []
    
    return [{
      technology: selectedProfile.value.communicationTechnology,
      fieldDefinitions: fieldDefs,
    }]
  }
  
  return []
})

// Get all field definitions from all technologies in the profile
const allFieldDefinitions = computed((): (TechFieldDefinition & { technology: CommunicationTechnology })[] => {
  const fields: (TechFieldDefinition & { technology: CommunicationTechnology })[] = []
  
  for (const config of profileCommunicationConfigs.value) {
    for (const fieldDef of config.fieldDefinitions) {
      fields.push({
        name: fieldDef.name,
        label: fieldDef.label || fieldDef.name,
        type: fieldDef.type || 'string',
        length: fieldDef.length || 32,
        regex: fieldDef.regex || '.*',
        required: fieldDef.required ?? true,
        description: fieldDef.description,
        technology: config.technology,
      })
    }
  }
  
  return fields
})

// Check if profile has multiple technologies
const hasMultipleTechnologies = computed(() => profileCommunicationConfigs.value.length > 1)

// Get scenarios for the selected technology
const selectedTechnologyConfig = computed(() => {
  if (!formData.selectedTechnology) return null
  return profileCommunicationConfigs.value.find(c => c.technology === formData.selectedTechnology)
})

// Get available scenarios from the selected technology
const availableScenarios = computed((): Scenario[] => {
  if (!selectedTechnologyConfig.value?.scenarios) return []
  return selectedTechnologyConfig.value.scenarios
})

// Check if profile has scenarios
const hasScenarios = computed(() => {
  return profileCommunicationConfigs.value.some(c => c.scenarios && c.scenarios.length > 0)
})

// Technology options for dropdown
const technologyOptions = computed(() => {
  return profileCommunicationConfigs.value.map(c => ({
    label: c.technology.replace(/_/g, '-'),
    value: c.technology,
  }))
})

// Get field definitions for selected technology only
const selectedTechnologyFieldDefinitions = computed((): TechFieldDefinition[] => {
  if (!selectedTechnologyConfig.value) {
    // If no technology selected, show all fields (legacy behavior)
    return allFieldDefinitions.value
  }
  
  return (selectedTechnologyConfig.value.fieldDefinitions || []).map(fd => ({
    name: fd.name,
    label: fd.label || fd.name,
    type: fd.type || 'string',
    length: fd.length || 32,
    regex: fd.regex || '.*',
    required: fd.required ?? true,
    description: fd.description,
  }))
})

// Watch for profile changes and initialize technology/scenarios/fields
watch(() => formData.deviceProfileId, () => {
  if (!isEditMode.value) {
    // Reset selections when profile changes
    formData.selectedTechnology = ''
    formData.activeScenarioIds = []
    formData.dynamicFields = {}
    
    // Auto-select technology if only one
    if (profileCommunicationConfigs.value.length === 1) {
      formData.selectedTechnology = profileCommunicationConfigs.value[0].technology
    }
  }
})

// Watch for technology changes and initialize scenarios/fields
watch(() => formData.selectedTechnology, () => {
  if (!isEditMode.value && formData.selectedTechnology) {
    // Reset and select default scenarios
    formData.activeScenarioIds = []
    
    const defaultScenarios = availableScenarios.value.filter(s => s.isDefault)
    if (defaultScenarios.length > 0) {
      formData.activeScenarioIds = defaultScenarios.map(s => s.id)
    }
    
    // Reset and initialize fields for selected technology
    formData.dynamicFields = {}
    for (const fieldDef of selectedTechnologyFieldDefinitions.value) {
      formData.dynamicFields[fieldDef.name] = ''
    }
  }
})

// Toggle scenario selection
const toggleScenario = (scenarioId: string) => {
  const index = formData.activeScenarioIds.indexOf(scenarioId)
  if (index === -1) {
    formData.activeScenarioIds.push(scenarioId)
  } else {
    formData.activeScenarioIds.splice(index, 1)
  }
}

// Validate field against regex
const validateField = (value: string, def: TechFieldDefinition): boolean => {
  if (!def.required && !value) return true
  if (def.required && !value) return false
  return new RegExp(def.regex).test(value)
}

// Fetch lookups
const fetchLookups = async () => {
  isLoading.value = true
  try {
    const [tenantsRes, profilesRes] = await Promise.all([
      api.getList<Tenant>('/api/v1/tenants', { limit: 100 }),
      api.getList<DeviceProfile>('/api/v1/device-profiles', { limit: 100 }),
    ])
    
    tenants.value = tenantsRes.data
    deviceProfiles.value = profilesRes.data
    
    // Set default tenant if only one (only in create mode)
    if (!isEditMode.value && tenants.value.length === 1 && tenants.value[0]) {
      formData.tenantId = tenants.value[0].id
    }
  } catch (error) {
    toast.error('Failed to load form data')
  } finally {
    isLoading.value = false
  }
}

// Validate form
const validate = (): boolean => {
  // Clear previous errors
  Object.keys(errors).forEach(key => delete errors[key])
  
  // Only validate create-only fields when not in edit mode
  if (!isEditMode.value) {
    if (!formData.tenantId) errors.tenantId = 'Tenant is required'
    if (!formData.deviceProfileId) errors.deviceProfileId = 'Device profile is required'
    if (!formData.serialNumber) errors.serialNumber = 'Serial number is required'
    
    // Validate technology selection if profile has multiple technologies
    if (hasMultipleTechnologies.value && !formData.selectedTechnology) {
      errors.selectedTechnology = 'Please select a communication technology'
    }
  }
  
  // Validate dynamic fields for selected technology
  const fieldsToValidate = formData.selectedTechnology 
    ? selectedTechnologyFieldDefinitions.value 
    : allFieldDefinitions.value
  
  for (const fieldDef of fieldsToValidate) {
    const value = formData.dynamicFields[fieldDef.name] || ''
    if (fieldDef.required && !value) {
      errors[`field_${fieldDef.name}`] = `${fieldDef.label || fieldDef.name} is required`
    } else if (value && !validateField(value, fieldDef)) {
      errors[`field_${fieldDef.name}`] = `Invalid ${fieldDef.label || fieldDef.name} format`
    }
  }
  
  return Object.keys(errors).length === 0
}

// Submit form
const handleSubmit = async () => {
  if (!validate()) {
    toast.error('Please fix the validation errors')
    return
  }
  
  isSubmitting.value = true
  
  try {
    // Build payload - exclude read-only fields in edit mode
    const payload = {
      // Fields only allowed on create
      ...(isEditMode.value ? {} : {
        tenantId: formData.tenantId,
        deviceProfileId: formData.deviceProfileId,
        serialNumber: formData.serialNumber,
      }),
      // Fields allowed on both create and update
      status: formData.status,
      selectedTechnology: formData.selectedTechnology || undefined,
      activeScenarioIds: formData.activeScenarioIds.length > 0 ? formData.activeScenarioIds : undefined,
      dynamicFields: formData.dynamicFields,
      metadata: formData.metadata,
    }
    
    if (isEditMode.value && props.device) {
      await api.patch(`/api/v1/devices/${props.device.id}`, payload)
      toast.success('Device updated successfully')
    } else {
      await api.post('/api/v1/devices', payload)
      toast.success('Device created successfully')
    }
    emit('success')
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.error(`Failed to ${isEditMode.value ? 'update' : 'create'} device`, err.message)
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
      <!-- Basic Info -->
      <div class="space-y-4">
        <h3 class="font-medium text-lg">Device Information</h3>
        
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
            <UiLabel :error="!!errors.deviceProfileId">Device Profile *</UiLabel>
            <SearchableSelect
              v-model="formData.deviceProfileId"
              :options="deviceProfiles.map(p => ({ 
                label: `${p.brand} ${p.modelCode}`, 
                value: p.id,
                description: p.communicationTechnology?.replace(/_/g, '-')
              }))"
              placeholder="Select device profile"
              search-placeholder="Search device profiles..."
              empty-text="No device profiles found"
              :error="!!errors.deviceProfileId"
              :disabled="isEditMode"
            />
            <p v-if="errors.deviceProfileId" class="text-xs text-destructive mt-1">{{ errors.deviceProfileId }}</p>
            <p v-else-if="isEditMode" class="text-xs text-muted-foreground mt-1">
              Device profile cannot be changed after creation
            </p>
          </div>
          
          <div>
            <UiLabel :error="!!errors.serialNumber">Serial Number *</UiLabel>
            <UiInput
              v-model="formData.serialNumber"
              placeholder="e.g. DEV-001234"
              :error="!!errors.serialNumber"
              :disabled="isEditMode"
            />
            <p v-if="errors.serialNumber" class="text-xs text-destructive mt-1">{{ errors.serialNumber }}</p>
            <p v-else-if="isEditMode" class="text-xs text-muted-foreground mt-1">
              Serial number cannot be changed after creation
            </p>
          </div>
          
          <div>
            <UiLabel>Status</UiLabel>
            <SearchableSelect
              v-model="formData.status"
              :options="statusOptions"
              placeholder="Select status"
              search-placeholder="Search status..."
              empty-text="No status found"
              :disabled="!isEditMode"
            />
            <p v-if="!isEditMode" class="text-xs text-muted-foreground mt-1">
              New devices start in Warehouse status
            </p>
          </div>
        </div>
      </div>
      
      <!-- Technology & Scenario Selection (when profile has multiple technologies or scenarios) -->
      <div v-if="selectedProfile && (hasMultipleTechnologies || hasScenarios)" class="space-y-4 pt-4 border-t border-border">
        <h3 class="font-medium text-lg flex items-center gap-2">
          <Zap class="h-5 w-5" />
          Communication Setup
        </h3>
        
        <!-- Technology Selection -->
        <div v-if="hasMultipleTechnologies" class="space-y-2">
          <UiLabel :error="!!errors.selectedTechnology">
            Communication Technology *
          </UiLabel>
          <SearchableSelect
            v-model="formData.selectedTechnology"
            :options="technologyOptions"
            placeholder="Select technology"
            search-placeholder="Search technologies..."
            empty-text="No technologies available"
            :error="!!errors.selectedTechnology"
          />
          <p v-if="errors.selectedTechnology" class="text-xs text-destructive">
            {{ errors.selectedTechnology }}
          </p>
          <p v-else class="text-xs text-muted-foreground">
            This device profile supports multiple technologies. Select one for this device.
          </p>
        </div>
        
        <!-- Scenario Selection (only show when technology is selected) -->
        <div v-if="availableScenarios.length > 0" class="space-y-3">
          <div>
            <UiLabel>Active Scenarios</UiLabel>
            <p class="text-xs text-muted-foreground">
              Select which messaging scenarios this device will use (can select multiple)
            </p>
          </div>
          
          <div class="flex flex-wrap gap-2">
            <button
              v-for="scenario in availableScenarios"
              :key="scenario.id"
              type="button"
              class="px-3 py-2 rounded-lg border text-sm transition-colors flex items-center gap-2"
              :class="formData.activeScenarioIds.includes(scenario.id)
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'"
              @click="toggleScenario(scenario.id)"
            >
              <Star v-if="scenario.isDefault" class="h-3 w-3" :class="formData.activeScenarioIds.includes(scenario.id) ? 'fill-current' : ''" />
              <span>{{ scenario.name }}</span>
              <span v-if="scenario.messageInterval" class="text-xs text-muted-foreground">
                ({{ scenario.messageInterval >= 1440 ? `${Math.round(scenario.messageInterval / 1440)}d` : `${scenario.messageInterval}m` }})
              </span>
            </button>
          </div>
          
          <p v-if="formData.activeScenarioIds.length === 0" class="text-xs text-amber-600">
            No scenarios selected. Default scenario will be used.
          </p>
        </div>
      </div>
      
      <!-- Communication Keys (from Profile) -->
      <div v-if="selectedProfile && selectedTechnologyFieldDefinitions.length > 0" class="space-y-4 pt-4 border-t border-border">
        <div class="flex items-start gap-2">
          <h3 class="font-medium text-lg flex items-center gap-2">
            <Wifi class="h-5 w-5" />
            Communication Keys
          </h3>
          <UiBadge v-if="formData.selectedTechnology" variant="outline" class="text-xs">
            {{ formData.selectedTechnology.replace(/_/g, '-') }}
          </UiBadge>
        </div>
        
        <div class="flex items-center gap-1 text-xs text-muted-foreground">
          <Info class="h-3 w-3" />
          <span>Fields defined by the selected device profile</span>
        </div>
        
        <div class="p-4 rounded-lg border border-border bg-muted/50">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="fieldDef in selectedTechnologyFieldDefinitions" :key="fieldDef.name">
              <UiLabel :error="!!errors[`field_${fieldDef.name}`]">
                {{ fieldDef.label || fieldDef.name }}
                <span v-if="fieldDef.required" class="text-destructive">*</span>
                <span v-if="fieldDef.length" class="text-xs text-muted-foreground ml-1">({{ fieldDef.length }} chars)</span>
              </UiLabel>
              <UiInput
                v-model="formData.dynamicFields[fieldDef.name]"
                :placeholder="fieldDef.description || `Enter ${fieldDef.label || fieldDef.name}`"
                :error="!!errors[`field_${fieldDef.name}`]"
                :maxlength="fieldDef.length"
                class="font-mono uppercase"
              />
              <p v-if="errors[`field_${fieldDef.name}`]" class="text-xs text-destructive mt-1">
                {{ errors[`field_${fieldDef.name}`] }}
              </p>
              <p v-else-if="fieldDef.regex && fieldDef.regex !== '.*'" class="text-xs text-muted-foreground mt-1">
                Format: {{ fieldDef.regex }}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- No fields defined message -->
      <div v-else-if="selectedProfile && selectedTechnologyFieldDefinitions.length === 0 && formData.selectedTechnology" class="p-6 rounded-lg border border-dashed border-border text-center text-muted-foreground">
        <Wifi class="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No communication keys defined for this technology</p>
        <p class="text-sm">This technology has no field definitions configured</p>
      </div>
      
      <!-- Need to select technology message -->
      <div v-else-if="selectedProfile && hasMultipleTechnologies && !formData.selectedTechnology" class="p-6 rounded-lg border border-dashed border-border text-center text-muted-foreground">
        <Wifi class="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Select a communication technology above</p>
        <p class="text-sm">Communication keys will appear after selecting a technology</p>
      </div>
      
      <!-- Profile Info (Read-only) -->
      <div v-if="selectedProfile" class="space-y-4 pt-4 border-t border-border">
        <h3 class="font-medium text-lg">Profile Details</h3>
        
        <div class="p-4 rounded-lg bg-muted/50 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p class="text-muted-foreground">Brand</p>
            <p class="font-medium">{{ selectedProfile.brand }}</p>
          </div>
          <div>
            <p class="text-muted-foreground">Model</p>
            <p class="font-medium">{{ selectedProfile.modelCode }}</p>
          </div>
          <div>
            <p class="text-muted-foreground">Technology</p>
            <div class="flex flex-wrap gap-1">
              <UiBadge 
                v-for="config in profileCommunicationConfigs" 
                :key="config.technology" 
                variant="outline"
                class="text-xs"
              >
                {{ config.technology.replace(/_/g, '-') }}
              </UiBadge>
              <span v-if="profileCommunicationConfigs.length === 0" class="font-medium">-</span>
            </div>
          </div>
          <div>
            <p class="text-muted-foreground">Integration</p>
            <p class="font-medium">{{ selectedProfile.integrationType }}</p>
          </div>
          <div v-if="hasScenarios">
            <p class="text-muted-foreground">Scenarios</p>
            <p class="font-medium text-green-600">
              {{ profileCommunicationConfigs.reduce((sum, c) => sum + (c.scenarios?.length || 0), 0) }} configured
            </p>
          </div>
          <div v-else-if="selectedProfile.decoderFunction">
            <p class="text-muted-foreground">Decoder</p>
            <p class="font-medium text-green-600">✓ Configured</p>
          </div>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="flex justify-end gap-3 pt-4 border-t border-border">
        <UiButton type="button" variant="outline" @click="emit('cancel')">
          Cancel
        </UiButton>
        <UiButton type="submit" :loading="isSubmitting">
          {{ isEditMode ? 'Update Device' : 'Add to Inventory' }}
        </UiButton>
      </div>
    </template>
  </form>
</template>
