<script setup lang="ts">
import type { MeterMapData, MeterStatus } from '~/types'

const props = defineProps<{
  class?: string
}>()

// Map instance
const mapContainer = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
let markerLayer: L.LayerGroup | null = null

// Mock data for demonstration
const mockMeters: MeterMapData[] = [
  { id: '1', latitude: 39.9334, longitude: 32.8597, status: 'ACTIVE' as MeterStatus, hasAlarm: false, isHighUsage: false, isOffline: false, serialNumber: 'WM-001', customerName: 'Ahmet Yılmaz' },
  { id: '2', latitude: 39.9254, longitude: 32.8667, status: 'ACTIVE' as MeterStatus, hasAlarm: true, isHighUsage: false, isOffline: false, serialNumber: 'WM-002', customerName: 'Mehmet Demir' },
  { id: '3', latitude: 39.9404, longitude: 32.8527, status: 'ACTIVE' as MeterStatus, hasAlarm: false, isHighUsage: true, isOffline: false, serialNumber: 'WM-003', customerName: 'Ayşe Kaya' },
  { id: '4', latitude: 39.9184, longitude: 32.8697, status: 'MAINTENANCE' as MeterStatus, hasAlarm: false, isHighUsage: false, isOffline: true, serialNumber: 'WM-004', customerName: 'Fatma Öz' },
  { id: '5', latitude: 39.9364, longitude: 32.8457, status: 'ACTIVE' as MeterStatus, hasAlarm: false, isHighUsage: false, isOffline: false, serialNumber: 'WM-005', customerName: 'Ali Can' },
  { id: '6', latitude: 39.9294, longitude: 32.8787, status: 'ACTIVE' as MeterStatus, hasAlarm: false, isHighUsage: false, isOffline: false, serialNumber: 'WM-006', customerName: 'Zeynep Ak' },
]

// Get marker color based on meter status
const getMarkerColor = (meter: MeterMapData): string => {
  if (meter.isOffline) return '#6b7280' // Gray
  if (meter.hasAlarm) return '#ef4444' // Red
  if (meter.isHighUsage) return '#f97316' // Orange
  return '#22c55e' // Green
}

// Create custom marker icon
const createMarkerIcon = (color: string) => {
  if (typeof window === 'undefined') return null
  
  const L = window.L
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
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
  
  // Create map
  map = L.map(mapContainer.value, {
    center: [39.9334, 32.8597], // Ankara, Turkey
    zoom: 13,
    zoomControl: true,
  })
  
  // Add tile layer (dark theme)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  }).addTo(map)
  
  // Create marker layer
  markerLayer = L.layerGroup().addTo(map)
  
  // Add markers
  updateMarkers()
}

// Update markers on map
const updateMarkers = () => {
  if (!map || !markerLayer || typeof window === 'undefined') return
  
  const L = window.L
  
  // Clear existing markers
  markerLayer.clearLayers()
  
  // Add new markers
  mockMeters.forEach(meter => {
    const icon = createMarkerIcon(getMarkerColor(meter))
    if (!icon) return
    
    const marker = L.marker([meter.latitude, meter.longitude], { icon })
    
    // Create popup content
    const popupContent = `
      <div style="min-width: 150px;">
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${meter.serialNumber}</div>
        <div style="color: #9ca3af; font-size: 12px; margin-bottom: 8px;">${meter.customerName || 'No customer'}</div>
        <div style="display: flex; gap: 8px; font-size: 11px;">
          ${meter.hasAlarm ? '<span style="color: #ef4444;">⚠ Alarm</span>' : ''}
          ${meter.isHighUsage ? '<span style="color: #f97316;">📈 High Usage</span>' : ''}
          ${meter.isOffline ? '<span style="color: #6b7280;">📵 Offline</span>' : ''}
          ${!meter.hasAlarm && !meter.isHighUsage && !meter.isOffline ? '<span style="color: #22c55e;">✓ Normal</span>' : ''}
        </div>
      </div>
    `
    
    marker.bindPopup(popupContent)
    markerLayer?.addLayer(marker)
  })
}

// Lifecycle
onMounted(() => {
  // Wait for DOM
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
/* Fix Leaflet CSS issues */
.leaflet-container {
  font-family: inherit;
  background: hsl(222 47% 11%);
}

.leaflet-popup-content-wrapper {
  background: hsl(222 47% 13%);
  color: hsl(210 40% 98%);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.leaflet-popup-tip {
  background: hsl(222 47% 13%);
}

.leaflet-popup-close-button {
  color: hsl(215 20.2% 65.1%);
}

.leaflet-control-zoom a {
  background: hsl(222 47% 13%) !important;
  color: hsl(210 40% 98%) !important;
  border-color: hsl(217.2 32.6% 20%) !important;
}

.leaflet-control-zoom a:hover {
  background: hsl(217.2 32.6% 17.5%) !important;
}

.leaflet-control-attribution {
  background: hsl(222 47% 11% / 0.8) !important;
  color: hsl(215 20.2% 65.1%) !important;
}

.leaflet-control-attribution a {
  color: hsl(187 100% 42%) !important;
}

.custom-marker {
  background: transparent;
  border: none;
}
</style>

