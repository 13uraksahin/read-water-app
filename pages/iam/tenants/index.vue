<script setup lang="ts">
import { Building2, Plus, ChevronRight, ChevronDown, Search, Users, Gauge } from 'lucide-vue-next'
import type { Tenant } from '~/types'

definePageMeta({
  middleware: ['auth'],
})

const api = useApi()
const appStore = useAppStore()
const toast = useToast()

// State
const tenants = ref<Tenant[]>([])
const isLoading = ref(true)
const showCreateDialog = ref(false)
const searchQuery = ref('')
const expandedIds = ref<Set<string>>(new Set())

// Fetch tenants
const fetchTenants = async () => {
  isLoading.value = true
  try {
    const response = await api.getList<Tenant>('/api/v1/tenants', {
      search: searchQuery.value || undefined,
      limit: 100,
    })
    tenants.value = response.data
  } catch (error) {
    toast.error('Failed to fetch tenants')
  } finally {
    isLoading.value = false
  }
}

// Build tree structure
const tenantTree = computed(() => {
  const map = new Map<string, Tenant & { children: Tenant[]; level: number }>()
  const roots: (Tenant & { children: Tenant[]; level: number })[] = []
  
  // First pass: create map
  tenants.value.forEach(tenant => {
    map.set(tenant.id, { ...tenant, children: [], level: 0 })
  })
  
  // Second pass: build tree
  tenants.value.forEach(tenant => {
    const node = map.get(tenant.id)!
    if (tenant.parentId && map.has(tenant.parentId)) {
      const parent = map.get(tenant.parentId)!
      node.level = parent.level + 1
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  })
  
  return roots
})

// Extended tenant type with tree properties
type TenantTreeNode = Tenant & { children: TenantTreeNode[]; level: number }

// Flatten tree for display
const flattenTree = (nodes: TenantTreeNode[]): TenantTreeNode[] => {
  const result: TenantTreeNode[] = []
  
  const traverse = (items: TenantTreeNode[]) => {
    items.forEach(item => {
      result.push(item)
      if (expandedIds.value.has(item.id) && item.children.length > 0) {
        traverse(item.children)
      }
    })
  }
  
  traverse(nodes)
  return result
}

const flatTenants = computed(() => flattenTree(tenantTree.value as TenantTreeNode[]))

// Toggle expand
const toggleExpand = (id: string) => {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id)
  } else {
    expandedIds.value.add(id)
  }
}

// Fetch on mount (NuxtPage key ensures re-mount on navigation)
onMounted(() => {
  fetchTenants()
})

// Watch for search changes
watch(searchQuery, () => {
  fetchTenants()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <Building2 class="h-6 w-6 text-primary" />
          Tenants
        </h1>
        <p class="text-muted-foreground">Manage tenant hierarchy and subscriptions</p>
      </div>
      
      <UiButton @click="showCreateDialog = true">
        <Plus class="h-4 w-4" />
        Add Tenant
      </UiButton>
    </div>
    
    <!-- Search -->
    <UiCard class="p-4">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <UiInput
          v-model="searchQuery"
          placeholder="Search tenants..."
          class="pl-10"
        />
      </div>
    </UiCard>
    
    <!-- Tenants tree table -->
    <UiCard>
      <UiTable>
        <UiTableHeader>
          <UiTableRow>
            <UiTableHead class="w-[40%]">Name</UiTableHead>
            <UiTableHead>Path</UiTableHead>
            <UiTableHead>Status</UiTableHead>
            <UiTableHead>Plan</UiTableHead>
            <UiTableHead>Users</UiTableHead>
            <UiTableHead>Meters</UiTableHead>
          </UiTableRow>
        </UiTableHeader>
        <UiTableBody>
          <template v-if="isLoading">
            <UiTableRow v-for="i in 5" :key="i">
              <UiTableCell v-for="j in 6" :key="j">
                <UiSkeleton class="h-4 w-full" />
              </UiTableCell>
            </UiTableRow>
          </template>
          
          <template v-else-if="flatTenants.length === 0">
            <UiTableRow>
              <UiTableCell :colspan="6" class="text-center py-12 text-muted-foreground">
                <Building2 class="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p class="font-medium">No tenants found</p>
                <p class="text-sm">Add a new tenant to get started</p>
              </UiTableCell>
            </UiTableRow>
          </template>
          
          <template v-else>
            <UiTableRow
              v-for="tenant in flatTenants"
              :key="tenant.id"
              clickable
              @click="navigateTo(`/iam/tenants/${tenant.id}`)"
            >
              <UiTableCell>
                <div class="flex items-center gap-2" :style="{ paddingLeft: `${tenant.level * 24}px` }">
                  <button
                    v-if="tenant.children.length > 0"
                    class="p-1 hover:bg-muted rounded"
                    @click.stop="toggleExpand(tenant.id)"
                  >
                    <ChevronDown v-if="expandedIds.has(tenant.id)" class="h-4 w-4" />
                    <ChevronRight v-else class="h-4 w-4" />
                  </button>
                  <span v-else class="w-6" />
                  
                  <Building2 class="h-4 w-4 text-muted-foreground" />
                  <span class="font-medium">{{ tenant.name }}</span>
                </div>
              </UiTableCell>
              <UiTableCell class="font-mono text-xs text-muted-foreground">
                {{ tenant.path }}
              </UiTableCell>
              <UiTableCell>
                <UiBadge :variant="tenant.tenantSubscriptionStatus === 'ACTIVE' ? 'success' : 'secondary'">
                  {{ tenant.tenantSubscriptionStatus }}
                </UiBadge>
              </UiTableCell>
              <UiTableCell>
                {{ tenant.subscriptionPlan || '-' }}
              </UiTableCell>
              <UiTableCell>
                <div class="flex items-center gap-1">
                  <Users class="h-3 w-3 text-muted-foreground" />
                  <span>-</span>
                </div>
              </UiTableCell>
              <UiTableCell>
                <div class="flex items-center gap-1">
                  <Gauge class="h-3 w-3 text-muted-foreground" />
                  <span>-</span>
                </div>
              </UiTableCell>
            </UiTableRow>
          </template>
        </UiTableBody>
      </UiTable>
    </UiCard>
    
    <!-- Create Dialog -->
    <UiDialog v-model:open="showCreateDialog">
      <UiDialogContent class="max-w-2xl">
        <UiDialogHeader>
          <UiDialogTitle>Add Tenant</UiDialogTitle>
        </UiDialogHeader>
        <div class="overflow-y-auto flex-1 -mx-6 px-6">
          <TenantsCreateForm
            @success="showCreateDialog = false; fetchTenants()"
            @cancel="showCreateDialog = false"
          />
        </div>
      </UiDialogContent>
    </UiDialog>
  </div>
</template>

