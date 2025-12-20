<script setup lang="ts">
import {
  FileText,
  ArrowLeft,
  Edit,
  Ruler,
  Droplets,
  Wifi,
  Radio,
  Shield,
} from 'lucide-vue-next'
import type { MeterProfile } from '~/types'

definePageMeta({
  middleware: ['auth'],
})

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()

const profileId = computed(() => route.params.id as string)

// State
const profile = ref<MeterProfile | null>(null)
const isLoading = ref(true)
const showEditDialog = ref(false)

// Fetch profile details
const fetchProfile = async () => {
  isLoading.value = true
  try {
    const response = await api.get<MeterProfile>(`/api/v1/profiles/${profileId.value}`)
    profile.value = response
  } catch (error) {
    toast.error('Failed to load profile')
    router.push('/profiles')
  } finally {
    isLoading.value = false
  }
}

// Format flow rates
const formatFlowRate = (value?: number): string => {
  if (value === undefined || value === null) return '-'
  return `${value} m³/h`
}

// Initial fetch
onMounted(() => {
  fetchProfile()
})

// Handle edit success
const handleEditSuccess = () => {
  showEditDialog.value = false
  fetchProfile()
  toast.success('Profile updated successfully')
}
</script>

<template>
  <div class="space-y-6">
    <!-- Back button & header -->
    <div class="flex items-center gap-4">
      <UiButton variant="ghost" size="icon" @click="router.push('/profiles')">
        <ArrowLeft class="h-5 w-5" />
      </UiButton>
      
      <div class="flex-1">
        <div v-if="isLoading" class="space-y-2">
          <UiSkeleton class="h-8 w-64" />
          <UiSkeleton class="h-4 w-48" />
        </div>
        <template v-else-if="profile">
          <h1 class="text-2xl font-bold flex items-center gap-2">
            <FileText class="h-6 w-6 text-primary" />
            {{ profile.brand }} {{ profile.modelCode }}
          </h1>
          <p class="text-sm text-muted-foreground">{{ profile.meterType?.replace(/_/g, ' ') }} • Meter Profile</p>
        </template>
      </div>
      
      <UiButton v-if="profile" @click="showEditDialog = true">
        <Edit class="h-4 w-4" />
        Edit
      </UiButton>
    </div>
    
    <!-- Loading state -->
    <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <UiCard class="lg:col-span-2 p-6">
        <UiSkeleton class="h-6 w-48 mb-4" />
        <div class="grid grid-cols-2 gap-4">
          <UiSkeleton v-for="i in 8" :key="i" class="h-12" />
        </div>
      </UiCard>
      <UiCard class="p-6">
        <UiSkeleton class="h-6 w-32 mb-4" />
        <div class="space-y-3">
          <UiSkeleton v-for="i in 4" :key="i" class="h-10" />
        </div>
      </UiCard>
    </div>
    
    <!-- Content -->
    <template v-else-if="profile">
      <!-- Main content grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Technical Specifications -->
        <UiCard class="lg:col-span-2">
          <UiCardHeader>
            <UiCardTitle>Technical Specifications</UiCardTitle>
            <UiCardDescription>Mechanical meter characteristics and properties</UiCardDescription>
          </UiCardHeader>
          <UiCardContent>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <p class="text-sm text-muted-foreground">Brand</p>
                <p class="font-medium">{{ profile.brand }}</p>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Model Code</p>
                <p class="font-medium">{{ profile.modelCode }}</p>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Meter Type</p>
                <p class="font-medium">{{ profile.meterType?.replace(/_/g, ' ') }}</p>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Dial Type</p>
                <p class="font-medium">{{ profile.dialType?.replace(/_/g, ' ') }}</p>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Connection Type</p>
                <p class="font-medium">{{ profile.connectionType?.replace(/_/g, ' ') || '-' }}</p>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Mounting Type</p>
                <p class="font-medium">{{ profile.mountingType?.replace(/_/g, ' ') || '-' }}</p>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Temperature Type</p>
                <p class="font-medium">{{ profile.temperatureType || '-' }}</p>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">IP Rating</p>
                <UiBadge variant="outline">{{ profile.ipRating }}</UiBadge>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Communication Module</p>
                <UiBadge variant="secondary">
                  {{ profile.communicationModule?.replace(/_/g, ' ') }}
                </UiBadge>
              </div>
            </div>
          </UiCardContent>
        </UiCard>
        
        <!-- Compatible Device Profiles -->
        <UiCard>
          <UiCardHeader>
            <UiCardTitle class="flex items-center gap-2">
              <Radio class="h-4 w-4" />
              Compatible Devices
            </UiCardTitle>
            <UiCardDescription>
              Device profiles that can be linked to meters using this profile
            </UiCardDescription>
          </UiCardHeader>
          <UiCardContent>
            <div v-if="profile.compatibleDeviceProfiles?.length" class="space-y-3">
              <div
                v-for="dp in profile.compatibleDeviceProfiles"
                :key="dp.id"
                class="p-3 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors"
                @click="navigateTo(`/profiles/device/${dp.id}`)"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium">{{ dp.brand }} {{ dp.modelCode }}</p>
                    <p class="text-xs text-muted-foreground">
                      {{ dp.communicationTechnology?.replace(/_/g, '-') }}
                    </p>
                  </div>
                  <UiBadge variant="outline" class="text-xs">
                    {{ dp.integrationType }}
                  </UiBadge>
                </div>
              </div>
            </div>
            
            <div v-else class="text-center py-6 text-muted-foreground">
              <Radio class="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p class="text-sm">No compatible device profiles</p>
              <p class="text-xs">Edit this profile to add compatible devices</p>
            </div>
          </UiCardContent>
        </UiCard>
      </div>
      
      <!-- Dimensions & Flow Rates -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Dimensions -->
        <UiCard>
          <UiCardHeader>
            <UiCardTitle class="flex items-center gap-2">
              <Ruler class="h-4 w-4" />
              Dimensions
            </UiCardTitle>
          </UiCardHeader>
          <UiCardContent>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-muted-foreground">Diameter</p>
                <p class="font-medium">{{ profile.diameter ? `${profile.diameter} mm` : '-' }}</p>
              </div>
              <div>
                <p class="text-sm text-muted-foreground">Length</p>
                <p class="font-medium">{{ profile.length ? `${profile.length} mm` : '-' }}</p>
              </div>
              <div>
                <p class="text-sm text-muted-foreground">Width</p>
                <p class="font-medium">{{ profile.width ? `${profile.width} mm` : '-' }}</p>
              </div>
              <div>
                <p class="text-sm text-muted-foreground">Height</p>
                <p class="font-medium">{{ profile.height ? `${profile.height} mm` : '-' }}</p>
              </div>
            </div>
          </UiCardContent>
        </UiCard>
        
        <!-- Flow Rates -->
        <UiCard>
          <UiCardHeader>
            <UiCardTitle class="flex items-center gap-2">
              <Droplets class="h-4 w-4" />
              Flow Rates
            </UiCardTitle>
          </UiCardHeader>
          <UiCardContent>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-muted-foreground">Q1 (Qmin)</p>
                <p class="font-medium">{{ formatFlowRate(profile.q1) }}</p>
              </div>
              <div>
                <p class="text-sm text-muted-foreground">Q2 (Qt)</p>
                <p class="font-medium">{{ formatFlowRate(profile.q2) }}</p>
              </div>
              <div>
                <p class="text-sm text-muted-foreground">Q3 (Qn)</p>
                <p class="font-medium">{{ formatFlowRate(profile.q3) }}</p>
              </div>
              <div>
                <p class="text-sm text-muted-foreground">Q4 (Qmax)</p>
                <p class="font-medium">{{ formatFlowRate(profile.q4) }}</p>
              </div>
              <div>
                <p class="text-sm text-muted-foreground">R Value</p>
                <p class="font-medium">{{ profile.rValue || '-' }}</p>
              </div>
              <div>
                <p class="text-sm text-muted-foreground">Pressure Loss</p>
                <p class="font-medium">{{ profile.pressureLoss ? `${profile.pressureLoss} bar` : '-' }}</p>
              </div>
            </div>
          </UiCardContent>
        </UiCard>
      </div>
      
      <!-- Assigned Tenants -->
      <UiCard v-if="profile.allowedTenants?.length">
        <UiCardHeader>
          <UiCardTitle>Assigned Tenants</UiCardTitle>
          <UiCardDescription>Tenants that can use this meter profile</UiCardDescription>
        </UiCardHeader>
        <UiCardContent>
          <div class="flex flex-wrap gap-2">
            <UiBadge
              v-for="tenant in profile.allowedTenants"
              :key="tenant.id"
              variant="secondary"
              class="cursor-pointer hover:bg-secondary/80"
              @click="navigateTo(`/iam/tenants/${tenant.id}`)"
            >
              {{ tenant.name }}
            </UiBadge>
          </div>
        </UiCardContent>
      </UiCard>
    </template>
    
    <!-- Edit Dialog -->
    <UiDialog v-model:open="showEditDialog">
      <UiDialogContent class="max-w-3xl">
        <UiDialogHeader>
          <UiDialogTitle>Edit Profile</UiDialogTitle>
        </UiDialogHeader>
        <div class="overflow-y-auto flex-1 -mx-6 px-6">
          <ProfilesCreateForm
            v-if="profile"
            :profile="profile"
            mode="edit"
            @success="handleEditSuccess"
            @cancel="showEditDialog = false"
          />
        </div>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>
