<script setup lang="ts">
import {
  Building2,
  ArrowLeft,
  Edit,
  Users,
  Gauge,
  Shield,
  MapPin,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileText,
} from 'lucide-vue-next'
import type { Tenant, User, MeterProfile } from '~/types'

definePageMeta({
  middleware: ['auth'],
})

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()

const tenantId = computed(() => route.params.id as string)

// State
const tenant = ref<Tenant | null>(null)
const users = ref<User[]>([])
const allowedProfiles = ref<MeterProfile[]>([])
const isLoading = ref(true)
const isLoadingUsers = ref(true)
const isLoadingProfiles = ref(true)
const showEditDialog = ref(false)

// Stats
const stats = computed(() => ({
  totalUsers: users.value.length,
  totalMeters: 0, // TODO: Fetch from API
  activeAlarms: 0, // TODO: Fetch from API
}))

// Fetch tenant details
const fetchTenant = async () => {
  isLoading.value = true
  try {
    const response = await api.get<Tenant>(`/api/v1/tenants/${tenantId.value}`)
    tenant.value = response
  } catch (error) {
    toast.error('Failed to load tenant')
    router.push('/iam/tenants')
  } finally {
    isLoading.value = false
  }
}

// Fetch users assigned to this tenant
const fetchUsers = async () => {
  isLoadingUsers.value = true
  try {
    const response = await api.getList<any>('/api/v1/users', {
      tenantId: tenantId.value,
      limit: 100,
    })
    
    // Transform tenants from API format to expected format
    users.value = response.data.map((user: any) => ({
      ...user,
      tenants: user.tenants?.map((t: any) => ({
        tenantId: t.tenant?.id || t.tenantId,
        tenantName: t.tenant?.name || t.tenantName,
        tenantPath: t.tenant?.path || t.tenantPath,
        role: t.role,
      })),
    })) as User[]
  } catch (error) {
    console.error('Failed to fetch users:', error)
  } finally {
    isLoadingUsers.value = false
  }
}

// Fetch allowed profiles
const fetchProfiles = async () => {
  isLoadingProfiles.value = true
  try {
    const response = await api.getList<MeterProfile>('/api/v1/profiles', {
      tenantId: tenantId.value,
      limit: 100,
    })
    allowedProfiles.value = response.data
  } catch (error) {
    console.error('Failed to fetch profiles:', error)
  } finally {
    isLoadingProfiles.value = false
  }
}

// Get user role for this tenant
const getUserRole = (user: User): string => {
  const assignment = user.tenants?.find(t => t.tenantId === tenantId.value)
  return assignment?.role?.replace(/_/g, ' ') || 'No Role'
}

// Format address
const formatAddress = (address?: Tenant['address']): string => {
  if (!address) return '-'
  const parts = [
    address.street,
    address.buildingNo,
    address.neighborhood,
    address.district,
    address.city,
  ].filter(Boolean)
  return parts.join(', ') || '-'
}

// Initial fetch
onMounted(() => {
  fetchTenant()
  fetchUsers()
  fetchProfiles()
})

// Handle edit success
const handleEditSuccess = () => {
  showEditDialog.value = false
  fetchTenant()
  toast.success('Tenant updated successfully')
}
</script>

<template>
  <div class="space-y-6">
    <!-- Back button & header -->
    <div class="flex items-center gap-4">
      <UiButton variant="ghost" size="icon" @click="router.push('/iam/tenants')">
        <ArrowLeft class="h-5 w-5" />
      </UiButton>
      
      <div class="flex-1">
        <div v-if="isLoading" class="space-y-2">
          <UiSkeleton class="h-8 w-64" />
          <UiSkeleton class="h-4 w-48" />
        </div>
        <template v-else-if="tenant">
          <h1 class="text-2xl font-bold flex items-center gap-2">
            <Building2 class="h-6 w-6 text-primary" />
            {{ tenant.name }}
          </h1>
          <p class="text-sm text-muted-foreground font-mono">{{ tenant.path }}</p>
        </template>
      </div>
      
      <UiButton v-if="tenant" @click="showEditDialog = true">
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
    <template v-else-if="tenant">
      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UiCard class="p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-primary/10">
              <Users class="h-5 w-5 text-primary" />
            </div>
            <div>
              <p class="text-2xl font-bold">{{ stats.totalUsers }}</p>
              <p class="text-sm text-muted-foreground">Total Users</p>
            </div>
          </div>
        </UiCard>
        
        <UiCard class="p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-blue-500/10">
              <Gauge class="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p class="text-2xl font-bold">{{ stats.totalMeters }}</p>
              <p class="text-sm text-muted-foreground">Total Meters</p>
            </div>
          </div>
        </UiCard>
        
        <UiCard class="p-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-destructive/10">
              <AlertCircle class="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p class="text-2xl font-bold">{{ stats.activeAlarms }}</p>
              <p class="text-sm text-muted-foreground">Active Alarms</p>
            </div>
          </div>
        </UiCard>
      </div>
      
      <!-- Main content grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Company Info -->
        <UiCard class="lg:col-span-2">
          <UiCardHeader>
            <UiCardTitle>Company Information</UiCardTitle>
            <UiCardDescription>Tenant details and contact information</UiCardDescription>
          </UiCardHeader>
          <UiCardContent>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Contact Info -->
              <div class="space-y-4">
                <h4 class="font-medium text-sm text-muted-foreground uppercase tracking-wide">Contact</h4>
                
                <div class="flex items-center gap-3">
                  <Users class="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p class="text-sm text-muted-foreground">Contact Person</p>
                    <p class="font-medium">
                      {{ [tenant.contactFirstName, tenant.contactLastName].filter(Boolean).join(' ') || '-' }}
                    </p>
                  </div>
                </div>
                
                <div class="flex items-center gap-3">
                  <Phone class="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p class="text-sm text-muted-foreground">Phone</p>
                    <p class="font-medium">{{ tenant.contactPhone || '-' }}</p>
                  </div>
                </div>
                
                <div class="flex items-center gap-3">
                  <Mail class="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p class="text-sm text-muted-foreground">Email</p>
                    <p class="font-medium">{{ tenant.contactEmail || '-' }}</p>
                  </div>
                </div>
              </div>
              
              <!-- Tax & Address Info -->
              <div class="space-y-4">
                <h4 class="font-medium text-sm text-muted-foreground uppercase tracking-wide">Tax & Address</h4>
                
                <div>
                  <p class="text-sm text-muted-foreground">Tax ID</p>
                  <p class="font-medium">{{ tenant.taxId || '-' }}</p>
                </div>
                
                <div>
                  <p class="text-sm text-muted-foreground">Tax Office</p>
                  <p class="font-medium">{{ tenant.taxOffice || '-' }}</p>
                </div>
                
                <div class="flex items-start gap-3">
                  <MapPin class="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p class="text-sm text-muted-foreground">Address</p>
                    <p class="font-medium">{{ formatAddress(tenant.address) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </UiCardContent>
        </UiCard>
        
        <!-- Subscription Status -->
        <UiCard>
          <UiCardHeader>
            <UiCardTitle>Subscription</UiCardTitle>
          </UiCardHeader>
          <UiCardContent class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">Status</span>
              <UiBadge :variant="tenant.subscriptionStatus === 'ACTIVE' ? 'success' : 'secondary'">
                <CheckCircle2 v-if="tenant.subscriptionStatus === 'ACTIVE'" class="h-3 w-3 mr-1" />
                {{ tenant.subscriptionStatus }}
              </UiBadge>
            </div>
            
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">Plan</span>
              <span class="font-medium">{{ tenant.subscriptionPlan || 'Standard' }}</span>
            </div>
            
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">Created</span>
              <span class="text-sm">{{ new Date(tenant.createdAt).toLocaleDateString() }}</span>
            </div>
            
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">Active</span>
              <UiBadge :variant="tenant.isActive !== false ? 'success' : 'secondary'">
                {{ tenant.isActive !== false ? 'Yes' : 'No' }}
              </UiBadge>
            </div>
          </UiCardContent>
        </UiCard>
      </div>
      
      <!-- Users assigned to this tenant -->
      <UiCard>
        <UiCardHeader>
          <div class="flex items-center justify-between">
            <div>
              <UiCardTitle>Assigned Users</UiCardTitle>
              <UiCardDescription>Users with access to this tenant</UiCardDescription>
            </div>
          </div>
        </UiCardHeader>
        <UiTable>
          <UiTableHeader>
            <UiTableRow>
              <UiTableHead>User</UiTableHead>
              <UiTableHead>Email</UiTableHead>
              <UiTableHead>Role</UiTableHead>
              <UiTableHead>Status</UiTableHead>
            </UiTableRow>
          </UiTableHeader>
          <UiTableBody>
            <template v-if="isLoadingUsers">
              <UiTableRow v-for="i in 3" :key="i">
                <UiTableCell v-for="j in 4" :key="j">
                  <UiSkeleton class="h-4 w-full" />
                </UiTableCell>
              </UiTableRow>
            </template>
            
            <template v-else-if="users.length === 0">
              <UiTableRow>
                <UiTableCell :colspan="4" class="text-center py-8 text-muted-foreground">
                  <Users class="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No users assigned to this tenant</p>
                </UiTableCell>
              </UiTableRow>
            </template>
            
            <template v-else>
              <UiTableRow
                v-for="user in users"
                :key="user.id"
                clickable
                @click="navigateTo(`/iam/users/${user.id}`)"
              >
                <UiTableCell>
                  <div class="flex items-center gap-3">
                    <UiAvatar :fallback="user.firstName?.charAt(0)" size="sm" />
                    <span class="font-medium">{{ user.firstName }} {{ user.lastName }}</span>
                  </div>
                </UiTableCell>
                <UiTableCell>{{ user.email }}</UiTableCell>
                <UiTableCell>
                  <UiBadge variant="outline">
                    <Shield class="h-3 w-3 mr-1" />
                    {{ getUserRole(user) }}
                  </UiBadge>
                </UiTableCell>
                <UiTableCell>
                  <UiBadge :variant="user.isActive ? 'success' : 'secondary'">
                    {{ user.isActive ? 'Active' : 'Inactive' }}
                  </UiBadge>
                </UiTableCell>
              </UiTableRow>
            </template>
          </UiTableBody>
        </UiTable>
      </UiCard>
      
      <!-- Allowed Meter Profiles -->
      <UiCard>
        <UiCardHeader>
          <div class="flex items-center justify-between">
            <div>
              <UiCardTitle>Allowed Meter Profiles</UiCardTitle>
              <UiCardDescription>Meter models this tenant can use</UiCardDescription>
            </div>
          </div>
        </UiCardHeader>
        <UiCardContent>
          <div v-if="isLoadingProfiles" class="flex gap-2">
            <UiSkeleton v-for="i in 4" :key="i" class="h-8 w-32" />
          </div>
          
          <div v-else-if="allowedProfiles.length === 0" class="text-center py-8 text-muted-foreground">
            <FileText class="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No meter profiles assigned</p>
          </div>
          
          <div v-else class="flex flex-wrap gap-2">
            <UiBadge
              v-for="profile in allowedProfiles"
              :key="profile.id"
              variant="secondary"
              class="cursor-pointer hover:bg-secondary/80"
              @click="navigateTo(`/profiles/${profile.id}`)"
            >
              <FileText class="h-3 w-3 mr-1" />
              {{ profile.brand }} {{ profile.modelCode }}
            </UiBadge>
          </div>
        </UiCardContent>
      </UiCard>
    </template>
    
    <!-- Edit Dialog -->
    <UiDialog v-model:open="showEditDialog" title="Edit Tenant" class="max-w-2xl">
      <TenantsCreateForm
        v-if="tenant"
        :tenant="tenant"
        mode="edit"
        @success="handleEditSuccess"
        @cancel="showEditDialog = false"
      />
    </UiDialog>
  </div>
</template>
