<script setup lang="ts">
import { Download, FileSpreadsheet, FileText, HelpCircle, Columns3, ChevronDown, ChevronUp } from 'lucide-vue-next'
import type { ExportScope, ExportColumn } from '~/composables/useBulkOperations'

export interface ColumnSelection {
  [key: string]: boolean
}

const props = defineProps<{
  open: boolean
  title: string
  description?: string
  currentPageCount: number
  totalCount: number
  isExporting?: boolean
  columns: ExportColumn[]  // Column definitions for this entity
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'export', scope: ExportScope, selectedColumns: string[]): void
}>()

const MAX_EXPORT_ROWS = 10000

const selectedScope = ref<ExportScope>('page')
const showColumnSelector = ref(false)
const columnSelection = ref<ColumnSelection>({})

// Initialize column selection with all columns selected
const initializeColumnSelection = () => {
  const selection: ColumnSelection = {}
  
  const selectAllLeaves = (columns: ExportColumn[]) => {
    for (const col of columns) {
      if (!col.children || col.children.length === 0) {
        selection[col.key] = true
      } else {
        selectAllLeaves(col.children)
      }
    }
  }
  
  selectAllLeaves(props.columns)
  columnSelection.value = selection
}

// Watch for dialog open to initialize
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    initializeColumnSelection()
  }
})

// Get selected column keys
const selectedColumnKeys = computed(() => {
  return Object.entries(columnSelection.value)
    .filter(([_, selected]) => selected)
    .map(([key]) => key)
})

// Get selected count
const selectedColumnCount = computed(() => {
  return selectedColumnKeys.value.length
})

// Get total column count
const totalColumnCount = computed(() => {
  let count = 0
  const countLeaves = (columns: ExportColumn[]) => {
    for (const col of columns) {
      if (!col.children || col.children.length === 0) {
        count++
      } else {
        countLeaves(col.children)
      }
    }
  }
  countLeaves(props.columns)
  return count
})

const handleExport = () => {
  emit('export', selectedScope.value, selectedColumnKeys.value)
}

const effectiveCount = computed(() => {
  if (selectedScope.value === 'page') {
    return props.currentPageCount
  }
  return Math.min(props.totalCount, MAX_EXPORT_ROWS)
})
</script>

<template>
  <UiDialog :open="open" @update:open="$emit('update:open', $event)">
    <UiDialogContent class="max-w-lg">
      <UiDialogHeader>
        <UiDialogTitle class="flex items-center gap-2">
          <Download class="h-5 w-5 text-primary" />
          {{ title }}
        </UiDialogTitle>
        <UiDialogDescription v-if="description">
          {{ description }}
        </UiDialogDescription>
      </UiDialogHeader>
      
      <div class="space-y-4 py-4">
        <!-- Export Scope Selection -->
        <div class="space-y-3">
          <label class="text-sm font-medium">Export Scope</label>
          
          <!-- Page Only Option -->
          <div 
            class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
            :class="selectedScope === 'page' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'"
            @click="selectedScope = 'page'"
          >
            <div class="flex-shrink-0 mt-0.5">
              <div 
                class="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                :class="selectedScope === 'page' ? 'border-primary' : 'border-muted-foreground'"
              >
                <div 
                  v-if="selectedScope === 'page'" 
                  class="w-2 h-2 rounded-full bg-primary"
                />
              </div>
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <FileText class="h-4 w-4 text-muted-foreground" />
                <span class="font-medium">Current Page Only</span>
              </div>
              <p class="text-sm text-muted-foreground mt-1">
                Export only the {{ currentPageCount }} items visible on this page
              </p>
            </div>
          </div>
          
          <!-- All Data Option -->
          <div 
            class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
            :class="selectedScope === 'all' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'"
            @click="selectedScope = 'all'"
          >
            <div class="flex-shrink-0 mt-0.5">
              <div 
                class="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                :class="selectedScope === 'all' ? 'border-primary' : 'border-muted-foreground'"
              >
                <div 
                  v-if="selectedScope === 'all'" 
                  class="w-2 h-2 rounded-full bg-primary"
                />
              </div>
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <FileSpreadsheet class="h-4 w-4 text-muted-foreground" />
                <span class="font-medium">All Data (with current filters)</span>
              </div>
              <p class="text-sm text-muted-foreground mt-1">
                Export all {{ totalCount.toLocaleString() }} matching items
                <span v-if="totalCount > MAX_EXPORT_ROWS" class="text-warning">
                  (limited to {{ MAX_EXPORT_ROWS.toLocaleString() }} rows)
                </span>
              </p>
            </div>
          </div>
        </div>
        
        <!-- Column Selector Toggle -->
        <div class="space-y-2">
          <button
            type="button"
            class="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            @click="showColumnSelector = !showColumnSelector"
          >
            <div class="flex items-center gap-2">
              <Columns3 class="h-4 w-4 text-muted-foreground" />
              <span class="font-medium text-sm">Select Columns</span>
              <span class="text-xs text-muted-foreground">
                ({{ selectedColumnCount }} of {{ totalColumnCount }} selected)
              </span>
            </div>
            <ChevronUp v-if="showColumnSelector" class="h-4 w-4 text-muted-foreground" />
            <ChevronDown v-else class="h-4 w-4 text-muted-foreground" />
          </button>
          
          <!-- Column Selector Tree -->
          <div v-if="showColumnSelector" class="border rounded-lg p-3 bg-muted/20">
            <BulkColumnSelector
              v-model="columnSelection"
              :columns="columns"
            />
          </div>
        </div>
        
        <!-- Info Box -->
        <div class="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
          <HelpCircle class="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div class="text-muted-foreground">
            <p>Export will be downloaded as a CSV file with selected columns.</p>
            <p class="mt-1" v-if="selectedScope === 'all' && totalCount > 1000">
              Large exports may take a moment to process.
            </p>
          </div>
        </div>
        
        <!-- Summary -->
        <div class="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground">Items to export:</span>
              <span class="font-semibold">{{ effectiveCount.toLocaleString() }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground">Columns:</span>
              <span class="font-semibold">{{ selectedColumnCount }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <UiDialogFooter>
        <UiButton variant="outline" @click="$emit('update:open', false)">
          Cancel
        </UiButton>
        <UiButton 
          @click="handleExport" 
          :disabled="isExporting || selectedColumnCount === 0"
        >
          <Download class="h-4 w-4" />
          {{ isExporting ? 'Exporting...' : 'Export CSV' }}
        </UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>
