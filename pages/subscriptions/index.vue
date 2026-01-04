<script setup lang="ts">
import { FileText, Plus, Search, MapPin, Download, Upload } from 'lucide-vue-next'
import type { Subscription, PaginatedResponse } from '~/types'
import type { ExportScope } from '~/composables/useBulkOperations'

definePageMeta({
  middleware: ['auth'],
})

const api = useApi()
const toast = useToast()
const appStore = useAppStore()
const { exportSubscriptions, subscriptionsColumns } = useBulkOperations()

// State
const subscriptions = ref<Subscription[]>([])
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

// Fetch subscriptions
const fetchSubscriptions = async () => {
  isLoading.value = true
  try {
    const response = await api.getList<Subscription>('/api/v1/subscriptions', {
      page: pagination.value.page,
      limit: pagination.value.limit,
      search: searchQuery.value || undefined,
    })
    
    subscriptions.value = response.data
    pagination.value = {
      ...pagination.value,
      total: response.meta.total,
      totalPages: response.meta.totalPages,
    }
  } catch (error) {
    toast.error('Failed to fetch subscriptions')
  } finally {
    isLoading.value = false
  }
}

// Fetch on mount (NuxtPage key ensures re-mount on navigation)
onMounted(() => {
  fetchSubscriptions()
})

// Watch for filter changes
watch(searchQuery, () => {
  pagination.value.page = 1
  fetchSubscriptions()
})

// Watch for tenant changes
watch(() => appStore.activeTenantId, () => {
  pagination.value.page = 1
  fetchSubscriptions()
})

// Get customer display name from subscription
const getCustomerName = (subscription: Subscription): string => {
  if (!subscription.customer) return 'N/A'
  const customer = subscription.customer
  if (customer.customerType === 'INDIVIDUAL') {
    return `${customer.details?.firstName || ''} ${customer.details?.lastName || ''}`.trim() || 'N/A'
  }
  return customer.details?.organizationName || 'N/A'
}

// Get address display
const getAddressDisplay = (subscription: Subscription): string => {
  if (!subscription.address) return '-'
  const addr = subscription.address
  const parts = [addr.city, addr.district, addr.neighborhood].filter(Boolean)
  return parts.join(', ') || '-'
}

// Get customer ID (TC or Tax ID)
const getCustomerId = (subscription: Subscription): string => {
  if (!subscription.customer) return 'N/A'
  const customer = subscription.customer
  if (customer.customerType === 'INDIVIDUAL') {
    return customer.details?.tcIdNo || 'N/A'
  }
  return customer.details?.taxId || 'N/A'
}

// Handle export
const handleExport = async (scope: ExportScope, selectedColumns: string[]) => {
  isExporting.value = true
  try {
    await exportSubscriptions({
      scope,
      filters: {
        search: searchQuery.value || undefined,
      },
      pageData: scope === 'page' ? subscriptions.value : undefined,
      selectedColumns,
    })
    showExportDialog.value = false
  } finally {
    isExporting.value = false
  }
}

// Handle import success
const handleImportSuccess = () => {
  fetchSubscriptions()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <FileText class="h-6 w-6 text-primary" />
          Subscriptions
        </h1>
        <p class="text-muted-foreground">Manage service subscriptions linking customers to meters</p>
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
          Add Subscription
        </UiButton>
      </div>
    </div>
    
    <!-- Search -->
    <UiCard class="p-4">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <UiInput
          v-model="searchQuery"
          placeholder="Search by address, city, district..."
          class="pl-10"
        />
      </div>
    </UiCard>
    
    <!-- Subscriptions table -->
    <UiCard>
      <UiTable>
        <UiTableHeader>
          <UiTableRow>
            <UiTableHead>Subscription No</UiTableHead>
            <UiTableHead>Customer</UiTableHead>
            <UiTableHead>Address</UiTableHead>
            <UiTableHead>Group</UiTableHead>
            <UiTableHead>Meters</UiTableHead>
            <UiTableHead>Status</UiTableHead>
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
          
          <template v-else-if="subscriptions.length === 0">
            <UiTableRow>
              <UiTableCell :colspan="6" class="text-center py-12 text-muted-foreground">
                <FileText class="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p class="font-medium">No subscriptions found</p>
                <p class="text-sm">Add a new subscription to get started</p>
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
              <UiTableCell class="font-medium">
                {{ getCustomerName(subscription) }}
              </UiTableCell>
              <UiTableCell>
                <div class="flex items-center gap-1 text-sm">
                  <MapPin class="h-3 w-3 text-muted-foreground" />
                  {{ getAddressDisplay(subscription) }}
                </div>
              </UiTableCell>
              <UiTableCell>
                <UiBadge :variant="subscription.subscriptionGroup === 'HIGH_CONSUMPTION' ? 'warning' : 'secondary'">
                  {{ subscription.subscriptionGroup === 'HIGH_CONSUMPTION' ? 'High' : 'Normal' }}
                </UiBadge>
              </UiTableCell>
              <UiTableCell>
                <UiBadge variant="outline">
                  {{ subscription.meters?.length || 0 }}
                </UiBadge>
              </UiTableCell>
              <UiTableCell>
                <UiBadge :variant="subscription.isActive ? 'success' : 'secondary'">
                  {{ subscription.isActive ? 'Active' : 'Inactive' }}
                </UiBadge>
              </UiTableCell>
            </UiTableRow>
          </template>
        </UiTableBody>
      </UiTable>
      
      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-border">
        <p class="text-sm text-muted-foreground">
          Showing {{ subscriptions.length }} of {{ pagination.total }} subscriptions
        </p>
        <div class="flex items-center gap-2">
          <UiButton
            variant="outline"
            size="sm"
            :disabled="pagination.page <= 1"
            @click="pagination.page--; fetchSubscriptions()"
          >
            Previous
          </UiButton>
          <UiButton
            variant="outline"
            size="sm"
            :disabled="pagination.page >= pagination.totalPages"
            @click="pagination.page++; fetchSubscriptions()"
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
          <UiDialogTitle>Add New Subscription</UiDialogTitle>
        </UiDialogHeader>
        <div class="overflow-y-auto flex-1 -mx-6 px-6">
          <SubscriptionsCreateForm @success="showCreateDialog = false; fetchSubscriptions()" @cancel="showCreateDialog = false" />
        </div>
      </UiDialogContent>
    </UiDialog>
    
    <!-- Export Dialog -->
    <BulkExportDialog
      v-model:open="showExportDialog"
      title="Export Subscriptions"
      description="Export subscription data to CSV file"
      :current-page-count="subscriptions.length"
      :total-count="pagination.total"
      :is-exporting="isExporting"
      :columns="subscriptionsColumns"
      @export="handleExport"
    />
    
    <!-- Import Dialog -->
    <BulkSubscriptionsImportDialog
      v-model:open="showImportDialog"
      @success="handleImportSuccess"
    />
  </div>
</template>

