<script setup lang="ts">
import { Gauge, Users, AlertTriangle, Wrench, WifiOff, Droplets } from 'lucide-vue-next'

definePageMeta({
  middleware: ['auth'],
})

const { t } = useI18n()
const appStore = useAppStore()

// Fetch dashboard stats
onMounted(() => {
  appStore.fetchStats()
})

// Stats cards configuration with i18n keys
const statsCards = computed(() => [
  {
    labelKey: 'dashboard.totalMeters',
    value: appStore.stats?.totalMeters ?? 0,
    icon: Gauge,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    labelKey: 'dashboard.totalCustomers',
    value: appStore.stats?.totalCustomers ?? 0,
    icon: Users,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    labelKey: 'dashboard.totalUsage',
    value: `${(appStore.stats?.totalWaterUsage ?? 0).toLocaleString()} m³`,
    icon: Droplets,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
  {
    labelKey: 'dashboard.activeAlarms',
    value: appStore.stats?.activeAlarms ?? 0,
    icon: AlertTriangle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  {
    labelKey: 'dashboard.inMaintenance',
    value: appStore.stats?.metersInMaintenance ?? 0,
    icon: Wrench,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    labelKey: 'dashboard.offline',
    value: appStore.stats?.metersOffline ?? 0,
    icon: WifiOff,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
  },
])
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div>
      <h1 class="text-2xl font-bold">{{ $t('dashboard.title') }}</h1>
      <p class="text-muted-foreground">{{ $t('dashboard.description') }}</p>
    </div>
    
    <!-- Stats grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <UiCard v-for="stat in statsCards" :key="stat.labelKey" hover>
        <UiCardContent class="p-4">
          <div class="flex items-center gap-4">
            <div :class="['p-3 rounded-lg', stat.bgColor]">
              <component :is="stat.icon" :class="['h-5 w-5', stat.color]" />
            </div>
            <div>
              <p class="text-2xl font-bold">{{ stat.value }}</p>
              <p class="text-sm text-muted-foreground">{{ $t(stat.labelKey) }}</p>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </div>
    
    <!-- Map and alerts grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Map section -->
      <div class="lg:col-span-2">
        <UiCard>
          <UiCardHeader>
            <UiCardTitle>{{ $t('dashboard.meterMap') }}</UiCardTitle>
            <UiCardDescription>{{ $t('dashboard.mapDescription') }}</UiCardDescription>
          </UiCardHeader>
          <UiCardContent class="p-0">
            <DashboardMap class="h-[500px] rounded-b-xl" />
          </UiCardContent>
        </UiCard>
      </div>
      
      <!-- Alerts section -->
      <div>
        <UiCard class="h-full">
          <UiCardHeader>
            <UiCardTitle class="flex items-center gap-2">
              <AlertTriangle class="h-5 w-5 text-red-500" />
              {{ $t('dashboard.alarmsTitle') }}
            </UiCardTitle>
            <UiCardDescription>{{ $t('dashboard.alarmsDescription') }}</UiCardDescription>
          </UiCardHeader>
          <UiCardContent>
            <DashboardAlarms />
          </UiCardContent>
        </UiCard>
      </div>
    </div>
    
    <!-- Recent readings chart -->
    <UiCard>
      <UiCardHeader>
        <UiCardTitle>{{ $t('dashboard.consumptionChart') }}</UiCardTitle>
        <UiCardDescription>{{ $t('dashboard.chartDescription') }}</UiCardDescription>
      </UiCardHeader>
      <UiCardContent>
        <DashboardChart class="h-[300px]" />
      </UiCardContent>
    </UiCard>
  </div>
</template>
