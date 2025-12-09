<script setup lang="ts">
import { Plus, Trash2, Info } from 'lucide-vue-next'
import {
  MeterStatus,
  CommunicationTechnology,
  COMMUNICATION_TECH_FIELDS,
  type TechFieldDefinition,
  type MeterProfile,
  type Customer,
  type Tenant,
  type TechnologyConfig,
} from '~/types'

const emit = defineEmits<{
  success: []
  cancel: []
}>()

const api = useApi()
const toast = useToast()

// Form state
const isLoading = ref(false)
const isSubmitting = ref(false)

// Lookups
const tenants = ref<Tenant[]>([])
const customers = ref<Customer[]>([])
const profiles = ref<MeterProfile[]>([])

// Form data
const formData = reactive({
  tenantId: '',
  customerId: '',
  profileId: '',
  serialNumber: '',
  deviceId: '',
  initialIndex: 0,
  status: MeterStatus.WAREHOUSE,
  installationDate: '',
  latitude: undefined as number | undefined,
  longitude: undefined as number | undefined,
  addressCode: '',
  address: {
    city: '',
    district: '',
    neighborhood: '',
    street: '',
    buildingNo: '',
    floor: '',
    doorNo: '',
    postalCode: '',
    extraDetails: '',
  },
  // Connectivity - DYNAMIC
  primaryTechnology: '' as CommunicationTechnology | '',
  primaryFields: {} as Record<string, string>,
  secondaryTechnology: '' as CommunicationTechnology | '',
  secondaryFields: {} as Record<string, string>,
  otherTechnologies: [] as { technology: CommunicationTechnology; fields: Record<string, string> }[],
})

// Validation errors
const errors = reactive<Record<string, string>>({})

// Options
const statusOptions = Object.values(MeterStatus).map(s => ({ label: s.replace(/_/g, ' '), value: s }))
const technologyOptions = Object.values(CommunicationTechnology).map(t => ({ label: t.replace(/_/g, ' '), value: t }))

// Get field definitions for a technology
const getFieldDefinitions = (tech: CommunicationTechnology | ''): TechFieldDefinition[] => {
  if (!tech) return []
  return COMMUNICATION_TECH_FIELDS[tech] || []
}

// Computed field definitions
const primaryFieldDefs = computed(() => getFieldDefinitions(formData.primaryTechnology as CommunicationTechnology))
const secondaryFieldDefs = computed(() => getFieldDefinitions(formData.secondaryTechnology as CommunicationTechnology))

// Watch for technology changes and initialize fields
watch(() => formData.primaryTechnology, (tech) => {
  formData.primaryFields = {}
  if (tech) {
    const defs = getFieldDefinitions(tech)
    defs.forEach(def => {
      formData.primaryFields[def.keyName] = ''
    })
  }
})

watch(() => formData.secondaryTechnology, (tech) => {
  formData.secondaryFields = {}
  if (tech) {
    const defs = getFieldDefinitions(tech)
    defs.forEach(def => {
      formData.secondaryFields[def.keyName] = ''
    })
  }
})

// Add other technology
const addOtherTechnology = () => {
  formData.otherTechnologies.push({
    technology: '' as CommunicationTechnology,
    fields: {},
  })
}

// Remove other technology
const removeOtherTechnology = (index: number) => {
  formData.otherTechnologies.splice(index, 1)
}

// Watch other technology changes
const onOtherTechChange = (index: number, tech: CommunicationTechnology) => {
  formData.otherTechnologies[index].technology = tech
  formData.otherTechnologies[index].fields = {}
  
  if (tech) {
    const defs = getFieldDefinitions(tech)
    defs.forEach(def => {
      formData.otherTechnologies[index].fields[def.keyName] = ''
    })
  }
}

// Validate field against regex
const validateField = (value: string, def: TechFieldDefinition): boolean => {
  if (!value) return false
  return new RegExp(def.validationRegex).test(value)
}

// Fetch lookups
const fetchLookups = async () => {
  isLoading.value = true
  try {
    const [tenantsRes, profilesRes] = await Promise.all([
      api.getList<Tenant>('/api/v1/tenants', { limit: 100 }),
      api.getList<MeterProfile>('/api/v1/profiles', { limit: 100 }),
    ])
    
    tenants.value = tenantsRes.data
    profiles.value = profilesRes.data
    
    // Set default tenant if only one
    if (tenants.value.length === 1) {
      formData.tenantId = tenants.value[0].id
    }
  } catch (error) {
    toast.error('Failed to load form data')
  } finally {
    isLoading.value = false
  }
}

// Fetch customers when tenant changes
watch(() => formData.tenantId, async (tenantId) => {
  if (!tenantId) {
    customers.value = []
    return
  }
  
  try {
    const response = await api.getList<Customer>('/api/v1/customers', { tenantId, limit: 100 })
    customers.value = response.data
  } catch (error) {
    console.error('Failed to fetch customers:', error)
  }
})

// Validate form
const validate = (): boolean => {
  // Clear previous errors
  Object.keys(errors).forEach(key => delete errors[key])
  
  if (!formData.tenantId) errors.tenantId = 'Tenant is required'
  if (!formData.profileId) errors.profileId = 'Meter profile is required'
  if (!formData.serialNumber) errors.serialNumber = 'Serial number is required'
  if (!formData.status) errors.status = 'Status is required'
  
  // Validate primary technology fields
  if (formData.primaryTechnology) {
    primaryFieldDefs.value.forEach(def => {
      const value = formData.primaryFields[def.keyName]
      if (!validateField(value, def)) {
        errors[`primary_${def.keyName}`] = `Invalid ${def.keyName} format`
      }
    })
  }
  
  // Validate secondary technology fields
  if (formData.secondaryTechnology) {
    secondaryFieldDefs.value.forEach(def => {
      const value = formData.secondaryFields[def.keyName]
      if (!validateField(value, def)) {
        errors[`secondary_${def.keyName}`] = `Invalid ${def.keyName} format`
      }
    })
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
    // Build connectivity config
    const connectivityConfig: { primary?: TechnologyConfig; secondary?: TechnologyConfig; other?: TechnologyConfig[] } = {}
    
    if (formData.primaryTechnology) {
      connectivityConfig.primary = {
        technology: formData.primaryTechnology,
        fields: formData.primaryFields,
      }
    }
    
    if (formData.secondaryTechnology) {
      connectivityConfig.secondary = {
        technology: formData.secondaryTechnology,
        fields: formData.secondaryFields,
      }
    }
    
    if (formData.otherTechnologies.length > 0) {
      connectivityConfig.other = formData.otherTechnologies.filter(t => t.technology)
    }
    
    const payload = {
      tenantId: formData.tenantId,
      customerId: formData.customerId || undefined,
      profileId: formData.profileId,
      serialNumber: formData.serialNumber,
      deviceId: formData.deviceId || undefined,
      initialIndex: formData.initialIndex,
      status: formData.status,
      installationDate: formData.installationDate || undefined,
      latitude: formData.latitude,
      longitude: formData.longitude,
      addressCode: formData.addressCode || undefined,
      address: formData.address,
      connectivityConfig,
    }
    
    await api.create('/api/v1/meters', payload)
    toast.success('Meter created successfully')
    emit('success')
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.error('Failed to create meter', err.message)
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
        <h3 class="font-medium text-lg">Basic Information</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <UiLabel :error="!!errors.tenantId">Tenant *</UiLabel>
            <UiSelect
              v-model="formData.tenantId"
              :options="tenants.map(t => ({ label: t.name, value: t.id }))"
              placeholder="Select tenant"
              :error="!!errors.tenantId"
            />
            <p v-if="errors.tenantId" class="text-xs text-destructive mt-1">{{ errors.tenantId }}</p>
          </div>
          
          <div>
            <UiLabel>Customer (Optional)</UiLabel>
            <UiSelect
              v-model="formData.customerId"
              :options="customers.map(c => ({ label: c.details?.firstName || c.details?.organizationName || 'N/A', value: c.id }))"
              placeholder="Select customer"
              :disabled="!formData.tenantId"
            />
          </div>
          
          <div>
            <UiLabel :error="!!errors.profileId">Meter Profile *</UiLabel>
            <UiSelect
              v-model="formData.profileId"
              :options="profiles.map(p => ({ label: `${p.brand} ${p.modelCode}`, value: p.id }))"
              placeholder="Select profile"
              :error="!!errors.profileId"
            />
            <p v-if="errors.profileId" class="text-xs text-destructive mt-1">{{ errors.profileId }}</p>
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
            <UiLabel>Device ID</UiLabel>
            <UiInput v-model="formData.deviceId" placeholder="Optional device identifier" />
          </div>
          
          <div>
            <UiLabel>Initial Index (m³)</UiLabel>
            <UiInput v-model.number="formData.initialIndex" type="number" min="0" step="0.001" />
          </div>
          
          <div>
            <UiLabel :error="!!errors.status">Status *</UiLabel>
            <UiSelect
              v-model="formData.status"
              :options="statusOptions"
              placeholder="Select status"
              :error="!!errors.status"
            />
          </div>
          
          <div>
            <UiLabel>Installation Date</UiLabel>
            <UiInput v-model="formData.installationDate" type="datetime-local" />
          </div>
        </div>
      </div>
      
      <!-- WAN Connectivity - DYNAMIC SECTION -->
      <div class="space-y-4 pt-4 border-t border-border">
        <h3 class="font-medium text-lg flex items-center gap-2">
          WAN Connectivity
          <span class="text-xs text-muted-foreground font-normal">(Dynamic fields based on technology)</span>
        </h3>
        
        <!-- Primary Technology -->
        <div class="p-4 rounded-lg border border-border space-y-4">
          <div class="flex items-center justify-between">
            <UiLabel class="text-base">Primary Technology</UiLabel>
            <UiBadge variant="secondary">Primary</UiBadge>
          </div>
          
          <UiSelect
            v-model="formData.primaryTechnology"
            :options="[{ label: 'None', value: '' }, ...technologyOptions]"
            placeholder="Select technology"
          />
          
          <!-- Dynamic fields for primary technology -->
          <div v-if="primaryFieldDefs.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div v-for="def in primaryFieldDefs" :key="def.keyName">
              <UiLabel :error="!!errors[`primary_${def.keyName}`]">
                {{ def.keyName }}
                <span class="text-xs text-muted-foreground ml-1">({{ def.keyLength }} chars)</span>
              </UiLabel>
              <UiInput
                v-model="formData.primaryFields[def.keyName]"
                :placeholder="`Enter ${def.keyName}`"
                :error="!!errors[`primary_${def.keyName}`]"
                :maxlength="def.keyLength"
                class="font-mono uppercase"
              />
              <p v-if="errors[`primary_${def.keyName}`]" class="text-xs text-destructive mt-1">
                {{ errors[`primary_${def.keyName}`] }}
              </p>
              <p class="text-xs text-muted-foreground mt-1">
                Format: {{ def.validationRegex }}
              </p>
            </div>
          </div>
        </div>
        
        <!-- Secondary Technology -->
        <div class="p-4 rounded-lg border border-border space-y-4">
          <div class="flex items-center justify-between">
            <UiLabel class="text-base">Secondary Technology (Optional)</UiLabel>
            <UiBadge variant="outline">Secondary</UiBadge>
          </div>
          
          <UiSelect
            v-model="formData.secondaryTechnology"
            :options="[{ label: 'None', value: '' }, ...technologyOptions]"
            placeholder="Select technology"
          />
          
          <!-- Dynamic fields for secondary technology -->
          <div v-if="secondaryFieldDefs.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div v-for="def in secondaryFieldDefs" :key="def.keyName">
              <UiLabel :error="!!errors[`secondary_${def.keyName}`]">
                {{ def.keyName }}
                <span class="text-xs text-muted-foreground ml-1">({{ def.keyLength }} chars)</span>
              </UiLabel>
              <UiInput
                v-model="formData.secondaryFields[def.keyName]"
                :placeholder="`Enter ${def.keyName}`"
                :error="!!errors[`secondary_${def.keyName}`]"
                :maxlength="def.keyLength"
                class="font-mono uppercase"
              />
              <p v-if="errors[`secondary_${def.keyName}`]" class="text-xs text-destructive mt-1">
                {{ errors[`secondary_${def.keyName}`] }}
              </p>
            </div>
          </div>
        </div>
        
        <!-- Other Technologies -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <UiLabel class="text-base">Other Technologies</UiLabel>
            <UiButton type="button" variant="outline" size="sm" @click="addOtherTechnology">
              <Plus class="h-4 w-4" />
              Add Technology
            </UiButton>
          </div>
          
          <div
            v-for="(tech, index) in formData.otherTechnologies"
            :key="index"
            class="p-4 rounded-lg border border-border space-y-4"
          >
            <div class="flex items-center justify-between">
              <UiSelect
                :model-value="tech.technology"
                :options="technologyOptions"
                placeholder="Select technology"
                class="flex-1"
                @update:model-value="(val: string | number) => onOtherTechChange(index, val as CommunicationTechnology)"
              />
              <UiButton type="button" variant="ghost" size="icon" @click="removeOtherTechnology(index)">
                <Trash2 class="h-4 w-4 text-destructive" />
              </UiButton>
            </div>
            
            <!-- Dynamic fields -->
            <div v-if="tech.technology" class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-for="def in getFieldDefinitions(tech.technology)" :key="def.keyName">
                <UiLabel>{{ def.keyName }}</UiLabel>
                <UiInput
                  v-model="tech.fields[def.keyName]"
                  :placeholder="`Enter ${def.keyName}`"
                  :maxlength="def.keyLength"
                  class="font-mono uppercase"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Location -->
      <div class="space-y-4 pt-4 border-t border-border">
        <h3 class="font-medium text-lg">Location</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <UiLabel>Latitude</UiLabel>
            <UiInput v-model.number="formData.latitude" type="number" step="0.000001" placeholder="e.g. 39.9334" />
          </div>
          <div>
            <UiLabel>Longitude</UiLabel>
            <UiInput v-model.number="formData.longitude" type="number" step="0.000001" placeholder="e.g. 32.8597" />
          </div>
          <div>
            <UiLabel>Address Code</UiLabel>
            <UiInput v-model="formData.addressCode" placeholder="TC Address Code" />
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <UiLabel>City</UiLabel>
            <UiInput v-model="formData.address.city" placeholder="City" />
          </div>
          <div>
            <UiLabel>District</UiLabel>
            <UiInput v-model="formData.address.district" placeholder="District" />
          </div>
          <div>
            <UiLabel>Neighborhood</UiLabel>
            <UiInput v-model="formData.address.neighborhood" placeholder="Neighborhood" />
          </div>
          <div>
            <UiLabel>Street</UiLabel>
            <UiInput v-model="formData.address.street" placeholder="Street" />
          </div>
          <div>
            <UiLabel>Building No</UiLabel>
            <UiInput v-model="formData.address.buildingNo" placeholder="Building No" />
          </div>
          <div>
            <UiLabel>Floor / Door</UiLabel>
            <div class="flex gap-2">
              <UiInput v-model="formData.address.floor" placeholder="Floor" />
              <UiInput v-model="formData.address.doorNo" placeholder="Door" />
            </div>
          </div>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="flex justify-end gap-3 pt-4 border-t border-border">
        <UiButton type="button" variant="outline" @click="emit('cancel')">
          Cancel
        </UiButton>
        <UiButton type="submit" :loading="isSubmitting">
          Create Meter
        </UiButton>
      </div>
    </template>
  </form>
</template>

