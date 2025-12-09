// =============================================================================
// Auth Middleware - Protect routes
// =============================================================================

export default defineNuxtRouteMiddleware(async (to) => {
  // Skip auth check on server side - localStorage is not available
  // Auth will be validated on client side after hydration
  if (import.meta.server) {
    return
  }
  
  // Ensure auth is initialized before checking
  const { ensureInitialized } = useAuthInit()
  await ensureInitialized()
  
  const authStore = useAuthStore()
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/forgot-password', '/reset-password']
  
  if (publicRoutes.includes(to.path)) {
    // If already authenticated, redirect to dashboard
    if (authStore.isAuthenticated) {
      return navigateTo('/')
    }
    return
  }
  
  // Check if user is authenticated
  if (!authStore.isAuthenticated) {
    return navigateTo('/login')
  }
})

