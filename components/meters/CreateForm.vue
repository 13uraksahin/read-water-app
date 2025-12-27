<script setup lang="ts">
import { Radio, Plus, Warehouse, Link2 } from 'lucide-vue-next'
import {
  MeterStatus,
  DeviceStatus,
  type MeterProfile,
  type Subscription,
  type Tenant,
  type Device,
  type DeviceProfile,
  type Meter,
  COMMUNICATION_TECH_FIELDS,
} from '~/types'

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
const subscriptions = ref<Subscription[]>([])
const meterProfiles = ref<MeterProfile[]>([])
const availableDevices = ref<Device[]>([])
const deviceProfiles = ref<DeviceProfile[]>([])

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
  
  // Step 2: Device Configuration
  deviceOption: 'none' as 'none' | 'select' | 'create',
  selectedDeviceId: props.meter?.activeDeviceId || '',
  // For inline device creation
  newDevice: {
    deviceProfileId: '',
    serialNumber: '',
    dynamicFields: {} as Record<string, string>,
  },
})

// Validation errors
const errors = reactive<Record<string, string>>({})

// Options
const statusOptions = Object.values(MeterStatus).map(s => ({ label: s.replace(/_/g, ' '), value: s }))

// Device options for display
const deviceOptions = [
  { value: 'none', label: 'None (Mechanical Only)', description: 'Create meter without communication device' },
  { value: 'select', label: 'Select from Inventory', description: 'Choose an available device from warehouse' },
  { value: 'create', label: 'Create New Device', description: 'Register a new device inline' },
]

// Selected meter profile
const selectedMeterProfile = computed(() => {
  return meterProfiles.value.find(p => p.id === formData.meterProfileId)
})

// Selected subscription
const selectedSubscription = computed(() => {
  return subscriptions.value.find(s => s.id === formData.subscriptionId)
})

// Selected device profile for new device
const selectedDeviceProfile = computed(() => {
  return deviceProfiles.value.find(p => p.id === formData.newDevice.deviceProfileId)
})

// Field definitions for new device
const newDeviceFieldDefs = computed(() => {
  if (!selectedDeviceProfile.value) return []
  
  if (selectedDeviceProfile.value.fieldDefinitions?.length) {
    return selectedDeviceProfile.value.fieldDefinitions
  }
  
  const tech = selectedDeviceProfile.value.communicationTechnology
  if (tech && COMMUNICATION_TECH_FIELDS[tech]) {
    return COMMUNICATION_TECH_FIELDS[tech]
  }
  
  return []
})

// Watch device profile changes for new device
watch(() => formData.newDevice.deviceProfileId, () => {
  formData.newDevice.dynamicFields = {}
  newDeviceFieldDefs.value.forEach(def => {
    formData.newDevice.dynamicFields[def.name] = ''
  })
})

// Fetch lookups
const fetchLookups = async () => {
  isLoading.value = true
  try {
    const [tenantsRes, profilesRes, deviceProfilesRes] = await Promise.all([
      api.getList<Tenant>('/api/v1/tenants', { limit: 100 }),
      api.getList<MeterProfile>('/api/v1/profiles', { limit: 100 }),
      api.getList<DeviceProfile>('/api/v1/device-profiles', { limit: 100 }),
    ])
    
    tenants.value = tenantsRes.data
    meterProfiles.value = profilesRes.data
    deviceProfiles.value = deviceProfilesRes.data
    
    // Set default tenant if only one
    if (!isEditMode.value && tenants.value.length === 1 && tenants.value[0]) {
      formData.tenantId = tenants.value[0].id
    }
    
    // If editing and tenant is set, fetch subscriptions
    if (isEditMode.value && formData.tenantId) {
      await fetchSubscriptions()
    }
  } catch (error) {
    toast.error('Failed to load form data')
  } finally {
    isLoading.value = false
  }
}

// Fetch subscriptions when tenant changes
const fetchSubscriptions = async () => {
  if (!formData.tenantId) {
    subscriptions.value = []
    return
  }
  
  try {
    const response = await api.getList<Subscription>('/api/v1/subscriptions', { 
      tenantId: formData.tenantId, 
      limit: 100 
    })
    subscriptions.value = response.data
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error)
  }
}

// Fetch available devices for inventory selection
const fetchAvailableDevices = async () => {
  if (!formData.tenantId || !formData.meterProfileId) {
    availableDevices.value = []
    return
  }
  
  try {
    const response = await api.get<Device[]>(
      `/api/v1/devices/available?tenantId=${formData.tenantId}&meterProfileId=${formData.meterProfileId}`
    )
    availableDevices.value = response
  } catch (error) {
    console.error('Failed to fetch available devices:', error)
    // Fallback: fetch all warehouse devices for tenant
    try {
      const response = await api.getList<Device>('/api/v1/devices', {
        tenantId: formData.tenantId,
        status: DeviceStatus.WAREHOUSE,
        limit: 100,
      })
      availableDevices.value = response.data
    } catch {
      availableDevices.value = []
    }
  }
}

// Watch tenant and profile changes
watch(() => formData.tenantId, () => {
  fetchSubscriptions()
  if (formData.meterProfileId) {
    fetchAvailableDevices()
  }
})

watch(() => formData.meterProfileId, () => {
  if (formData.tenantId) {
    fetchAvailableDevices()
  }
})

// Get device identifier for display
const getDeviceIdentifier = (device: Device): string => {
  if (!device.dynamicFields) return device.serialNumber
  const identifiers = ['DevEUI', 'ID', 'IMEI', 'MacAddress']
  for (const key of identifiers) {
    if (device.dynamicFields[key]) return device.dynamicFields[key]
  }
  return device.serialNumber
}

// Get subscription display name
const getSubscriptionLabel = (sub: Subscription): string => {
  const customerName = sub.customer?.details?.firstName 
    ? `${sub.customer.details.firstName} ${sub.customer.details.lastName || ''}`
    : sub.customer?.details?.organizationName || 'N/A'
  const address = sub.address?.city 
    ? `${sub.address.city}, ${sub.address.district || ''}`
    : ''
  return `${customerName} - ${address || 'No address'}`
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
  
  if (step === 2 && formData.deviceOption === 'create') {
    if (!formData.newDevice.deviceProfileId) {
      errors.newDeviceProfile = 'Device profile is required'
    }
    if (!formData.newDevice.serialNumber) {
      errors.newDeviceSerial = 'Device serial number is required'
    }
    // Validate dynamic fields
    newDeviceFieldDefs.value.forEach(def => {
      const value = formData.newDevice.dynamicFields[def.name] || ''
      if (def.required && !value) {
        errors[`device_field_${def.name}`] = `${def.label || def.name} is required`
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
    
    // Handle device linking if needed (only on create or if device option changed)
    if (!isEditMode.value && formData.deviceOption !== 'none') {
      if (formData.deviceOption === 'select' && formData.selectedDeviceId) {
        // Link existing device
        await api.post(`/api/v1/meters/${meterId}/link-device`, {
          deviceId: formData.selectedDeviceId,
        })
        toast.success('Device linked to meter')
      } else if (formData.deviceOption === 'create') {
        // Create new device first
        const devicePayload = {
          tenantId: formData.tenantId,
          deviceProfileId: formData.newDevice.deviceProfileId,
          serialNumber: formData.newDevice.serialNumber,
          status: DeviceStatus.WAREHOUSE,
          dynamicFields: formData.newDevice.dynamicFields,
        }
        
        const deviceResponse = await api.post<{ id: string }>('/api/v1/devices', devicePayload)
        
        // Then link it
        await api.post(`/api/v1/meters/${meterId}/link-device`, {
          deviceId: deviceResponse.id,
        })
        toast.success('Device created and linked to meter')
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
            <UiLabel :error="!!errors.subscriptionId">Subscription (Service Point)</UiLabel>
            <UiSelect
              v-model="formData.subscriptionId"
              :options="[
                { label: '-- No Subscription (Warehouse Stock) --', value: '' },
                ...subscriptions.map(s => ({ 
                  label: getSubscriptionLabel(s), 
                  value: s.id 
                }))
              ]"
              placeholder="Select subscription (optional)"
              :error="!!errors.subscriptionId"
              :disabled="!formData.tenantId"
            />
            <p v-if="errors.subscriptionId" class="text-xs text-destructive mt-1">{{ errors.subscriptionId }}</p>
            <p v-else class="text-xs text-muted-foreground mt-1">
              Optional. Leave empty to add meter to warehouse inventory.
            </p>
          </div>
          
          <div>
            <UiLabel :error="!!errors.meterProfileId">Meter Profile *</UiLabel>
            <UiSelect
              v-model="formData.meterProfileId"
              :options="meterProfiles.map(p => ({ label: `${p.brand} ${p.modelCode}`, value: p.id }))"
              placeholder="Select profile"
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
            <UiSelect
              v-model="formData.status"
              :options="statusOptions"
              placeholder="Select status"
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
            This meter will be added to inventory without a service point. You can link it to a subscription later.
          </p>
        </div>
      </div>
      
      <!-- Step 2: Device Configuration -->
      <div v-show="currentStep === 2" class="space-y-6">
        <div>
          <h3 class="font-medium text-lg flex items-center gap-2">
            <Radio class="h-5 w-5" />
            Device Configuration
          </h3>
          <p class="text-sm text-muted-foreground mt-1">
            Configure the communication device for this meter (optional)
          </p>
        </div>
        
        <!-- Device Option Selection -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            v-for="option in deviceOptions"
            :key="option.value"
            class="p-4 rounded-lg border-2 cursor-pointer transition-colors"
            :class="formData.deviceOption === option.value 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50'"
            @click="formData.deviceOption = option.value as typeof formData.deviceOption"
          >
            <div class="flex items-center gap-3 mb-2">
              <component
                :is="option.value === 'none' ? 'div' : option.value === 'select' ? Warehouse : Plus"
                class="h-5 w-5"
                :class="formData.deviceOption === option.value ? 'text-primary' : 'text-muted-foreground'"
              />
              <span class="font-medium">{{ option.label }}</span>
            </div>
            <p class="text-sm text-muted-foreground">{{ option.description }}</p>
          </div>
        </div>
        
        <!-- Select from Inventory -->
        <div v-if="formData.deviceOption === 'select'" class="space-y-4 p-4 rounded-lg border border-border">
          <h4 class="font-medium flex items-center gap-2">
            <Warehouse class="h-4 w-4" />
            Select Device from Inventory
          </h4>
          
          <div v-if="availableDevices.length === 0" class="text-center py-8 text-muted-foreground">
            <Warehouse class="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No available devices in warehouse</p>
            <p class="text-sm">Make sure you've selected a tenant and meter profile</p>
          </div>
          
          <div v-else class="space-y-2">
            <UiLabel>Available Devices</UiLabel>
            <div class="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
              <div
                v-for="device in availableDevices"
                :key="device.id"
                class="p-3 rounded-lg border cursor-pointer transition-colors"
                :class="formData.selectedDeviceId === device.id 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'"
                @click="formData.selectedDeviceId = device.id"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium font-mono">{{ device.serialNumber }}</p>
                    <p class="text-xs text-muted-foreground">{{ getDeviceIdentifier(device) }}</p>
                  </div>
                  <div class="text-right">
                    <UiBadge variant="outline" class="text-xs">
                      {{ device.deviceProfile?.brand }} {{ device.deviceProfile?.modelCode }}
                    </UiBadge>
                    <p class="text-xs text-muted-foreground mt-1">
                      {{ device.deviceProfile?.communicationTechnology?.replace(/_/g, '-') }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Create New Device -->
        <div v-if="formData.deviceOption === 'create'" class="space-y-4 p-4 rounded-lg border border-border">
          <h4 class="font-medium flex items-center gap-2">
            <Plus class="h-4 w-4" />
            Create New Device
          </h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <UiLabel :error="!!errors.newDeviceProfile">Device Profile *</UiLabel>
              <UiSelect
                v-model="formData.newDevice.deviceProfileId"
                :options="deviceProfiles.map(p => ({ 
                  label: `${p.brand} ${p.modelCode} (${p.communicationTechnology?.replace(/_/g, '-')})`, 
                  value: p.id 
                }))"
                placeholder="Select device profile"
                :error="!!errors.newDeviceProfile"
              />
              <p v-if="errors.newDeviceProfile" class="text-xs text-destructive mt-1">{{ errors.newDeviceProfile }}</p>
            </div>
            
            <div>
              <UiLabel :error="!!errors.newDeviceSerial">Device Serial Number *</UiLabel>
              <UiInput
                v-model="formData.newDevice.serialNumber"
                placeholder="e.g. DEV-001234"
                :error="!!errors.newDeviceSerial"
              />
              <p v-if="errors.newDeviceSerial" class="text-xs text-destructive mt-1">{{ errors.newDeviceSerial }}</p>
            </div>
          </div>
          
          <!-- Dynamic Fields for New Device -->
          <div v-if="newDeviceFieldDefs.length > 0" class="space-y-4 pt-4 border-t border-border">
            <p class="text-sm font-medium">Communication Keys</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-for="def in newDeviceFieldDefs" :key="def.name">
                <UiLabel :error="!!errors[`device_field_${def.name}`]">
                  {{ def.label || def.name }}
                  <span v-if="def.required" class="text-destructive">*</span>
                  <span v-if="def.length" class="text-xs text-muted-foreground ml-1">({{ def.length }} chars)</span>
                </UiLabel>
                <UiInput
                  v-model="formData.newDevice.dynamicFields[def.name]"
                  :placeholder="`Enter ${def.label || def.name}`"
                  :error="!!errors[`device_field_${def.name}`]"
                  :maxlength="def.length"
                  class="font-mono uppercase"
                />
                <p v-if="errors[`device_field_${def.name}`]" class="text-xs text-destructive mt-1">
                  {{ errors[`device_field_${def.name}`] }}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Edit mode note -->
        <div v-if="isEditMode" class="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <p>
            <strong>Note:</strong> To link or unlink devices, use the device management section on the meter detail page.
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
