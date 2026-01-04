<script setup lang="ts">
import { ChevronRight, ChevronDown, Check, Minus } from 'lucide-vue-next'
import type { ExportColumn } from '~/composables/useBulkOperations'

export interface ColumnSelection {
  [key: string]: boolean
}

const props = defineProps<{
  column: ExportColumn
  modelValue: ColumnSelection
  expandedNodes: Set<string>
  depth: number
}>()

const emit = defineEmits<{
  (e: 'toggleExpand', key: string): void
  (e: 'toggleSelection', column: ExportColumn): void
  (e: 'getSelectionState', column: ExportColumn): 'checked' | 'unchecked' | 'indeterminate'
}>()

const hasChildren = computed(() => {
  return props.column.children && props.column.children.length > 0
})

const isExpanded = computed(() => {
  return props.expandedNodes.has(props.column.key)
})

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
const selectionState = computed((): 'checked' | 'unchecked' | 'indeterminate' => {
  if (!props.column.children || props.column.children.length === 0) {
    return props.modelValue[props.column.key] ? 'checked' : 'unchecked'
  }
  
  const leafKeys = getAllLeafKeys(props.column)
  const selectedCount = leafKeys.filter(key => props.modelValue[key]).length
  
  if (selectedCount === 0) return 'unchecked'
  if (selectedCount === leafKeys.length) return 'checked'
  return 'indeterminate'
})
</script>

<template>
  <div>
    <!-- Node Row -->
    <div 
      class="flex items-center gap-1.5 py-1 px-1 rounded hover:bg-muted/50 cursor-pointer select-none"
      :style="{ paddingLeft: `${depth * 16 + 4}px` }"
    >
      <!-- Expand/Collapse Toggle -->
      <button
        v-if="hasChildren"
        type="button"
        class="p-0.5 hover:bg-muted rounded"
        @click.stop="$emit('toggleExpand', column.key)"
      >
        <ChevronDown v-if="isExpanded" class="h-3.5 w-3.5 text-muted-foreground" />
        <ChevronRight v-else class="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      <div v-else class="w-4.5" />
      
      <!-- Checkbox -->
      <button
        type="button"
        class="flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors"
        :class="{
          'bg-primary border-primary text-primary-foreground': selectionState === 'checked',
          'bg-primary/50 border-primary text-primary-foreground': selectionState === 'indeterminate',
          'border-muted-foreground/50 hover:border-primary': selectionState === 'unchecked'
        }"
        @click.stop="$emit('toggleSelection', column)"
      >
        <Check v-if="selectionState === 'checked'" class="h-3 w-3" />
        <Minus v-else-if="selectionState === 'indeterminate'" class="h-3 w-3" />
      </button>
      
      <!-- Label -->
      <span 
        class="text-sm flex-1 truncate"
        :class="hasChildren ? 'font-medium' : ''"
        @click="$emit('toggleSelection', column)"
      >
        {{ column.label }}
      </span>
      
      <!-- Key hint for leaf nodes -->
      <span 
        v-if="!hasChildren" 
        class="text-xs text-muted-foreground font-mono truncate max-w-32"
      >
        {{ column.key }}
      </span>
    </div>
    
    <!-- Children (recursive) -->
    <template v-if="hasChildren && isExpanded">
      <BulkColumnNode
        v-for="child in column.children"
        :key="child.key"
        :column="child"
        :model-value="modelValue"
        :expanded-nodes="expandedNodes"
        :depth="depth + 1"
        @toggle-expand="(key) => $emit('toggleExpand', key)"
        @toggle-selection="(col) => $emit('toggleSelection', col)"
      />
    </template>
  </div>
</template>
