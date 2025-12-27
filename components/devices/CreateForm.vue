<script setup lang="ts">
import { Info, Wifi } from 'lucide-vue-next'
import {
  DeviceStatus,
  CommunicationTechnology,
  COMMUNICATION_TECH_FIELDS,
  type DeviceProfile,
  type Device,
  type Tenant,
  type TechFieldDefinition,
  type DeviceCommunicationConfig,
} from '~/types'

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

// Watch for profile changes and initialize dynamic fields
watch(() => formData.deviceProfileId, () => {
  if (!isEditMode.value) {
    // Reset dynamic fields when profile changes
    formData.dynamicFields = {}
    
    // Initialize all fields from the profile's field definitions
    for (const fieldDef of allFieldDefinitions.value) {
      formData.dynamicFields[fieldDef.name] = ''
    }
  }
})

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
  }
  
  // Validate all dynamic fields from the profile
  for (const fieldDef of allFieldDefinitions.value) {
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
            <UiSelect
              v-model="formData.tenantId"
              :options="tenants.map(t => ({ label: t.name, value: t.id }))"
              placeholder="Select tenant"
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
            <UiSelect
              v-model="formData.deviceProfileId"
              :options="deviceProfiles.map(p => ({ 
                label: `${p.brand} ${p.modelCode} (${p.communicationTechnology?.replace(/_/g, '-')})`, 
                value: p.id 
              }))"
              placeholder="Select device profile"
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
            <UiSelect
              v-model="formData.status"
              :options="statusOptions"
              :disabled="!isEditMode"
            />
            <p v-if="!isEditMode" class="text-xs text-muted-foreground mt-1">
              New devices start in Warehouse status
            </p>
          </div>
        </div>
      </div>
      
      <!-- Communication Keys (from Profile) -->
      <div v-if="selectedProfile && allFieldDefinitions.length > 0" class="space-y-4 pt-4 border-t border-border">
        <div class="flex items-start gap-2">
          <h3 class="font-medium text-lg flex items-center gap-2">
            <Wifi class="h-5 w-5" />
            Communication Keys
          </h3>
          <div v-if="hasMultipleTechnologies" class="flex gap-1">
            <UiBadge 
              v-for="config in profileCommunicationConfigs" 
              :key="config.technology" 
              variant="outline"
              class="text-xs"
            >
              {{ config.technology.replace(/_/g, '-') }}
            </UiBadge>
          </div>
        </div>
        
        <div class="flex items-center gap-1 text-xs text-muted-foreground">
          <Info class="h-3 w-3" />
          <span>Fields defined by the selected device profile</span>
        </div>
        
        <!-- Group fields by technology if multiple -->
        <template v-if="hasMultipleTechnologies">
          <div 
            v-for="config in profileCommunicationConfigs" 
            :key="config.technology"
            class="rounded-lg border border-border overflow-hidden"
          >
            <div class="p-3 bg-muted/50 border-b border-border">
              <UiBadge variant="outline">{{ config.technology.replace(/_/g, '-') }}</UiBadge>
            </div>
            <div class="p-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  v-for="fieldDef in config.fieldDefinitions" 
                  :key="fieldDef.name"
                >
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
        </template>
        
        <!-- Single technology - simpler layout -->
        <template v-else>
          <div class="p-4 rounded-lg border border-border bg-muted/50">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-for="fieldDef in allFieldDefinitions" :key="fieldDef.name">
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
        </template>
      </div>
      
      <!-- No fields defined message -->
      <div v-else-if="selectedProfile && allFieldDefinitions.length === 0" class="p-6 rounded-lg border border-dashed border-border text-center text-muted-foreground">
        <Wifi class="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No communication keys defined for this profile</p>
        <p class="text-sm">This device profile has no field definitions configured</p>
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
          <div v-if="selectedProfile.batteryLifeMonths">
            <p class="text-muted-foreground">Battery Life</p>
            <p class="font-medium">{{ selectedProfile.batteryLifeMonths }} months</p>
          </div>
          <div v-if="selectedProfile.decoderFunction">
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
