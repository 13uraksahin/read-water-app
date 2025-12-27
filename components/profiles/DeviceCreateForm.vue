<script setup lang="ts">
import { Plus, Trash2, Code, Play, Check, X, Wifi } from 'lucide-vue-next'
import {
  DeviceBrand,
  CommunicationTechnology,
  IntegrationType,
  COMMUNICATION_TECH_FIELDS,
  type DeviceProfile,
  type DeviceFieldDefinition,
  type TechFieldDefinition,
} from '~/types'

// Communication config type for each technology
interface CommunicationConfig {
  technology: CommunicationTechnology
  fieldDefinitions: DeviceFieldDefinition[]
  decoderFunction: string
  testPayload: string
}

const props = defineProps<{
  profile?: DeviceProfile
  mode?: 'create' | 'edit'
}>()

const emit = defineEmits<{
  success: []
  cancel: []
}>()

const api = useApi()
const toast = useToast()

// Form state
const isSubmitting = ref(false)
const isTesting = ref<string | null>(null) // Track which technology is being tested
const testResults = ref<Record<string, { result?: Record<string, unknown>; error?: string }>>({})

// Computed: Is edit mode
const isEditMode = computed(() => props.mode === 'edit')

// Initialize communication configs from existing profile
const initCommunicationConfigs = (): CommunicationConfig[] => {
  // Check for new format: communicationConfigs stored in specifications
  const specs = props.profile?.specifications as Record<string, unknown> | undefined
  if (specs?.communicationConfigs && Array.isArray(specs.communicationConfigs)) {
    return (specs.communicationConfigs as CommunicationConfig[]).map(config => ({
      technology: config.technology,
      fieldDefinitions: config.fieldDefinitions?.length ? [...config.fieldDefinitions] : [],
      decoderFunction: config.decoderFunction || '',
      testPayload: config.testPayload || '',
    }))
  }
  
  // Fallback: Legacy single technology format
  if (props.profile?.communicationTechnology) {
    return [{
      technology: props.profile.communicationTechnology,
      fieldDefinitions: props.profile.fieldDefinitions?.length 
        ? [...props.profile.fieldDefinitions] 
        : [],
      decoderFunction: props.profile.decoderFunction || '',
      testPayload: props.profile.testPayload || '',
    }]
  }
  return []
}

// Form data
const formData = reactive({
  brand: props.profile?.brand || '',
  modelCode: props.profile?.modelCode || '',
  integrationType: props.profile?.integrationType || IntegrationType.HTTP,
  batteryLifeMonths: props.profile?.batteryLifeMonths,
  // Multiple communication technologies with their configs
  communicationConfigs: initCommunicationConfigs(),
})

// Validation errors
const errors = reactive<Record<string, string>>({})

// Options
const brandOptions = Object.values(DeviceBrand).map(b => ({ label: b, value: b }))
const technologyOptions = Object.values(CommunicationTechnology).map(t => ({ 
  label: t.replace(/_/g, '-'), 
  value: t 
}))
const integrationOptions = Object.values(IntegrationType).map(i => ({ label: i, value: i }))

// Field type options
const fieldTypeOptions = [
  { label: 'Hexadecimal', value: 'hex' },
  { label: 'String', value: 'string' },
  { label: 'Number', value: 'number' },
]

// Get available technologies (not already added)
const availableTechnologies = computed(() => {
  const usedTechs = formData.communicationConfigs.map(c => c.technology)
  return technologyOptions.filter(t => !usedTechs.includes(t.value as CommunicationTechnology))
})

// Add new communication technology
const addCommunicationConfig = () => {
  const nextTech = availableTechnologies.value[0]?.value as CommunicationTechnology
  if (!nextTech) return
  
  // Get default fields from COMMUNICATION_TECH_FIELDS
  const defaultFields = COMMUNICATION_TECH_FIELDS[nextTech] || []
  
  formData.communicationConfigs.push({
    technology: nextTech,
    fieldDefinitions: defaultFields.map(f => ({
      name: f.name,
      label: f.label,
      type: f.type as 'hex' | 'string' | 'number',
      length: f.length,
      regex: f.regex,
      required: f.required,
      description: '',
    })),
    decoderFunction: getDefaultDecoder(nextTech),
    testPayload: '',
  })
}

// Remove communication technology
const removeCommunicationConfig = (index: number) => {
  formData.communicationConfigs.splice(index, 1)
}

// Update technology and reinitialize fields
const updateTechnology = (index: number, newTech: CommunicationTechnology) => {
  const config = formData.communicationConfigs[index]
  if (!config) return
  
  config.technology = newTech
  
  // Get default fields from COMMUNICATION_TECH_FIELDS
  const defaultFields = COMMUNICATION_TECH_FIELDS[newTech] || []
  config.fieldDefinitions = defaultFields.map(f => ({
    name: f.name,
    label: f.label,
    type: f.type as 'hex' | 'string' | 'number',
    length: f.length,
    regex: f.regex,
    required: f.required,
    description: '',
  }))
  
  config.decoderFunction = getDefaultDecoder(newTech)
}

// Get default decoder template for a technology
const getDefaultDecoder = (tech: CommunicationTechnology): string => {
  return `// Decoder for ${tech.replace(/_/g, '-')}
function decode(payload) {
  // payload is a hex string
  // Return an object with decoded values
  return {
    index: parseInt(payload.substring(0, 8), 16) / 1000,
    battery: parseInt(payload.substring(8, 10), 16),
    signal: parseInt(payload.substring(10, 12), 16) - 100
  };
}`
}

// Add field to a specific config
const addFieldDefinition = (configIndex: number) => {
  formData.communicationConfigs[configIndex]?.fieldDefinitions.push({
    name: '',
    label: '',
    type: 'hex',
    length: 16,
    regex: '',
    required: true,
    description: '',
  })
}

// Remove field from a specific config
const removeFieldDefinition = (configIndex: number, fieldIndex: number) => {
  formData.communicationConfigs[configIndex]?.fieldDefinitions.splice(fieldIndex, 1)
}

// Generate regex from type and length
const generateRegex = (type: string, length: number): string => {
  switch (type) {
    case 'hex':
      return `^[a-fA-F0-9]{${length}}$`
    case 'number':
      return `^[0-9]{1,${length}}$`
    default:
      return `^.{1,${length}}$`
  }
}

// Auto-generate regex when type/length changes
const updateFieldRegex = (configIndex: number, fieldIndex: number) => {
  const field = formData.communicationConfigs[configIndex]?.fieldDefinitions[fieldIndex]
  if (field && field.type && field.length) {
    field.regex = generateRegex(field.type, field.length)
  }
}

// Test decoder for a specific technology
const testDecoder = async (configIndex: number) => {
  const config = formData.communicationConfigs[configIndex]
  if (!config?.decoderFunction || !config.testPayload) {
    toast.error('Please enter both decoder function and test payload')
    return
  }
  
  const tech = config.technology
  isTesting.value = tech
  testResults.value[tech] = {}
  
  try {
    const response = await api.post<{ result: Record<string, unknown> }>('/api/v1/decoders/test', {
      decoderFunction: config.decoderFunction,
      payload: config.testPayload,
    })
    testResults.value[tech] = { result: response.result }
    toast.success('Decoder test passed!')
  } catch (error: unknown) {
    const err = error as { message?: string }
    testResults.value[tech] = { error: err.message || 'Decoder test failed' }
    toast.error('Decoder test failed')
  } finally {
    isTesting.value = null
  }
}

// Validate form
const validate = (): boolean => {
  Object.keys(errors).forEach(key => delete errors[key])
  
  // Only validate create-only fields when not in edit mode
  if (!isEditMode.value) {
    if (!formData.brand) errors.brand = 'Brand is required'
    if (!formData.modelCode) errors.modelCode = 'Model code is required'
    if (formData.communicationConfigs.length === 0) {
      errors.technologies = 'At least one communication technology is required'
    }
  }
  
  if (!formData.integrationType) errors.integrationType = 'Integration type is required'
  
  // Validate each config
  formData.communicationConfigs.forEach((config, configIndex) => {
    config.fieldDefinitions.forEach((field, fieldIndex) => {
      if (!field.name) {
        errors[`config_${configIndex}_field_${fieldIndex}_name`] = 'Field name is required'
      }
    })
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
    // Build communication configs array with all technologies
    const communicationConfigs = formData.communicationConfigs.map(config => ({
      technology: config.technology,
      fieldDefinitions: config.fieldDefinitions.filter(f => f.name),
      decoderFunction: config.decoderFunction || undefined,
      testPayload: config.testPayload || undefined,
    }))
    
    // Build payload - exclude read-only fields in edit mode
    const payload = {
      // Fields only allowed on create
      ...(isEditMode.value ? {} : {
        brand: formData.brand,
        modelCode: formData.modelCode,
      }),
      // Fields allowed on both create and update
      integrationType: formData.integrationType,
      batteryLifeMonths: formData.batteryLifeMonths,
      // Send all communication configs (new format)
      communicationConfigs,
    }
    
    if (isEditMode.value && props.profile) {
      await api.patch(`/api/v1/device-profiles/${props.profile.id}`, payload)
    } else {
      await api.post('/api/v1/device-profiles', payload)
    }
    
    emit('success')
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.error(`Failed to ${isEditMode.value ? 'update' : 'create'} device profile`, err.message)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
    <!-- Basic Info -->
    <div class="space-y-4">
      <h3 class="font-medium text-lg">Basic Information</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <UiLabel :error="!!errors.brand">Brand *</UiLabel>
          <UiSelect
            v-model="formData.brand"
            :options="brandOptions"
            placeholder="Select brand"
            :error="!!errors.brand"
            :disabled="isEditMode"
          />
          <p v-if="errors.brand" class="text-xs text-destructive mt-1">{{ errors.brand }}</p>
          <p v-else-if="isEditMode" class="text-xs text-muted-foreground mt-1">
            Brand cannot be changed after creation
          </p>
        </div>
        
        <div>
          <UiLabel :error="!!errors.modelCode">Model Code *</UiLabel>
          <UiInput
            v-model="formData.modelCode"
            placeholder="e.g. LW-100"
            :error="!!errors.modelCode"
            :disabled="isEditMode"
          />
          <p v-if="errors.modelCode" class="text-xs text-destructive mt-1">{{ errors.modelCode }}</p>
          <p v-else-if="isEditMode" class="text-xs text-muted-foreground mt-1">
            Model code cannot be changed after creation
          </p>
        </div>
        
        <div>
          <UiLabel :error="!!errors.integrationType">Integration Type *</UiLabel>
          <UiSelect
            v-model="formData.integrationType"
            :options="integrationOptions"
            placeholder="Select integration"
            :error="!!errors.integrationType"
          />
        </div>
        
        <div>
          <UiLabel>Battery Life (months)</UiLabel>
          <UiInput
            v-model.number="formData.batteryLifeMonths"
            type="number"
            min="1"
            max="240"
            placeholder="e.g. 120"
          />
        </div>
      </div>
    </div>
    
    <!-- Communication Technologies Section -->
    <div class="space-y-4 pt-4 border-t border-border">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-medium text-lg flex items-center gap-2">
            <Wifi class="h-5 w-5" />
            Communication Technologies
          </h3>
          <p class="text-sm text-muted-foreground">
            Configure supported communication technologies, their fields, and decoders
          </p>
        </div>
        <UiButton 
          type="button" 
          variant="outline" 
          size="sm" 
          :disabled="availableTechnologies.length === 0"
          @click="addCommunicationConfig"
        >
          <Plus class="h-4 w-4" />
          Add Technology
        </UiButton>
      </div>
      
      <p v-if="errors.technologies" class="text-sm text-destructive">{{ errors.technologies }}</p>
      
      <!-- No technologies -->
      <div v-if="formData.communicationConfigs.length === 0" class="p-8 rounded-lg border border-dashed border-border text-center text-muted-foreground">
        <Wifi class="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No communication technologies configured</p>
        <p class="text-sm">Click "Add Technology" to add LoRaWAN, Sigfox, NB-IoT, etc.</p>
      </div>
      
      <!-- Communication configs -->
      <div v-else class="space-y-6">
        <div
          v-for="(config, configIndex) in formData.communicationConfigs"
          :key="configIndex"
          class="rounded-lg border border-border overflow-hidden"
        >
          <!-- Technology Header -->
          <div class="flex items-center justify-between p-4 bg-muted/50 border-b border-border">
            <div class="flex items-center gap-3">
              <UiSelect
                :model-value="config.technology"
                :options="[
                  { label: config.technology.replace(/_/g, '-'), value: config.technology },
                  ...availableTechnologies
                ]"
                class="w-48"
                @update:model-value="(val: string | number) => updateTechnology(configIndex, val as CommunicationTechnology)"
              />
              <UiBadge variant="outline">Technology {{ configIndex + 1 }}</UiBadge>
            </div>
            <UiButton
              type="button"
              variant="ghost"
              size="icon"
              @click="removeCommunicationConfig(configIndex)"
            >
              <Trash2 class="h-4 w-4 text-destructive" />
            </UiButton>
          </div>
          
          <div class="p-4 space-y-6">
            <!-- Field Definitions for this technology -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="font-medium">Field Definitions</h4>
                  <p class="text-xs text-muted-foreground">
                    Required keys for devices using {{ config.technology.replace(/_/g, '-') }}
                  </p>
                </div>
                <UiButton type="button" variant="outline" size="sm" @click="addFieldDefinition(configIndex)">
                  <Plus class="h-4 w-4" />
                  Add Field
                </UiButton>
              </div>
              
              <div v-if="config.fieldDefinitions.length === 0" class="p-4 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                No fields defined. Add fields like DevEUI, AppKey, IMEI, etc.
              </div>
              
              <div v-else class="space-y-3">
                <div
                  v-for="(field, fieldIndex) in config.fieldDefinitions"
                  :key="fieldIndex"
                  class="p-3 rounded-lg bg-muted/30"
                >
                  <div class="flex items-start justify-between mb-3">
                    <span class="text-xs font-medium text-muted-foreground">Field {{ fieldIndex + 1 }}</span>
                    <UiButton type="button" variant="ghost" size="icon" class="h-6 w-6" @click="removeFieldDefinition(configIndex, fieldIndex)">
                      <Trash2 class="h-3 w-3 text-destructive" />
                    </UiButton>
                  </div>
                  
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <UiLabel class="text-xs" :error="!!errors[`config_${configIndex}_field_${fieldIndex}_name`]">Name *</UiLabel>
                      <UiInput
                        v-model="field.name"
                        placeholder="e.g. DevEUI"
                        class="h-8 text-sm"
                        :error="!!errors[`config_${configIndex}_field_${fieldIndex}_name`]"
                      />
                    </div>
                    
                    <div>
                      <UiLabel class="text-xs">Label</UiLabel>
                      <UiInput v-model="field.label" placeholder="e.g. Device EUI" class="h-8 text-sm" />
                    </div>
                    
                    <div>
                      <UiLabel class="text-xs">Type</UiLabel>
                      <UiSelect
                        v-model="field.type"
                        :options="fieldTypeOptions"
                        class="h-8 text-sm"
                        @update:model-value="updateFieldRegex(configIndex, fieldIndex)"
                      />
                    </div>
                    
                    <div>
                      <UiLabel class="text-xs">Length</UiLabel>
                      <UiInput
                        v-model.number="field.length"
                        type="number"
                        min="1"
                        max="256"
                        class="h-8 text-sm"
                        @blur="updateFieldRegex(configIndex, fieldIndex)"
                      />
                    </div>
                    
                    <div class="md:col-span-2">
                      <UiLabel class="text-xs">Validation Regex</UiLabel>
                      <UiInput v-model="field.regex" placeholder="e.g. ^[a-fA-F0-9]{16}$" class="h-8 text-sm font-mono" />
                    </div>
                    
                    <div class="flex items-center gap-2 pt-5">
                      <input
                        :id="`field-required-${configIndex}-${fieldIndex}`"
                        v-model="field.required"
                        type="checkbox"
                        class="rounded border-input h-4 w-4"
                      />
                      <label :for="`field-required-${configIndex}-${fieldIndex}`" class="text-xs">Required</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Decoder Function for this technology -->
            <div class="space-y-3 pt-4 border-t border-border">
              <div class="flex items-center gap-2">
                <Code class="h-4 w-4" />
                <h4 class="font-medium">Decoder Function</h4>
              </div>
              
              <div>
                <textarea
                  v-model="config.decoderFunction"
                  rows="8"
                  class="w-full p-3 rounded-lg border border-input bg-background font-mono text-xs resize-y"
                  :placeholder="`// Decoder for ${config.technology.replace(/_/g, '-')}\nfunction decode(payload) {\n  return {\n    index: 0,\n    battery: 0\n  };\n}`"
                ></textarea>
              </div>
              
              <!-- Test Decoder -->
              <div class="p-3 rounded-lg bg-muted/50 space-y-3">
                <h5 class="text-sm font-medium flex items-center gap-2">
                  <Play class="h-3 w-3" />
                  Test Decoder
                </h5>
                
                <div class="flex items-end gap-3">
                  <div class="flex-1">
                    <UiLabel class="text-xs">Test Payload (Hex)</UiLabel>
                    <UiInput
                      v-model="config.testPayload"
                      placeholder="e.g. 00000123005F"
                      class="h-8 text-sm font-mono"
                    />
                  </div>
                  <UiButton
                    type="button"
                    variant="outline"
                    size="sm"
                    :loading="isTesting === config.technology"
                    :disabled="!config.decoderFunction || !config.testPayload"
                    @click="testDecoder(configIndex)"
                  >
                    <Play class="h-3 w-3" />
                    Test
                  </UiButton>
                </div>
                
                <!-- Test Result -->
                <div v-if="testResults[config.technology]">
                  <div v-if="testResults[config.technology]?.error" class="p-2 rounded bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                    <div class="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs">
                      <X class="h-3 w-3" />
                      <span>Failed: {{ testResults[config.technology]?.error }}</span>
                    </div>
                  </div>
                  
                  <div v-else-if="testResults[config.technology]?.result" class="p-2 rounded bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                    <div class="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs mb-1">
                      <Check class="h-3 w-3" />
                      <span>Passed</span>
                    </div>
                    <pre class="text-xs font-mono overflow-x-auto">{{ JSON.stringify(testResults[config.technology]?.result, null, 2) }}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Actions -->
    <div class="flex justify-end gap-3 pt-4 border-t border-border sticky bottom-0 bg-background py-4">
      <UiButton type="button" variant="outline" @click="emit('cancel')">
        Cancel
      </UiButton>
      <UiButton type="submit" :loading="isSubmitting">
        {{ isEditMode ? 'Update Profile' : 'Create Profile' }}
      </UiButton>
    </div>
  </form>
</template>
