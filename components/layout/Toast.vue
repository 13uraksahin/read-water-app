<script setup lang="ts">
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-vue-next'
import { cn } from '~/lib/utils'

const { toasts, dismiss } = useToast()

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const variants = {
  success: 'border-green-500/20 bg-green-500/10 text-green-500',
  error: 'border-red-500/20 bg-red-500/10 text-red-500',
  warning: 'border-orange-500/20 bg-orange-500/10 text-orange-500',
  info: 'border-blue-500/20 bg-blue-500/10 text-blue-500',
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="cn(
            'flex items-start gap-3 p-4 rounded-lg border shadow-lg bg-card',
            variants[toast.type]
          )"
        >
          <component :is="icons[toast.type]" class="h-5 w-5 shrink-0 mt-0.5" />
          <div class="flex-1 min-w-0">
            <p class="font-medium text-foreground">{{ toast.title }}</p>
            <p v-if="toast.message" class="text-sm text-muted-foreground mt-0.5">
              {{ toast.message }}
            </p>
          </div>
          <button
            class="shrink-0 p-1 hover:bg-muted rounded transition-colors"
            @click="dismiss(toast.id)"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>

