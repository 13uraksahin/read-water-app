// =============================================================================
// Toast Composable - Simple Toast Notifications
// =============================================================================

interface Toast {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message?: string
  duration?: number
}

const toasts = ref<Toast[]>([])

export const useToast = () => {
  const show = (toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID()
    const duration = toast.duration ?? 5000
    
    toasts.value.push({ ...toast, id })
    
    if (duration > 0) {
      setTimeout(() => {
        dismiss(id)
      }, duration)
    }
    
    return id
  }
  
  const dismiss = (id: string) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }
  
  const dismissAll = () => {
    toasts.value = []
  }
  
  const success = (title: string, message?: string) => {
    return show({ type: 'success', title, message })
  }
  
  const error = (title: string, message?: string) => {
    return show({ type: 'error', title, message })
  }
  
  const warning = (title: string, message?: string) => {
    return show({ type: 'warning', title, message })
  }
  
  const info = (title: string, message?: string) => {
    return show({ type: 'info', title, message })
  }
  
  return {
    toasts: readonly(toasts),
    show,
    dismiss,
    dismissAll,
    success,
    error,
    warning,
    info,
  }
}

