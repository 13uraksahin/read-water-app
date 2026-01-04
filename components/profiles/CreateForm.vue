<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next'
import {
  Brand,
  MeterType,
  DialType,
  IPRating,
  CommunicationModule,
  type MeterProfile,
  type ModuleProfile,
} from '~/types'
import { SearchableSelect } from '~/components/ui/searchable-select'

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
const isLoadingModuleProfiles = ref(false)
const moduleProfiles = ref<ModuleProfile[]>([])

// Enum options
const brandOptions = Object.values(Brand).map(b => ({ label: b, value: b }))
const meterTypeOptions = Object.values(MeterType).map(t => ({ label: t.replace(/_/g, ' '), value: t }))
const dialTypeOptions = Object.values(DialType).map(t => ({ label: t.replace(/_/g, ' '), value: t }))
const ipRatingOptions = Object.values(IPRating).map(r => ({ label: r, value: r }))
const communicationModuleOptions = Object.values(CommunicationModule).map(m => ({ label: m.replace(/_/g, ' '), value: m }))

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
  communicationModule: props.profile?.communicationModule || CommunicationModule.NONE,
  // Compatible module profiles (for linking)
  compatibleModuleProfileIds: props.profile?.compatibleModuleProfiles?.map(dp => dp.id) || [] as string[],
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

// Fetch module profiles for compatibility selection
const fetchModuleProfiles = async () => {
  isLoadingModuleProfiles.value = true
  try {
    const response = await api.getList<ModuleProfile>('/api/v1/module-profiles', { limit: 100 })
    moduleProfiles.value = response.data
  } catch (error) {
    console.error('Failed to fetch module profiles:', error)
  } finally {
    isLoadingModuleProfiles.value = false
  }
}

// Toggle module profile compatibility
const toggleModuleProfile = (profileId: string) => {
  const index = formData.compatibleModuleProfileIds.indexOf(profileId)
  if (index > -1) {
    formData.compatibleModuleProfileIds.splice(index, 1)
  } else {
    formData.compatibleModuleProfileIds.push(profileId)
  }
}

// Group module profiles by technology for display
const moduleProfilesByTechnology = computed(() => {
  const grouped: Record<string, ModuleProfile[]> = {}
  moduleProfiles.value.forEach(dp => {
    const tech = dp.communicationTechnology || 'OTHER'
    if (!grouped[tech]) grouped[tech] = []
    grouped[tech].push(dp)
  })
  return grouped
})

// Validate form
const validate = (): boolean => {
  Object.keys(errors).forEach(key => delete errors[key])
  
  // Only validate create-only fields when not in edit mode
  if (!isEditMode.value) {
    if (!formData.brand) {
      errors.brand = 'Brand is required'
    }
    
    if (!formData.modelCode.trim()) {
      errors.modelCode = 'Model code is required'
    }
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
    // Build payload - exclude read-only fields in edit mode
    const payload = {
      // Fields only allowed on create
      ...(isEditMode.value ? {} : {
        brand: formData.brand,
        modelCode: formData.modelCode,
      }),
      // Fields allowed on both create and update
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
      // Send compatible module profile IDs
      compatibleModuleProfileIds: formData.compatibleModuleProfileIds,
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

// Fetch module profiles on mount
onMounted(() => {
  fetchModuleProfiles()
})
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Basic Info -->
    <div class="space-y-4">
      <h3 class="font-medium text-lg">Basic Information</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <UiLabel :error="!!errors.brand">Brand *</UiLabel>
          <SearchableSelect
            v-model="formData.brand"
            :options="brandOptions"
            placeholder="Select brand"
            search-placeholder="Search brands..."
            empty-text="No brands found"
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
            placeholder="e.g. WM-100"
            :error="!!errors.modelCode"
            :disabled="isEditMode"
          />
          <p v-if="errors.modelCode" class="text-xs text-destructive mt-1">{{ errors.modelCode }}</p>
          <p v-else-if="isEditMode" class="text-xs text-muted-foreground mt-1">
            Model code cannot be changed after creation
          </p>
        </div>
        
        <div>
          <UiLabel :error="!!errors.meterType">Meter Type *</UiLabel>
          <SearchableSelect
            v-model="formData.meterType"
            :options="meterTypeOptions"
            placeholder="Select type"
            search-placeholder="Search types..."
            empty-text="No types found"
            :error="!!errors.meterType"
          />
        </div>
        
        <div>
          <UiLabel :error="!!errors.dialType">Dial Type *</UiLabel>
          <SearchableSelect
            v-model="formData.dialType"
            :options="dialTypeOptions"
            placeholder="Select dial type"
            search-placeholder="Search dial types..."
            empty-text="No dial types found"
            :error="!!errors.dialType"
          />
        </div>
        
        <div>
          <UiLabel>Connection Type</UiLabel>
          <SearchableSelect
            v-model="formData.connectionType"
            :options="connectionTypeOptions"
            placeholder="Select connection type"
            search-placeholder="Search..."
            empty-text="No options available"
          />
        </div>
        
        <div>
          <UiLabel>Mounting Type</UiLabel>
          <SearchableSelect
            v-model="formData.mountingType"
            :options="mountingTypeOptions"
            placeholder="Select mounting type"
            search-placeholder="Search..."
            empty-text="No options available"
          />
        </div>
        
        <div>
          <UiLabel>Temperature Type</UiLabel>
          <SearchableSelect
            v-model="formData.temperatureType"
            :options="temperatureTypeOptions"
            placeholder="Select temperature type"
            search-placeholder="Search..."
            empty-text="No options available"
          />
        </div>
        
        <div>
          <UiLabel>IP Rating</UiLabel>
          <SearchableSelect
            v-model="formData.ipRating"
            :options="ipRatingOptions"
            placeholder="Select IP rating"
            search-placeholder="Search IP ratings..."
            empty-text="No ratings found"
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
    
    <!-- Communication Module -->
    <div class="space-y-4 pt-4 border-t border-border">
      <h3 class="font-medium text-lg">Communication Module</h3>
      <p class="text-sm text-muted-foreground">
        Specify if this meter has an integrated communication module, supports retrofit modules, or is purely mechanical.
      </p>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <UiLabel>Module Type</UiLabel>
          <SearchableSelect
            v-model="formData.communicationModule"
            :options="communicationModuleOptions"
            placeholder="Select module type"
            search-placeholder="Search..."
            empty-text="No options available"
          />
        </div>
      </div>
    </div>
    
    <!-- Compatible Module Profiles -->
    <div v-if="formData.communicationModule !== 'NONE'" class="space-y-4 pt-4 border-t border-border">
      <div>
        <h3 class="font-medium text-lg">Compatible Module Profiles</h3>
        <p class="text-sm text-muted-foreground">
          Select module profiles that are compatible with this meter. This determines which communication modules can be linked to meters using this profile.
        </p>
      </div>
      
      <div v-if="isLoadingModuleProfiles" class="flex items-center justify-center py-8">
        <UiSpinner />
      </div>
      
      <div v-else-if="moduleProfiles.length === 0" class="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
        <p>No module profiles available</p>
        <p class="text-sm">Create module profiles first to set up compatibility</p>
      </div>
      
      <div v-else class="space-y-4">
        <!-- Group by technology -->
        <div
          v-for="(profiles, technology) in moduleProfilesByTechnology"
          :key="technology"
          class="space-y-2"
        >
          <h4 class="text-sm font-medium text-muted-foreground">
            {{ technology.replace(/_/g, '-') }}
          </h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            <div
              v-for="profile in profiles"
              :key="profile.id"
              class="p-3 rounded-lg border cursor-pointer transition-colors"
              :class="formData.compatibleModuleProfileIds.includes(profile.id) 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'"
              @click="toggleModuleProfile(profile.id)"
            >
              <div class="flex items-center gap-3">
                <input
                  type="checkbox"
                  :checked="formData.compatibleModuleProfileIds.includes(profile.id)"
                  class="rounded border-input"
                  @click.stop
                  @change="toggleModuleProfile(profile.id)"
                />
                <div class="flex-1 min-w-0">
                  <p class="font-medium truncate">{{ profile.brand }} {{ profile.modelCode }}</p>
                  <p class="text-xs text-muted-foreground">
                    {{ profile.integrationType }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Selected count -->
        <p class="text-sm text-muted-foreground">
          {{ formData.compatibleModuleProfileIds.length }} module profile(s) selected
        </p>
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
