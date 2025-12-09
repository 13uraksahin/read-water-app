<script setup lang="ts">
import { FileText, Plus, Search } from 'lucide-vue-next'
import type { MeterProfile, PaginatedResponse } from '~/types'

definePageMeta({
  middleware: ['auth'],
})

const api = useApi()
const toast = useToast()

// State
const profiles = ref<MeterProfile[]>([])
const isLoading = ref(true)
const showCreateDialog = ref(false)
const searchQuery = ref('')

// Fetch profiles
const fetchProfiles = async () => {
  isLoading.value = true
  try {
    const response = await api.getList<MeterProfile>('/api/v1/profiles', {
      search: searchQuery.value || undefined,
      limit: 100,
    })
    profiles.value = response.data
  } catch (error) {
    toast.error('Failed to fetch profiles')
  } finally {
    isLoading.value = false
  }
}

// Initial fetch
onMounted(() => {
  fetchProfiles()
})

// Watch for search changes
watch(searchQuery, () => {
  fetchProfiles()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <FileText class="h-6 w-6 text-primary" />
          Meter Profiles
        </h1>
        <p class="text-muted-foreground">Manage meter models and communication configurations</p>
      </div>
      
      <UiButton @click="showCreateDialog = true">
        <Plus class="h-4 w-4" />
        Add Profile
      </UiButton>
    </div>
    
    <!-- Search -->
    <UiCard class="p-4">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <UiInput
          v-model="searchQuery"
          placeholder="Search by brand, model code..."
          class="pl-10"
        />
      </div>
    </UiCard>
    
    <!-- Profiles grid -->
    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <UiCard v-for="i in 6" :key="i" class="p-6">
        <UiSkeleton class="h-6 w-3/4 mb-4" />
        <UiSkeleton class="h-4 w-1/2 mb-2" />
        <UiSkeleton class="h-4 w-2/3" />
      </UiCard>
    </div>
    
    <div v-else-if="profiles.length === 0" class="text-center py-12">
      <FileText class="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
      <p class="font-medium">No profiles found</p>
      <p class="text-sm text-muted-foreground">Add a new meter profile to get started</p>
    </div>
    
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <UiCard
        v-for="profile in profiles"
        :key="profile.id"
        hover
        @click="navigateTo(`/profiles/${profile.id}`)"
      >
        <UiCardHeader>
          <div class="flex items-start justify-between">
            <div>
              <UiCardTitle class="text-lg">{{ profile.brand }} {{ profile.modelCode }}</UiCardTitle>
              <UiCardDescription>{{ profile.meterType.replace(/_/g, ' ') }}</UiCardDescription>
            </div>
            <UiBadge :variant="profile.isActive ? 'success' : 'secondary'">
              {{ profile.isActive ? 'Active' : 'Inactive' }}
            </UiBadge>
          </div>
        </UiCardHeader>
        <UiCardContent>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-muted-foreground">Dial Type:</span>
              <span>{{ profile.dialType.replace(/_/g, ' ') }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Module:</span>
              <span>{{ profile.communicationModule }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">IP Rating:</span>
              <span>{{ profile.ipRating }}</span>
            </div>
            <div v-if="profile.diameter" class="flex justify-between">
              <span class="text-muted-foreground">Diameter:</span>
              <span>{{ profile.diameter }} mm</span>
            </div>
          </div>
          
          <!-- Communication technologies -->
          <div v-if="profile.communicationConfig?.length" class="mt-4 pt-4 border-t border-border">
            <p class="text-xs text-muted-foreground mb-2">Technologies:</p>
            <div class="flex flex-wrap gap-1">
              <UiBadge
                v-for="config in profile.communicationConfig"
                :key="config.technology"
                variant="outline"
                class="text-xs"
              >
                {{ config.technology }}
              </UiBadge>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </div>
    
    <!-- Create Dialog -->
    <UiDialog v-model:open="showCreateDialog" title="Add Meter Profile" class="max-w-3xl">
      <ProfilesCreateForm
        @success="showCreateDialog = false; fetchProfiles()"
        @cancel="showCreateDialog = false"
      />
    </UiDialog>
  </div>
</template>

