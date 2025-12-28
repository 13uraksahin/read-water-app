<script setup lang="ts">
import { Check, ChevronsUpDown, Search, X } from 'lucide-vue-next'
import { cn } from '~/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'

interface Option {
  label: string
  value: string
  disabled?: boolean
  description?: string
  icon?: string
}

interface Props {
  modelValue?: string
  options: Option[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  error?: boolean
  class?: string
  displayValue?: (value: string) => string
  showClear?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Select an option',
  searchPlaceholder: 'Search...',
  emptyText: 'No options found.',
  disabled: false,
  error: false,
  showClear: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const open = ref(false)
const searchTerm = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const highlightedIndex = ref(-1)

// For tracking the selected option
const selectedOption = computed(() => {
  return props.options.find(opt => opt.value === props.modelValue)
})

const filteredOptions = computed(() => {
  const term = searchTerm.value.toLowerCase().trim()
  if (!term) return props.options
  return props.options.filter(opt => 
    opt.label.toLowerCase().includes(term) ||
    (opt.description?.toLowerCase().includes(term))
  )
})

const displayLabel = computed(() => {
  if (props.displayValue && props.modelValue) {
    return props.displayValue(props.modelValue)
  }
  return selectedOption.value?.label
})

function handleSelect(option: Option) {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  open.value = false
  searchTerm.value = ''
  highlightedIndex.value = -1
}

function handleClear(e: Event) {
  e.stopPropagation()
  emit('update:modelValue', '')
}

function clearSearch() {
  searchTerm.value = ''
  searchInputRef.value?.focus()
}

// Reset search and highlight when opening/closing
watch(open, (isOpen) => {
  if (isOpen) {
    searchTerm.value = ''
    highlightedIndex.value = -1
    // Focus search input when dropdown opens
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  }
})

// Reset highlighted index when filtered options change
watch(filteredOptions, () => {
  highlightedIndex.value = -1
})

function handleKeydown(e: KeyboardEvent) {
  const options = filteredOptions.value.filter(opt => !opt.disabled)
  
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, options.length - 1)
      break
    case 'ArrowUp':
      e.preventDefault()
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
      break
    case 'Enter':
      e.preventDefault()
      if (highlightedIndex.value >= 0 && highlightedIndex.value < options.length) {
        handleSelect(options[highlightedIndex.value])
      }
      break
    case 'Escape':
      e.preventDefault()
      open.value = false
      searchTerm.value = ''
      break
  }
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        :disabled="disabled"
        :class="cn(
          'group flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors',
          'hover:bg-accent/50',
          'focus:outline-none focus:ring-1 focus:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus:ring-destructive',
          open && 'ring-1 ring-ring',
          props.class
        )"
      >
        <span 
          :class="cn(
            'flex-1 truncate text-left',
            !selectedOption && 'text-muted-foreground'
          )"
        >
          {{ displayLabel || placeholder }}
        </span>
        
        <!-- Clear button -->
        <button
          v-if="showClear && selectedOption"
          type="button"
          class="mr-1 rounded-sm opacity-50 hover:opacity-100 focus:outline-none"
          @click.stop="handleClear"
        >
          <X class="h-3.5 w-3.5" />
        </button>
        
        <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50 transition-transform duration-200" :class="open && 'rotate-180'" />
      </button>
    </PopoverTrigger>

    <PopoverContent 
      class="w-[--reka-popover-trigger-width] p-0"
      :side-offset="4"
      align="start"
    >
      <!-- Filter/Search Header - PrimeVue inspired -->
      <div class="sticky top-0 z-10 border-b border-border bg-popover">
        <div class="flex items-center gap-2 px-3 py-2">
          <Search class="h-4 w-4 shrink-0 text-muted-foreground pointer-events-none" />
          <input
            ref="searchInputRef"
            v-model="searchTerm"
            type="text"
            :placeholder="searchPlaceholder"
            class="h-7 flex-1 border-0 bg-transparent text-sm shadow-none placeholder:text-muted-foreground focus:outline-none"
            @keydown="handleKeydown"
          />
          <button
            v-if="searchTerm"
            type="button"
            class="rounded-sm text-muted-foreground hover:text-foreground focus:outline-none"
            @click="clearSearch"
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <!-- Options List -->
      <div class="max-h-56 overflow-auto py-1">
        <div 
          v-if="filteredOptions.length === 0" 
          class="py-6 text-center text-sm text-muted-foreground"
        >
          {{ emptyText }}
        </div>
        
        <div
          v-for="(option, index) in filteredOptions"
          :key="option.value"
          role="option"
          :aria-selected="option.value === modelValue"
          :aria-disabled="option.disabled"
          :class="cn(
            'relative mx-1 flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none',
            'hover:bg-accent hover:text-accent-foreground',
            option.disabled && 'pointer-events-none opacity-50',
            option.value === modelValue && 'bg-accent/50',
            highlightedIndex === index && 'bg-accent text-accent-foreground'
          )"
          @click="handleSelect(option)"
          @mouseenter="highlightedIndex = index"
        >
          <div class="flex flex-1 flex-col gap-0.5 overflow-hidden">
            <span class="truncate font-medium">{{ option.label }}</span>
            <span v-if="option.description" class="truncate text-xs text-muted-foreground">
              {{ option.description }}
            </span>
          </div>
          <Check 
            v-if="option.value === modelValue" 
            class="h-4 w-4 shrink-0 text-primary" 
          />
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
