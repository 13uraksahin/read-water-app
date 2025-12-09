<script setup lang="ts">
import { cn } from '~/lib/utils'

interface Props {
  class?: string
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  clickable: false,
})
</script>

<template>
  <tr
    :class="cn(
      'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
      clickable && 'cursor-pointer',
      props.class
    )"
  >
    <slot />
  </tr>
</template>

