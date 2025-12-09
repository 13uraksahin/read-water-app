<script setup lang="ts">
import { Plus, Trash2, Shield } from 'lucide-vue-next'
import { SystemRole, type User, type Tenant } from '~/types'

const props = defineProps<{
  user?: User
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

// Role options
const roleOptions = Object.values(SystemRole).map(role => ({
  label: role.replace(/_/g, ' '),
  value: role,
}))

// Form data
const formData = reactive({
  firstName: props.user?.firstName || '',
  lastName: props.user?.lastName || '',
  email: props.user?.email || '',
  password: '',
  phone: props.user?.phone || '',
  tcIdNo: props.user?.tcIdNo || '',
  language: 'en',
  timezone: 'Europe/Istanbul',
  isActive: props.user?.isActive ?? true,
  tenantAssignments: [] as { tenantId: string; role: SystemRole; permissions?: string[] }[],
})

// Validation errors
const errors = reactive<Record<string, string>>({})

// Computed: Is edit mode
const isEditMode = computed(() => props.mode === 'edit')

// Initialize tenant assignments from existing user
watchEffect(() => {
  if (props.user?.tenants) {
    formData.tenantAssignments = props.user.tenants.map(t => ({
      tenantId: t.tenantId,
      role: t.role,
    }))
  }
})

// Fetch lookups
const fetchLookups = async () => {
  isLoading.value = true
  try {
    const response = await api.getList<Tenant>('/api/v1/tenants', { limit: 100 })
    tenants.value = response.data
  } catch (error) {
    toast.error('Failed to load tenants')
  } finally {
    isLoading.value = false
  }
}

// Add tenant assignment
const addTenantAssignment = () => {
  formData.tenantAssignments.push({
    tenantId: '',
    role: SystemRole.VIEWER,
  })
}

// Remove tenant assignment
const removeTenantAssignment = (index: number) => {
  formData.tenantAssignments.splice(index, 1)
}

// Get tenant name
const getTenantName = (tenantId: string): string => {
  const tenant = tenants.value.find(t => t.id === tenantId)
  return tenant?.name || 'Unknown'
}

// Validate form
const validate = (): boolean => {
  Object.keys(errors).forEach(key => delete errors[key])
  
  if (!formData.firstName.trim()) {
    errors.firstName = 'First name is required'
  }
  
  if (!formData.lastName.trim()) {
    errors.lastName = 'Last name is required'
  }
  
  if (!formData.email.trim()) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = 'Invalid email format'
  }
  
  if (!isEditMode.value && !formData.password) {
    errors.password = 'Password is required for new users'
  } else if (!isEditMode.value && formData.password.length < 8) {
    errors.password = 'Password must be at least 8 characters'
  }
  
  // Validate tenant assignments
  formData.tenantAssignments.forEach((assignment, index) => {
    if (!assignment.tenantId) {
      errors[`tenant_${index}`] = 'Tenant is required'
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
    if (isEditMode.value && props.user) {
      // Update user
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        tcIdNo: formData.tcIdNo || undefined,
        isActive: formData.isActive,
        language: formData.language,
        timezone: formData.timezone,
      }
      
      await api.update('/api/v1/users', props.user.id, payload)
      
      // Update tenant assignments separately if needed
      // This would typically be a separate API call
      
      toast.success('User updated successfully')
    } else {
      // Create user
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        tcIdNo: formData.tcIdNo || undefined,
        language: formData.language,
        timezone: formData.timezone,
        tenants: formData.tenantAssignments.filter(a => a.tenantId),
      }
      
      await api.create('/api/v1/users', payload)
      toast.success('User created successfully')
    }
    
    emit('success')
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.error(`Failed to ${isEditMode.value ? 'update' : 'create'} user`, err.message)
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
        <h3 class="font-medium text-lg">Personal Information</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <UiLabel :error="!!errors.firstName">First Name *</UiLabel>
            <UiInput
              v-model="formData.firstName"
              placeholder="Enter first name"
              :error="!!errors.firstName"
            />
            <p v-if="errors.firstName" class="text-xs text-destructive mt-1">{{ errors.firstName }}</p>
          </div>
          
          <div>
            <UiLabel :error="!!errors.lastName">Last Name *</UiLabel>
            <UiInput
              v-model="formData.lastName"
              placeholder="Enter last name"
              :error="!!errors.lastName"
            />
            <p v-if="errors.lastName" class="text-xs text-destructive mt-1">{{ errors.lastName }}</p>
          </div>
          
          <div>
            <UiLabel :error="!!errors.email">Email *</UiLabel>
            <UiInput
              v-model="formData.email"
              type="email"
              placeholder="Enter email address"
              :error="!!errors.email"
            />
            <p v-if="errors.email" class="text-xs text-destructive mt-1">{{ errors.email }}</p>
          </div>
          
          <div v-if="!isEditMode">
            <UiLabel :error="!!errors.password">Password *</UiLabel>
            <UiInput
              v-model="formData.password"
              type="password"
              placeholder="Enter password"
              :error="!!errors.password"
            />
            <p v-if="errors.password" class="text-xs text-destructive mt-1">{{ errors.password }}</p>
            <p v-else class="text-xs text-muted-foreground mt-1">Minimum 8 characters</p>
          </div>
          
          <div>
            <UiLabel>Phone</UiLabel>
            <UiInput
              v-model="formData.phone"
              placeholder="Phone number"
            />
          </div>
          
          <div>
            <UiLabel>TC ID Number</UiLabel>
            <UiInput
              v-model="formData.tcIdNo"
              placeholder="11 digit TC ID"
              maxlength="11"
            />
          </div>
        </div>
      </div>
      
      <!-- Status (Edit mode only) -->
      <div v-if="isEditMode" class="space-y-4 pt-4 border-t border-border">
        <h3 class="font-medium text-lg">Status</h3>
        
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
            :class="formData.isActive ? 'bg-primary' : 'bg-muted'"
            @click="formData.isActive = !formData.isActive"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
              :class="formData.isActive ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
          <span class="text-sm">
            {{ formData.isActive ? 'Active' : 'Inactive' }}
          </span>
        </div>
      </div>
      
      <!-- Tenant Assignments -->
      <div class="space-y-4 pt-4 border-t border-border">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-medium text-lg">Tenant Assignments</h3>
            <p class="text-sm text-muted-foreground">Assign this user to tenants with specific roles</p>
          </div>
          <UiButton type="button" variant="outline" size="sm" @click="addTenantAssignment">
            <Plus class="h-4 w-4" />
            Add Tenant
          </UiButton>
        </div>
        
        <div v-if="formData.tenantAssignments.length === 0" class="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
          <Shield class="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No tenant assignments</p>
          <p class="text-sm">Click "Add Tenant" to assign roles</p>
        </div>
        
        <div
          v-for="(assignment, index) in formData.tenantAssignments"
          :key="index"
          class="p-4 rounded-lg border border-border space-y-4"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <UiLabel :error="!!errors[`tenant_${index}`]">Tenant *</UiLabel>
                <UiSelect
                  v-model="assignment.tenantId"
                  :options="tenants.map(t => ({ label: t.name, value: t.id }))"
                  placeholder="Select tenant"
                  :error="!!errors[`tenant_${index}`]"
                />
                <p v-if="errors[`tenant_${index}`]" class="text-xs text-destructive mt-1">
                  {{ errors[`tenant_${index}`] }}
                </p>
              </div>
              
              <div>
                <UiLabel>Role *</UiLabel>
                <UiSelect
                  v-model="assignment.role"
                  :options="roleOptions"
                  placeholder="Select role"
                />
              </div>
            </div>
            
            <UiButton
              type="button"
              variant="ghost"
              size="icon"
              class="mt-6"
              @click="removeTenantAssignment(index)"
            >
              <Trash2 class="h-4 w-4 text-destructive" />
            </UiButton>
          </div>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="flex justify-end gap-3 pt-4 border-t border-border">
        <UiButton type="button" variant="outline" @click="emit('cancel')">
          Cancel
        </UiButton>
        <UiButton type="submit" :loading="isSubmitting">
          {{ isEditMode ? 'Update User' : 'Create User' }}
        </UiButton>
      </div>
    </template>
  </form>
</template>
