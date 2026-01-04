<script setup lang="ts">
import { Gauge, Users, AlertTriangle, Wrench, WifiOff, Droplets, Cpu, Warehouse, Loader2 } from 'lucide-vue-next'

definePageMeta({
  middleware: ['auth'],
})

const { t } = useI18n()
const appStore = useAppStore()
const dashboardStore = useDashboardStore()

// Loading state
const isLoading = computed(() => dashboardStore.statsLoading)

// Fetch all dashboard data
onMounted(() => {
  dashboardStore.fetchStats(appStore.activeTenantId ?? undefined)
})

// Watch for tenant changes and refetch
watch(() => appStore.activeTenantId, (newTenantId) => {
  if (newTenantId) {
    dashboardStore.fetchAll(newTenantId)
  }
})

// Stats cards configuration with i18n keys
const statsCards = computed(() => [
  {
    labelKey: 'dashboard.totalMeters',
    value: dashboardStore.totalMeters,
    icon: Gauge,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    route: '/meters',
  },
  {
    labelKey: 'dashboard.totalCustomers',
    value: dashboardStore.totalCustomers,
    icon: Users,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    route: '/customers',
  },
  {
    labelKey: 'dashboard.totalUsage',
    value: `${dashboardStore.totalWaterUsage.toLocaleString()} m³`,
    icon: Droplets,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    route: '/readings',
  },
  {
    labelKey: 'dashboard.activeAlarms',
    value: dashboardStore.activeAlarms,
    icon: AlertTriangle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    route: '/alarms',
  },
  {
    labelKey: 'dashboard.inMaintenance',
    value: dashboardStore.metersInMaintenance,
    icon: Wrench,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    route: '/meters',
  },
  {
    labelKey: 'dashboard.offline',
    value: dashboardStore.metersOffline,
    icon: WifiOff,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    route: '/meters',
  },
])

// Module stats cards (for Asset/Module separation visibility)
const moduleStatsCards = computed(() => [
  {
    labelKey: 'dashboard.totalModules',
    value: dashboardStore.totalModules,
    icon: Cpu,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    route: '/modules',
  },
  {
    labelKey: 'dashboard.modulesInWarehouse',
    value: dashboardStore.modulesInWarehouse,
    icon: Warehouse,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    route: '/modules',
  },
])
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">{{ $t('dashboard.title') }}</h1>
        <p class="text-muted-foreground">{{ $t('dashboard.description') }}</p>
      </div>
      <div v-if="isLoading" class="flex items-center gap-2 text-muted-foreground">
        <Loader2 class="h-4 w-4 animate-spin" />
        <span class="text-sm">{{ $t('common.loading') }}</span>
      </div>
    </div>
    
    <!-- Main Stats grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <NuxtLink v-for="stat in statsCards" :key="stat.labelKey" :to="stat.route" class="block">
        <UiCard hover class="h-full cursor-pointer transition-shadow hover:shadow-md">
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
      </NuxtLink>
    </div>
    
    <!-- Module Stats (Asset/Module Separation) -->
    <div v-if="dashboardStore.totalModules > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <NuxtLink v-for="stat in moduleStatsCards" :key="stat.labelKey" :to="stat.route" class="block">
        <UiCard hover class="h-full cursor-pointer transition-shadow hover:shadow-md">
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
      </NuxtLink>
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
