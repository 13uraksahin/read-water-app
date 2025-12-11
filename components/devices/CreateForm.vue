<script setup lang="ts">
import { Info } from 'lucide-vue-next'
import {
  DeviceStatus,
  CommunicationTechnology,
  COMMUNICATION_TECH_FIELDS,
  type DeviceProfile,
  type Device,
  type Tenant,
  type TechFieldDefinition,
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

// Field definitions from selected profile
const fieldDefinitions = computed((): TechFieldDefinition[] => {
  if (!selectedProfile.value) return []
  
  // Use profile's field definitions if available
  if (selectedProfile.value.fieldDefinitions?.length) {
    return selectedProfile.value.fieldDefinitions.map(def => ({
      name: def.name,
      label: def.label || def.name,
      type: def.type || 'string',
      length: def.length || 32,
      regex: def.regex || '.*',
      required: def.required ?? true,
      description: def.description,
    }))
  }
  
  // Fallback to static definitions based on technology
  const tech = selectedProfile.value.communicationTechnology
  if (tech && COMMUNICATION_TECH_FIELDS[tech]) {
    return COMMUNICATION_TECH_FIELDS[tech]
  }
  
  return []
})

// Watch for profile changes and initialize dynamic fields
watch(() => formData.deviceProfileId, () => {
  if (!isEditMode.value) {
    formData.dynamicFields = {}
    fieldDefinitions.value.forEach(def => {
      formData.dynamicFields[def.name] = ''
    })
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
  
  if (!formData.tenantId) errors.tenantId = 'Tenant is required'
  if (!formData.deviceProfileId) errors.deviceProfileId = 'Device profile is required'
  if (!formData.serialNumber) errors.serialNumber = 'Serial number is required'
  
  // Validate dynamic fields
  fieldDefinitions.value.forEach(def => {
    const value = formData.dynamicFields[def.name] || ''
    if (def.required && !value) {
      errors[`field_${def.name}`] = `${def.label || def.name} is required`
    } else if (value && !validateField(value, def)) {
      errors[`field_${def.name}`] = `Invalid ${def.label || def.name} format`
    }
  })
  
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
    const payload = {
      tenantId: formData.tenantId,
      deviceProfileId: formData.deviceProfileId,
      serialNumber: formData.serialNumber,
      status: formData.status,
      dynamicFields: formData.dynamicFields,
      metadata: formData.metadata,
    }
    
    if (isEditMode.value && props.device) {
      await api.put(`/api/v1/devices/${props.device.id}`, payload)
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
          </div>
          
          <div>
            <UiLabel :error="!!errors.serialNumber">Serial Number *</UiLabel>
            <UiInput
              v-model="formData.serialNumber"
              placeholder="e.g. DEV-001234"
              :error="!!errors.serialNumber"
            />
            <p v-if="errors.serialNumber" class="text-xs text-destructive mt-1">{{ errors.serialNumber }}</p>
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
      
      <!-- Dynamic Fields (Communication Keys) -->
      <div v-if="selectedProfile && fieldDefinitions.length > 0" class="space-y-4 pt-4 border-t border-border">
        <div class="flex items-start gap-2">
          <h3 class="font-medium text-lg">Communication Keys</h3>
          <div class="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Info class="h-3 w-3" />
            <span>Fields for {{ selectedProfile.communicationTechnology?.replace(/_/g, '-') }}</span>
          </div>
        </div>
        
        <div class="p-4 rounded-lg border border-border bg-muted/50">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="def in fieldDefinitions" :key="def.name">
              <UiLabel :error="!!errors[`field_${def.name}`]">
                {{ def.label || def.name }}
                <span v-if="def.required" class="text-destructive">*</span>
                <span v-if="def.length" class="text-xs text-muted-foreground ml-1">({{ def.length }} chars)</span>
              </UiLabel>
              <UiInput
                v-model="formData.dynamicFields[def.name]"
                :placeholder="def.description || `Enter ${def.label || def.name}`"
                :error="!!errors[`field_${def.name}`]"
                :maxlength="def.length"
                class="font-mono uppercase"
              />
              <p v-if="errors[`field_${def.name}`]" class="text-xs text-destructive mt-1">
                {{ errors[`field_${def.name}`] }}
              </p>
              <p v-else-if="def.regex && def.regex !== '.*'" class="text-xs text-muted-foreground mt-1">
                Format: {{ def.regex }}
              </p>
            </div>
          </div>
        </div>
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
            <p class="font-medium">{{ selectedProfile.communicationTechnology?.replace(/_/g, '-') }}</p>
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
