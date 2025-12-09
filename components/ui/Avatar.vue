<script setup lang="ts">
import { cn } from '~/lib/utils'

interface Props {
  src?: string
  alt?: string
  fallback?: string
  class?: string
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  alt: 'Avatar',
  size: 'md',
})

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
}

const showFallback = ref(false)

const initials = computed(() => {
  if (props.fallback) return props.fallback.slice(0, 2).toUpperCase()
  return props.alt?.slice(0, 2).toUpperCase() || '??'
})
</script>

<template>
  <div
    :class="cn(
      'relative flex shrink-0 overflow-hidden rounded-full',
      sizeClasses[size],
      props.class
    )"
  >
    <img
      v-if="src && !showFallback"
      :src="src"
      :alt="alt"
      class="aspect-square h-full w-full object-cover"
      @error="showFallback = true"
    />
    <div
      v-else
      class="flex h-full w-full items-center justify-center rounded-full bg-muted font-medium"
    >
      {{ initials }}
    </div>
  </div>
</template>

