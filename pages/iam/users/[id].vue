<script setup lang="ts">
import {
  UserCog,
  ArrowLeft,
  Edit,
  Shield,
  Mail,
  Phone,
  Calendar,
  Clock,
  Building2,
  Activity,
  CheckCircle2,
} from 'lucide-vue-next'
import type { User, TenantAssignment } from '~/types'

definePageMeta({
  middleware: ['auth'],
})

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()

const userId = computed(() => route.params.id as string)

// State
const user = ref<User | null>(null)
const isLoading = ref(true)
const showEditDialog = ref(false)

// Activity log mock (would come from API)
const activityLog = ref([
  { action: 'Login', timestamp: new Date().toISOString(), ip: '192.168.1.1' },
  { action: 'Updated meter WM-001', timestamp: new Date(Date.now() - 3600000).toISOString() },
  { action: 'Created customer', timestamp: new Date(Date.now() - 86400000).toISOString() },
])

// Fetch user details
const fetchUser = async () => {
  isLoading.value = true
  try {
    const response = await api.get<any>(`/api/v1/users/${userId.value}`)
    
    // Transform tenants from API format to expected format
    if (response.tenants) {
      response.tenants = response.tenants.map((t: any) => ({
        tenantId: t.tenant?.id || t.tenantId,
        tenantName: t.tenant?.name || t.tenantName,
        tenantPath: t.tenant?.path || t.tenantPath,
        role: t.role,
      }))
    }
    
    user.value = response as User
  } catch (error) {
    toast.error('Failed to load user')
    router.push('/iam/users')
  } finally {
    isLoading.value = false
  }
}

// Get role variant
const getRoleVariant = (role: string): 'default' | 'secondary' | 'outline' => {
  if (role.includes('ADMIN')) return 'default'
  if (role.includes('OPERATOR')) return 'secondary'
  return 'outline'
}

// Format date
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Format time
const formatTime = (date: string) => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Initial fetch
onMounted(() => {
  fetchUser()
})

// Handle edit success
const handleEditSuccess = () => {
  showEditDialog.value = false
  fetchUser()
  toast.success('User updated successfully')
}
</script>

<template>
  <div class="space-y-6">
    <!-- Back button & header -->
    <div class="flex items-center gap-4">
      <UiButton variant="ghost" size="icon" @click="router.push('/iam/users')">
        <ArrowLeft class="h-5 w-5" />
      </UiButton>
      
      <div class="flex-1">
        <div v-if="isLoading" class="space-y-2">
          <UiSkeleton class="h-8 w-64" />
          <UiSkeleton class="h-4 w-48" />
        </div>
        <template v-else-if="user">
          <h1 class="text-2xl font-bold flex items-center gap-2">
            <UserCog class="h-6 w-6 text-primary" />
            {{ user.firstName }} {{ user.lastName }}
          </h1>
          <p class="text-sm text-muted-foreground">{{ user.email }}</p>
        </template>
      </div>
      
      <UiButton v-if="user" @click="showEditDialog = true">
        <Edit class="h-4 w-4" />
        Edit
      </UiButton>
    </div>
    
    <!-- Loading state -->
    <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <UiCard class="lg:col-span-2 p-6">
        <UiSkeleton class="h-6 w-48 mb-4" />
        <div class="grid grid-cols-2 gap-4">
          <UiSkeleton v-for="i in 6" :key="i" class="h-12" />
        </div>
      </UiCard>
      <UiCard class="p-6">
        <UiSkeleton class="h-6 w-32 mb-4" />
        <div class="space-y-3">
          <UiSkeleton v-for="i in 3" :key="i" class="h-16" />
        </div>
      </UiCard>
    </div>
    
    <!-- Content -->
    <template v-else-if="user">
      <!-- Main content grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- User Info Card -->
        <UiCard class="lg:col-span-2">
          <UiCardHeader>
            <UiCardTitle>User Information</UiCardTitle>
            <UiCardDescription>Personal details and contact</UiCardDescription>
          </UiCardHeader>
          <UiCardContent>
            <div class="flex items-start gap-6">
              <!-- Avatar -->
              <UiAvatar :fallback="user.firstName?.charAt(0)" size="lg" class="h-16 w-16" />
              
              <!-- Details grid -->
              <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-4">
                  <div>
                    <p class="text-sm text-muted-foreground">Full Name</p>
                    <p class="font-medium text-lg">{{ user.firstName }} {{ user.lastName }}</p>
                  </div>
                  
                  <div class="flex items-center gap-3">
                    <Mail class="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p class="text-sm text-muted-foreground">Email</p>
                      <p class="font-medium">{{ user.email }}</p>
                    </div>
                  </div>
                  
                  <div class="flex items-center gap-3">
                    <Phone class="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p class="text-sm text-muted-foreground">Phone</p>
                      <p class="font-medium">{{ user.phone || '-' }}</p>
                    </div>
                  </div>
                </div>
                
                <div class="space-y-4">
                  <div>
                    <p class="text-sm text-muted-foreground">TC ID Number</p>
                    <p class="font-medium">{{ user.tcIdNo || '-' }}</p>
                  </div>
                  
                  <div class="flex items-center gap-3">
                    <Calendar class="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p class="text-sm text-muted-foreground">Created</p>
                      <p class="font-medium">{{ formatDate(user.createdAt) }}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p class="text-sm text-muted-foreground">Status</p>
                    <UiBadge :variant="user.isActive ? 'success' : 'secondary'" class="mt-1">
                      <CheckCircle2 v-if="user.isActive" class="h-3 w-3 mr-1" />
                      {{ user.isActive ? 'Active' : 'Inactive' }}
                    </UiBadge>
                  </div>
                </div>
              </div>
            </div>
          </UiCardContent>
        </UiCard>
        
        <!-- Activity Log -->
        <UiCard>
          <UiCardHeader>
            <UiCardTitle class="flex items-center gap-2">
              <Activity class="h-4 w-4" />
              Activity Log
            </UiCardTitle>
          </UiCardHeader>
          <UiCardContent class="space-y-4">
            <div
              v-for="(activity, index) in activityLog"
              :key="index"
              class="flex items-start gap-3 pb-4"
              :class="{ 'border-b border-border': index < activityLog.length - 1 }"
            >
              <div class="p-1.5 rounded-full bg-muted">
                <Clock class="h-3 w-3 text-muted-foreground" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-sm">{{ activity.action }}</p>
                <p class="text-xs text-muted-foreground">{{ formatTime(activity.timestamp) }}</p>
                <p v-if="activity.ip" class="text-xs text-muted-foreground">IP: {{ activity.ip }}</p>
              </div>
            </div>
          </UiCardContent>
        </UiCard>
      </div>
      
      <!-- Assigned Tenants -->
      <UiCard>
        <UiCardHeader>
          <UiCardTitle>Assigned Tenants</UiCardTitle>
          <UiCardDescription>Tenants and roles for this user</UiCardDescription>
        </UiCardHeader>
        <UiTable>
          <UiTableHeader>
            <UiTableRow>
              <UiTableHead>Tenant</UiTableHead>
              <UiTableHead>Path</UiTableHead>
              <UiTableHead>Role</UiTableHead>
            </UiTableRow>
          </UiTableHeader>
          <UiTableBody>
            <template v-if="!user.tenants?.length">
              <UiTableRow>
                <UiTableCell :colspan="3" class="text-center py-8 text-muted-foreground">
                  <Building2 class="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No tenants assigned</p>
                </UiTableCell>
              </UiTableRow>
            </template>
            
            <template v-else>
              <UiTableRow
                v-for="assignment in user.tenants"
                :key="assignment.tenantId"
                clickable
                @click="navigateTo(`/iam/tenants/${assignment.tenantId}`)"
              >
                <UiTableCell>
                  <div class="flex items-center gap-3">
                    <Building2 class="h-4 w-4 text-muted-foreground" />
                    <span class="font-medium">{{ assignment.tenantName }}</span>
                  </div>
                </UiTableCell>
                <UiTableCell class="font-mono text-xs text-muted-foreground">
                  {{ assignment.tenantPath }}
                </UiTableCell>
                <UiTableCell>
                  <UiBadge :variant="getRoleVariant(assignment.role)">
                    <Shield class="h-3 w-3 mr-1" />
                    {{ assignment.role.replace(/_/g, ' ') }}
                  </UiBadge>
                </UiTableCell>
              </UiTableRow>
            </template>
          </UiTableBody>
        </UiTable>
      </UiCard>
    </template>
    
    <!-- Edit Dialog -->
    <UiDialog v-model:open="showEditDialog">
      <UiDialogContent class="max-w-2xl">
        <UiDialogHeader>
          <UiDialogTitle>Edit User</UiDialogTitle>
        </UiDialogHeader>
        <div class="overflow-y-auto flex-1 -mx-6 px-6">
          <UsersCreateForm
            v-if="user"
            :user="user"
            mode="edit"
            @success="handleEditSuccess"
            @cancel="showEditDialog = false"
          />
        </div>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>
