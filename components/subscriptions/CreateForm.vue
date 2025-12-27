<script setup lang="ts">
import { SubscriptionType, SubscriptionGroup, type Subscription, type Customer } from '~/types'

const props = defineProps<{
  subscription?: Subscription
}>()

const emit = defineEmits<{
  success: []
  cancel: []
}>()

const api = useApi()
const toast = useToast()
const appStore = useAppStore()

const isEditing = computed(() => !!props.subscription)

// Get the default tenant - prefer active tenant, fall back to first non-root tenant
const getDefaultTenantId = (): string => {
  if (props.subscription?.tenantId) return props.subscription.tenantId
  if (appStore.activeTenantId) return appStore.activeTenantId
  // Fall back to first non-root tenant (one with a parent)
  const nonRootTenant = appStore.tenants.find(t => t.parentId)
  return nonRootTenant?.id || appStore.tenants[0]?.id || ''
}

// Form state
const form = ref({
  tenantId: getDefaultTenantId(),
  subscriptionNumber: props.subscription?.subscriptionNumber || '',
  customerId: props.subscription?.customerId || '',
  subscriptionType: props.subscription?.subscriptionType || SubscriptionType.INDIVIDUAL,
  subscriptionGroup: props.subscription?.subscriptionGroup || SubscriptionGroup.NORMAL_CONSUMPTION,
  address: {
    city: props.subscription?.address?.city || '',
    district: props.subscription?.address?.district || '',
    neighborhood: props.subscription?.address?.neighborhood || '',
    street: props.subscription?.address?.street || '',
    buildingNo: props.subscription?.address?.buildingNo || '',
    floor: props.subscription?.address?.floor || '',
    doorNo: props.subscription?.address?.doorNo || '',
    postalCode: props.subscription?.address?.postalCode || '',
    addressCode: props.subscription?.address?.addressCode || '',
    extraDetails: props.subscription?.address?.extraDetails || '',
  },
  addressCode: props.subscription?.addressCode || '',
  latitude: props.subscription?.latitude || undefined,
  longitude: props.subscription?.longitude || undefined,
  isActive: props.subscription?.isActive ?? true,
})

const isSubmitting = ref(false)
const customers = ref<Customer[]>([])
const isLoadingCustomers = ref(false)

// Options for selects
const subscriptionTypeOptions = [
  { label: 'Individual', value: SubscriptionType.INDIVIDUAL },
  { label: 'Organizational', value: SubscriptionType.ORGANIZATIONAL },
]

const subscriptionGroupOptions = [
  { label: 'Normal Consumption', value: SubscriptionGroup.NORMAL_CONSUMPTION },
  { label: 'High Consumption', value: SubscriptionGroup.HIGH_CONSUMPTION },
]

// Tenant options - filter out root tenant (tenants with parentId are child tenants)
const tenantOptions = computed(() => 
  appStore.tenants
    .filter(t => t.parentId) // Only show non-root tenants for subscription creation
    .map(t => ({
      label: t.name,
      value: t.id,
    }))
)

// Customer options computed from fetched customers
const customerOptions = computed(() => 
  customers.value.map(c => ({
    label: `${c.customerNumber} - ${getCustomerName(c)} (${c.customerType})`,
    value: c.id,
  }))
)

// Fetch customers for the selected tenant
const fetchCustomers = async () => {
  if (!form.value.tenantId) return
  
  isLoadingCustomers.value = true
  try {
    const response = await api.getList<Customer>('/api/v1/customers', {
      tenantId: form.value.tenantId,
      limit: 100,
    })
    customers.value = response.data
  } catch (error) {
    console.error('Failed to fetch customers:', error)
  } finally {
    isLoadingCustomers.value = false
  }
}

// Watch for tenant changes
watch(() => form.value.tenantId, () => {
  form.value.customerId = ''
  fetchCustomers()
}, { immediate: true })

// Get customer display name
const getCustomerName = (customer: Customer): string => {
  if (customer.customerType === 'INDIVIDUAL') {
    return `${customer.details?.firstName || ''} ${customer.details?.lastName || ''}`.trim() || 'N/A'
  }
  return customer.details?.organizationName || 'N/A'
}

// Submit form
const handleSubmit = async () => {
  if (!form.value.tenantId) {
    toast.error('Please select a tenant')
    return
  }
  
  if (!form.value.subscriptionNumber) {
    toast.error('Please enter a subscription number')
    return
  }
  
  if (!form.value.customerId) {
    toast.error('Please select a customer')
    return
  }
  
  if (!form.value.address.city) {
    toast.error('City is required')
    return
  }

  isSubmitting.value = true
  try {
    if (isEditing.value) {
      await api.patch(`/api/v1/subscriptions/${props.subscription!.id}`, {
        subscriptionNumber: form.value.subscriptionNumber,
        subscriptionType: form.value.subscriptionType,
        subscriptionGroup: form.value.subscriptionGroup,
        address: form.value.address,
        addressCode: form.value.addressCode,
        latitude: form.value.latitude,
        longitude: form.value.longitude,
        isActive: form.value.isActive,
      })
      toast.success('Subscription updated successfully')
    } else {
      await api.post('/api/v1/subscriptions', form.value)
      toast.success('Subscription created successfully')
    }
    emit('success')
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.error(err.message || 'Failed to save subscription')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Tenant Selection (only for new subscriptions) -->
    <div v-if="!isEditing && tenantOptions.length > 1" class="space-y-4">
      <h3 class="text-lg font-medium">Tenant</h3>
      
      <div class="space-y-2">
        <UiLabel>Select Tenant *</UiLabel>
        <UiSelect 
          v-model="form.tenantId" 
          :options="tenantOptions"
          placeholder="Select a tenant..."
        />
      </div>
    </div>
    
    <!-- Subscription Number -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium">Subscription Number</h3>
      
      <div class="space-y-2">
        <UiLabel>Subscription Number *</UiLabel>
        <UiInput 
          v-model="form.subscriptionNumber" 
          placeholder="Enter subscription number"
        />
        <p class="text-xs text-muted-foreground">
          User-defined unique identifier for this subscription
        </p>
      </div>
    </div>
    
    <!-- Customer Selection -->
    <div v-if="!isEditing" class="space-y-4">
      <h3 class="text-lg font-medium">Customer</h3>
      
      <div class="space-y-2">
        <UiLabel>Select Customer *</UiLabel>
        <UiSelect 
          v-model="form.customerId" 
          :options="customerOptions"
          :disabled="isLoadingCustomers || !form.tenantId"
          :placeholder="!form.tenantId ? 'Select a tenant first...' : (isLoadingCustomers ? 'Loading customers...' : 'Select a customer...')"
        />
        <p v-if="form.tenantId && !isLoadingCustomers && customerOptions.length === 0" class="text-sm text-muted-foreground">
          No customers found for this tenant. Create a customer first.
        </p>
      </div>
    </div>
    
    <!-- Subscription Type -->
    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <UiLabel>Subscription Type *</UiLabel>
        <UiSelect 
          v-model="form.subscriptionType"
          :options="subscriptionTypeOptions"
          placeholder="Select type"
        />
      </div>
      
      <div class="space-y-2">
        <UiLabel>Consumption Group</UiLabel>
        <UiSelect 
          v-model="form.subscriptionGroup"
          :options="subscriptionGroupOptions"
          placeholder="Select group"
        />
      </div>
    </div>
    
    <!-- Address -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium">Service Address</h3>
      
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <UiLabel>City *</UiLabel>
          <UiInput v-model="form.address.city" placeholder="City" />
        </div>
        
        <div class="space-y-2">
          <UiLabel>District</UiLabel>
          <UiInput v-model="form.address.district" placeholder="District" />
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <UiLabel>Neighborhood</UiLabel>
          <UiInput v-model="form.address.neighborhood" placeholder="Neighborhood" />
        </div>
        
        <div class="space-y-2">
          <UiLabel>Street</UiLabel>
          <UiInput v-model="form.address.street" placeholder="Street" />
        </div>
      </div>
      
      <div class="grid grid-cols-4 gap-4">
        <div class="space-y-2">
          <UiLabel>Building No</UiLabel>
          <UiInput v-model="form.address.buildingNo" placeholder="No" />
        </div>
        
        <div class="space-y-2">
          <UiLabel>Floor</UiLabel>
          <UiInput v-model="form.address.floor" placeholder="Floor" />
        </div>
        
        <div class="space-y-2">
          <UiLabel>Door No</UiLabel>
          <UiInput v-model="form.address.doorNo" placeholder="Door" />
        </div>
        
        <div class="space-y-2">
          <UiLabel>Postal Code</UiLabel>
          <UiInput v-model="form.address.postalCode" placeholder="Code" />
        </div>
      </div>
      
      <div class="space-y-2">
        <UiLabel>UAVT Address Code</UiLabel>
        <UiInput v-model="form.addressCode" placeholder="Address code (UAVT)" />
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-2">
          <UiLabel>Latitude</UiLabel>
          <UiInput 
            v-model.number="form.latitude" 
            type="number" 
            step="0.000001"
            placeholder="e.g., 39.9334" 
          />
        </div>
        
        <div class="space-y-2">
          <UiLabel>Longitude</UiLabel>
          <UiInput 
            v-model.number="form.longitude" 
            type="number" 
            step="0.000001"
            placeholder="e.g., 32.8597" 
          />
        </div>
      </div>
      
      <div class="space-y-2">
        <UiLabel>Extra Details</UiLabel>
        <UiInput v-model="form.address.extraDetails" placeholder="Additional address details" />
      </div>
    </div>
    
    <!-- Status -->
    <div v-if="isEditing" class="flex items-center gap-2">
      <input 
        type="checkbox" 
        id="isActive" 
        v-model="form.isActive"
        class="rounded border-input"
      />
      <label for="isActive" class="text-sm">Subscription is active</label>
    </div>
    
    <!-- Actions -->
    <div class="flex justify-end gap-3 pt-4 border-t">
      <UiButton type="button" variant="outline" @click="emit('cancel')">
        Cancel
      </UiButton>
      <UiButton type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Create') }}
      </UiButton>
    </div>
  </form>
</template>
