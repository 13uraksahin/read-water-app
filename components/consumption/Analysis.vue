<script setup lang="ts">
import { BarChart3, TrendingUp, Calendar, CalendarIcon } from 'lucide-vue-next'
import type { Reading } from '~/types'
import { BarChart } from '~/components/ui/chart-bar'

const props = defineProps<{
  /** The source type to query readings: 'meter', 'module', 'subscription', or 'customer' */
  sourceType: 'meter' | 'module' | 'subscription' | 'customer'
  /** The ID of the source entity */
  sourceId: string
  /** Custom title */
  title?: string
  /** Custom description */
  description?: string
}>()

const api = useApi()

// State
const readings = ref<Reading[]>([])
const isLoading = ref(true)
const viewMode = ref<'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'half-yearly' | 'yearly' | 'all'>('hourly')

// Date selectors
const selectedDateTime = ref(new Date().toISOString().slice(0, 16)) // For hourly (datetime-local)
const selectedDate = ref(new Date().toISOString().split('T')[0]) // For daily, weekly
const selectedMonth = ref(new Date().toISOString().slice(0, 7)) // For monthly

// Quarter selectors
const selectedQuarter = ref<string>('')
const selectedHalf = ref<string>('')
const selectedYear = ref<string>('')

// Available periods (populated from data)
const availableQuarters = ref<{ label: string; value: string }[]>([])
const availableHalfYears = ref<{ label: string; value: string }[]>([])
const availableYears = ref<{ label: string; value: string }[]>([])

// View mode options
const viewModeOptions = [
  { label: 'Hourly', value: 'hourly' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Half-Yearly', value: 'half-yearly' },
  { label: 'Yearly', value: 'yearly' },
  { label: 'All Time', value: 'all' },
]

// Calculate limit based on view mode
const fetchLimit = computed(() => {
  switch (viewMode.value) {
    case 'hourly': return 500
    case 'daily': return 45 * 24
    case 'weekly': return 52 * 7 * 24
    case 'monthly': return 365 * 24
    case 'quarterly': return 365 * 2 * 24
    case 'half-yearly': return 365 * 3 * 24
    case 'yearly': return 365 * 5 * 24
    case 'all': return 10000
    default: return 1000
  }
})

// Fetch readings for chart
const fetchChartData = async () => {
  isLoading.value = true
  try {
    const params: Record<string, string | number> = {
      limit: fetchLimit.value,
    }
    
    // Set the appropriate filter based on source type
    switch (props.sourceType) {
      case 'meter':
        params.meterId = props.sourceId
        break
      case 'module':
        params.sourceDeviceId = props.sourceId
        break
      case 'subscription':
        // For subscriptions, we need to fetch meters first and get their readings
        // This is handled differently - get readings for subscription
        params.subscriptionId = props.sourceId
        break
      case 'customer':
        params.customerId = props.sourceId
        break
    }
    
    const response = await api.getList<Reading>('/api/v1/readings', params)
    readings.value = response.data
    
    // Update available periods after fetching
    updateAvailablePeriods()
  } catch (error) {
    console.error('Failed to fetch readings:', error)
  } finally {
    isLoading.value = false
  }
}

// Update available periods from readings data
const updateAvailablePeriods = () => {
  if (!readings.value.length) return
  
  const quarters = new Set<string>()
  const halves = new Set<string>()
  const years = new Set<string>()
  
  readings.value.forEach(reading => {
    const date = new Date(reading.time)
    const year = date.getFullYear()
    const quarter = Math.ceil((date.getMonth() + 1) / 3)
    const half = date.getMonth() < 6 ? 'H1' : 'H2'
    
    quarters.add(`${year}-Q${quarter}`)
    halves.add(`${year}-${half}`)
    years.add(year.toString())
  })
  
  // Sort and convert to options
  availableQuarters.value = Array.from(quarters)
    .sort((a, b) => b.localeCompare(a))
    .map(q => {
      const [year, qtr] = q.split('-')
      return { label: `${qtr} ${year}`, value: q }
    })
  
  availableHalfYears.value = Array.from(halves)
    .sort((a, b) => b.localeCompare(a))
    .map(h => {
      const [year, half] = h.split('-')
      return { label: `${half === 'H1' ? 'First Half' : 'Second Half'} ${year}`, value: h }
    })
  
  availableYears.value = Array.from(years)
    .sort((a, b) => parseInt(b) - parseInt(a))
    .map(y => ({ label: y, value: y }))
  
  // Set defaults if not already set
  if (!selectedQuarter.value && availableQuarters.value.length) {
    selectedQuarter.value = availableQuarters.value[0].value
  }
  if (!selectedHalf.value && availableHalfYears.value.length) {
    selectedHalf.value = availableHalfYears.value[0].value
  }
  if (!selectedYear.value && availableYears.value.length) {
    selectedYear.value = availableYears.value[0].value
  }
}

// Get ISO week number
const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// Process data based on view mode
const chartData = computed(() => {
  if (!readings.value.length) return []
  
  // Filter readings by selected date/time range
  let filteredReadings = [...readings.value]
  
  switch (viewMode.value) {
    case 'hourly':
      // Filter by selected date (from datetime-local)
      const selectedDateOnly = selectedDateTime.value.split('T')[0]
      filteredReadings = readings.value.filter(r => {
        const date = new Date(r.time).toISOString().split('T')[0]
        return date === selectedDateOnly
      })
      break
    case 'daily':
    case 'weekly':
      // Filter to show readings around the selected date
      break
    case 'monthly':
      // Filter by selected month
      filteredReadings = readings.value.filter(r => {
        const date = new Date(r.time).toISOString().slice(0, 7)
        return date === selectedMonth.value
      })
      break
    case 'quarterly':
      // Filter by selected quarter
      if (selectedQuarter.value) {
        const [year, qtr] = selectedQuarter.value.split('-')
        const quarterNum = parseInt(qtr.replace('Q', ''))
        filteredReadings = readings.value.filter(r => {
          const date = new Date(r.time)
          const readingYear = date.getFullYear()
          const readingQuarter = Math.ceil((date.getMonth() + 1) / 3)
          return readingYear.toString() === year && readingQuarter === quarterNum
        })
      }
      break
    case 'half-yearly':
      // Filter by selected half
      if (selectedHalf.value) {
        const [year, half] = selectedHalf.value.split('-')
        filteredReadings = readings.value.filter(r => {
          const date = new Date(r.time)
          const readingYear = date.getFullYear()
          const readingHalf = date.getMonth() < 6 ? 'H1' : 'H2'
          return readingYear.toString() === year && readingHalf === half
        })
      }
      break
    case 'yearly':
      // Filter by selected year
      if (selectedYear.value) {
        filteredReadings = readings.value.filter(r => {
          const date = new Date(r.time)
          return date.getFullYear().toString() === selectedYear.value
        })
      }
      break
    // 'all' - no filtering needed
  }
  
  // Group readings based on view mode
  const grouped = new Map<string, number[]>()
  
  filteredReadings.forEach(reading => {
    const date = new Date(reading.time)
    let key: string
    
    switch (viewMode.value) {
      case 'hourly':
        key = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
        break
      case 'daily':
        key = date.toLocaleDateString('en-CA') // YYYY-MM-DD
        break
      case 'weekly':
        const weekNum = getWeekNumber(date)
        key = `${date.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`
        break
      case 'monthly':
        key = date.toLocaleDateString('en-CA').slice(5, 10) // MM-DD (day within month)
        break
      case 'quarterly':
        key = date.toLocaleDateString('en-US', { month: 'short' }) // Month within quarter
        break
      case 'half-yearly':
        key = date.toLocaleDateString('en-US', { month: 'short' }) // Month within half
        break
      case 'yearly':
        key = date.toLocaleDateString('en-US', { month: 'short' }) // Month within year
        break
      case 'all':
        key = date.toLocaleDateString('en-CA').slice(0, 7) // YYYY-MM for all time
        break
      default:
        key = date.toLocaleDateString('en-CA')
    }
    
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(Number(reading.consumption || 0))
  })
  
  // Sort and transform to chart format
  const sortedKeys = Array.from(grouped.keys()).sort((a, b) => {
    // Sort based on view mode
    if (viewMode.value === 'hourly') {
      return a.localeCompare(b)
    }
    return a.localeCompare(b)
  })
  
  // Limit displayed data points
  let displayKeys = sortedKeys
  const maxPoints = viewMode.value === 'hourly' ? 24 : viewMode.value === 'all' ? 24 : 31
  if (displayKeys.length > maxPoints) {
    displayKeys = displayKeys.slice(-maxPoints)
  }
  
  // Transform to chart data format
  return displayKeys.map(key => {
    const values = grouped.get(key) || []
    const total = values.reduce((sum, val) => sum + val, 0)
    return {
      label: formatLabel(key),
      consumption: Number(total.toFixed(4)),
    }
  })
})

// Format label for display
const formatLabel = (key: string): string => {
  switch (viewMode.value) {
    case 'hourly':
      return key
    case 'daily':
      return new Date(key).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })
    case 'weekly':
      return key.replace('-W', ' W')
    case 'monthly':
      // key is MM-DD
      const [month, day] = key.split('-')
      return `${parseInt(day)}`
    case 'quarterly':
    case 'half-yearly':
    case 'yearly':
      return key
    case 'all':
      return new Date(key + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    default:
      return key
  }
}

// Statistics
const stats = computed(() => {
  const data = chartData.value
  if (!data.length) return { total: 0, avg: 0, max: 0, min: 0 }
  
  const values = data.map(d => d.consumption)
  const total = values.reduce((sum, val) => sum + val, 0)
  const avg = total / values.length
  const max = Math.max(...values)
  const min = Math.min(...values)
  
  return { total, avg, max, min }
})

// Chart categories and index
const chartCategories = ['consumption'] as const
const chartIndex = 'label' as const

// Chart config for tooltip
const chartConfig = {
  consumption: {
    label: 'Consumption (m³)',
    color: 'hsl(var(--primary))',
  },
}

// Y-axis formatter
const yFormatter = (value: number | Date) => {
  if (typeof value === 'number') {
    return value.toFixed(viewMode.value === 'hourly' ? 4 : 3)
  }
  return String(value)
}

// Watch for changes and refetch
watch([() => props.sourceId, () => props.sourceType], fetchChartData, { immediate: true })

// When view mode changes, ensure we have data
watch(viewMode, () => {
  // Just re-process, no need to refetch
})
</script>

<template>
  <UiCard>
    <UiCardHeader>
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <UiCardTitle class="flex items-center gap-2">
            <BarChart3 class="h-5 w-5" />
            {{ title || 'Consumption Analysis' }}
          </UiCardTitle>
          <UiCardDescription>{{ description || 'Water consumption over time' }}</UiCardDescription>
        </div>
        
        <div class="flex flex-wrap items-center gap-3">
          <!-- View Mode Selector -->
          <div class="flex flex-wrap rounded-lg border border-border p-1 gap-1">
            <button
              v-for="mode in viewModeOptions"
              :key="mode.value"
              class="px-2 py-1 text-xs rounded-md transition-colors whitespace-nowrap"
              :class="viewMode === mode.value 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-muted text-muted-foreground'"
              @click="viewMode = mode.value as typeof viewMode"
            >
              {{ mode.label }}
            </button>
          </div>
          
          <!-- DateTime Selector (for hourly view) -->
          <div v-if="viewMode === 'hourly'" class="flex items-center gap-2">
            <CalendarIcon class="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              v-model="selectedDate"
              @change="selectedDateTime = `${selectedDate}T00:00`"
              class="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          
          <!-- Date Selector (for daily/weekly) -->
          <div v-if="viewMode === 'daily' || viewMode === 'weekly'" class="flex items-center gap-2">
            <CalendarIcon class="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              v-model="selectedDate"
              class="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          
          <!-- Month Selector -->
          <div v-if="viewMode === 'monthly'" class="flex items-center gap-2">
            <CalendarIcon class="h-4 w-4 text-muted-foreground" />
            <input
              type="month"
              v-model="selectedMonth"
              class="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          
          <!-- Quarter Selector -->
          <select
            v-if="viewMode === 'quarterly' && availableQuarters.length"
            v-model="selectedQuarter"
            class="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option v-for="q in availableQuarters" :key="q.value" :value="q.value">
              {{ q.label }}
            </option>
          </select>
          
          <!-- Half-Year Selector -->
          <select
            v-if="viewMode === 'half-yearly' && availableHalfYears.length"
            v-model="selectedHalf"
            class="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option v-for="h in availableHalfYears" :key="h.value" :value="h.value">
              {{ h.label }}
            </option>
          </select>
          
          <!-- Year Selector -->
          <select
            v-if="viewMode === 'yearly' && availableYears.length"
            v-model="selectedYear"
            class="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option v-for="y in availableYears" :key="y.value" :value="y.value">
              {{ y.label }}
            </option>
          </select>
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
      
      <div v-else-if="!chartData.length" class="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
        <TrendingUp class="h-12 w-12 mb-2 opacity-50" />
        <p>No consumption data available</p>
        <p class="text-sm">Try selecting a different time period</p>
      </div>
      
      <ClientOnly v-else>
        <BarChart
          :data="chartData"
          :categories="chartCategories"
          :index="chartIndex"
          :y-formatter="yFormatter"
          :colors="['hsl(var(--primary))']"
          :rounded-corners="4"
          :show-legend="false"
          class="h-[300px]"
        />
      </ClientOnly>
    </UiCardContent>
  </UiCard>
</template>
