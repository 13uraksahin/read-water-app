<script setup lang="ts">
import { Code2, ExternalLink } from 'lucide-vue-next'
import type { DecoderFunction } from '~/types'

definePageMeta({
  middleware: ['auth'],
})

const api = useApi()
const toast = useToast()

// State
const decoders = ref<DecoderFunction[]>([])
const isLoading = ref(true)

// Fetch decoders
const fetchDecoders = async () => {
  isLoading.value = true
  try {
    const response = await api.getList<DecoderFunction>('/api/v1/decoders', { limit: 100 })
    decoders.value = response.data
  } catch (error) {
    toast.error('Failed to fetch decoders')
  } finally {
    isLoading.value = false
  }
}

// Initial fetch
onMounted(() => {
  fetchDecoders()
})

// Navigate to profile to edit decoder
const goToProfile = (decoder: DecoderFunction) => {
  if (decoder.moduleProfileId) {
    navigateTo(`/profiles/module/${decoder.moduleProfileId}`)
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div>
      <h1 class="text-2xl font-bold flex items-center gap-2">
        <Code2 class="h-6 w-6 text-primary" />
        Decoder Functions
      </h1>
      <p class="text-muted-foreground">View payload decoder functions (Edit via Meter Profiles)</p>
    </div>
    
    <!-- Info banner -->
    <UiCard class="p-4 bg-primary/5 border-primary/20">
      <div class="flex items-start gap-3">
        <Code2 class="h-5 w-5 text-primary mt-0.5" />
        <div>
          <p class="font-medium text-primary">Read-Only View</p>
          <p class="text-sm text-muted-foreground">
            Decoder functions are defined within Meter Profiles. Click on a decoder card to navigate to its profile for editing.
          </p>
        </div>
      </div>
    </UiCard>
    
    <!-- Decoders grid -->
    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <UiCard v-for="i in 6" :key="i" class="p-6">
        <UiSkeleton class="h-6 w-3/4 mb-4" />
        <UiSkeleton class="h-20 w-full mb-4" />
        <UiSkeleton class="h-4 w-1/2" />
      </UiCard>
    </div>
    
    <div v-else-if="decoders.length === 0" class="text-center py-12">
      <Code2 class="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
      <p class="font-medium">No decoder functions found</p>
      <p class="text-sm text-muted-foreground">Decoders are created within Meter Profiles</p>
    </div>
    
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <UiCard
        v-for="decoder in decoders"
        :key="decoder.id"
        hover
        @click="goToProfile(decoder)"
      >
        <UiCardHeader>
          <div class="flex items-start justify-between">
            <div>
              <UiCardTitle class="text-lg flex items-center gap-2">
                {{ decoder.name }}
                <ExternalLink class="h-4 w-4 text-muted-foreground" />
              </UiCardTitle>
              <UiCardDescription>{{ decoder.technology }}</UiCardDescription>
            </div>
            <UiBadge :variant="decoder.lastTestSucceeded ? 'success' : 'secondary'">
              {{ decoder.lastTestSucceeded ? 'Tested' : 'Untested' }}
            </UiBadge>
          </div>
        </UiCardHeader>
        <UiCardContent>
          <p v-if="decoder.description" class="text-sm text-muted-foreground mb-4">
            {{ decoder.description }}
          </p>
          
          <!-- Code preview -->
          <div class="bg-muted/50 rounded-lg p-3 overflow-hidden">
            <pre class="text-xs font-mono text-muted-foreground overflow-x-auto max-h-24">{{ decoder.functionCode?.slice(0, 200) }}{{ (decoder.functionCode?.length ?? 0) > 200 ? '...' : '' }}</pre>
          </div>
          
          <!-- Profile link -->
          <div v-if="decoder.moduleProfile" class="mt-4 pt-4 border-t border-border">
            <p class="text-xs text-muted-foreground">
              Profile: <span class="text-foreground">{{ decoder.moduleProfile.brand }} {{ decoder.moduleProfile.modelCode }}</span>
            </p>
          </div>
        </UiCardContent>
      </UiCard>
    </div>
  </div>
</template>

