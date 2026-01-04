<script setup lang="ts">
import { Settings, Globe, Webhook, Server, Palette, Save } from 'lucide-vue-next'
import type { PlatformSettings } from '~/types'

definePageMeta({
  middleware: ['auth'],
})

const api = useApi()
const toast = useToast()

// State
const settings = ref<PlatformSettings | null>(null)
const isLoading = ref(true)
const isSaving = ref(false)

// Form data
const formData = reactive({
  domain: '',
  httpCallbackUrl: '',
  mqttUrl: '',
  logoUrl: '',
  platformName: '',
  platformTitle: '',
  platformDescription: '',
})

// Fetch settings
const fetchSettings = async () => {
  isLoading.value = true
  try {
    const response = await api.get<PlatformSettings>('/api/v1/settings')
    settings.value = response
    
    // Populate form
    formData.domain = response.domain || ''
    formData.httpCallbackUrl = response.httpCallbackUrl || ''
    formData.mqttUrl = response.mqttUrl || ''
    formData.logoUrl = response.logoUrl || ''
    formData.platformName = response.platformName || ''
    formData.platformTitle = response.platformTitle || ''
    formData.platformDescription = response.platformDescription || ''
  } catch (error) {
    toast.error('Failed to fetch settings')
  } finally {
    isLoading.value = false
  }
}

// Save settings
const saveSettings = async () => {
  isSaving.value = true
  try {
    await api.put('/api/v1/settings', formData)
    toast.success('Settings saved successfully')
  } catch (error) {
    toast.error('Failed to save settings')
  } finally {
    isSaving.value = false
  }
}

// Initial fetch
onMounted(() => {
  fetchSettings()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div>
      <h1 class="text-2xl font-bold flex items-center gap-2">
        <Settings class="h-6 w-6 text-primary" />
        Settings
      </h1>
      <p class="text-muted-foreground">Platform configuration and white labeling</p>
    </div>
    
    <div v-if="isLoading" class="space-y-4">
      <UiCard class="p-6">
        <UiSkeleton class="h-6 w-1/4 mb-4" />
        <UiSkeleton class="h-10 w-full mb-4" />
        <UiSkeleton class="h-10 w-full" />
      </UiCard>
    </div>
    
    <form v-else @submit.prevent="saveSettings" class="space-y-6">
      <!-- Integration Settings -->
      <UiCard>
        <UiCardHeader>
          <UiCardTitle class="flex items-center gap-2">
            <Webhook class="h-5 w-5 text-primary" />
            Integration Settings
          </UiCardTitle>
          <UiCardDescription>Configure external service connections</UiCardDescription>
        </UiCardHeader>
        <UiCardContent class="space-y-4">
          <div>
            <UiLabel>Domain</UiLabel>
            <UiInput v-model="formData.domain" placeholder="https://readwater.io" />
            <p class="text-xs text-muted-foreground mt-1">Your platform domain URL</p>
          </div>
          
          <div>
            <UiLabel>HTTP Callback URL</UiLabel>
            <UiInput v-model="formData.httpCallbackUrl" placeholder="https://api.readwater.io/webhook" />
            <p class="text-xs text-muted-foreground mt-1">Endpoint for IoT module callbacks</p>
          </div>
          
          <div>
            <UiLabel>MQTT URL</UiLabel>
            <UiInput v-model="formData.mqttUrl" placeholder="mqtt://broker.readwater.io:1883" />
            <p class="text-xs text-muted-foreground mt-1">MQTT broker connection URL</p>
          </div>
        </UiCardContent>
      </UiCard>
      
      <!-- White Labeling -->
      <UiCard>
        <UiCardHeader>
          <UiCardTitle class="flex items-center gap-2">
            <Palette class="h-5 w-5 text-primary" />
            White Labeling
          </UiCardTitle>
          <UiCardDescription>Customize the platform appearance</UiCardDescription>
        </UiCardHeader>
        <UiCardContent class="space-y-4">
          <div>
            <UiLabel>Platform Name</UiLabel>
            <UiInput v-model="formData.platformName" placeholder="Read Water" />
          </div>
          
          <div>
            <UiLabel>Platform Title</UiLabel>
            <UiInput v-model="formData.platformTitle" placeholder="Remote Water Meter Reading Platform" />
          </div>
          
          <div>
            <UiLabel>Platform Description</UiLabel>
            <textarea
              v-model="formData.platformDescription"
              class="form-input min-h-[100px] resize-none"
              placeholder="A brief description of your platform..."
            />
          </div>
          
          <div>
            <UiLabel>Logo URL</UiLabel>
            <UiInput v-model="formData.logoUrl" placeholder="https://..." />
            <p class="text-xs text-muted-foreground mt-1">URL to your platform logo (recommended: 200x50px)</p>
          </div>
          
          <!-- Logo preview -->
          <div v-if="formData.logoUrl" class="p-4 bg-muted/50 rounded-lg">
            <p class="text-xs text-muted-foreground mb-2">Logo Preview:</p>
            <img
              :src="formData.logoUrl"
              alt="Logo preview"
              class="max-h-12 object-contain"
              @error="() => {}"
            />
          </div>
        </UiCardContent>
      </UiCard>
      
      <!-- Save button -->
      <div class="flex justify-end">
        <UiButton type="submit" :loading="isSaving">
          <Save class="h-4 w-4" />
          Save Settings
        </UiButton>
      </div>
    </form>
  </div>
</template>

