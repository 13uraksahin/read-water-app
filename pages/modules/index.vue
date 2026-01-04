<script setup lang="ts">
import { Radio, Plus, Search, Edit, Trash2, Link2, Link2Off, Warehouse, Activity, Download, Upload } from 'lucide-vue-next'
import type { Module, ModuleStatus, ModuleProfile, PaginatedResponse } from '~/types'
import type { ExportScope } from '~/composables/useBulkOperations'
import { formatDate, formatDateTime } from '~/lib/utils'

definePageMeta({
  middleware: ['auth'],
})

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const moduleStore = useModuleStore()
const appStore = useAppStore()
const { exportModules, modulesColumns } = useBulkOperations()

// State
const modules = ref<Module[]>([])
const moduleProfiles = ref<ModuleProfile[]>([])
const isLoading = ref(true)
const showCreateDialog = ref(false)
const showExportDialog = ref(false)
const showImportDialog = ref(false)
const isExporting = ref(false)
const showDeleteConfirm = ref(false)
const moduleToDelete = ref<Module | null>(null)
const searchQuery = ref('')
const statusFilter = ref<ModuleStatus | ''>('')
const brandFilter = ref('')
const techFilter = ref('')

// Pagination
const pagination = ref({
  page: 1,
  limit: 30,
  total: 0,
  totalPages: 0,
})

// Status options
const statusOptions = [
  { label: 'All Statuses', value: '' },
  { label: 'Warehouse', value: 'WAREHOUSE' },
  { label: 'Deployed', value: 'DEPLOYED' },
  { label: 'Maintenance', value: 'MAINTENANCE' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Passive', value: 'PASSIVE' },
]

// Brand options
const brandOptions = [
  { label: 'All Brands', value: '' },
  { label: 'Una', value: 'UNA' },
  { label: 'Ima', value: 'IMA' },
  { label: 'Itron', value: 'ITRON' },
  { label: 'Zenner', value: 'ZENNER' },
]

// Technology options
const techOptions = [
  { label: 'All Technologies', value: '' },
  { label: 'LoRaWAN', value: 'LORAWAN' },
  { label: 'Sigfox', value: 'SIGFOX' },
  { label: 'NB-IoT', value: 'NB_IOT' },
  { label: 'wM-Bus', value: 'WM_BUS' },
]

// Fetch modules
const fetchModules = async () => {
  isLoading.value = true
  try {
    const response = await api.getList<Module>('/api/v1/modules', {
      page: pagination.value.page,
      limit: pagination.value.limit,
      search: searchQuery.value || undefined,
      status: statusFilter.value || undefined,
      brand: brandFilter.value || undefined,
      technology: techFilter.value || undefined,
    })
    
    modules.value = response.data
    pagination.value = {
      ...pagination.value,
      total: response.meta.total,
      totalPages: response.meta.totalPages,
    }
  } catch (error) {
    toast.error('Failed to fetch modules')
  } finally {
    isLoading.value = false
  }
}

// Fetch module profiles
const fetchProfiles = async () => {
  try {
    const response = await api.getList<ModuleProfile>('/api/v1/module-profiles', { limit: 100 })
    moduleProfiles.value = response.data
  } catch (error) {
    console.error('Failed to fetch module profiles:', error)
  }
}

// Fetch on mount (NuxtPage key ensures re-mount on navigation)
onMounted(async () => {
  await Promise.all([fetchModules(), fetchProfiles()])
})

// Watch for filter changes
watch([searchQuery, statusFilter, brandFilter, techFilter], () => {
  pagination.value.page = 1
  fetchModules()
})

// Watch for tenant changes and refetch
watch(() => appStore.activeTenantId, () => {
  pagination.value.page = 1
  fetchModules()
})

// Get status variant
const getStatusVariant = (status: ModuleStatus): 'success' | 'warning' | 'error' | 'info' | 'secondary' => {
  const variants: Record<ModuleStatus, 'success' | 'warning' | 'error' | 'info' | 'secondary'> = {
    WAREHOUSE: 'info',
    DEPLOYED: 'success',
    MAINTENANCE: 'warning',
    ACTIVE: 'success',
    PASSIVE: 'secondary',
    PLANNED: 'secondary',
    USED: 'secondary',
  }
  return variants[status] || 'secondary'
}

// Get module identifier (DevEUI, ID, IMEI, etc)
const getModuleIdentifier = (module: Module): string => {
  if (!module.dynamicFields) return module.serialNumber
  
  // Try common identifier fields
  const identifiers = ['DevEUI', 'ID', 'IMEI', 'MacAddress', 'EUI64']
  for (const key of identifiers) {
    if (module.dynamicFields[key]) {
      return module.dynamicFields[key]
    }
  }
  return module.serialNumber
}

// Navigate to module detail
const goToModule = (id: string) => {
  navigateTo(`/modules/${id}`)
}

// Handle delete
const handleDeleteClick = (module: Module) => {
  if (module.status === 'DEPLOYED' && module.meter) {
    toast.error('Cannot delete deployed module. Unlink from meter first.')
    return
  }
  moduleToDelete.value = module
  showDeleteConfirm.value = true
}

const confirmDelete = async () => {
  if (!moduleToDelete.value) return
  
  try {
    await api.del(`/api/v1/modules/${moduleToDelete.value.id}`)
    toast.success('Module deleted successfully')
    await fetchModules()
  } catch (error) {
    toast.error('Failed to delete module')
  } finally {
    showDeleteConfirm.value = false
    moduleToDelete.value = null
  }
}

// Handle create success
const handleCreateSuccess = () => {
  showCreateDialog.value = false
  fetchModules()
  toast.success('Module created successfully')
}

// Handle export
const handleExport = async (scope: ExportScope, selectedColumns: string[]) => {
  isExporting.value = true
  try {
    await exportModules({
      scope,
      filters: {
        search: searchQuery.value || undefined,
        status: statusFilter.value || undefined,
        brand: brandFilter.value || undefined,
        technology: techFilter.value || undefined,
      },
      pageData: scope === 'page' ? modules.value : undefined,
      selectedColumns,
    })
    showExportDialog.value = false
  } finally {
    isExporting.value = false
  }
}

// Handle import success
const handleImportSuccess = () => {
  fetchModules()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <Radio class="h-6 w-6 text-primary" />
          {{ t('modules.title', 'Modules') }}
        </h1>
        <p class="text-muted-foreground">{{ t('modules.description', 'Manage communication modules') }}</p>
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
          {{ t('modules.addModule', 'Add Module') }}
        </UiButton>
      </div>
    </div>
    
    <!-- Stats Overview -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <UiCard class="p-4">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-primary/10">
            <Radio class="h-5 w-5 text-primary" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ pagination.total }}</p>
            <p class="text-sm text-muted-foreground">Total Modules</p>
          </div>
        </div>
      </UiCard>
      
      <UiCard class="p-4">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-blue-500/10">
            <Warehouse class="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ modules.filter(d => d.status === 'WAREHOUSE').length }}</p>
            <p class="text-sm text-muted-foreground">In Warehouse</p>
          </div>
        </div>
      </UiCard>
      
      <UiCard class="p-4">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-green-500/10">
            <Link2 class="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ modules.filter(d => d.status === 'DEPLOYED').length }}</p>
            <p class="text-sm text-muted-foreground">Deployed</p>
          </div>
        </div>
      </UiCard>
      
      <UiCard class="p-4">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-yellow-500/10">
            <Activity class="h-5 w-5 text-yellow-500" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ modules.filter(d => d.status === 'MAINTENANCE').length }}</p>
            <p class="text-sm text-muted-foreground">In Maintenance</p>
          </div>
        </div>
      </UiCard>
    </div>
    
    <!-- Filters -->
    <UiCard class="p-4">
      <div class="flex flex-col lg:flex-row gap-4">
        <div class="flex-1 relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <UiInput
            v-model="searchQuery"
            placeholder="Search by serial, DevEUI, ID..."
            class="pl-10"
          />
        </div>
        
        <UiSelect
          v-model="statusFilter"
          :options="statusOptions"
          placeholder="Status"
          class="w-full sm:w-40"
        />
        
        <UiSelect
          v-model="brandFilter"
          :options="brandOptions"
          placeholder="Brand"
          class="w-full sm:w-36"
        />
        
        <UiSelect
          v-model="techFilter"
          :options="techOptions"
          placeholder="Technology"
          class="w-full sm:w-40"
        />
      </div>
    </UiCard>
    
    <!-- Modules table -->
    <UiCard>
      <UiTable>
        <UiTableHeader>
          <UiTableRow>
            <UiTableHead>Serial / Identifier</UiTableHead>
            <UiTableHead>Brand</UiTableHead>
            <UiTableHead>Model</UiTableHead>
            <UiTableHead>Technology</UiTableHead>
            <UiTableHead>Status</UiTableHead>
            <UiTableHead>Linked Meter</UiTableHead>
            <UiTableHead>Battery</UiTableHead>
            <UiTableHead>Last Comm</UiTableHead>
            <UiTableHead class="w-[80px]">Actions</UiTableHead>
          </UiTableRow>
        </UiTableHeader>
        <UiTableBody>
          <template v-if="isLoading">
            <UiTableRow v-for="i in 10" :key="i">
              <UiTableCell v-for="j in 9" :key="j">
                <UiSkeleton class="h-4 w-full" />
              </UiTableCell>
            </UiTableRow>
          </template>
          
          <template v-else-if="modules.length === 0">
            <UiTableRow>
              <UiTableCell :colspan="9" class="text-center py-12 text-muted-foreground">
                <Radio class="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p class="font-medium">{{ t('modules.noModules', 'No modules found') }}</p>
                <p class="text-sm">{{ t('modules.noModulesHint', 'Add a new module to get started') }}</p>
              </UiTableCell>
            </UiTableRow>
          </template>
          
          <template v-else>
            <UiTableRow
              v-for="module in modules"
              :key="module.id"
              clickable
              @click="goToModule(module.id)"
            >
              <UiTableCell class="font-mono">
                <div class="flex flex-col">
                  <span class="font-medium">{{ module.serialNumber }}</span>
                  <span class="text-xs text-muted-foreground">{{ getModuleIdentifier(module) }}</span>
                </div>
              </UiTableCell>
              <UiTableCell>
                {{ module.moduleProfile?.brand || '-' }}
              </UiTableCell>
              <UiTableCell>
                {{ module.moduleProfile?.modelCode || '-' }}
              </UiTableCell>
              <UiTableCell>
                <UiBadge variant="outline" class="text-xs">
                  {{ module.moduleProfile?.communicationTechnology?.replace(/_/g, '-') || '-' }}
                </UiBadge>
              </UiTableCell>
              <UiTableCell>
                <UiBadge :variant="getStatusVariant(module.status)">
                  {{ module.status }}
                </UiBadge>
              </UiTableCell>
              <UiTableCell>
                <template v-if="module.meter">
                  <div class="flex items-center gap-2">
                    <Link2 class="h-4 w-4 text-green-500" />
                    <span class="text-sm font-mono">{{ module.meter.serialNumber }}</span>
                  </div>
                </template>
                <template v-else>
                  <span class="text-muted-foreground flex items-center gap-2">
                    <Link2Off class="h-4 w-4" />
                    Not linked
                  </span>
                </template>
              </UiTableCell>
              <UiTableCell>
                <template v-if="module.lastBatteryLevel != null">
                  <span :class="{
                    'text-green-600': module.lastBatteryLevel > 50,
                    'text-yellow-600': module.lastBatteryLevel > 20 && module.lastBatteryLevel <= 50,
                    'text-red-600': module.lastBatteryLevel <= 20,
                  }">
                    {{ module.lastBatteryLevel }}%
                  </span>
                </template>
                <template v-else>
                  <span class="text-muted-foreground">-</span>
                </template>
              </UiTableCell>
              <UiTableCell>
                <span v-if="module.lastCommunicationAt" class="text-sm">
                  {{ formatDate(module.lastCommunicationAt) }}
                </span>
                <span v-else class="text-muted-foreground">Never</span>
              </UiTableCell>
              <UiTableCell @click.stop>
                <div class="flex items-center gap-1">
                  <UiButton
                    variant="ghost"
                    size="icon"
                    @click="goToModule(module.id)"
                  >
                    <Edit class="h-4 w-4" />
                  </UiButton>
                  <UiButton
                    variant="ghost"
                    size="icon"
                    @click="handleDeleteClick(module)"
                    :disabled="module.status === 'DEPLOYED'"
                  >
                    <Trash2 class="h-4 w-4 text-destructive" />
                  </UiButton>
                </div>
              </UiTableCell>
            </UiTableRow>
          </template>
        </UiTableBody>
      </UiTable>
      
      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-border">
        <p class="text-sm text-muted-foreground">
          Showing {{ modules.length }} of {{ pagination.total }} modules
        </p>
        <div class="flex items-center gap-2">
          <UiButton
            variant="outline"
            size="sm"
            :disabled="pagination.page <= 1"
            @click="pagination.page--; fetchModules()"
          >
            Previous
          </UiButton>
          <UiButton
            variant="outline"
            size="sm"
            :disabled="pagination.page >= pagination.totalPages"
            @click="pagination.page++; fetchModules()"
          >
            Next
          </UiButton>
        </div>
      </div>
    </UiCard>
    
    <!-- Create Module Dialog -->
    <UiDialog v-model:open="showCreateDialog">
      <UiDialogContent class="max-w-2xl">
        <UiDialogHeader>
          <UiDialogTitle>Add New Module</UiDialogTitle>
          <UiDialogDescription>Add a communication module</UiDialogDescription>
        </UiDialogHeader>
        <div class="overflow-y-auto flex-1 -mx-6 px-6">
          <ModulesCreateForm
            @success="handleCreateSuccess"
            @cancel="showCreateDialog = false"
          />
        </div>
      </UiDialogContent>
    </UiDialog>
    
    <!-- Delete Confirmation Dialog -->
    <UiDialog v-model:open="showDeleteConfirm">
      <UiDialogContent>
        <UiDialogHeader>
          <UiDialogTitle>Delete Module</UiDialogTitle>
          <UiDialogDescription>Are you sure you want to delete this module?</UiDialogDescription>
        </UiDialogHeader>
        <div class="space-y-4">
          <p class="text-muted-foreground">
            This action cannot be undone. The module "{{ moduleToDelete?.serialNumber }}" will be permanently removed.
          </p>
          <div class="flex justify-end gap-3">
            <UiButton variant="outline" @click="showDeleteConfirm = false">
              Cancel
            </UiButton>
            <UiButton variant="destructive" @click="confirmDelete">
              Delete
            </UiButton>
          </div>
        </div>
      </UiDialogContent>
    </UiDialog>
    
    <!-- Export Dialog -->
    <BulkExportDialog
      v-model:open="showExportDialog"
      title="Export Modules"
      description="Export module data to CSV file"
      :current-page-count="modules.length"
      :total-count="pagination.total"
      :is-exporting="isExporting"
      :columns="modulesColumns"
      @export="handleExport"
    />
    
    <!-- Import Dialog -->
    <BulkModulesImportDialog
      v-model:open="showImportDialog"
      @success="handleImportSuccess"
    />
  </div>
</template>
