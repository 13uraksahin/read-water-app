// =============================================================================
// API URL Composable - Auto-detects correct API URL based on environment
// =============================================================================

/**
 * Returns the correct API base URL based on the current environment:
 * - If accessed via tunnel (HTTPS), uses the tunnel API URL
 * - If accessed via localhost, uses localhost API
 */
export const useApiUrl = () => {
  const config = useRuntimeConfig()
  
  // On server-side, use the configured apiBase
  if (import.meta.server) {
    return config.public.apiBase
  }
  
  // On client-side, auto-detect based on current hostname
  const hostname = window.location.hostname
  const isSecure = window.location.protocol === 'https:'
  
  // If accessing via tunnel domain or HTTPS, use tunnel API URL
  if (hostname.includes('portall.com.tr') || isSecure) {
    return config.public.tunnelApiUrl || 'https://read-water-api.portall.com.tr'
  }
  
  // Otherwise use localhost
  return config.public.apiBase
}

/**
 * Returns the correct Socket.IO URL based on the current environment
 */
export const useSocketUrl = () => {
  const config = useRuntimeConfig()
  
  // On server-side, use the configured socketUrl
  if (import.meta.server) {
    return config.public.socketUrl
  }
  
  // On client-side, auto-detect based on current hostname
  const hostname = window.location.hostname
  const isSecure = window.location.protocol === 'https:'
  
  // If accessing via tunnel domain or HTTPS, use tunnel API URL for socket
  if (hostname.includes('portall.com.tr') || isSecure) {
    return config.public.tunnelApiUrl || 'https://read-water-api.portall.com.tr'
  }
  
  // Otherwise use localhost
  return config.public.socketUrl
}
