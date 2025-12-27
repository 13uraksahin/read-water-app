// =============================================================================
// Auth Middleware - Protect routes with authentication and permissions
// =============================================================================

// Route permission mapping - maps routes to required permission modules
const routePermissions: Record<string, string> = {
  '/': 'dashboard',
  '/readings': 'reading',
  '/customers': 'customer',
  '/subscriptions': 'subscription',
  '/meters': 'meter',
  '/devices': 'device',
  '/profiles': 'profile',
  '/decoders': 'decoder',
  '/alarms': 'alarm',
  '/iam/tenants': 'tenant',
  '/iam/users': 'user',
  '/settings': 'settings',
}

// Get the base route for permission checking
const getBaseRoute = (path: string): string => {
  // Handle dynamic routes like /customers/[id]
  const segments = path.split('/')
  
  // For IAM routes, include two segments
  if (segments[1] === 'iam' && segments[2]) {
    return `/${segments[1]}/${segments[2]}`
  }
  
  // For other routes, use first segment
  if (segments[1]) {
    return `/${segments[1]}`
  }
  
  return '/'
}

// Check if route requires a specific permission
const getRequiredPermission = (path: string): string | null => {
  const baseRoute = getBaseRoute(path)
  return routePermissions[baseRoute] || null
}

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
  
  // Check route-level permissions
  const requiredModule = getRequiredPermission(to.path)
  
  if (requiredModule) {
    // Check if user can access this module (has read permission)
    const hasAccess = authStore.canAccessModule(requiredModule)
    
    if (!hasAccess) {
      // Redirect to dashboard with access denied message
      // Or to a 403 page if you have one
      console.warn(`Access denied: Missing permission for ${requiredModule}`)
      
      // Try to redirect to a page they can access
      // Default to dashboard if they have access, otherwise logout
      if (authStore.canAccessModule('dashboard')) {
        return navigateTo('/')
      }
      
      // No access to anything - logout
      authStore.logout()
      return navigateTo('/login')
    }
  }
})

