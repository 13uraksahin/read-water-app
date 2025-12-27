<script setup lang="ts">
/**
 * PermissionGate Component
 * 
 * A wrapper component that conditionally renders content based on user permissions.
 * 
 * @example
 * <!-- Show content if user has specific permission -->
 * <PermissionGate permission="meter.create">
 *   <Button>Create Meter</Button>
 * </PermissionGate>
 * 
 * @example
 * <!-- Show content if user has ANY of the permissions -->
 * <PermissionGate :permissions="['meter.create', 'meter.update']">
 *   <Button>Edit Meter</Button>
 * </PermissionGate>
 * 
 * @example
 * <!-- Show content if user has ALL permissions -->
 * <PermissionGate :permissions="['meter.read', 'meter.update']" mode="all">
 *   <Button>Update Meter</Button>
 * </PermissionGate>
 * 
 * @example
 * <!-- Show content based on module access -->
 * <PermissionGate module="meter">
 *   <MeterList />
 * </PermissionGate>
 * 
 * @example
 * <!-- Show content based on module action -->
 * <PermissionGate module="meter" action="create">
 *   <Button>Create Meter</Button>
 * </PermissionGate>
 * 
 * @example
 * <!-- Show fallback if no permission -->
 * <PermissionGate permission="meter.delete">
 *   <Button variant="destructive">Delete</Button>
 *   <template #fallback>
 *     <span class="text-muted-foreground">No permission to delete</span>
 *   </template>
 * </PermissionGate>
 * 
 * @example
 * <!-- Role-based check -->
 * <PermissionGate :roles="['PLATFORM_ADMIN', 'TENANT_ADMIN']">
 *   <AdminPanel />
 * </PermissionGate>
 */

import type { SystemRole } from '~/types'

interface Props {
  // Single permission string
  permission?: string
  // Multiple permissions (combined with mode)
  permissions?: string[]
  // Mode for multiple permissions: 'any' (default) or 'all'
  mode?: 'any' | 'all'
  // Module-based access check
  module?: string
  // Action for module-based check: 'read' (default), 'create', 'update', 'delete'
  action?: 'read' | 'create' | 'update' | 'delete'
  // Role-based check (any of the roles)
  roles?: SystemRole[]
  // Role check mode: 'any' (default) or 'all'
  roleMode?: 'any' | 'all'
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'any',
  action: 'read',
  roleMode: 'any',
})

const { 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions,
  canRead,
  canCreate,
  canUpdate,
  canDelete,
  hasRole,
  hasAnyRole,
} = usePermissions()

const hasAccess = computed(() => {
  // Role-based check takes precedence
  if (props.roles && props.roles.length > 0) {
    if (props.roleMode === 'all') {
      return props.roles.every(role => hasRole(role))
    }
    return hasAnyRole(props.roles)
  }
  
  // Module-based check
  if (props.module) {
    switch (props.action) {
      case 'create':
        return canCreate(props.module)
      case 'update':
        return canUpdate(props.module)
      case 'delete':
        return canDelete(props.module)
      case 'read':
      default:
        return canRead(props.module)
    }
  }
  
  // Multiple permissions check
  if (props.permissions && props.permissions.length > 0) {
    return props.mode === 'all'
      ? hasAllPermissions(props.permissions)
      : hasAnyPermission(props.permissions)
  }
  
  // Single permission check
  if (props.permission) {
    return hasPermission(props.permission)
  }
  
  // No permission specified - allow access
  return true
})
</script>

<template>
  <template v-if="hasAccess">
    <slot />
  </template>
  <template v-else>
    <slot name="fallback" />
  </template>
</template>
