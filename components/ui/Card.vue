<script setup lang="ts">
import { cn } from '~/lib/utils'

interface Props {
  class?: string
  hover?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  hover: false,
})
</script>

<template>
  <div
    :class="cn(
      'rounded-xl border bg-card text-card-foreground shadow',
      hover && 'transition-all duration-200 hover:shadow-lg hover:border-primary/50 cursor-pointer',
      props.class
    )"
  >
    <slot />
  </div>
</template>

