// =============================================================================
// Permissions Plugin - Vue directives for permission-based rendering
// =============================================================================

import type { DirectiveBinding } from 'vue'

export default defineNuxtPlugin((nuxtApp) => {
  /**
   * v-permission directive
   * 
   * Usage:
   * - v-permission="'meter.create'" - Show if user has permission
   * - v-permission="['meter.create', 'meter.update']" - Show if user has ANY permission
   * - v-permission:all="['meter.create', 'meter.update']" - Show if user has ALL permissions
   * - v-permission:module="'meter'" - Show if user can access module (has read)
   * - v-permission:create="'meter'" - Show if user can create in module
   * - v-permission:update="'meter'" - Show if user can update in module
   * - v-permission:delete="'meter'" - Show if user can delete in module
   * 
   * Modifiers:
   * - v-permission.hide="'meter.create'" - Hide element (display: none) instead of removing
   * - v-permission.disable="'meter.create'" - Disable element instead of removing
   */
  nuxtApp.vueApp.directive('permission', {
    mounted(el: HTMLElement, binding: DirectiveBinding) {
      checkPermission(el, binding)
    },
    updated(el: HTMLElement, binding: DirectiveBinding) {
      checkPermission(el, binding)
    },
  })

  /**
   * v-role directive
   * 
   * Usage:
   * - v-role="'PLATFORM_ADMIN'" - Show if user has role
   * - v-role="['PLATFORM_ADMIN', 'TENANT_ADMIN']" - Show if user has ANY role
   * - v-role:all="['PLATFORM_ADMIN', 'TENANT_ADMIN']" - Show if user has ALL roles
   */
  nuxtApp.vueApp.directive('role', {
    mounted(el: HTMLElement, binding: DirectiveBinding) {
      checkRole(el, binding)
    },
    updated(el: HTMLElement, binding: DirectiveBinding) {
      checkRole(el, binding)
    },
  })
})

function checkPermission(el: HTMLElement, binding: DirectiveBinding) {
  const authStore = useAuthStore()
  const value = binding.value
  const arg = binding.arg // 'all', 'module', 'create', 'update', 'delete'
  const modifiers = binding.modifiers // 'hide', 'disable'

  let hasPermission = false

  if (!value) {
    hasPermission = true
  } else if (arg === 'module') {
    // Check module access (read permission)
    hasPermission = authStore.canAccessModule(value as string)
  } else if (arg === 'create') {
    hasPermission = authStore.canCreate(value as string)
  } else if (arg === 'update') {
    hasPermission = authStore.canUpdate(value as string)
  } else if (arg === 'delete') {
    hasPermission = authStore.canDelete(value as string)
  } else if (arg === 'all') {
    // Must have ALL permissions
    const permissions = Array.isArray(value) ? value : [value]
    hasPermission = authStore.hasAllPermissions(permissions)
  } else {
    // Default: must have ANY permission
    const permissions = Array.isArray(value) ? value : [value]
    hasPermission = authStore.hasAnyPermission(permissions)
  }

  applyPermissionResult(el, hasPermission, modifiers)
}

function checkRole(el: HTMLElement, binding: DirectiveBinding) {
  const authStore = useAuthStore()
  const value = binding.value
  const arg = binding.arg // 'all'
  const modifiers = binding.modifiers // 'hide', 'disable'

  let hasRole = false

  if (!value) {
    hasRole = true
  } else if (arg === 'all') {
    // Must have ALL roles
    const roles = Array.isArray(value) ? value : [value]
    hasRole = roles.every(role => authStore.hasRole(role))
  } else {
    // Default: must have ANY role
    const roles = Array.isArray(value) ? value : [value]
    hasRole = authStore.hasAnyRole(roles)
  }

  applyPermissionResult(el, hasRole, modifiers)
}

function applyPermissionResult(
  el: HTMLElement,
  hasAccess: boolean,
  modifiers: Record<string, boolean>
) {
  // Store original display value
  const originalDisplay = el.dataset.originalDisplay ?? getComputedStyle(el).display
  if (!el.dataset.originalDisplay) {
    el.dataset.originalDisplay = originalDisplay
  }

  if (hasAccess) {
    // Restore element
    el.style.display = originalDisplay === 'none' ? '' : originalDisplay
    if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) {
      el.disabled = false
    }
    el.classList.remove('permission-denied')
  } else {
    // Apply restriction based on modifier
    if (modifiers.disable) {
      // Disable the element
      if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) {
        el.disabled = true
      }
      el.classList.add('permission-denied')
      el.style.opacity = '0.5'
      el.style.pointerEvents = 'none'
    } else if (modifiers.hide) {
      // Hide element (keep in DOM)
      el.style.display = 'none'
    } else {
      // Default: remove from DOM (via display: none, Vue handles actual removal)
      el.style.display = 'none'
    }
  }
}
