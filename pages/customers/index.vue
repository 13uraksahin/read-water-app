<script setup lang="ts">
import { Users, Plus, Search, Building2, User } from 'lucide-vue-next'
import type { Customer, PaginatedResponse, CustomerType } from '~/types'

definePageMeta({
  middleware: ['auth'],
})

const api = useApi()
const toast = useToast()
const appStore = useAppStore()

// State
const customers = ref<Customer[]>([])
const isLoading = ref(true)
const showCreateDialog = ref(false)
const searchQuery = ref('')

// Pagination
const pagination = ref({
  page: 1,
  limit: 30,
  total: 0,
  totalPages: 0,
})

// Fetch customers
const fetchCustomers = async () => {
  isLoading.value = true
  try {
    const response = await api.getList<Customer>('/api/v1/customers', {
      page: pagination.value.page,
      limit: pagination.value.limit,
      search: searchQuery.value || undefined,
    })
    
    customers.value = response.data
    pagination.value = {
      ...pagination.value,
      total: response.meta.total,
      totalPages: response.meta.totalPages,
    }
  } catch (error) {
    toast.error('Failed to fetch customers')
  } finally {
    isLoading.value = false
  }
}

// Initial fetch
onMounted(() => {
  fetchCustomers()
})

// Watch for filter changes
watch(searchQuery, () => {
  pagination.value.page = 1
  fetchCustomers()
})

// Watch for tenant changes and refetch
watch(() => appStore.activeTenantId, () => {
  pagination.value.page = 1
  fetchCustomers()
})

// Get customer display name
const getCustomerName = (customer: Customer): string => {
  if (customer.customerType === 'INDIVIDUAL') {
    return `${customer.details?.firstName || ''} ${customer.details?.lastName || ''}`.trim() || 'N/A'
  }
  return customer.details?.organizationName || 'N/A'
}

// Get customer ID (TC or Tax ID)
const getCustomerId = (customer: Customer): string => {
  if (customer.customerType === 'INDIVIDUAL') {
    return customer.details?.tcIdNo || 'N/A'
  }
  return customer.details?.taxId || 'N/A'
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <Users class="h-6 w-6 text-primary" />
          Customers
        </h1>
        <p class="text-muted-foreground">Manage customer accounts and subscriptions</p>
      </div>
      
      <UiButton @click="showCreateDialog = true">
        <Plus class="h-4 w-4" />
        Add Customer
      </UiButton>
    </div>
    
    <!-- Search -->
    <UiCard class="p-4">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <UiInput
          v-model="searchQuery"
          placeholder="Search by name, TC ID, Tax ID..."
          class="pl-10"
        />
      </div>
    </UiCard>
    
    <!-- Customers table -->
    <UiCard>
      <UiTable>
        <UiTableHeader>
          <UiTableRow>
            <UiTableHead>Type</UiTableHead>
            <UiTableHead>Name</UiTableHead>
            <UiTableHead>TC/Tax ID</UiTableHead>
            <UiTableHead>Contact</UiTableHead>
            <UiTableHead>Consumption</UiTableHead>
            <UiTableHead>Address</UiTableHead>
            <UiTableHead>Meters</UiTableHead>
          </UiTableRow>
        </UiTableHeader>
        <UiTableBody>
          <template v-if="isLoading">
            <UiTableRow v-for="i in 10" :key="i">
              <UiTableCell v-for="j in 7" :key="j">
                <UiSkeleton class="h-4 w-full" />
              </UiTableCell>
            </UiTableRow>
          </template>
          
          <template v-else-if="customers.length === 0">
            <UiTableRow>
              <UiTableCell :colspan="7" class="text-center py-12 text-muted-foreground">
                <Users class="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p class="font-medium">No customers found</p>
                <p class="text-sm">Add a new customer to get started</p>
              </UiTableCell>
            </UiTableRow>
          </template>
          
          <template v-else>
            <UiTableRow
              v-for="customer in customers"
              :key="customer.id"
              clickable
              @click="navigateTo(`/customers/${customer.id}`)"
            >
              <UiTableCell>
                <div class="flex items-center gap-2">
                  <User v-if="customer.customerType === 'INDIVIDUAL'" class="h-4 w-4 text-muted-foreground" />
                  <Building2 v-else class="h-4 w-4 text-muted-foreground" />
                  <span class="text-xs">{{ customer.customerType }}</span>
                </div>
              </UiTableCell>
              <UiTableCell class="font-medium">
                {{ getCustomerName(customer) }}
              </UiTableCell>
              <UiTableCell class="font-mono text-sm">
                {{ getCustomerId(customer) }}
              </UiTableCell>
              <UiTableCell>
                <div class="text-sm">
                  <p>{{ customer.details?.phone || customer.details?.contactPhone || '-' }}</p>
                  <p class="text-muted-foreground text-xs">{{ customer.details?.email || customer.details?.contactEmail || '-' }}</p>
                </div>
              </UiTableCell>
              <UiTableCell>
                <UiBadge :variant="customer.consumptionType === 'HIGH' ? 'warning' : 'secondary'">
                  {{ customer.consumptionType }}
                </UiBadge>
              </UiTableCell>
              <UiTableCell>
                <span v-if="customer.address?.city" class="text-sm">
                  {{ customer.address.city }}, {{ customer.address.district }}
                </span>
                <span v-else class="text-muted-foreground">-</span>
              </UiTableCell>
              <UiTableCell>
                <UiBadge variant="outline">
                  {{ customer.meters?.length || 0 }}
                </UiBadge>
              </UiTableCell>
            </UiTableRow>
          </template>
        </UiTableBody>
      </UiTable>
      
      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-border">
        <p class="text-sm text-muted-foreground">
          Showing {{ customers.length }} of {{ pagination.total }} customers
        </p>
        <div class="flex items-center gap-2">
          <UiButton
            variant="outline"
            size="sm"
            :disabled="pagination.page <= 1"
            @click="pagination.page--; fetchCustomers()"
          >
            Previous
          </UiButton>
          <UiButton
            variant="outline"
            size="sm"
            :disabled="pagination.page >= pagination.totalPages"
            @click="pagination.page++; fetchCustomers()"
          >
            Next
          </UiButton>
        </div>
      </div>
    </UiCard>
    
    <!-- Create Dialog -->
    <UiDialog v-model:open="showCreateDialog">
      <UiDialogContent class="max-w-2xl">
        <UiDialogHeader>
          <UiDialogTitle>Add New Customer</UiDialogTitle>
        </UiDialogHeader>
        <div class="overflow-y-auto flex-1 -mx-6 px-6">
          <CustomersCreateForm @success="showCreateDialog = false; fetchCustomers()" @cancel="showCreateDialog = false" />
        </div>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>

