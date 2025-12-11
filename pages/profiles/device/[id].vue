<script setup lang="ts">
import {
  Radio,
  ArrowLeft,
  Edit,
  Code,
  Settings,
  Wifi,
  Battery,
  Copy,
  Play,
  Check,
  X,
} from 'lucide-vue-next'
import type { DeviceProfile } from '~/types'
import { formatDate, formatDateTime } from '~/lib/utils'

definePageMeta({
  middleware: ['auth'],
})

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()

const profileId = computed(() => route.params.id as string)

// State
const profile = ref<DeviceProfile | null>(null)
const isLoading = ref(true)
const showEditDialog = ref(false)
const isTesting = ref(false)
const testPayload = ref('')
const testResult = ref<Record<string, unknown> | null>(null)
const testError = ref<string | null>(null)

// Fetch profile details
const fetchProfile = async () => {
  isLoading.value = true
  try {
    const response = await api.get<DeviceProfile>(`/api/v1/device-profiles/${profileId.value}`)
    profile.value = response
    testPayload.value = response.testPayload || ''
  } catch (error) {
    toast.error('Failed to load device profile')
    router.push('/profiles')
  } finally {
    isLoading.value = false
  }
}

// Copy decoder to clipboard
const copyDecoder = async () => {
  if (!profile.value?.decoderFunction) return
  try {
    await navigator.clipboard.writeText(profile.value.decoderFunction)
    toast.success('Decoder copied to clipboard')
  } catch {
    toast.error('Failed to copy decoder')
  }
}

// Test decoder
const testDecoder = async () => {
  if (!profile.value?.decoderFunction || !testPayload.value) return
  
  isTesting.value = true
  testResult.value = null
  testError.value = null
  
  try {
    const response = await api.post<{ result: Record<string, unknown> }>('/api/v1/decoders/test', {
      decoderFunction: profile.value.decoderFunction,
      payload: testPayload.value,
    })
    testResult.value = response.result
  } catch (error: unknown) {
    const err = error as { message?: string }
    testError.value = err.message || 'Decoder test failed'
  } finally {
    isTesting.value = false
  }
}

// Initial fetch
onMounted(() => {
  fetchProfile()
})

// Handle edit success
const handleEditSuccess = () => {
  showEditDialog.value = false
  fetchProfile()
  toast.success('Device profile updated successfully')
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
            <Radio class="h-6 w-6 text-primary" />
            {{ profile.brand }} {{ profile.modelCode }}
          </h1>
          <p class="text-sm text-muted-foreground">
            {{ profile.communicationTechnology?.replace(/_/g, '-') }} Device Profile
          </p>
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
        <!-- Device Info -->
        <UiCard class="lg:col-span-2">
          <UiCardHeader>
            <UiCardTitle>Device Profile Information</UiCardTitle>
            <UiCardDescription>Communication device specifications</UiCardDescription>
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
                <p class="text-sm text-muted-foreground">Technology</p>
                <UiBadge variant="outline">
                  {{ profile.communicationTechnology?.replace(/_/g, '-') }}
                </UiBadge>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Integration Type</p>
                <p class="font-medium">{{ profile.integrationType }}</p>
              </div>
              
              <div v-if="profile.batteryLifeMonths">
                <p class="text-sm text-muted-foreground">Battery Life</p>
                <p class="font-medium flex items-center gap-1">
                  <Battery class="h-4 w-4" />
                  {{ profile.batteryLifeMonths }} months
                </p>
              </div>
              
              <div>
                <p class="text-sm text-muted-foreground">Created</p>
                <p class="font-medium">{{ formatDate(profile.createdAt) }}</p>
              </div>
            </div>
          </UiCardContent>
        </UiCard>
        
        <!-- Field Definitions -->
        <UiCard>
          <UiCardHeader>
            <UiCardTitle class="flex items-center gap-2">
              <Settings class="h-4 w-4" />
              Field Definitions
            </UiCardTitle>
            <UiCardDescription>Required keys when adding devices</UiCardDescription>
          </UiCardHeader>
          <UiCardContent>
            <div v-if="profile.fieldDefinitions?.length" class="space-y-3">
              <div
                v-for="field in profile.fieldDefinitions"
                :key="field.name"
                class="p-3 rounded-lg bg-muted/50"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="font-medium">{{ field.name }}</span>
                  <UiBadge v-if="field.required" variant="secondary" class="text-xs">Required</UiBadge>
                </div>
                <div class="text-xs text-muted-foreground space-y-1">
                  <p v-if="field.type">Type: {{ field.type }}</p>
                  <p v-if="field.length">Length: {{ field.length }}</p>
                  <p v-if="field.regex" class="font-mono">Regex: {{ field.regex }}</p>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-6 text-muted-foreground">
              <Settings class="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p class="text-sm">No field definitions</p>
            </div>
          </UiCardContent>
        </UiCard>
      </div>
      
      <!-- Decoder Function -->
      <UiCard>
        <UiCardHeader>
          <div class="flex items-center justify-between">
            <div>
              <UiCardTitle class="flex items-center gap-2">
                <Code class="h-4 w-4" />
                Decoder Function
              </UiCardTitle>
              <UiCardDescription>JavaScript function to decode device payloads</UiCardDescription>
            </div>
            <UiButton v-if="profile.decoderFunction" variant="outline" size="sm" @click="copyDecoder">
              <Copy class="h-4 w-4" />
              Copy
            </UiButton>
          </div>
        </UiCardHeader>
        <UiCardContent>
          <div v-if="profile.decoderFunction" class="space-y-4">
            <!-- Decoder Code -->
            <div class="rounded-lg border border-border overflow-hidden">
              <pre class="p-4 text-sm font-mono overflow-x-auto bg-muted/20 max-h-96 overflow-y-auto">{{ profile.decoderFunction }}</pre>
            </div>
            
            <!-- Test Section -->
            <div class="border-t border-border pt-4">
              <h4 class="font-medium mb-3 flex items-center gap-2">
                <Play class="h-4 w-4" />
                Test Decoder
              </h4>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <UiLabel>Test Payload (Hex)</UiLabel>
                  <UiInput
                    v-model="testPayload"
                    placeholder="e.g. 00000123005F"
                    class="font-mono"
                  />
                </div>
                <div class="flex items-end">
                  <UiButton
                    :loading="isTesting"
                    :disabled="!testPayload"
                    @click="testDecoder"
                  >
                    <Play class="h-4 w-4" />
                    Run Test
                  </UiButton>
                </div>
              </div>
              
              <!-- Test Result -->
              <div v-if="testResult || testError" class="mt-4">
                <div v-if="testError" class="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                  <div class="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                    <X class="h-4 w-4" />
                    <span class="font-medium">Test Failed</span>
                  </div>
                  <p class="text-sm text-red-700 dark:text-red-300">{{ testError }}</p>
                </div>
                
                <div v-else-if="testResult" class="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                  <div class="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                    <Check class="h-4 w-4" />
                    <span class="font-medium">Test Successful</span>
                  </div>
                  <pre class="text-sm font-mono overflow-x-auto">{{ JSON.stringify(testResult, null, 2) }}</pre>
                </div>
              </div>
              
              <!-- Last Test Info -->
              <div v-if="profile.lastTestedAt" class="mt-4 text-sm text-muted-foreground flex items-center gap-4">
                <span>Last tested: {{ formatDateTime(profile.lastTestedAt) }}</span>
                <UiBadge :variant="profile.lastTestSucceeded ? 'success' : 'destructive'" class="text-xs">
                  {{ profile.lastTestSucceeded ? 'Passed' : 'Failed' }}
                </UiBadge>
              </div>
            </div>
          </div>
          
          <div v-else class="text-center py-8 text-muted-foreground">
            <Code class="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p class="font-medium">No Decoder Function</p>
            <p class="text-sm">Edit this profile to add a decoder function</p>
          </div>
        </UiCardContent>
      </UiCard>
      
      <!-- Compatible Meter Profiles -->
      <UiCard v-if="profile.compatibleMeterProfiles?.length">
        <UiCardHeader>
          <UiCardTitle>Compatible Meter Profiles</UiCardTitle>
          <UiCardDescription>Meter profiles that can use devices with this profile</UiCardDescription>
        </UiCardHeader>
        <UiCardContent>
          <div class="flex flex-wrap gap-2">
            <UiBadge
              v-for="mp in profile.compatibleMeterProfiles"
              :key="mp.id"
              variant="secondary"
              class="cursor-pointer hover:bg-secondary/80"
              @click="navigateTo(`/profiles/${mp.id}`)"
            >
              {{ mp.brand }} {{ mp.modelCode }}
            </UiBadge>
          </div>
        </UiCardContent>
      </UiCard>
    </template>
    
    <!-- Edit Dialog -->
    <UiDialog v-model:open="showEditDialog" title="Edit Device Profile" class="max-w-3xl">
      <ProfilesDeviceCreateForm
        v-if="profile"
        :profile="profile"
        mode="edit"
        @success="handleEditSuccess"
        @cancel="showEditDialog = false"
      />
    </UiDialog>
  </div>
</template>
