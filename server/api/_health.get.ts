// =============================================================================
// Health Check API - For Docker/Kubernetes health probes
// =============================================================================

export default defineEventHandler(() => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'readwater-app',
  }
})

