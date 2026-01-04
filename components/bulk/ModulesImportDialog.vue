<script setup lang="ts">
import { Upload, FileText, Download, AlertCircle, CheckCircle2, XCircle, HelpCircle } from 'lucide-vue-next'
import type { ModuleProfile } from '~/types'
import type { ImportResult } from '~/composables/useBulkOperations'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success'): void
}>()

const api = useApi()
const toast = useToast()
const appStore = useAppStore()
const { importModules, downloadModulesSample } = useBulkOperations()

// Form state
const namePrefix = ref('')
const nameSuffix = ref('')
const selectedProfileId = ref('')
const file = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

// State
const isLoading = ref(false)
const moduleProfiles = ref<ModuleProfile[]>([])
const importResult = ref<ImportResult | null>(null)
const step = ref<'form' | 'result'>('form')

// Fetch module profiles
const fetchProfiles = async () => {
  try {
    const response = await api.getList<ModuleProfile>('/api/v1/module-profiles', { 
      limit: 100,
      tenantId: appStore.activeTenantId 
    }, { skipTenantFilter: true })
    moduleProfiles.value = response.data
  } catch (error) {
    console.error('Failed to fetch module profiles:', error)
  }
}

// Profile options for select
const profileOptions = computed(() => [
  { label: 'Select a module profile (required)', value: '' },
  ...moduleProfiles.value.map(p => ({
    label: `${p.brand} ${p.modelCode} (${p.communicationTechnology})`,
    value: p.id,
  }))
])

// Get selected profile details
const selectedProfile = computed(() => {
  return moduleProfiles.value.find(p => p.id === selectedProfileId.value)
})

// Dynamic field requirements based on selected profile
const requiredDynamicFields = computed(() => {
  if (!selectedProfile.value) return []
  return selectedProfile.value.fieldDefinitions?.filter(f => f.required) || []
})

// Handle file selection
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const selectedFile = target.files?.[0]
  
  if (selectedFile) {
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file')
      return
    }
    file.value = selectedFile
  }
}

// Handle file drop
const handleFileDrop = (event: DragEvent) => {
  event.preventDefault()
  const droppedFile = event.dataTransfer?.files[0]
  
  if (droppedFile) {
    if (!droppedFile.name.endsWith('.csv')) {
      toast.error('Please drop a CSV file')
      return
    }
    file.value = droppedFile
  }
}

// Validation
const isValid = computed(() => {
  return file.value !== null && selectedProfileId.value !== ''
})

// Handle import
const handleImport = async () => {
  if (!file.value || !selectedProfileId.value) return
  
  isLoading.value = true
  
  try {
    const result = await importModules({
      file: file.value,
      namePrefix: namePrefix.value || undefined,
      nameSuffix: nameSuffix.value || undefined,
      profileId: selectedProfileId.value,
    })
    
    importResult.value = result
    step.value = 'result'
    
    if (result.success && result.failedRows === 0) {
      toast.success(`Successfully imported ${result.importedRows} modules`)
    } else if (result.importedRows > 0) {
      toast.warning(`Imported ${result.importedRows} modules with ${result.failedRows} failures`)
    } else {
      toast.error('Import failed')
    }
  } catch (error) {
    toast.error('Failed to import modules')
  } finally {
    isLoading.value = false
  }
}

// Reset form
const resetForm = () => {
  namePrefix.value = ''
  nameSuffix.value = ''
  selectedProfileId.value = ''
  file.value = null
  importResult.value = null
  step.value = 'form'
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

// Handle close
const handleClose = () => {
  if (importResult.value?.importedRows && importResult.value.importedRows > 0) {
    emit('success')
  }
  emit('update:open', false)
  resetForm()
}

// Watch for dialog open
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    fetchProfiles()
    resetForm()
  }
})
</script>

<template>
  <UiDialog :open="open" @update:open="handleClose">
    <UiDialogContent class="max-w-2xl">
      <UiDialogHeader>
        <UiDialogTitle class="flex items-center gap-2">
          <Upload class="h-5 w-5 text-primary" />
          Bulk Import Modules
        </UiDialogTitle>
        <UiDialogDescription>
          Import multiple communication modules from a CSV file
        </UiDialogDescription>
      </UiDialogHeader>
      
      <!-- Form Step -->
      <div v-if="step === 'form'" class="space-y-6 py-4">
        <!-- Name Prefix/Suffix -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">Serial Number Prefix</label>
            <UiInput
              v-model="namePrefix"
              placeholder="e.g., MOD-"
            />
            <p class="text-xs text-muted-foreground">
              Added before each serial number
            </p>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">Serial Number Suffix</label>
            <UiInput
              v-model="nameSuffix"
              placeholder="e.g., -2024"
            />
            <p class="text-xs text-muted-foreground">
              Added after each serial number
            </p>
          </div>
        </div>
        
        <!-- Module Profile Selector -->
        <div class="space-y-2">
          <label class="text-sm font-medium">
            Module Profile <span class="text-destructive">*</span>
          </label>
          <UiSelect
            v-model="selectedProfileId"
            :options="profileOptions"
            placeholder="Select module profile"
            class="w-full"
          />
          <p class="text-xs text-muted-foreground">
            All imported modules will use this profile
          </p>
        </div>
        
        <!-- Dynamic Fields Info -->
        <div v-if="selectedProfile && requiredDynamicFields.length > 0" class="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
          <p class="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
            Required Dynamic Fields for {{ selectedProfile.communicationTechnology }}:
          </p>
          <div class="flex flex-wrap gap-2">
            <span 
              v-for="field in requiredDynamicFields" 
              :key="field.name"
              class="px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded text-xs font-mono"
            >
              {{ field.name }}
            </span>
          </div>
        </div>
        
        <!-- File Upload Area -->
        <div class="space-y-2">
          <label class="text-sm font-medium">
            CSV File <span class="text-destructive">*</span>
          </label>
          <div
            class="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/30"
            :class="file ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' : 'border-muted-foreground/25'"
            @click="fileInputRef?.click()"
            @dragover.prevent
            @drop="handleFileDrop"
          >
            <input
              ref="fileInputRef"
              type="file"
              accept=".csv"
              class="hidden"
              @change="handleFileSelect"
            />
            
            <div v-if="file" class="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
              <FileText class="h-6 w-6" />
              <span class="font-medium">{{ file.name }}</span>
            </div>
            <div v-else class="space-y-2">
              <Upload class="h-8 w-8 mx-auto text-muted-foreground" />
              <p class="text-sm text-muted-foreground">
                Click to upload or drag and drop
              </p>
              <p class="text-xs text-muted-foreground">
                CSV files only
              </p>
            </div>
          </div>
        </div>
        
        <!-- Sample File & Instructions -->
        <div class="space-y-3 p-4 rounded-lg bg-muted/50">
          <div class="flex items-start gap-2">
            <HelpCircle class="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div class="text-sm text-muted-foreground">
              <p class="font-medium text-foreground mb-2">CSV Format Requirements:</p>
              <ul class="list-disc list-inside space-y-1">
                <li>First row must contain column headers</li>
                <li>Required column: <code class="bg-muted px-1 rounded">serialNumber</code></li>
                <li>Include dynamic field columns based on profile (e.g., <code class="bg-muted px-1 rounded">DevEUI</code>, <code class="bg-muted px-1 rounded">JoinEUI</code>)</li>
                <li>Optional: <code class="bg-muted px-1 rounded">status</code></li>
              </ul>
            </div>
          </div>
          
          <UiButton variant="outline" size="sm" @click="downloadModulesSample">
            <Download class="h-4 w-4" />
            Download Sample CSV
          </UiButton>
        </div>
      </div>
      
      <!-- Result Step -->
      <div v-else-if="step === 'result' && importResult" class="space-y-4 py-4">
        <!-- Summary -->
        <div 
          class="p-4 rounded-lg flex items-center gap-3"
          :class="importResult.failedRows === 0 ? 'bg-green-100 dark:bg-green-950/30' : 'bg-yellow-100 dark:bg-yellow-950/30'"
        >
          <CheckCircle2 v-if="importResult.failedRows === 0" class="h-6 w-6 text-green-600" />
          <AlertCircle v-else class="h-6 w-6 text-yellow-600" />
          <div>
            <p class="font-medium">
              {{ importResult.failedRows === 0 ? 'Import Completed Successfully' : 'Import Completed with Errors' }}
            </p>
            <p class="text-sm text-muted-foreground">
              {{ importResult.importedRows }} of {{ importResult.totalRows }} modules imported
            </p>
          </div>
        </div>
        
        <!-- Stats -->
        <div class="grid grid-cols-3 gap-4">
          <div class="p-3 rounded-lg bg-muted/50 text-center">
            <p class="text-2xl font-bold">{{ importResult.totalRows }}</p>
            <p class="text-xs text-muted-foreground">Total Rows</p>
          </div>
          <div class="p-3 rounded-lg bg-green-100 dark:bg-green-950/30 text-center">
            <p class="text-2xl font-bold text-green-600">{{ importResult.importedRows }}</p>
            <p class="text-xs text-muted-foreground">Imported</p>
          </div>
          <div class="p-3 rounded-lg bg-red-100 dark:bg-red-950/30 text-center">
            <p class="text-2xl font-bold text-red-600">{{ importResult.failedRows }}</p>
            <p class="text-xs text-muted-foreground">Failed</p>
          </div>
        </div>
        
        <!-- Errors List -->
        <div v-if="importResult.errors && importResult.errors.length > 0" class="space-y-2">
          <p class="text-sm font-medium">Errors:</p>
          <div class="max-h-40 overflow-y-auto space-y-1">
            <div 
              v-for="(error, index) in importResult.errors.slice(0, 20)" 
              :key="index"
              class="flex items-start gap-2 text-sm p-2 rounded bg-red-50 dark:bg-red-950/20"
            >
              <XCircle class="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>
                Row {{ error.row }}: {{ error.field }} - {{ error.message }}
              </span>
            </div>
            <p v-if="importResult.errors.length > 20" class="text-sm text-muted-foreground">
              ...and {{ importResult.errors.length - 20 }} more errors
            </p>
          </div>
        </div>
      </div>
      
      <UiDialogFooter>
        <template v-if="step === 'form'">
          <UiButton variant="outline" @click="handleClose">
            Cancel
          </UiButton>
          <UiButton 
            @click="handleImport" 
            :disabled="!isValid || isLoading"
          >
            <Upload class="h-4 w-4" />
            {{ isLoading ? 'Importing...' : 'Import Modules' }}
          </UiButton>
        </template>
        <template v-else>
          <UiButton variant="outline" @click="resetForm">
            Import More
          </UiButton>
          <UiButton @click="handleClose">
            Done
          </UiButton>
        </template>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>
