<script setup lang="ts">
import type { MapMeterData } from '~/stores/dashboard'

const props = defineProps<{
  class?: string
}>()

// Stores
const dashboardStore = useDashboardStore()
const appStore = useAppStore()

// Color mode
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

// Map instance
const mapContainer = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
let markerLayer: L.LayerGroup | null = null
let tileLayer: L.TileLayer | null = null

// Tile layer URLs
const TILE_URLS = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
}

// Computed meters from store
const meters = computed(() => dashboardStore.mapData)

// Get marker color based on map status
const getMarkerColor = (meter: MapMeterData): string => {
  switch (meter.mapStatus) {
    case 'alarm':
      return '#ef4444' // Red
    case 'offline':
      return '#6b7280' // Gray
    case 'high_usage':
      return '#f97316' // Orange
    default:
      return '#22c55e' // Green
  }
}

// Create custom marker icon
const createMarkerIcon = (color: string) => {
  if (typeof window === 'undefined') return null
  
  const L = window.L
  const borderColor = isDark.value ? 'white' : '#1f2937'
  const shadowColor = isDark.value ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.2)'
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background: ${color};
        border: 3px solid ${borderColor};
        border-radius: 50%;
        box-shadow: 0 2px 8px ${shadowColor};
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  })
}

// Initialize map
const initMap = async () => {
  if (!mapContainer.value || typeof window === 'undefined') return
  
  const L = await import('leaflet')
  
  // Use center from store or default
  const center = dashboardStore.mapCenter
  
  // Create map
  map = L.map(mapContainer.value, {
    center: [center.lat, center.lng],
    zoom: 13,
    zoomControl: true,
  })
  
  // Add tile layer based on current color mode
  const tileUrl = isDark.value ? TILE_URLS.dark : TILE_URLS.light
  tileLayer = L.tileLayer(tileUrl, {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  }).addTo(map)
  
  // Create marker layer
  markerLayer = L.layerGroup().addTo(map)
  
  // Add markers
  updateMarkers()
}

// Update tile layer when color mode changes
const updateTileLayer = async () => {
  if (!map || typeof window === 'undefined') return
  
  const L = await import('leaflet')
  
  // Remove old tile layer
  if (tileLayer) {
    map.removeLayer(tileLayer)
  }
  
  // Add new tile layer based on color mode
  const tileUrl = isDark.value ? TILE_URLS.dark : TILE_URLS.light
  tileLayer = L.tileLayer(tileUrl, {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  }).addTo(map)
  
  // Re-render markers to update border colors
  updateMarkers()
}

// Update markers on map
const updateMarkers = () => {
  if (!map || !markerLayer || typeof window === 'undefined') return
  
  const L = window.L
  
  // Clear existing markers
  markerLayer.clearLayers()
  
  // Add new markers from store
  meters.value.forEach(meter => {
    const icon = createMarkerIcon(getMarkerColor(meter))
    if (!icon) return
    
    const marker = L.marker([meter.latitude, meter.longitude], { icon })
    
    // Build status badges
    const batteryInfo = meter.batteryLevel != null 
      ? `<span style="color: ${meter.batteryLevel < 20 ? '#ef4444' : '#22c55e'};">🔋 ${meter.batteryLevel}%</span>` 
      : ''
    const signalInfo = meter.signalStrength != null 
      ? `<span style="color: #60a5fa;">📶 ${meter.signalStrength} dBm</span>` 
      : ''
    
    // Dynamic colors based on color mode
    const subtextColor = isDark.value ? '#9ca3af' : '#6b7280'
    const borderColor = isDark.value ? '#374151' : '#e5e7eb'
    
    // Create popup content with module info
    const popupContent = `
      <div style="min-width: 180px;">
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${meter.serialNumber}</div>
        <div style="color: ${subtextColor}; font-size: 12px; margin-bottom: 8px;">${meter.customerName || 'No customer'}</div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; font-size: 11px; margin-bottom: 6px;">
          ${meter.hasAlarm ? '<span style="color: #ef4444;">⚠ Alarm</span>' : ''}
          ${meter.isHighUsage ? '<span style="color: #f97316;">📈 High Usage</span>' : ''}
          ${meter.isOffline ? '<span style="color: #6b7280;">📵 Offline</span>' : ''}
          ${!meter.hasAlarm && !meter.isHighUsage && !meter.isOffline ? '<span style="color: #22c55e;">✓ Normal</span>' : ''}
        </div>
        ${(batteryInfo || signalInfo) ? `
          <div style="display: flex; gap: 8px; font-size: 11px; padding-top: 6px; border-top: 1px solid ${borderColor};">
            ${batteryInfo}
            ${signalInfo}
          </div>
        ` : ''}
      </div>
    `
    
    marker.bindPopup(popupContent)
    markerLayer?.addLayer(marker)
  })
  
  // Fit bounds to show all markers if we have data
  if (meters.value.length > 0 && map) {
    const bounds = meters.value.map(m => [m.latitude, m.longitude] as [number, number])
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
  }
}

// Watch for meter data changes
watch(meters, () => {
  updateMarkers()
}, { deep: true })

// Watch for color mode changes
watch(isDark, () => {
  updateTileLayer()
})

// Fetch map data on mount
onMounted(async () => {
  // Fetch data first
  await dashboardStore.fetchMapData(appStore.activeTenantId ?? undefined)
  
  // Wait for DOM then init map
  nextTick(() => {
    initMap()
  })
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <div ref="mapContainer" :class="['w-full', props.class]" />
</template>

<style>
/* Fix Leaflet CSS issues - Base styles */
.leaflet-container {
  font-family: inherit;
}

.custom-marker {
  background: transparent;
  border: none;
}

/* ============================================
   LIGHT MODE (default)
   ============================================ */
.leaflet-container {
  background: hsl(0 0% 96%);
}

.leaflet-popup-content-wrapper {
  background: white;
  color: hsl(222 47% 11%);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.leaflet-popup-tip {
  background: white;
}

.leaflet-popup-close-button {
  color: hsl(215 20% 45%);
}

.leaflet-control-zoom a {
  background: white !important;
  color: hsl(222 47% 11%) !important;
  border-color: hsl(220 13% 85%) !important;
}

.leaflet-control-zoom a:hover {
  background: hsl(220 13% 95%) !important;
}

.leaflet-control-attribution {
  background: rgba(255, 255, 255, 0.8) !important;
  color: hsl(215 20% 45%) !important;
}

.leaflet-control-attribution a {
  color: hsl(200 100% 35%) !important;
}

/* ============================================
   DARK MODE
   ============================================ */
html.dark .leaflet-container {
  background: hsl(222 47% 11%);
}

html.dark .leaflet-popup-content-wrapper {
  background: hsl(222 47% 13%);
  color: hsl(210 40% 98%);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

html.dark .leaflet-popup-tip {
  background: hsl(222 47% 13%);
}

html.dark .leaflet-popup-close-button {
  color: hsl(215 20.2% 65.1%);
}

html.dark .leaflet-control-zoom a {
  background: hsl(222 47% 13%) !important;
  color: hsl(210 40% 98%) !important;
  border-color: hsl(217.2 32.6% 20%) !important;
}

html.dark .leaflet-control-zoom a:hover {
  background: hsl(217.2 32.6% 17.5%) !important;
}

html.dark .leaflet-control-attribution {
  background: hsl(222 47% 11% / 0.8) !important;
  color: hsl(215 20.2% 65.1%) !important;
}

html.dark .leaflet-control-attribution a {
  color: hsl(187 100% 42%) !important;
}
</style>
