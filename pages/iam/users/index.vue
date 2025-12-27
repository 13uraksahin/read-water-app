<script setup lang="ts">
import { UserCog, Plus, Search, Shield, Mail } from 'lucide-vue-next'
import type { User } from '~/types'

definePageMeta({
  middleware: ['auth'],
})

const api = useApi()
const toast = useToast()

// State
const users = ref<User[]>([])
const isLoading = ref(true)
const showCreateDialog = ref(false)
const searchQuery = ref('')

// Pagination
const pagination = ref({
  page: 1,
  limit: 30,
  total: 0,
  totalPages: 0,
})

// Fetch users
const fetchUsers = async () => {
  isLoading.value = true
  try {
    // Skip tenant filter to show all users accessible by current user (based on tenant hierarchy)
    const response = await api.getList<any>('/api/v1/users', {
      page: pagination.value.page,
      limit: pagination.value.limit,
      search: searchQuery.value || undefined,
    }, { skipTenantFilter: true })
    
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
    
    pagination.value = {
      ...pagination.value,
      total: response.meta.total,
      totalPages: response.meta.totalPages,
    }
  } catch (error) {
    toast.error('Failed to fetch users')
  } finally {
    isLoading.value = false
  }
}

// Fetch on mount (NuxtPage key ensures re-mount on navigation)
onMounted(() => {
  fetchUsers()
})

// Watch for search changes
watch(searchQuery, () => {
  pagination.value.page = 1
  fetchUsers()
})

// Get primary role
const getPrimaryRole = (user: User): string => {
  if (!user.tenants?.length) return 'No Role'
  const rolePriority = ['PLATFORM_ADMIN', 'TENANT_ADMIN', 'OPERATOR', 'VIEWER', 'FIELD_ENGINEER', 'CUSTOMER']
  const sorted = [...user.tenants].sort((a, b) => rolePriority.indexOf(a.role) - rolePriority.indexOf(b.role))
  const firstTenant = sorted[0]
  return firstTenant?.role?.replace(/_/g, ' ') || 'No Role'
}

// Get role variant
const getRoleVariant = (role: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (role.includes('ADMIN')) return 'default'
  if (role.includes('OPERATOR')) return 'secondary'
  return 'outline'
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <UserCog class="h-6 w-6 text-primary" />
          Users
        </h1>
        <p class="text-muted-foreground">Manage user accounts and role assignments</p>
      </div>
      
      <UiButton @click="showCreateDialog = true">
        <Plus class="h-4 w-4" />
        Add User
      </UiButton>
    </div>
    
    <!-- Search -->
    <UiCard class="p-4">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <UiInput
          v-model="searchQuery"
          placeholder="Search by name, email..."
          class="pl-10"
        />
      </div>
    </UiCard>
    
    <!-- Users table -->
    <UiCard>
      <UiTable>
        <UiTableHeader>
          <UiTableRow>
            <UiTableHead>User</UiTableHead>
            <UiTableHead>Email</UiTableHead>
            <UiTableHead>Phone</UiTableHead>
            <UiTableHead>Primary Role</UiTableHead>
            <UiTableHead>Tenants</UiTableHead>
            <UiTableHead>Status</UiTableHead>
          </UiTableRow>
        </UiTableHeader>
        <UiTableBody>
          <template v-if="isLoading">
            <UiTableRow v-for="i in 10" :key="i">
              <UiTableCell v-for="j in 6" :key="j">
                <UiSkeleton class="h-4 w-full" />
              </UiTableCell>
            </UiTableRow>
          </template>
          
          <template v-else-if="users.length === 0">
            <UiTableRow>
              <UiTableCell :colspan="6" class="text-center py-12 text-muted-foreground">
                <UserCog class="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p class="font-medium">No users found</p>
                <p class="text-sm">Add a new user to get started</p>
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
              <UiTableCell>
                <div class="flex items-center gap-2">
                  <Mail class="h-4 w-4 text-muted-foreground" />
                  {{ user.email }}
                </div>
              </UiTableCell>
              <UiTableCell>
                {{ user.phone || '-' }}
              </UiTableCell>
              <UiTableCell>
                <UiBadge :variant="getRoleVariant(getPrimaryRole(user))">
                  <Shield class="h-3 w-3 mr-1" />
                  {{ getPrimaryRole(user) }}
                </UiBadge>
              </UiTableCell>
              <UiTableCell>
                <UiBadge variant="outline">
                  {{ user.tenants?.length || 0 }} tenant(s)
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
      
      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-border">
        <p class="text-sm text-muted-foreground">
          Showing {{ users.length }} of {{ pagination.total }} users
        </p>
        <div class="flex items-center gap-2">
          <UiButton
            variant="outline"
            size="sm"
            :disabled="pagination.page <= 1"
            @click="pagination.page--; fetchUsers()"
          >
            Previous
          </UiButton>
          <UiButton
            variant="outline"
            size="sm"
            :disabled="pagination.page >= pagination.totalPages"
            @click="pagination.page++; fetchUsers()"
          >
            Next
          </UiButton>
        </div>
      </div>
    </UiCard>
    
    <!-- Create Dialog -->
    <UiDialog v-model:open="showCreateDialog">
      <UiDialogContent class="max-w-2xl">
        <UiDialogHeader>
          <UiDialogTitle>Add User</UiDialogTitle>
        </UiDialogHeader>
        <div class="overflow-y-auto flex-1 -mx-6 px-6">
          <UsersCreateForm
            @success="showCreateDialog = false; fetchUsers()"
            @cancel="showCreateDialog = false"
          />
        </div>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>

