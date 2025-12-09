<script setup lang="ts">
import { Plus, Trash2, Code } from 'lucide-vue-next'
import {
  Brand,
  MeterType,
  DialType,
  IPRating,
  CommunicationModule,
  CommunicationTechnology,
  type MeterProfile,
} from '~/types'

const props = defineProps<{
  profile?: MeterProfile
  mode?: 'create' | 'edit'
}>()

const emit = defineEmits<{
  success: []
  cancel: []
}>()

const api = useApi()
const toast = useToast()

// State
const isSubmitting = ref(false)

// Enum options
const brandOptions = Object.values(Brand).map(b => ({ label: b, value: b }))
const meterTypeOptions = Object.values(MeterType).map(t => ({ label: t.replace(/_/g, ' '), value: t }))
const dialTypeOptions = Object.values(DialType).map(t => ({ label: t.replace(/_/g, ' '), value: t }))
const ipRatingOptions = Object.values(IPRating).map(r => ({ label: r, value: r }))
const communicationModuleOptions = Object.values(CommunicationModule).map(m => ({ label: m.replace(/_/g, ' '), value: m }))
const technologyOptions = Object.values(CommunicationTechnology).map(t => ({ label: t.replace(/_/g, ' '), value: t }))

const connectionTypeOptions = [
  { label: 'Thread', value: 'THREAD' },
  { label: 'Flange', value: 'FLANGE' },
]

const mountingTypeOptions = [
  { label: 'Vertical', value: 'VERTICAL' },
  { label: 'Horizontal', value: 'HORIZONTAL' },
  { label: 'Both', value: 'BOTH' },
]

const temperatureTypeOptions = [
  { label: 'T30 (Cold)', value: 'T30' },
  { label: 'T90 (Hot)', value: 'T90' },
]

// Form data
const formData = reactive({
  brand: props.profile?.brand || Brand.BAYLAN,
  modelCode: props.profile?.modelCode || '',
  meterType: props.profile?.meterType || MeterType.SINGLE_JET,
  dialType: props.profile?.dialType || DialType.DRY,
  connectionType: props.profile?.connectionType || 'THREAD',
  mountingType: props.profile?.mountingType || 'HORIZONTAL',
  temperatureType: props.profile?.temperatureType || 'T30',
  diameter: props.profile?.diameter,
  length: props.profile?.length,
  width: props.profile?.width,
  height: props.profile?.height,
  q1: props.profile?.q1,
  q2: props.profile?.q2,
  q3: props.profile?.q3,
  q4: props.profile?.q4,
  rValue: props.profile?.rValue,
  pressureLoss: props.profile?.pressureLoss,
  ipRating: props.profile?.ipRating || IPRating.IP67,
  communicationModule: props.profile?.communicationModule || CommunicationModule.INTEGRATED,
  batteryLifeMonths: props.profile?.batteryLife,
  communicationConfigs: [] as {
    technology: CommunicationTechnology
    decoder: string
  }[],
})

// Validation errors
const errors = reactive<Record<string, string>>({})

// Computed: Is edit mode
const isEditMode = computed(() => props.mode === 'edit')

// Computed: Calculate R value
const calculatedRValue = computed(() => {
  if (formData.q3 && formData.q1 && formData.q1 > 0) {
    return (formData.q3 / formData.q1).toFixed(2)
  }
  return null
})

// Watch q1/q3 to auto-calculate R value
watch([() => formData.q1, () => formData.q3], () => {
  if (calculatedRValue.value && !formData.rValue) {
    formData.rValue = parseFloat(calculatedRValue.value)
  }
})

// Initialize communication configs from existing profile
watchEffect(() => {
  if (props.profile?.communicationConfig) {
    formData.communicationConfigs = props.profile.communicationConfig.map(c => ({
      technology: c.technology,
      decoder: c.decoderFunction || '',
    }))
  }
})

// Add communication config
const addCommunicationConfig = () => {
  formData.communicationConfigs.push({
    technology: CommunicationTechnology.LORAWAN,
    decoder: '// Decoder function\nfunction decode(payload) {\n  // Parse payload and return reading\n  return {\n    value: 0,\n    unit: "m3"\n  };\n}',
  })
}

// Remove communication config
const removeCommunicationConfig = (index: number) => {
  formData.communicationConfigs.splice(index, 1)
}

// Validate form
const validate = (): boolean => {
  Object.keys(errors).forEach(key => delete errors[key])
  
  if (!formData.brand) {
    errors.brand = 'Brand is required'
  }
  
  if (!formData.modelCode.trim()) {
    errors.modelCode = 'Model code is required'
  }
  
  if (!formData.meterType) {
    errors.meterType = 'Meter type is required'
  }
  
  if (!formData.dialType) {
    errors.dialType = 'Dial type is required'
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
    const payload = {
      brand: formData.brand,
      modelCode: formData.modelCode,
      meterType: formData.meterType,
      dialType: formData.dialType,
      connectionType: formData.connectionType,
      mountingType: formData.mountingType,
      temperatureType: formData.temperatureType,
      diameter: formData.diameter,
      length: formData.length,
      width: formData.width,
      height: formData.height,
      q1: formData.q1,
      q2: formData.q2,
      q3: formData.q3,
      q4: formData.q4,
      rValue: formData.rValue,
      pressureLoss: formData.pressureLoss,
      ipRating: formData.ipRating,
      communicationModule: formData.communicationModule,
      batteryLifeMonths: formData.batteryLifeMonths,
      communicationConfigs: formData.communicationConfigs.map(c => ({
        technology: c.technology,
        decoder: c.decoder,
      })),
    }
    
    if (isEditMode.value && props.profile) {
      await api.update('/api/v1/profiles', props.profile.id, payload)
      toast.success('Profile updated successfully')
    } else {
      await api.create('/api/v1/profiles', payload)
      toast.success('Profile created successfully')
    }
    
    emit('success')
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.error(`Failed to ${isEditMode.value ? 'update' : 'create'} profile`, err.message)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
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
          />
          <p v-if="errors.brand" class="text-xs text-destructive mt-1">{{ errors.brand }}</p>
        </div>
        
        <div>
          <UiLabel :error="!!errors.modelCode">Model Code *</UiLabel>
          <UiInput
            v-model="formData.modelCode"
            placeholder="e.g. WM-100"
            :error="!!errors.modelCode"
          />
          <p v-if="errors.modelCode" class="text-xs text-destructive mt-1">{{ errors.modelCode }}</p>
        </div>
        
        <div>
          <UiLabel :error="!!errors.meterType">Meter Type *</UiLabel>
          <UiSelect
            v-model="formData.meterType"
            :options="meterTypeOptions"
            placeholder="Select type"
            :error="!!errors.meterType"
          />
        </div>
        
        <div>
          <UiLabel :error="!!errors.dialType">Dial Type *</UiLabel>
          <UiSelect
            v-model="formData.dialType"
            :options="dialTypeOptions"
            placeholder="Select dial type"
            :error="!!errors.dialType"
          />
        </div>
        
        <div>
          <UiLabel>Connection Type</UiLabel>
          <UiSelect
            v-model="formData.connectionType"
            :options="connectionTypeOptions"
          />
        </div>
        
        <div>
          <UiLabel>Mounting Type</UiLabel>
          <UiSelect
            v-model="formData.mountingType"
            :options="mountingTypeOptions"
          />
        </div>
        
        <div>
          <UiLabel>Temperature Type</UiLabel>
          <UiSelect
            v-model="formData.temperatureType"
            :options="temperatureTypeOptions"
          />
        </div>
        
        <div>
          <UiLabel>IP Rating</UiLabel>
          <UiSelect
            v-model="formData.ipRating"
            :options="ipRatingOptions"
          />
        </div>
      </div>
    </div>
    
    <!-- Dimensions -->
    <div class="space-y-4 pt-4 border-t border-border">
      <h3 class="font-medium text-lg">Dimensions</h3>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <UiLabel>Diameter (mm)</UiLabel>
          <UiInput
            v-model.number="formData.diameter"
            type="number"
            step="0.1"
            placeholder="e.g. 20"
          />
        </div>
        
        <div>
          <UiLabel>Length (mm)</UiLabel>
          <UiInput
            v-model.number="formData.length"
            type="number"
            step="0.1"
            placeholder="e.g. 115"
          />
        </div>
        
        <div>
          <UiLabel>Width (mm)</UiLabel>
          <UiInput
            v-model.number="formData.width"
            type="number"
            step="0.1"
            placeholder="e.g. 80"
          />
        </div>
        
        <div>
          <UiLabel>Height (mm)</UiLabel>
          <UiInput
            v-model.number="formData.height"
            type="number"
            step="0.1"
            placeholder="e.g. 100"
          />
        </div>
      </div>
    </div>
    
    <!-- Flow Rates -->
    <div class="space-y-4 pt-4 border-t border-border">
      <h3 class="font-medium text-lg">Flow Rates (m³/h)</h3>
      
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <UiLabel>Q1 (Qmin)</UiLabel>
          <UiInput
            v-model.number="formData.q1"
            type="number"
            step="0.001"
            placeholder="e.g. 0.016"
          />
        </div>
        
        <div>
          <UiLabel>Q2 (Qt)</UiLabel>
          <UiInput
            v-model.number="formData.q2"
            type="number"
            step="0.001"
            placeholder="e.g. 0.025"
          />
        </div>
        
        <div>
          <UiLabel>Q3 (Qn)</UiLabel>
          <UiInput
            v-model.number="formData.q3"
            type="number"
            step="0.001"
            placeholder="e.g. 2.5"
          />
        </div>
        
        <div>
          <UiLabel>Q4 (Qmax)</UiLabel>
          <UiInput
            v-model.number="formData.q4"
            type="number"
            step="0.001"
            placeholder="e.g. 3.125"
          />
        </div>
        
        <div>
          <UiLabel>
            R Value
            <span v-if="calculatedRValue" class="text-xs text-muted-foreground ml-1">
              (calc: {{ calculatedRValue }})
            </span>
          </UiLabel>
          <UiInput
            v-model.number="formData.rValue"
            type="number"
            step="0.1"
            :placeholder="calculatedRValue || 'e.g. 160'"
          />
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <UiLabel>Pressure Loss (bar)</UiLabel>
          <UiInput
            v-model.number="formData.pressureLoss"
            type="number"
            step="0.01"
            placeholder="e.g. 0.63"
          />
        </div>
      </div>
    </div>
    
    <!-- Communication -->
    <div class="space-y-4 pt-4 border-t border-border">
      <h3 class="font-medium text-lg">Communication</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <UiLabel>Communication Module</UiLabel>
          <UiSelect
            v-model="formData.communicationModule"
            :options="communicationModuleOptions"
          />
        </div>
        
        <div v-if="formData.communicationModule !== 'NONE'">
          <UiLabel>Battery Life (months)</UiLabel>
          <UiInput
            v-model.number="formData.batteryLifeMonths"
            type="number"
            placeholder="e.g. 120"
          />
        </div>
      </div>
    </div>
    
    <!-- Communication Technologies & Decoders -->
    <div v-if="formData.communicationModule !== 'NONE'" class="space-y-4 pt-4 border-t border-border">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-medium text-lg">Communication Technologies</h3>
          <p class="text-sm text-muted-foreground">Configure supported technologies and decoder functions</p>
        </div>
        <UiButton type="button" variant="outline" size="sm" @click="addCommunicationConfig">
          <Plus class="h-4 w-4" />
          Add Technology
        </UiButton>
      </div>
      
      <div v-if="formData.communicationConfigs.length === 0" class="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
        <Code class="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No communication technologies configured</p>
        <p class="text-sm">Click "Add Technology" to configure decoders</p>
      </div>
      
      <div
        v-for="(config, index) in formData.communicationConfigs"
        :key="index"
        class="p-4 rounded-lg border border-border space-y-4"
      >
        <div class="flex items-center justify-between">
          <UiSelect
            v-model="config.technology"
            :options="technologyOptions"
            class="w-48"
          />
          <UiButton
            type="button"
            variant="ghost"
            size="icon"
            @click="removeCommunicationConfig(index)"
          >
            <Trash2 class="h-4 w-4 text-destructive" />
          </UiButton>
        </div>
        
        <div>
          <UiLabel>Decoder Function (JavaScript)</UiLabel>
          <textarea
            v-model="config.decoder"
            class="w-full h-48 p-3 rounded-lg border border-border bg-muted/50 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="// Decoder function code..."
          />
          <p class="text-xs text-muted-foreground mt-1">
            Write a JavaScript function to decode payloads from this technology
          </p>
        </div>
      </div>
    </div>
    
    <!-- Actions -->
    <div class="flex justify-end gap-3 pt-4 border-t border-border">
      <UiButton type="button" variant="outline" @click="emit('cancel')">
        Cancel
      </UiButton>
      <UiButton type="submit" :loading="isSubmitting">
        {{ isEditMode ? 'Update Profile' : 'Create Profile' }}
      </UiButton>
    </div>
  </form>
</template>
