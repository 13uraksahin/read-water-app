<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next'
import type { Tenant, MeterProfile } from '~/types'

const props = defineProps<{
  tenant?: Tenant
  mode?: 'create' | 'edit'
}>()

const emit = defineEmits<{
  success: []
  cancel: []
}>()

const api = useApi()
const toast = useToast()

// State
const isLoading = ref(false)
const isSubmitting = ref(false)
const tenants = ref<Tenant[]>([])
const profiles = ref<MeterProfile[]>([])

// Subscription options
const subscriptionStatusOptions = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Suspended', value: 'SUSPENDED' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

const subscriptionPlanOptions = [
  { label: 'Free', value: 'FREE' },
  { label: 'Starter', value: 'STARTER' },
  { label: 'Professional', value: 'PROFESSIONAL' },
  { label: 'Enterprise', value: 'ENTERPRISE' },
]

// Form data
const formData = reactive({
  name: props.tenant?.name || '',
  parentId: props.tenant?.parentId || '',
  contactFirstName: props.tenant?.contactFirstName || '',
  contactLastName: props.tenant?.contactLastName || '',
  contactPhone: props.tenant?.contactPhone || '',
  contactEmail: props.tenant?.contactEmail || '',
  taxId: props.tenant?.taxId || '',
  taxOffice: props.tenant?.taxOffice || '',
  subscriptionStatus: props.tenant?.subscriptionStatus || 'ACTIVE',
  subscriptionPlan: props.tenant?.subscriptionPlan || 'STARTER',
  latitude: props.tenant?.latitude,
  longitude: props.tenant?.longitude,
  address: {
    city: props.tenant?.address?.city || '',
    district: props.tenant?.address?.district || '',
    neighborhood: props.tenant?.address?.neighborhood || '',
    street: props.tenant?.address?.street || '',
    buildingNo: props.tenant?.address?.buildingNo || '',
    floor: props.tenant?.address?.floor || '',
    doorNo: props.tenant?.address?.doorNo || '',
    postalCode: props.tenant?.address?.postalCode || '',
    extraDetails: props.tenant?.address?.extraDetails || '',
  },
  allowedProfileIds: [] as string[],
})

// Validation errors
const errors = reactive<Record<string, string>>({})

// Computed: Is edit mode
const isEditMode = computed(() => props.mode === 'edit')

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
    
    // Set allowed profiles if editing
    if (props.tenant) {
      // Would need to fetch tenant's allowed profiles from API
    }
  } catch (error) {
    toast.error('Failed to load form data')
  } finally {
    isLoading.value = false
  }
}

// Validate form
const validate = (): boolean => {
  Object.keys(errors).forEach(key => delete errors[key])
  
  if (!formData.name.trim()) {
    errors.name = 'Tenant name is required'
  }
  
  if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
    errors.contactEmail = 'Invalid email format'
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
      name: formData.name,
      // parentId can only be set on create (tenant hierarchy is immutable)
      ...(isEditMode.value ? {} : { parentId: formData.parentId || undefined }),
      contactFirstName: formData.contactFirstName || undefined,
      contactLastName: formData.contactLastName || undefined,
      contactPhone: formData.contactPhone || undefined,
      contactEmail: formData.contactEmail || undefined,
      taxId: formData.taxId || undefined,
      taxOffice: formData.taxOffice || undefined,
      subscriptionStatus: formData.subscriptionStatus,
      subscriptionPlan: formData.subscriptionPlan || undefined,
      latitude: formData.latitude,
      longitude: formData.longitude,
      address: formData.address,
      allowedProfileIds: formData.allowedProfileIds.length > 0 ? formData.allowedProfileIds : undefined,
    }
    
    if (isEditMode.value && props.tenant) {
      await api.update('/api/v1/tenants', props.tenant.id, payload)
      toast.success('Tenant updated successfully')
    } else {
      await api.create('/api/v1/tenants', payload)
      toast.success('Tenant created successfully')
    }
    
    emit('success')
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.error(`Failed to ${isEditMode.value ? 'update' : 'create'} tenant`, err.message)
  } finally {
    isSubmitting.value = false
  }
}

// Toggle profile selection
const toggleProfile = (profileId: string) => {
  const index = formData.allowedProfileIds.indexOf(profileId)
  if (index > -1) {
    formData.allowedProfileIds.splice(index, 1)
  } else {
    formData.allowedProfileIds.push(profileId)
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
          <div class="md:col-span-2">
            <UiLabel :error="!!errors.name">Tenant Name *</UiLabel>
            <UiInput
              v-model="formData.name"
              placeholder="Enter tenant name"
              :error="!!errors.name"
            />
            <p v-if="errors.name" class="text-xs text-destructive mt-1">{{ errors.name }}</p>
          </div>
          
          <div class="md:col-span-2" v-if="!isEditMode">
            <UiLabel>Parent Tenant</UiLabel>
            <UiSelect
              v-model="formData.parentId"
              :options="[{ label: 'None (Root Tenant)', value: '' }, ...tenants.map(t => ({ label: t.name, value: t.id }))]"
              placeholder="Select parent tenant"
            />
            <p class="text-xs text-muted-foreground mt-1">
              Leave empty to create a root-level tenant
            </p>
          </div>
          
          <div>
            <UiLabel>Subscription Status</UiLabel>
            <UiSelect
              v-model="formData.subscriptionStatus"
              :options="subscriptionStatusOptions"
            />
          </div>
          
          <div>
            <UiLabel>Subscription Plan</UiLabel>
            <UiSelect
              v-model="formData.subscriptionPlan"
              :options="subscriptionPlanOptions"
            />
          </div>
        </div>
      </div>
      
      <!-- Contact Info -->
      <div class="space-y-4 pt-4 border-t border-border">
        <h3 class="font-medium text-lg">Contact Information</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <UiLabel>Contact First Name</UiLabel>
            <UiInput
              v-model="formData.contactFirstName"
              placeholder="First name"
            />
          </div>
          
          <div>
            <UiLabel>Contact Last Name</UiLabel>
            <UiInput
              v-model="formData.contactLastName"
              placeholder="Last name"
            />
          </div>
          
          <div>
            <UiLabel>Contact Phone</UiLabel>
            <UiInput
              v-model="formData.contactPhone"
              placeholder="Phone number"
            />
          </div>
          
          <div>
            <UiLabel :error="!!errors.contactEmail">Contact Email</UiLabel>
            <UiInput
              v-model="formData.contactEmail"
              type="email"
              placeholder="Email address"
              :error="!!errors.contactEmail"
            />
            <p v-if="errors.contactEmail" class="text-xs text-destructive mt-1">{{ errors.contactEmail }}</p>
          </div>
        </div>
      </div>
      
      <!-- Tax Info -->
      <div class="space-y-4 pt-4 border-t border-border">
        <h3 class="font-medium text-lg">Tax Information</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <UiLabel>Tax ID</UiLabel>
            <UiInput
              v-model="formData.taxId"
              placeholder="Tax ID number"
            />
          </div>
          
          <div>
            <UiLabel>Tax Office</UiLabel>
            <UiInput
              v-model="formData.taxOffice"
              placeholder="Tax office name"
            />
          </div>
        </div>
      </div>
      
      <!-- Address -->
      <div class="space-y-4 pt-4 border-t border-border">
        <h3 class="font-medium text-lg">Address</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <UiLabel>Latitude</UiLabel>
            <UiInput
              v-model.number="formData.latitude"
              type="number"
              step="0.000001"
              placeholder="e.g. 39.9334"
            />
          </div>
          
          <div>
            <UiLabel>Longitude</UiLabel>
            <UiInput
              v-model.number="formData.longitude"
              type="number"
              step="0.000001"
              placeholder="e.g. 32.8597"
            />
          </div>
          
          <div>
            <UiLabel>Postal Code</UiLabel>
            <UiInput
              v-model="formData.address.postalCode"
              placeholder="Postal code"
            />
          </div>
          
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
          
          <div class="md:col-span-3">
            <UiLabel>Extra Details</UiLabel>
            <UiInput v-model="formData.address.extraDetails" placeholder="Additional address details" />
          </div>
        </div>
      </div>
      
      <!-- Allowed Profiles -->
      <div class="space-y-4 pt-4 border-t border-border">
        <h3 class="font-medium text-lg">Allowed Meter Profiles</h3>
        <p class="text-sm text-muted-foreground">Select which meter profiles this tenant can use</p>
        
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          <button
            v-for="profile in profiles"
            :key="profile.id"
            type="button"
            class="flex items-center gap-2 p-3 rounded-lg border text-left transition-colors"
            :class="formData.allowedProfileIds.includes(profile.id)
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-muted-foreground/50'"
            @click="toggleProfile(profile.id)"
          >
            <div
              class="h-4 w-4 rounded border flex items-center justify-center"
              :class="formData.allowedProfileIds.includes(profile.id)
                ? 'bg-primary border-primary'
                : 'border-muted-foreground/50'"
            >
              <svg
                v-if="formData.allowedProfileIds.includes(profile.id)"
                class="h-3 w-3 text-primary-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-sm truncate">{{ profile.brand }}</p>
              <p class="text-xs text-muted-foreground truncate">{{ profile.modelCode }}</p>
            </div>
          </button>
        </div>
        
        <p v-if="profiles.length === 0" class="text-sm text-muted-foreground text-center py-4">
          No meter profiles available
        </p>
      </div>
      
      <!-- Actions -->
      <div class="flex justify-end gap-3 pt-4 border-t border-border">
        <UiButton type="button" variant="outline" @click="emit('cancel')">
          Cancel
        </UiButton>
        <UiButton type="submit" :loading="isSubmitting">
          {{ isEditMode ? 'Update Tenant' : 'Create Tenant' }}
        </UiButton>
      </div>
    </template>
  </form>
</template>
