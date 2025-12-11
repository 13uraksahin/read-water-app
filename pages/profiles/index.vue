<script setup lang="ts">
import { FileText, Radio, Plus, Search, Code, Settings } from 'lucide-vue-next'
import type { MeterProfile, DeviceProfile, PaginatedResponse } from '~/types'

definePageMeta({
  middleware: ['auth'],
})

const { t } = useI18n()
const api = useApi()
const toast = useToast()

// Active tab
const activeTab = ref<'meter' | 'device'>('meter')

// State
const meterProfiles = ref<MeterProfile[]>([])
const deviceProfiles = ref<DeviceProfile[]>([])
const isLoadingMeter = ref(true)
const isLoadingDevice = ref(true)
const showCreateMeterDialog = ref(false)
const showCreateDeviceDialog = ref(false)
const searchQuery = ref('')

// Fetch meter profiles
const fetchMeterProfiles = async () => {
  isLoadingMeter.value = true
  try {
    const response = await api.getList<MeterProfile>('/api/v1/profiles', {
      search: searchQuery.value || undefined,
      limit: 100,
    })
    meterProfiles.value = response.data
  } catch (error) {
    toast.error('Failed to fetch meter profiles')
  } finally {
    isLoadingMeter.value = false
  }
}

// Fetch device profiles
const fetchDeviceProfiles = async () => {
  isLoadingDevice.value = true
  try {
    const response = await api.getList<DeviceProfile>('/api/v1/device-profiles', {
      search: searchQuery.value || undefined,
      limit: 100,
    })
    deviceProfiles.value = response.data
  } catch (error) {
    toast.error('Failed to fetch device profiles')
  } finally {
    isLoadingDevice.value = false
  }
}

// Initial fetch
onMounted(() => {
  fetchMeterProfiles()
  fetchDeviceProfiles()
})

// Watch for search changes
watch(searchQuery, () => {
  if (activeTab.value === 'meter') {
    fetchMeterProfiles()
  } else {
    fetchDeviceProfiles()
  }
})

// Watch tab changes to refresh if needed
watch(activeTab, () => {
  searchQuery.value = ''
})

// Handle create success
const handleMeterCreateSuccess = () => {
  showCreateMeterDialog.value = false
  fetchMeterProfiles()
  toast.success('Meter profile created successfully')
}

const handleDeviceCreateSuccess = () => {
  showCreateDeviceDialog.value = false
  fetchDeviceProfiles()
  toast.success('Device profile created successfully')
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <FileText class="h-6 w-6 text-primary" />
          {{ t('profiles.title', 'Profiles') }}
        </h1>
        <p class="text-muted-foreground">{{ t('profiles.description', 'Manage meter and device profiles') }}</p>
      </div>
      
      <div class="flex gap-2">
        <UiButton v-if="activeTab === 'meter'" @click="showCreateMeterDialog = true">
          <Plus class="h-4 w-4" />
          {{ t('profiles.addMeterProfile', 'Add Meter Profile') }}
        </UiButton>
        <UiButton v-else @click="showCreateDeviceDialog = true">
          <Plus class="h-4 w-4" />
          {{ t('profiles.addDeviceProfile', 'Add Device Profile') }}
        </UiButton>
      </div>
    </div>
    
    <!-- Tabs -->
    <div class="border-b border-border">
      <nav class="-mb-px flex gap-4">
        <button
          class="px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2"
          :class="activeTab === 'meter' 
            ? 'border-primary text-primary' 
            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'"
          @click="activeTab = 'meter'"
        >
          <FileText class="h-4 w-4" />
          {{ t('profiles.meterProfiles', 'Meter Profiles') }}
          <UiBadge variant="secondary" class="ml-1">{{ meterProfiles.length }}</UiBadge>
        </button>
        
        <button
          class="px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2"
          :class="activeTab === 'device' 
            ? 'border-primary text-primary' 
            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'"
          @click="activeTab = 'device'"
        >
          <Radio class="h-4 w-4" />
          {{ t('profiles.deviceProfiles', 'Device Profiles') }}
          <UiBadge variant="secondary" class="ml-1">{{ deviceProfiles.length }}</UiBadge>
        </button>
      </nav>
    </div>
    
    <!-- Search -->
    <UiCard class="p-4">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <UiInput
          v-model="searchQuery"
          :placeholder="activeTab === 'meter' 
            ? 'Search by brand, model code...' 
            : 'Search by brand, model, technology...'"
          class="pl-10"
        />
      </div>
    </UiCard>
    
    <!-- Meter Profiles Tab -->
    <template v-if="activeTab === 'meter'">
      <div class="mb-4">
        <p class="text-sm text-muted-foreground">
          {{ t('profiles.meterProfilesDescription', 'Mechanical water meter specifications') }}
        </p>
      </div>
      
      <div v-if="isLoadingMeter" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <UiCard v-for="i in 6" :key="i" class="p-6">
          <UiSkeleton class="h-6 w-3/4 mb-4" />
          <UiSkeleton class="h-4 w-1/2 mb-2" />
          <UiSkeleton class="h-4 w-2/3" />
        </UiCard>
      </div>
      
      <div v-else-if="meterProfiles.length === 0" class="text-center py-12">
        <FileText class="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p class="font-medium">{{ t('profiles.noProfiles', 'No profiles found') }}</p>
        <p class="text-sm text-muted-foreground">{{ t('profiles.noProfilesHint', 'Add a new meter profile to get started') }}</p>
      </div>
      
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <UiCard
          v-for="profile in meterProfiles"
          :key="profile.id"
          hover
          @click="navigateTo(`/profiles/${profile.id}`)"
        >
          <UiCardHeader>
            <div class="flex items-start justify-between">
              <div>
                <UiCardTitle class="text-lg">{{ profile.brand }} {{ profile.modelCode }}</UiCardTitle>
                <UiCardDescription>{{ profile.meterType?.replace(/_/g, ' ') }}</UiCardDescription>
              </div>
              <UiBadge variant="secondary">
                {{ profile.communicationModule }}
              </UiBadge>
            </div>
          </UiCardHeader>
          <UiCardContent>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-muted-foreground">Dial Type:</span>
                <span>{{ profile.dialType?.replace(/_/g, ' ') }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">IP Rating:</span>
                <span>{{ profile.ipRating }}</span>
              </div>
              <div v-if="profile.diameter" class="flex justify-between">
                <span class="text-muted-foreground">Diameter:</span>
                <span>{{ profile.diameter }} mm</span>
              </div>
              <div v-if="profile._count?.meters" class="flex justify-between">
                <span class="text-muted-foreground">Meters:</span>
                <span>{{ profile._count.meters }}</span>
              </div>
            </div>
            
            <!-- Compatible Device Profiles -->
            <div v-if="profile.compatibleDeviceProfiles?.length" class="mt-4 pt-4 border-t border-border">
              <p class="text-xs text-muted-foreground mb-2">Compatible Devices:</p>
              <div class="flex flex-wrap gap-1">
                <UiBadge
                  v-for="dp in profile.compatibleDeviceProfiles.slice(0, 3)"
                  :key="dp.id"
                  variant="outline"
                  class="text-xs"
                >
                  {{ dp.brand }} {{ dp.modelCode }}
                </UiBadge>
                <UiBadge
                  v-if="profile.compatibleDeviceProfiles.length > 3"
                  variant="outline"
                  class="text-xs"
                >
                  +{{ profile.compatibleDeviceProfiles.length - 3 }} more
                </UiBadge>
              </div>
            </div>
          </UiCardContent>
        </UiCard>
      </div>
    </template>
    
    <!-- Device Profiles Tab -->
    <template v-else>
      <div class="mb-4">
        <p class="text-sm text-muted-foreground">
          {{ t('profiles.deviceProfilesDescription', 'Communication device configurations and decoders') }}
        </p>
      </div>
      
      <div v-if="isLoadingDevice" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <UiCard v-for="i in 6" :key="i" class="p-6">
          <UiSkeleton class="h-6 w-3/4 mb-4" />
          <UiSkeleton class="h-4 w-1/2 mb-2" />
          <UiSkeleton class="h-4 w-2/3" />
        </UiCard>
      </div>
      
      <div v-else-if="deviceProfiles.length === 0" class="text-center py-12">
        <Radio class="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p class="font-medium">{{ t('profiles.noProfiles', 'No profiles found') }}</p>
        <p class="text-sm text-muted-foreground">Add a new device profile to get started</p>
      </div>
      
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <UiCard
          v-for="profile in deviceProfiles"
          :key="profile.id"
          hover
          @click="navigateTo(`/profiles/device/${profile.id}`)"
        >
          <UiCardHeader>
            <div class="flex items-start justify-between">
              <div>
                <UiCardTitle class="text-lg">{{ profile.brand }} {{ profile.modelCode }}</UiCardTitle>
                <UiCardDescription>{{ profile.communicationTechnology?.replace(/_/g, '-') }}</UiCardDescription>
              </div>
              <UiBadge variant="outline">
                {{ profile.integrationType }}
              </UiBadge>
            </div>
          </UiCardHeader>
          <UiCardContent>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-muted-foreground">Brand:</span>
                <span>{{ profile.brand }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">Technology:</span>
                <UiBadge variant="secondary" class="text-xs">
                  {{ profile.communicationTechnology?.replace(/_/g, '-') }}
                </UiBadge>
              </div>
              <div v-if="profile.batteryLifeMonths" class="flex justify-between">
                <span class="text-muted-foreground">Battery Life:</span>
                <span>{{ profile.batteryLifeMonths }} months</span>
              </div>
            </div>
            
            <!-- Status indicators -->
            <div class="mt-4 pt-4 border-t border-border flex items-center gap-3">
              <div class="flex items-center gap-1 text-xs">
                <Code class="h-3 w-3" />
                <span :class="profile.decoderFunction ? 'text-green-600' : 'text-muted-foreground'">
                  {{ profile.decoderFunction ? 'Decoder ✓' : 'No Decoder' }}
                </span>
              </div>
              <div class="flex items-center gap-1 text-xs">
                <Settings class="h-3 w-3" />
                <span>{{ profile.fieldDefinitions?.length || 0 }} Fields</span>
              </div>
            </div>
            
            <!-- Field definitions preview -->
            <div v-if="profile.fieldDefinitions?.length" class="mt-3">
              <div class="flex flex-wrap gap-1">
                <UiBadge
                  v-for="field in profile.fieldDefinitions.slice(0, 4)"
                  :key="field.name"
                  variant="outline"
                  class="text-xs"
                >
                  {{ field.name }}
                </UiBadge>
                <UiBadge
                  v-if="profile.fieldDefinitions.length > 4"
                  variant="outline"
                  class="text-xs"
                >
                  +{{ profile.fieldDefinitions.length - 4 }}
                </UiBadge>
              </div>
            </div>
          </UiCardContent>
        </UiCard>
      </div>
    </template>
    
    <!-- Create Meter Profile Dialog -->
    <UiDialog 
      v-model:open="showCreateMeterDialog" 
      title="Add Meter Profile" 
      description="Create a new meter profile with technical specifications"
      class="max-w-3xl"
    >
      <ProfilesCreateForm
        @success="handleMeterCreateSuccess"
        @cancel="showCreateMeterDialog = false"
      />
    </UiDialog>
    
    <!-- Create Device Profile Dialog -->
    <UiDialog 
      v-model:open="showCreateDeviceDialog" 
      title="Add Device Profile" 
      description="Create a new device profile with communication settings and decoder"
      class="max-w-3xl"
    >
      <ProfilesDeviceCreateForm
        @success="handleDeviceCreateSuccess"
        @cancel="showCreateDeviceDialog = false"
      />
    </UiDialog>
  </div>
</template>
