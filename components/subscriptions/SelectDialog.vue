<script setup lang="ts">
import { Search, MapPin, FileText, Check, X } from 'lucide-vue-next'
import type { Subscription } from '~/types'

interface Props {
  modelValue?: string
  tenantId?: string
  disabled?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [subscription: Subscription | null]
}>()

const api = useApi()

// Dialog state
const open = ref(false)
const searchQuery = ref('')
const isLoading = ref(false)
const subscriptions = ref<Subscription[]>([])
const selectedSubscription = ref<Subscription | null>(null)

// Pagination
const pagination = ref({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
})

// Fetch selected subscription on mount if modelValue is set
watch(() => props.modelValue, async (id) => {
  if (id && !selectedSubscription.value) {
    try {
      const sub = await api.get<Subscription>(`/api/v1/subscriptions/${id}`)
      selectedSubscription.value = sub
    } catch {
      // Ignore if not found
    }
  } else if (!id) {
    selectedSubscription.value = null
  }
}, { immediate: true })

// Fetch subscriptions
const fetchSubscriptions = async () => {
  if (!props.tenantId) {
    subscriptions.value = []
    return
  }
  
  isLoading.value = true
  try {
    const response = await api.getList<Subscription>('/api/v1/subscriptions', {
      tenantId: props.tenantId,
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
    console.error('Failed to fetch subscriptions:', error)
    subscriptions.value = []
  } finally {
    isLoading.value = false
  }
}

// Watch dialog open state
watch(open, (isOpen) => {
  if (isOpen) {
    pagination.value.page = 1
    searchQuery.value = ''
    fetchSubscriptions()
  }
})

// Watch search query
watch(searchQuery, () => {
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

// Handle selection
const handleSelect = (subscription: Subscription) => {
  selectedSubscription.value = subscription
  emit('update:modelValue', subscription.id)
  emit('select', subscription)
  open.value = false
}

// Clear selection
const clearSelection = () => {
  selectedSubscription.value = null
  emit('update:modelValue', '')
  emit('select', null)
}

// Display label for trigger
const displayLabel = computed(() => {
  if (!selectedSubscription.value) return null
  return {
    number: selectedSubscription.value.subscriptionNumber,
    customer: getCustomerName(selectedSubscription.value),
    address: getAddressDisplay(selectedSubscription.value),
  }
})
</script>

<template>
  <div>
    <!-- Trigger Button -->
    <div
      class="flex items-center justify-between w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer hover:bg-accent/50 transition-colors"
      :class="{ 'opacity-50 cursor-not-allowed': disabled || !tenantId }"
      @click="!disabled && tenantId && (open = true)"
    >
      <div v-if="displayLabel" class="flex items-center gap-3 min-w-0 flex-1">
        <FileText class="h-4 w-4 text-muted-foreground shrink-0" />
        <div class="min-w-0 flex-1">
          <div class="font-mono text-xs font-medium">{{ displayLabel.number }}</div>
          <div class="text-xs text-muted-foreground truncate">
            {{ displayLabel.customer }} • {{ displayLabel.address }}
          </div>
        </div>
      </div>
      <span v-else class="text-muted-foreground">
        {{ !tenantId ? 'Select tenant first' : 'Select subscription...' }}
      </span>
      
      <div class="flex items-center gap-1 shrink-0 ml-2">
        <button
          v-if="selectedSubscription"
          type="button"
          class="p-1 hover:bg-muted rounded"
          @click.stop="clearSelection"
        >
          <X class="h-3 w-3 text-muted-foreground" />
        </button>
        <Search class="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
    
    <!-- Selection Dialog -->
    <UiDialog v-model:open="open">
      <UiDialogContent class="max-w-4xl max-h-[80vh] flex flex-col">
        <UiDialogHeader>
          <UiDialogTitle>Select Subscription</UiDialogTitle>
          <UiDialogDescription>
            Choose a subscription (service point) to link this meter to
          </UiDialogDescription>
        </UiDialogHeader>
        
        <!-- Search -->
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <UiInput
            v-model="searchQuery"
            placeholder="Search by address, city, customer name..."
            class="pl-10"
          />
        </div>
        
        <!-- Table -->
        <div class="flex-1 overflow-auto -mx-6 px-6">
          <UiTable>
            <UiTableHeader>
              <UiTableRow>
                <UiTableHead class="w-8"></UiTableHead>
                <UiTableHead>Subscription No</UiTableHead>
                <UiTableHead>Customer</UiTableHead>
                <UiTableHead>Address</UiTableHead>
                <UiTableHead>Group</UiTableHead>
              </UiTableRow>
            </UiTableHeader>
            <UiTableBody>
              <template v-if="isLoading">
                <UiTableRow v-for="i in 5" :key="i">
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
                    <p class="text-sm">Try adjusting your search or create a subscription first</p>
                  </UiTableCell>
                </UiTableRow>
              </template>
              
              <template v-else>
                <UiTableRow
                  v-for="subscription in subscriptions"
                  :key="subscription.id"
                  clickable
                  :class="modelValue === subscription.id && 'bg-primary/5'"
                  @click="handleSelect(subscription)"
                >
                  <UiTableCell>
                    <div
                      class="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                      :class="modelValue === subscription.id ? 'border-primary bg-primary' : 'border-muted-foreground'"
                    >
                      <Check v-if="modelValue === subscription.id" class="h-3 w-3 text-primary-foreground" />
                    </div>
                  </UiTableCell>
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
                </UiTableRow>
              </template>
            </UiTableBody>
          </UiTable>
        </div>
        
        <!-- Pagination -->
        <div v-if="pagination.totalPages > 1" class="flex items-center justify-between pt-4 border-t border-border">
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
            <span class="text-sm text-muted-foreground">
              Page {{ pagination.page }} of {{ pagination.totalPages }}
            </span>
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
        
        <!-- Footer -->
        <UiDialogFooter>
          <UiButton variant="outline" @click="open = false">
            Cancel
          </UiButton>
          <UiButton
            v-if="!modelValue"
            variant="secondary"
            @click="clearSelection(); open = false"
          >
            Skip (Warehouse Stock)
          </UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>
