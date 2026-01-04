<script setup lang="ts">
import { Users, Plus, Search, Building2, User, FileText, MapPin, Gauge, Calendar, Download, Upload } from 'lucide-vue-next'
import type { Customer, PaginatedResponse, CustomerType, Subscription } from '~/types'
import type { ExportScope } from '~/composables/useBulkOperations'

definePageMeta({
  middleware: ['auth'],
})

const api = useApi()
const toast = useToast()
const appStore = useAppStore()
const { exportCustomers, customersColumns } = useBulkOperations()

// State
const customers = ref<Customer[]>([])
const isLoading = ref(true)
const showCreateDialog = ref(false)
const showExportDialog = ref(false)
const showImportDialog = ref(false)
const isExporting = ref(false)
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

// Fetch on mount (NuxtPage key ensures re-mount on navigation)
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

// Format address from subscription
const formatAddress = (address?: Subscription['address']): string => {
  if (!address) return '-'
  const parts = [
    address.neighborhood,
    address.street,
    address.buildingNo && `No: ${address.buildingNo}`,
    address.district,
    address.city,
  ].filter(Boolean)
  return parts.join(', ') || '-'
}

// Get consumption group variant
const getConsumptionGroupVariant = (group?: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (group === 'HIGH_CONSUMPTION') return 'destructive'
  return 'secondary'
}

// Handle export
const handleExport = async (scope: ExportScope, selectedColumns: string[]) => {
  isExporting.value = true
  try {
    await exportCustomers({
      scope,
      filters: {
        search: searchQuery.value || undefined,
      },
      pageData: scope === 'page' ? customers.value : undefined,
      selectedColumns,
    })
    showExportDialog.value = false
  } finally {
    isExporting.value = false
  }
}

// Handle import success
const handleImportSuccess = () => {
  fetchCustomers()
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
        <p class="text-muted-foreground">Manage customer accounts</p>
      </div>
      
      <div class="flex items-center gap-2">
        <!-- Export Button -->
        <UiButton variant="outline" @click="showExportDialog = true">
          <Download class="h-4 w-4" />
          Export
        </UiButton>
        
        <!-- Bulk Import Button -->
        <UiButton variant="outline" @click="showImportDialog = true">
          <Upload class="h-4 w-4" />
          Bulk Import
        </UiButton>
        
        <UiButton @click="showCreateDialog = true">
          <Plus class="h-4 w-4" />
          Add Customer
        </UiButton>
      </div>
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
            <UiTableHead>Customer No</UiTableHead>
            <UiTableHead>Type</UiTableHead>
            <UiTableHead>Name</UiTableHead>
            <UiTableHead>TC/Tax ID</UiTableHead>
            <UiTableHead>Contact</UiTableHead>
            <UiTableHead>Subscriptions</UiTableHead>
          </UiTableRow>
        </UiTableHeader>
        <UiTableBody>
          <template v-if="isLoading">
            <UiTableRow v-for="i in 10" :key="i">
              <UiTableCell v-for="j in 6" :key="j">
                <UiSkeleton class="h-4 w-full" />
              </UiTableCell>
            </UiTableRow>
          </template>
          
          <template v-else-if="customers.length === 0">
            <UiTableRow>
              <UiTableCell :colspan="6" class="text-center py-12 text-muted-foreground">
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
              <UiTableCell class="font-mono text-sm font-medium">
                {{ customer.customerNumber }}
              </UiTableCell>
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
              <UiTableCell @click.stop>
                <!-- Hover Card for Subscriptions -->
                <UiHoverCard v-if="customer.subscriptions && customer.subscriptions.length > 0">
                  <UiHoverCardTrigger as-child>
                    <button class="flex items-center gap-2 hover:bg-muted/50 px-2 py-1 rounded-md transition-colors">
                      <FileText class="h-4 w-4 text-muted-foreground" />
                      <UiBadge variant="outline" class="cursor-pointer">
                        {{ customer._count?.subscriptions || customer.subscriptions?.length || 0 }}
                      </UiBadge>
                    </button>
                  </UiHoverCardTrigger>
                  <UiHoverCardContent class="w-80" side="left">
                    <div class="space-y-3">
                      <div class="flex items-center gap-2">
                        <FileText class="h-4 w-4 text-primary" />
                        <h4 class="font-semibold">Subscriptions</h4>
                      </div>
                      <div class="space-y-2 max-h-64 overflow-y-auto">
                        <div
                          v-for="subscription in customer.subscriptions.slice(0, 5)"
                          :key="subscription.id"
                          class="p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                          @click="navigateTo(`/subscriptions/${subscription.id}`)"
                        >
                          <div class="flex items-center justify-between mb-1">
                            <span class="font-mono text-xs font-medium">{{ subscription.subscriptionNumber }}</span>
                            <UiBadge 
                              :variant="getConsumptionGroupVariant(subscription.consumptionGroup)" 
                              class="text-xs"
                            >
                              {{ subscription.consumptionGroup?.replace(/_/g, ' ') || 'Normal' }}
                            </UiBadge>
                          </div>
                          <div v-if="subscription.address" class="flex items-start gap-1 text-xs text-muted-foreground">
                            <MapPin class="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span class="line-clamp-2">{{ formatAddress(subscription.address) }}</span>
                          </div>
                          <div class="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Gauge class="h-3 w-3" />
                            <span>{{ subscription.meters?.length || 0 }} meters</span>
                          </div>
                        </div>
                      </div>
                      <div v-if="customer.subscriptions.length > 5" class="text-xs text-muted-foreground text-center pt-1 border-t border-border">
                        +{{ customer.subscriptions.length - 5 }} more subscriptions
                      </div>
                      <UiButton 
                        variant="outline" 
                        size="sm" 
                        class="w-full"
                        @click.stop="navigateTo(`/customers/${customer.id}`)"
                      >
                        View All
                      </UiButton>
                    </div>
                  </UiHoverCardContent>
                </UiHoverCard>
                <!-- Simple badge when no subscriptions or not loaded -->
                <div v-else class="flex items-center gap-2">
                  <FileText class="h-4 w-4 text-muted-foreground" />
                  <UiBadge variant="outline">
                    {{ customer._count?.subscriptions || 0 }}
                  </UiBadge>
                </div>
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
    
    <!-- Export Dialog -->
    <BulkExportDialog
      v-model:open="showExportDialog"
      title="Export Customers"
      description="Export customer data to CSV file"
      :current-page-count="customers.length"
      :total-count="pagination.total"
      :is-exporting="isExporting"
      :columns="customersColumns"
      @export="handleExport"
    />
    
    <!-- Import Dialog -->
    <BulkCustomersImportDialog
      v-model:open="showImportDialog"
      @success="handleImportSuccess"
    />
  </div>
</template>
