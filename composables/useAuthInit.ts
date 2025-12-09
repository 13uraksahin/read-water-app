// =============================================================================
// Auth Initialization Composable
// Handles auth initialization with a shared promise to prevent race conditions
// =============================================================================

// Module-level promise to track initialization
let initPromise: Promise<void> | null = null

export function useAuthInit() {
  const authStore = useAuthStore()
  
  const ensureInitialized = async (): Promise<void> => {
    // On server, just return (no localStorage)
    if (import.meta.server) {
      return
    }
    
    // If already hydrated, return immediately
    if (authStore.isHydrated) {
      return
    }
    
    // If initialization is in progress, wait for it
    if (initPromise) {
      return initPromise
    }
    
    // Start initialization and store the promise
    initPromise = authStore.initializeFromStorage()
    
    try {
      await initPromise
    } finally {
      // Don't clear the promise - subsequent calls should see it completed
    }
  }
  
  return {
    ensureInitialized,
  }
}
