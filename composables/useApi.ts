// =============================================================================
// API Composable - HTTP Client Wrapper
// =============================================================================

import type { ApiResponse, PaginatedResponse } from '~/types'

type FetchOptions = Parameters<typeof $fetch>[1]

export const useApi = () => {
  const authStore = useAuthStore()
  const appStore = useAppStore()
  
  // Use the auto-detecting API URL composable
  const baseUrl = useApiUrl()
  
  const getHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (authStore.accessToken) {
      headers['Authorization'] = `Bearer ${authStore.accessToken}`
    }
    
    return headers
  }
  
  const handleError = async (error: unknown): Promise<never> => {
    const err = error as { status?: number; data?: { message?: string } }
    
    // Handle 401 - try to refresh token
    if (err.status === 401 && authStore.refreshToken) {
      const refreshed = await authStore.refreshAccessToken()
      if (refreshed) {
        // Retry would need to be handled by caller
        throw new Error('Token refreshed, please retry')
      }
    }
    
    // Handle other errors
    const message = err.data?.message || 'An error occurred'
    throw new Error(message)
  }
  
  const get = async <T>(endpoint: string, options?: FetchOptions): Promise<T> => {
    try {
      return await $fetch<T>(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: getHeaders(),
        ...options,
      })
    } catch (error) {
      return handleError(error)
    }
  }
  
  const post = async <T>(endpoint: string, body?: Record<string, unknown> | unknown[], options?: FetchOptions): Promise<T> => {
    try {
      return await $fetch<T>(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: getHeaders(),
        body: body as BodyInit | Record<string, unknown> | null | undefined,
        ...options,
      })
    } catch (error) {
      return handleError(error)
    }
  }
  
  const put = async <T>(endpoint: string, body?: Record<string, unknown> | unknown[], options?: FetchOptions): Promise<T> => {
    try {
      return await $fetch<T>(`${baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: body as BodyInit | Record<string, unknown> | null | undefined,
        ...options,
      })
    } catch (error) {
      return handleError(error)
    }
  }
  
  const patch = async <T>(endpoint: string, body?: Record<string, unknown> | unknown[], options?: FetchOptions): Promise<T> => {
    try {
      return await $fetch<T>(`${baseUrl}${endpoint}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: body as BodyInit | Record<string, unknown> | null | undefined,
        ...options,
      })
    } catch (error) {
      return handleError(error)
    }
  }
  
  const del = async <T>(endpoint: string, options?: FetchOptions): Promise<T> => {
    try {
      return await $fetch<T>(`${baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: getHeaders(),
        ...options,
      })
    } catch (error) {
      return handleError(error)
    }
  }
  
  // Endpoints that support tenant filtering via tenantId query parameter
  // Note: /api/v1/profiles (meter profiles) does NOT support tenantId filtering
  const TENANT_FILTERABLE_ENDPOINTS = [
    '/api/v1/customers',
    '/api/v1/subscriptions',
    '/api/v1/meters',
    '/api/v1/devices',
    '/api/v1/readings',
    '/api/v1/alarms',
    '/api/v1/dashboard',
    '/api/v1/users',
  ]
  
  // Check if endpoint supports tenant filtering
  const supportsTenantFilter = (endpoint: string): boolean => {
    return TENANT_FILTERABLE_ENDPOINTS.some(e => endpoint.startsWith(e))
  }
  
  // Convenience methods for common patterns
  const getList = async <T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>,
    options?: { skipTenantFilter?: boolean }
  ): Promise<PaginatedResponse<T>> => {
    const queryParams = new URLSearchParams()
    
    // Auto-inject activeTenantId only for supported endpoints
    const shouldInjectTenant = !options?.skipTenantFilter && 
                               appStore.activeTenantId && 
                               !params?.tenantId &&
                               supportsTenantFilter(endpoint)
    
    if (shouldInjectTenant) {
      queryParams.set('tenantId', appStore.activeTenantId)
    }
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.set(key, String(value))
        }
      })
    }
    
    const queryString = queryParams.toString()
    const url = queryString ? `${endpoint}?${queryString}` : endpoint
    
    return get<PaginatedResponse<T>>(url)
  }
  
  const getOne = async <T>(endpoint: string, id: string): Promise<ApiResponse<T>> => {
    return get<ApiResponse<T>>(`${endpoint}/${id}`)
  }
  
  const create = async <T>(endpoint: string, data: Record<string, unknown> | unknown[]): Promise<ApiResponse<T>> => {
    return post<ApiResponse<T>>(endpoint, data)
  }
  
  const update = async <T>(endpoint: string, id: string, data: Record<string, unknown> | unknown[]): Promise<ApiResponse<T>> => {
    return patch<ApiResponse<T>>(`${endpoint}/${id}`, data)
  }
  
  const remove = async <T>(endpoint: string, id: string): Promise<ApiResponse<T>> => {
    return del<ApiResponse<T>>(`${endpoint}/${id}`)
  }
  
  return {
    get,
    post,
    put,
    patch,
    del,
    getList,
    getOne,
    create,
    update,
    remove,
  }
}

