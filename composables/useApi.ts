// =============================================================================
// API Composable - HTTP Client Wrapper
// =============================================================================

import type { ApiResponse, PaginatedResponse } from '~/types'

type FetchOptions = Parameters<typeof $fetch>[1]

export const useApi = () => {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()
  
  const baseUrl = config.public.apiBase
  
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
  
  const post = async <T>(endpoint: string, body?: unknown, options?: FetchOptions): Promise<T> => {
    try {
      return await $fetch<T>(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: getHeaders(),
        body,
        ...options,
      })
    } catch (error) {
      return handleError(error)
    }
  }
  
  const put = async <T>(endpoint: string, body?: unknown, options?: FetchOptions): Promise<T> => {
    try {
      return await $fetch<T>(`${baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: getHeaders(),
        body,
        ...options,
      })
    } catch (error) {
      return handleError(error)
    }
  }
  
  const patch = async <T>(endpoint: string, body?: unknown, options?: FetchOptions): Promise<T> => {
    try {
      return await $fetch<T>(`${baseUrl}${endpoint}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body,
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
  
  // Convenience methods for common patterns
  const getList = async <T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<PaginatedResponse<T>> => {
    const queryParams = new URLSearchParams()
    
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
  
  const create = async <T>(endpoint: string, data: unknown): Promise<ApiResponse<T>> => {
    return post<ApiResponse<T>>(endpoint, data)
  }
  
  const update = async <T>(endpoint: string, id: string, data: unknown): Promise<ApiResponse<T>> => {
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

