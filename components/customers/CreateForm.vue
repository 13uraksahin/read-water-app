<script setup lang="ts">
import { CustomerType, type Tenant, type Customer } from '~/types'

const props = defineProps<{
  customer?: Customer
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

// Computed: Is edit mode
const isEditMode = computed(() => props.mode === 'edit')

// Form data - NO ADDRESS (address is on Subscription)
const formData = reactive({
  tenantId: props.customer?.tenantId || '',
  customerNumber: props.customer?.customerNumber || '',
  customerType: props.customer?.customerType || CustomerType.INDIVIDUAL,
  // Individual fields
  firstName: props.customer?.details?.firstName || '',
  lastName: props.customer?.details?.lastName || '',
  tcIdNo: props.customer?.details?.tcIdNo || '',
  phone: props.customer?.details?.phone || '',
  email: props.customer?.details?.email || '',
  // Organizational fields
  organizationName: props.customer?.details?.organizationName || '',
  taxId: props.customer?.details?.taxId || '',
  taxOffice: props.customer?.details?.taxOffice || '',
  contactFirstName: props.customer?.details?.contactFirstName || '',
  contactLastName: props.customer?.details?.contactLastName || '',
  contactPhone: props.customer?.details?.contactPhone || '',
  contactEmail: props.customer?.details?.contactEmail || '',
})

// Options
const customerTypeOptions = [
  { label: 'Individual', value: CustomerType.INDIVIDUAL },
  { label: 'Organizational', value: CustomerType.ORGANIZATIONAL },
]

// Computed: Is individual
const isIndividual = computed(() => formData.customerType === CustomerType.INDIVIDUAL)

// Fetch tenants
const fetchTenants = async () => {
  isLoading.value = true
  try {
    const response = await api.getList<Tenant>('/api/v1/tenants', { limit: 100 })
    tenants.value = response.data
    
    if (tenants.value.length === 1 && tenants.value[0]) {
      formData.tenantId = tenants.value[0].id
    }
  } catch (error) {
    toast.error('Failed to load tenants')
  } finally {
    isLoading.value = false
  }
}

// Submit form
const handleSubmit = async () => {
  isSubmitting.value = true
  
  try {
    const details = isIndividual.value
      ? {
          firstName: formData.firstName,
          lastName: formData.lastName,
          tcIdNo: formData.tcIdNo,
          phone: formData.phone,
          email: formData.email,
        }
      : {
          organizationName: formData.organizationName,
          taxId: formData.taxId,
          taxOffice: formData.taxOffice,
          contactFirstName: formData.contactFirstName,
          contactLastName: formData.contactLastName,
          contactPhone: formData.contactPhone,
          contactEmail: formData.contactEmail,
        }
    
    const payload = {
      ...(isEditMode.value ? {} : { tenantId: formData.tenantId }),
      customerNumber: formData.customerNumber,
      customerType: formData.customerType,
      details,
    }
    
    if (isEditMode.value && props.customer) {
      await api.update('/api/v1/customers', props.customer.id, payload)
      toast.success('Customer updated successfully')
    } else {
      await api.create('/api/v1/customers', payload)
      toast.success('Customer created successfully')
    }
    emit('success')
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.error(`Failed to ${isEditMode.value ? 'update' : 'create'} customer`, err.message)
  } finally {
    isSubmitting.value = false
  }
}

// Initial load
onMounted(() => {
  fetchTenants()
})
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <UiSpinner size="lg" />
    </div>
    
    <template v-else>
      <!-- Basic Info -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <UiLabel>Tenant *</UiLabel>
          <UiSelect
            v-model="formData.tenantId"
            :options="tenants.map(t => ({ label: t.name, value: t.id }))"
            placeholder="Select tenant"
            :disabled="isEditMode"
          />
          <p v-if="isEditMode" class="text-xs text-muted-foreground mt-1">
            Tenant cannot be changed after creation
          </p>
        </div>
        
        <div>
          <UiLabel>Customer Number *</UiLabel>
          <UiInput 
            v-model="formData.customerNumber" 
            placeholder="Enter customer number" 
          />
          <p class="text-xs text-muted-foreground mt-1">
            User-defined unique identifier
          </p>
        </div>
      </div>
      
      <div>
        <UiLabel>Customer Type *</UiLabel>
        <UiSelect
          v-model="formData.customerType"
          :options="customerTypeOptions"
        />
      </div>
      
      <!-- Note about address -->
      <div class="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
        <strong>Note:</strong> Address is assigned per subscription, not per customer. 
        Create a subscription to assign a service address.
      </div>
      
      <!-- Conditional Fields: Individual -->
      <div v-if="isIndividual" class="space-y-4 pt-4 border-t border-border">
        <h3 class="font-medium">Personal Information</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <UiLabel>First Name *</UiLabel>
            <UiInput v-model="formData.firstName" placeholder="First name" />
          </div>
          <div>
            <UiLabel>Last Name *</UiLabel>
            <UiInput v-model="formData.lastName" placeholder="Last name" />
          </div>
          <div>
            <UiLabel>TC ID Number *</UiLabel>
            <UiInput v-model="formData.tcIdNo" placeholder="11 digit TC ID" maxlength="11" />
          </div>
          <div>
            <UiLabel>Phone</UiLabel>
            <UiInput v-model="formData.phone" placeholder="Phone number" />
          </div>
          <div class="md:col-span-2">
            <UiLabel>Email</UiLabel>
            <UiInput v-model="formData.email" type="email" placeholder="Email address" />
          </div>
        </div>
      </div>
      
      <!-- Conditional Fields: Organizational -->
      <div v-else class="space-y-4 pt-4 border-t border-border">
        <h3 class="font-medium">Organization Information</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <UiLabel>Organization Name *</UiLabel>
            <UiInput v-model="formData.organizationName" placeholder="Full organization name" />
          </div>
          <div>
            <UiLabel>Tax ID *</UiLabel>
            <UiInput v-model="formData.taxId" placeholder="Tax ID number" />
          </div>
          <div>
            <UiLabel>Tax Office</UiLabel>
            <UiInput v-model="formData.taxOffice" placeholder="Tax office" />
          </div>
        </div>
        
        <h4 class="font-medium pt-2">Contact Person</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <UiLabel>Contact First Name</UiLabel>
            <UiInput v-model="formData.contactFirstName" placeholder="Contact first name" />
          </div>
          <div>
            <UiLabel>Contact Last Name</UiLabel>
            <UiInput v-model="formData.contactLastName" placeholder="Contact last name" />
          </div>
          <div>
            <UiLabel>Contact Phone</UiLabel>
            <UiInput v-model="formData.contactPhone" placeholder="Contact phone" />
          </div>
          <div>
            <UiLabel>Contact Email</UiLabel>
            <UiInput v-model="formData.contactEmail" type="email" placeholder="Contact email" />
          </div>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="flex justify-end gap-3 pt-4 border-t border-border">
        <UiButton type="button" variant="outline" @click="emit('cancel')">
          Cancel
        </UiButton>
        <UiButton type="submit" :loading="isSubmitting">
          {{ isEditMode ? 'Update Customer' : 'Create Customer' }}
        </UiButton>
      </div>
    </template>
  </form>
</template>
