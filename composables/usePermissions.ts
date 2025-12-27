// =============================================================================
// usePermissions Composable - Frontend permission checking
// =============================================================================

import type { SystemRole, TenantAssignment } from '~/types'

// Permission modules matching backend
export const MODULES = {
  DASHBOARD: 'dashboard',
  READINGS: 'reading',
  SUBSCRIPTIONS: 'subscription',
  CUSTOMERS: 'customer',
  METERS: 'meter',
  DEVICES: 'device',
  PROFILES: 'profile',
  ALARMS: 'alarm',
  TENANTS: 'tenant',
  USERS: 'user',
  SETTINGS: 'settings',
  DECODERS: 'decoder',
} as const

// Permission actions
export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
} as const

// Build permission string
const buildPermission = (module: string, action: string): string => {
  return `${module}.${action}`
}

export const usePermissions = () => {
  const authStore = useAuthStore()

  // Get current user's permissions (use store getter which has role-based fallback)
  const permissions = computed<string[]>(() => {
    return authStore.userPermissions
  })

  // Get all permissions across all tenants (use store getter which has role-based fallback)
  const allPermissions = computed<string[]>(() => {
    return authStore.allPermissions
  })

  // Get current user's roles
  const roles = computed<SystemRole[]>(() => {
    return authStore.userRoles
  })

  // Check if user has a specific permission
  const hasPermission = (permission: string): boolean => {
    return permissions.value.includes(permission)
  }

  // Check if user has any of the permissions
  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.some(p => permissions.value.includes(p))
  }

  // Check if user has all of the permissions
  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.every(p => permissions.value.includes(p))
  }

  // Module-based permission checks
  const canRead = (module: string): boolean => {
    return hasPermission(buildPermission(module, ACTIONS.READ))
  }

  const canCreate = (module: string): boolean => {
    return hasPermission(buildPermission(module, ACTIONS.CREATE))
  }

  const canUpdate = (module: string): boolean => {
    return hasPermission(buildPermission(module, ACTIONS.UPDATE))
  }

  const canDelete = (module: string): boolean => {
    return hasPermission(buildPermission(module, ACTIONS.DELETE))
  }

  // Check if user can access a module (has read permission)
  const canAccessModule = (module: string): boolean => {
    return canRead(module)
  }

  // Check if user can manage a module (has create, update, delete)
  const canManageModule = (module: string): boolean => {
    return canCreate(module) || canUpdate(module) || canDelete(module)
  }

  // Role-based checks (convenience methods)
  const isPlatformAdmin = computed(() => authStore.isPlatformAdmin)
  const isTenantAdmin = computed(() => authStore.isTenantAdmin)
  
  const hasRole = (role: SystemRole): boolean => {
    return authStore.hasRole(role)
  }

  const hasAnyRole = (roleList: SystemRole[]): boolean => {
    return authStore.hasAnyRole(roleList)
  }

  // Permission for specific tenant
  const hasPermissionForTenant = (tenantId: string, permission: string): boolean => {
    const tenantAssignment = authStore.user?.tenants?.find((t: TenantAssignment) => t.tenantId === tenantId)
    if (!tenantAssignment?.permissions) return false
    return tenantAssignment.permissions.includes(permission)
  }

  // Get all modules user can access
  const accessibleModules = computed<string[]>(() => {
    const modules = Object.values(MODULES)
    return modules.filter(module => canRead(module))
  })

  return {
    // Computed
    permissions,
    allPermissions,
    roles,
    isPlatformAdmin,
    isTenantAdmin,
    accessibleModules,
    
    // Permission checks
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // Module-based checks
    canRead,
    canCreate,
    canUpdate,
    canDelete,
    canAccessModule,
    canManageModule,
    
    // Role checks
    hasRole,
    hasAnyRole,
    
    // Tenant-specific
    hasPermissionForTenant,
    
    // Constants
    MODULES,
    ACTIONS,
    buildPermission,
  }
}
