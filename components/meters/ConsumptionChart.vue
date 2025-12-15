<script setup lang="ts">
import { Activity, TrendingUp, Calendar, BarChart3 } from 'lucide-vue-next'
import type { Reading } from '~/types'

const props = defineProps<{
  meterId: string
}>()

const api = useApi()

// State
const readings = ref<Reading[]>([])
const isLoading = ref(true)
const chartType = ref<'daily' | 'hourly'>('daily')
const period = ref<'7d' | '30d' | '45d'>('7d')

// Fetch readings for chart
const fetchChartData = async () => {
  isLoading.value = true
  try {
    const days = period.value === '7d' ? 7 : period.value === '30d' ? 30 : 45
    const response = await api.getList<Reading>('/api/v1/readings', {
      meterId: props.meterId,
      limit: days * 24, // Get enough readings for the period
    })
    readings.value = response.data
  } catch (error) {
    console.error('Failed to fetch readings:', error)
  } finally {
    isLoading.value = false
  }
}

// Process data for daily aggregation
const dailyData = computed(() => {
  if (!readings.value.length) return { categories: [], series: [] }
  
  // Group readings by date
  const grouped = readings.value.reduce((acc, reading) => {
    const date = new Date(reading.time).toLocaleDateString('en-CA') // YYYY-MM-DD format
    if (!acc[date]) acc[date] = []
    acc[date].push(Number(reading.consumption || 0))
    return acc
  }, {} as Record<string, number[]>)
  
  // Sort by date and calculate daily totals
  const sortedDates = Object.keys(grouped).sort()
  const days = period.value === '7d' ? 7 : period.value === '30d' ? 30 : 45
  const recentDates = sortedDates.slice(-days)
  
  const categories = recentDates.map(d => {
    const date = new Date(d)
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
  })
  
  const series = recentDates.map(date => {
    const total = grouped[date].reduce((sum, val) => sum + val, 0)
    return Number(total.toFixed(3))
  })
  
  return { categories, series }
})

// Process data for hourly view (last 24 hours)
const hourlyData = computed(() => {
  if (!readings.value.length) return { categories: [], series: [] }
  
  // Get last 24 readings
  const last24 = readings.value.slice(0, 24).reverse()
  
  const categories = last24.map(r => {
    const date = new Date(r.time)
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  })
  
  const series = last24.map(r => Number((r.consumption || 0).toFixed(4)))
  
  return { categories, series }
})

// Chart options
const chartOptions = computed(() => {
  const data = chartType.value === 'daily' ? dailyData.value : hourlyData.value
  
  return {
    chart: {
      type: 'bar',
      height: 300,
      toolbar: { show: false },
      fontFamily: 'inherit',
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '60%',
      },
    },
    dataLabels: { enabled: false },
    colors: ['#3b82f6'],
    xaxis: {
      categories: data.categories,
      labels: {
        style: {
          fontSize: '11px',
        },
        rotate: chartType.value === 'hourly' ? -45 : 0,
      },
    },
    yaxis: {
      title: {
        text: 'Consumption (m³)',
        style: { fontSize: '12px' },
      },
      labels: {
        formatter: (val: number) => val.toFixed(chartType.value === 'hourly' ? 3 : 2),
      },
    },
    tooltip: {
      y: {
        formatter: (val: number) => `${val.toFixed(3)} m³`,
      },
    },
    grid: {
      borderColor: '#e2e8f0',
      strokeDashArray: 4,
    },
  }
})

// Chart series
const chartSeries = computed(() => {
  const data = chartType.value === 'daily' ? dailyData.value : hourlyData.value
  return [{
    name: chartType.value === 'daily' ? 'Daily Consumption' : 'Hourly Consumption',
    data: data.series,
  }]
})

// Statistics
const stats = computed(() => {
  const data = chartType.value === 'daily' ? dailyData.value : hourlyData.value
  if (!data.series.length) return { total: 0, avg: 0, max: 0, min: 0 }
  
  const total = data.series.reduce((sum, val) => sum + val, 0)
  const avg = total / data.series.length
  const max = Math.max(...data.series)
  const min = Math.min(...data.series)
  
  return { total, avg, max, min }
})

// Watch for changes
watch([() => props.meterId, period], fetchChartData, { immediate: true })
</script>

<template>
  <UiCard>
    <UiCardHeader>
      <div class="flex items-center justify-between">
        <div>
          <UiCardTitle class="flex items-center gap-2">
            <BarChart3 class="h-5 w-5" />
            Consumption Analysis
          </UiCardTitle>
          <UiCardDescription>Water consumption over time</UiCardDescription>
        </div>
        
        <div class="flex items-center gap-2">
          <!-- Chart Type Toggle -->
          <div class="flex rounded-lg border border-border p-1">
            <button
              class="px-3 py-1 text-sm rounded-md transition-colors"
              :class="chartType === 'daily' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
              @click="chartType = 'daily'"
            >
              <Calendar class="h-4 w-4 inline mr-1" />
              Daily
            </button>
            <button
              class="px-3 py-1 text-sm rounded-md transition-colors"
              :class="chartType === 'hourly' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
              @click="chartType = 'hourly'"
            >
              <Activity class="h-4 w-4 inline mr-1" />
              Hourly
            </button>
          </div>
          
          <!-- Period Selector (for daily view) -->
          <UiSelect
            v-if="chartType === 'daily'"
            v-model="period"
            :options="[
              { label: 'Last 7 days', value: '7d' },
              { label: 'Last 30 days', value: '30d' },
              { label: 'Last 45 days', value: '45d' },
            ]"
            class="w-36"
          />
        </div>
      </div>
    </UiCardHeader>
    
    <UiCardContent>
      <!-- Stats Row -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="text-center p-3 rounded-lg bg-muted/50">
          <p class="text-2xl font-bold text-primary">{{ stats.total.toFixed(2) }}</p>
          <p class="text-xs text-muted-foreground">Total (m³)</p>
        </div>
        <div class="text-center p-3 rounded-lg bg-muted/50">
          <p class="text-2xl font-bold">{{ stats.avg.toFixed(3) }}</p>
          <p class="text-xs text-muted-foreground">Average (m³)</p>
        </div>
        <div class="text-center p-3 rounded-lg bg-muted/50">
          <p class="text-2xl font-bold text-green-600">{{ stats.max.toFixed(3) }}</p>
          <p class="text-xs text-muted-foreground">Max (m³)</p>
        </div>
        <div class="text-center p-3 rounded-lg bg-muted/50">
          <p class="text-2xl font-bold text-blue-600">{{ stats.min.toFixed(3) }}</p>
          <p class="text-xs text-muted-foreground">Min (m³)</p>
        </div>
      </div>
      
      <!-- Chart -->
      <div v-if="isLoading" class="h-[300px] flex items-center justify-center">
        <UiSpinner class="h-8 w-8" />
      </div>
      
      <div v-else-if="!readings.length" class="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
        <TrendingUp class="h-12 w-12 mb-2 opacity-50" />
        <p>No consumption data available</p>
      </div>
      
      <ClientOnly v-else>
        <apexchart
          type="bar"
          height="300"
          :options="chartOptions"
          :series="chartSeries"
        />
      </ClientOnly>
    </UiCardContent>
  </UiCard>
</template>
