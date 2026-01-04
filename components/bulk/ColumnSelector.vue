<script setup lang="ts">
import { ChevronRight, ChevronDown, Check, Minus } from 'lucide-vue-next'
import type { ExportColumn } from '~/composables/useBulkOperations'

export interface ColumnSelection {
  [key: string]: boolean
}

const props = defineProps<{
  columns: ExportColumn[]
  modelValue: ColumnSelection
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: ColumnSelection): void
}>()

// Track expanded nodes
const expandedNodes = ref<Set<string>>(new Set())

// Toggle expand/collapse
const toggleExpand = (key: string) => {
  if (expandedNodes.value.has(key)) {
    expandedNodes.value.delete(key)
  } else {
    expandedNodes.value.add(key)
  }
}

// Check if node is expanded
const isExpanded = (key: string) => expandedNodes.value.has(key)

// Get all descendant keys
const getAllDescendantKeys = (column: ExportColumn): string[] => {
  const keys: string[] = [column.key]
  if (column.children) {
    for (const child of column.children) {
      keys.push(...getAllDescendantKeys(child))
    }
  }
  return keys
}

// Get all leaf keys (columns without children)
const getAllLeafKeys = (column: ExportColumn): string[] => {
  if (!column.children || column.children.length === 0) {
    return [column.key]
  }
  const keys: string[] = []
  for (const child of column.children) {
    keys.push(...getAllLeafKeys(child))
  }
  return keys
}

// Check selection state for a node
const getSelectionState = (column: ExportColumn): 'checked' | 'unchecked' | 'indeterminate' => {
  if (!column.children || column.children.length === 0) {
    return props.modelValue[column.key] ? 'checked' : 'unchecked'
  }
  
  const leafKeys = getAllLeafKeys(column)
  const selectedCount = leafKeys.filter(key => props.modelValue[key]).length
  
  if (selectedCount === 0) return 'unchecked'
  if (selectedCount === leafKeys.length) return 'checked'
  return 'indeterminate'
}

// Toggle selection
const toggleSelection = (column: ExportColumn) => {
  const currentState = getSelectionState(column)
  const newValue = { ...props.modelValue }
  
  if (!column.children || column.children.length === 0) {
    // Leaf node - simple toggle
    newValue[column.key] = !newValue[column.key]
  } else {
    // Parent node - toggle all descendants
    const leafKeys = getAllLeafKeys(column)
    const shouldSelect = currentState !== 'checked'
    
    for (const key of leafKeys) {
      newValue[key] = shouldSelect
    }
  }
  
  emit('update:modelValue', newValue)
}

// Select all
const selectAll = () => {
  const newValue: ColumnSelection = {}
  for (const column of props.columns) {
    const leafKeys = getAllLeafKeys(column)
    for (const key of leafKeys) {
      newValue[key] = true
    }
  }
  emit('update:modelValue', newValue)
}

// Deselect all
const deselectAll = () => {
  emit('update:modelValue', {})
}

// Get selected count
const selectedCount = computed(() => {
  return Object.values(props.modelValue).filter(v => v).length
})

// Get total count
const totalCount = computed(() => {
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

// Auto-expand first level on mount
onMounted(() => {
  for (const column of props.columns) {
    if (column.children && column.children.length > 0) {
      expandedNodes.value.add(column.key)
    }
  }
})
</script>

<template>
  <div class="space-y-2">
    <!-- Header with select all/none -->
    <div class="flex items-center justify-between pb-2 border-b">
      <span class="text-sm text-muted-foreground">
        {{ selectedCount }} of {{ totalCount }} columns selected
      </span>
      <div class="flex gap-2">
        <button 
          type="button"
          class="text-xs text-primary hover:underline"
          @click="selectAll"
        >
          Select All
        </button>
        <span class="text-muted-foreground">|</span>
        <button 
          type="button"
          class="text-xs text-primary hover:underline"
          @click="deselectAll"
        >
          Deselect All
        </button>
      </div>
    </div>
    
    <!-- Tree structure -->
    <div class="max-h-64 overflow-y-auto space-y-0.5">
      <template v-for="column in columns" :key="column.key">
        <BulkColumnNode 
          :column="column" 
          :model-value="modelValue"
          :expanded-nodes="expandedNodes"
          :depth="0"
          @toggle-expand="toggleExpand"
          @toggle-selection="toggleSelection"
          @get-selection-state="getSelectionState"
        />
      </template>
    </div>
  </div>
</template>

<!-- Recursive Column Node Component -->
<script lang="ts">
// Use a separate component for recursive rendering
</script>
