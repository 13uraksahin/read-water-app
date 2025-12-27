<script setup lang="ts">
import {
  Users,
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Building2,
  Gauge,
  Calendar,
  TrendingUp,
  User,
  Briefcase,
  FileText,
} from 'lucide-vue-next'
import { CustomerType, type Customer, type Subscription } from '~/types'

definePageMeta({
  middleware: ['auth'],
})

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()

const customerId = computed(() => route.params.id as string)

// State
const customer = ref<Customer | null>(null)
const subscriptions = ref<Subscription[]>([])
const isLoading = ref(true)
const isLoadingSubscriptions = ref(true)
const showEditDialog = ref(false)

// Computed: Is individual customer
const isIndividual = computed(() => customer.value?.customerType === CustomerType.INDIVIDUAL)

// Computed: Customer display name
const customerName = computed(() => {
  if (!customer.value) return ''
  const details = customer.value.details
  if (isIndividual.value) {
    return `${details?.firstName || ''} ${details?.lastName || ''}`.trim()
  }
  return details?.organizationName || 'Unknown'
})

// Fetch customer details
const fetchCustomer = async () => {
  isLoading.value = true
  try {
    const response = await api.get<Customer>(`/api/v1/customers/${customerId.value}`)
    customer.value = response
  } catch (error) {
    toast.error('Failed to load customer')
    router.push('/customers')
  } finally {
    isLoading.value = false
  }
}

// Fetch customer's subscriptions (which link to meters)
const fetchSubscriptions = async () => {
  isLoadingSubscriptions.value = true
  try {
    const response = await api.getList<Subscription>('/api/v1/subscriptions', {
      customerId: customerId.value,
      limit: 100,
    })
    subscriptions.value = response.data
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error)
  } finally {
    isLoadingSubscriptions.value = false
  }
}

// Format address from subscription
const formatAddress = (address?: Subscription['address']): string => {
  if (!address) return '-'
  const parts = [
    address.street,
    address.buildingNo,
    address.neighborhood,
    address.district,
    address.city,
  ].filter(Boolean)
  return parts.join(', ') || '-'
}

// Get status variant
const getStatusVariant = (status?: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' => {
  switch (status) {
    case 'ACTIVE':
      return 'success'
    case 'MAINTENANCE':
    case 'SUSPENDED':
      return 'destructive'
    case 'CANCELLED':
      return 'secondary'
    default:
      return 'secondary'
  }
}

// Calculate total meters count
const totalMeters = computed(() => {
  return subscriptions.value.reduce((sum, sub) => sum + (sub.meters?.length || 0), 0)
})

// Calculate total consumption
const totalConsumption = computed(() => {
  let total = 0
  for (const sub of subscriptions.value) {
    if (sub.meters) {
      for (const meter of sub.meters) {
        const currentValue = Number(meter.lastReadingValue ?? meter.initialIndex ?? 0)
        const initialValue = Number(meter.initialIndex ?? 0)
        total += (currentValue - initialValue)
      }
    }
  }
  return total
})

// Initial fetch
onMounted(() => {
  fetchCustomer()
  fetchSubscriptions()
})

// Handle edit success
const handleEditSuccess = () => {
  showEditDialog.value = false
  fetchCustomer()
  toast.success('Customer updated successfully')
}
</script>

<template>
  <div class="space-y-6">
    <!-- Back button & header -->
    <div class="flex items-center gap-4">
      <UiButton variant="ghost" size="icon" @click="router.push('/customers')">
        <ArrowLeft class="h-5 w-5" />
      </UiButton>
      
      <div class="flex-1">
        <div v-if="isLoading" class="space-y-2">
          <UiSkeleton class="h-8 w-64" />
          <UiSkeleton class="h-4 w-48" />
        </div>
        <template v-else-if="customer">
          <h1 class="text-2xl font-bold flex items-center gap-2">
            <User v-if="isIndividual" class="h-6 w-6 text-primary" />
            <Briefcase v-else class="h-6 w-6 text-primary" />
            {{ customerName }}
          </h1>
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <UiBadge variant="secondary" class="font-mono">
              #{{ customer.customerNumber }}
            </UiBadge>
            <span>•</span>
            <UiBadge variant="outline">
              {{ isIndividual ? 'Individual' : 'Organizational' }}
            </UiBadge>
            <span>•</span>
            <UiBadge :variant="customer.consumptionType === 'HIGH' ? 'destructive' : 'secondary'">
              {{ customer.consumptionType }} Consumption
            </UiBadge>
          </div>
        </template>
      </div>
      
      <UiBadge v-if="customer" :variant="customer.isActive !== false ? 'success' : 'secondary'" class="mr-2">
        {{ customer.isActive !== false ? 'Active' : 'Inactive' }}
      </UiBadge>
      
      <UiButton v-if="customer" @click="showEditDialog = true">
        <Edit class="h-4 w-4" />
        Edit
      </UiButton>
    </div>
    
    <!-- Loading state -->
    <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <UiCard class="lg:col-span-2 p-6">
        <UiSkeleton class="h-6 w-48 mb-4" />
        <div class="grid grid-cols-2 gap-4">
          <UiSkeleton v-for="i in 6" :key="i" class="h-12" />
        </div>
      </UiCard>
      <UiCard class="p-6">
        <UiSkeleton class="h-6 w-32 mb-4" />
        <div class="space-y-3">
          <UiSkeleton v-for="i in 3" :key="i" class="h-16" />
        </div>
      </UiCard>
    </div>
    
    <!-- Content -->
    <template v-else-if="customer">
      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UiCard class="p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-primary/10">
              <FileText class="h-5 w-5 text-primary" />
            </div>
            <div>
              <p class="text-2xl font-bold">{{ subscriptions.length }}</p>
              <p class="text-sm text-muted-foreground">Subscriptions</p>
            </div>
          </div>
        </UiCard>
        
        <UiCard class="p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-blue-500/10">
              <Gauge class="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p class="text-2xl font-bold">{{ totalMeters }}</p>
              <p class="text-sm text-muted-foreground">Total Meters</p>
            </div>
          </div>
        </UiCard>
        
        <UiCard class="p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-green-500/10">
              <TrendingUp class="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p class="text-2xl font-bold">{{ totalConsumption.toFixed(2) }} m³</p>
              <p class="text-sm text-muted-foreground">Total Consumption</p>
            </div>
          </div>
        </UiCard>
      </div>
      
      <!-- Main content grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Customer Info -->
        <UiCard class="lg:col-span-2">
          <UiCardHeader>
            <UiCardTitle>Customer Information</UiCardTitle>
            <UiCardDescription>
              {{ isIndividual ? 'Personal details and contact' : 'Organization details and contact' }}
            </UiCardDescription>
          </UiCardHeader>
          <UiCardContent>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Individual Fields -->
              <template v-if="isIndividual">
                <div class="space-y-4">
                  <div>
                    <p class="text-sm text-muted-foreground">Customer Number</p>
                    <p class="font-medium font-mono">{{ customer.customerNumber }}</p>
                  </div>
                  
                  <div>
                    <p class="text-sm text-muted-foreground">Full Name</p>
                    <p class="font-medium text-lg">
                      {{ customer.details?.firstName }} {{ customer.details?.lastName }}
                    </p>
                  </div>
                  
                  <div>
                    <p class="text-sm text-muted-foreground">TC ID Number</p>
                    <p class="font-medium">{{ customer.details?.tcIdNo || '-' }}</p>
                  </div>
                  
                  <div class="flex items-center gap-3">
                    <Phone class="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p class="text-sm text-muted-foreground">Phone</p>
                      <p class="font-medium">{{ customer.details?.phone || '-' }}</p>
                    </div>
                  </div>
                  
                  <div class="flex items-center gap-3">
                    <Mail class="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p class="text-sm text-muted-foreground">Email</p>
                      <p class="font-medium">{{ customer.details?.email || '-' }}</p>
                    </div>
                  </div>
                </div>
                
                <div class="space-y-4">
                  <div>
                    <p class="text-sm text-muted-foreground">Customer Since</p>
                    <p class="font-medium">{{ new Date(customer.createdAt).toLocaleDateString() }}</p>
                  </div>
                  
                  <div>
                    <p class="text-sm text-muted-foreground">Last Updated</p>
                    <p class="font-medium">{{ new Date(customer.updatedAt).toLocaleDateString() }}</p>
                  </div>
                </div>
              </template>
              
              <!-- Organizational Fields -->
              <template v-else>
                <div class="space-y-4">
                  <div>
                    <p class="text-sm text-muted-foreground">Customer Number</p>
                    <p class="font-medium font-mono">{{ customer.customerNumber }}</p>
                  </div>
                  
                  <div>
                    <p class="text-sm text-muted-foreground">Organization Name</p>
                    <p class="font-medium text-lg">{{ customer.details?.organizationName }}</p>
                  </div>
                  
                  <div>
                    <p class="text-sm text-muted-foreground">Tax ID</p>
                    <p class="font-medium">{{ customer.details?.taxId || '-' }}</p>
                  </div>
                  
                  <div>
                    <p class="text-sm text-muted-foreground">Tax Office</p>
                    <p class="font-medium">{{ customer.details?.taxOffice || '-' }}</p>
                  </div>
                </div>
                
                <div class="space-y-4">
                  <h4 class="font-medium text-sm text-muted-foreground uppercase tracking-wide">Contact Person</h4>
                  
                  <div>
                    <p class="text-sm text-muted-foreground">Name</p>
                    <p class="font-medium">
                      {{ customer.details?.contactFirstName }} {{ customer.details?.contactLastName }}
                    </p>
                  </div>
                  
                  <div class="flex items-center gap-3">
                    <Phone class="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p class="text-sm text-muted-foreground">Phone</p>
                      <p class="font-medium">{{ customer.details?.contactPhone || '-' }}</p>
                    </div>
                  </div>
                  
                  <div class="flex items-center gap-3">
                    <Mail class="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p class="text-sm text-muted-foreground">Email</p>
                      <p class="font-medium">{{ customer.details?.contactEmail || '-' }}</p>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </UiCardContent>
        </UiCard>
        
        <!-- Tenant Info -->
        <UiCard>
          <UiCardHeader>
            <UiCardTitle class="flex items-center gap-2">
              <Building2 class="h-4 w-4" />
              Tenant
            </UiCardTitle>
          </UiCardHeader>
          <UiCardContent class="space-y-4">
            <div>
              <p class="text-sm text-muted-foreground">Tenant ID</p>
              <p class="font-mono text-sm">{{ customer.tenantId }}</p>
            </div>
            
            <UiButton
              variant="outline"
              class="w-full"
              @click="navigateTo(`/iam/tenants/${customer.tenantId}`)"
            >
              View Tenant
            </UiButton>
          </UiCardContent>
        </UiCard>
      </div>
      
      <!-- Subscriptions -->
      <UiCard>
        <UiCardHeader>
          <div class="flex items-center justify-between">
            <div>
              <UiCardTitle>Subscriptions</UiCardTitle>
              <UiCardDescription>Service subscriptions and associated meters</UiCardDescription>
            </div>
            <UiButton variant="outline" size="sm" @click="navigateTo('/subscriptions')">
              View All Subscriptions
            </UiButton>
          </div>
        </UiCardHeader>
        <UiTable>
          <UiTableHeader>
            <UiTableRow>
              <UiTableHead>Subscription No</UiTableHead>
              <UiTableHead>Address</UiTableHead>
              <UiTableHead>Type</UiTableHead>
              <UiTableHead>Group</UiTableHead>
              <UiTableHead>Status</UiTableHead>
              <UiTableHead>Meters</UiTableHead>
              <UiTableHead>Start Date</UiTableHead>
            </UiTableRow>
          </UiTableHeader>
          <UiTableBody>
            <template v-if="isLoadingSubscriptions">
              <UiTableRow v-for="i in 3" :key="i">
                <UiTableCell v-for="j in 7" :key="j">
                  <UiSkeleton class="h-4 w-full" />
                </UiTableCell>
              </UiTableRow>
            </template>
            
            <template v-else-if="subscriptions.length === 0">
              <UiTableRow>
                <UiTableCell :colspan="7" class="text-center py-8 text-muted-foreground">
                  <FileText class="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No subscriptions for this customer</p>
                  <p class="text-sm">Create a subscription to link meters</p>
                </UiTableCell>
              </UiTableRow>
            </template>
            
            <template v-else>
              <UiTableRow
                v-for="subscription in subscriptions"
                :key="subscription.id"
                clickable
                @click="navigateTo(`/subscriptions/${subscription.id}`)"
              >
                <UiTableCell class="font-mono text-sm font-medium">
                  {{ subscription.subscriptionNumber }}
                </UiTableCell>
                <UiTableCell>
                  <div class="flex items-center gap-2">
                    <MapPin class="h-4 w-4 text-muted-foreground" />
                    <span class="font-medium">{{ formatAddress(subscription.address) }}</span>
                  </div>
                </UiTableCell>
                <UiTableCell>
                  <UiBadge variant="outline">
                    {{ subscription.subscriptionType }}
                  </UiBadge>
                </UiTableCell>
                <UiTableCell>
                  <UiBadge :variant="subscription.subscriptionGroup === 'HIGH_CONSUMPTION' ? 'destructive' : 'secondary'">
                    {{ subscription.subscriptionGroup?.replace(/_/g, ' ') }}
                  </UiBadge>
                </UiTableCell>
                <UiTableCell>
                  <UiBadge :variant="getStatusVariant(subscription.isActive ? 'ACTIVE' : 'CANCELLED')">
                    {{ subscription.isActive ? 'Active' : 'Inactive' }}
                  </UiBadge>
                </UiTableCell>
                <UiTableCell>
                  <span class="font-medium">{{ subscription.meters?.length || 0 }}</span>
                </UiTableCell>
                <UiTableCell>
                  {{ new Date(subscription.startDate).toLocaleDateString() }}
                </UiTableCell>
              </UiTableRow>
            </template>
          </UiTableBody>
        </UiTable>
      </UiCard>
      
      <!-- Consumption History Chart Placeholder -->
      <UiCard>
        <UiCardHeader>
          <UiCardTitle>Consumption History</UiCardTitle>
          <UiCardDescription>Water usage over time across all subscriptions</UiCardDescription>
        </UiCardHeader>
        <UiCardContent>
          <div class="h-64 flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg">
            <div class="text-center">
              <TrendingUp class="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Consumption chart will be displayed here</p>
              <p class="text-sm">Using ApexCharts</p>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </template>
    
    <!-- Edit Dialog -->
    <UiDialog v-model:open="showEditDialog">
      <UiDialogContent class="max-w-2xl">
        <UiDialogHeader>
          <UiDialogTitle>Edit Customer</UiDialogTitle>
        </UiDialogHeader>
        <div class="overflow-y-auto flex-1 -mx-6 px-6">
          <CustomersCreateForm
            v-if="customer"
            :customer="customer"
            mode="edit"
            @success="handleEditSuccess"
            @cancel="showEditDialog = false"
          />
        </div>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>
