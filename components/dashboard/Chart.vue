<script setup lang="ts">
const props = defineProps<{
  class?: string
}>()

// Stores
const dashboardStore = useDashboardStore()
const appStore = useAppStore()

// Chart component (client-side only)
const VueApexCharts = defineAsyncComponent(() =>
  import('vue3-apexcharts').then(m => m.default)
)

// Computed chart data from store
const isLoading = computed(() => dashboardStore.consumptionLoading)
const hasData = computed(() => dashboardStore.consumptionData.length > 0)

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
      formatter: (val: number) => `${val.toLocaleString()} m³`,
    },
  },
  tooltip: {
    theme: 'dark',
    x: {
      format: 'MMM dd, yyyy',
    },
    y: {
      formatter: (val: number) => `${val.toLocaleString()} m³`,
    },
  },
  noData: {
    text: 'No consumption data available',
    style: {
      color: 'hsl(215 20.2% 65.1%)',
      fontSize: '14px',
    },
  },
}))

// Chart series from store
const chartSeries = computed(() => dashboardStore.chartSeries)

// Fetch consumption data on mount
onMounted(() => {
  dashboardStore.fetchConsumptionChart(appStore.activeTenantId ?? undefined, 30)
})
</script>

<template>
  <div :class="props.class">
    <ClientOnly>
      <div v-if="isLoading" class="flex items-center justify-center h-full">
        <UiSpinner size="lg" />
      </div>
      <VueApexCharts
        v-else
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

