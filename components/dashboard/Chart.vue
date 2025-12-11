<script setup lang="ts">
const props = defineProps<{
  class?: string
}>()

// Chart component (client-side only)
const VueApexCharts = defineAsyncComponent(() =>
  import('vue3-apexcharts').then(m => m.default)
)

// Generate mock data for last 30 days
const generateMockData = () => {
  const data = []
  const now = new Date()
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    
    // Random consumption between 50 and 200 m³
    const consumption = Math.floor(Math.random() * 150) + 50
    
    data.push({
      x: date.getTime(),
      y: consumption,
    })
  }
  
  return data
}

// Chart options
const chartOptions = computed(() => ({
  chart: {
    type: 'area' as const,
    toolbar: {
      show: false,
    },
    animations: {
      enabled: true,
      easing: 'easeinout',
      speed: 800,
    },
    background: 'transparent',
    fontFamily: 'Inter, sans-serif',
  },
  colors: ['#00d4aa'],
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.4,
      opacityTo: 0.1,
      stops: [0, 100],
    },
  },
  stroke: {
    curve: 'smooth' as const,
    width: 2,
  },
  dataLabels: {
    enabled: false,
  },
  grid: {
    borderColor: 'hsl(217.2 32.6% 20%)',
    strokeDashArray: 4,
  },
  xaxis: {
    type: 'datetime' as const,
    labels: {
      style: {
        colors: 'hsl(215 20.2% 65.1%)',
        fontSize: '11px',
      },
      datetimeFormatter: {
        day: 'MMM dd',
      },
    },
    axisBorder: {
      show: false,
    },
    axisTicks: {
      show: false,
    },
  },
  yaxis: {
    labels: {
      style: {
        colors: 'hsl(215 20.2% 65.1%)',
        fontSize: '11px',
      },
      formatter: (val: number) => `${val} m³`,
    },
  },
  tooltip: {
    theme: 'dark',
    x: {
      format: 'MMM dd, yyyy',
    },
    y: {
      formatter: (val: number) => `${val} m³`,
    },
  },
}))

// Chart series
const chartSeries = computed(() => [
  {
    name: 'Water Consumption',
    data: generateMockData(),
  },
])
</script>

<template>
  <div :class="props.class">
    <ClientOnly>
      <VueApexCharts
        type="area"
        height="100%"
        :options="chartOptions"
        :series="chartSeries"
      />
      <template #fallback>
        <div class="flex items-center justify-center h-full">
          <UiSpinner size="lg" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

