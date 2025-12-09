<script setup lang="ts">
import { Eye, EyeOff, Droplets } from 'lucide-vue-next'

definePageMeta({
  layout: 'auth',
})

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()
const toast = useToast()

// Form state
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const error = ref('')

// Form validation
const isEmailValid = computed(() => {
  if (!email.value) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
})

const canSubmit = computed(() => {
  return email.value && password.value && isEmailValid.value && !isLoading.value
})

// Handle login
const handleLogin = async () => {
  if (!canSubmit.value) return
  
  isLoading.value = true
  error.value = ''
  
  try {
    const success = await authStore.login({
      email: email.value,
      password: password.value,
    })
    
    if (success) {
      toast.success(t('auth.loginSuccess'), t('auth.loginSuccessMessage'))
      router.push('/')
    } else {
      error.value = authStore.error || t('auth.loginError')
    }
  } catch (e) {
    error.value = t('auth.loginError')
  } finally {
    isLoading.value = false
  }
}

// Redirect if already authenticated (wait for hydration)
watch(
  () => authStore.isHydrated,
  (isHydrated) => {
    if (isHydrated && authStore.isAuthenticated) {
      router.push('/')
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="w-full max-w-md">
    <!-- Background decoration -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl" />
      <div class="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-cyan-500/20 to-transparent rounded-full blur-3xl" />
    </div>
    
    <!-- Login card -->
    <UiCard class="relative glass">
      <UiCardHeader class="text-center pb-2">
        <!-- Logo -->
        <div class="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center shadow-lg shadow-primary/25 mb-4">
          <Droplets class="w-8 h-8 text-white" />
        </div>
        
        <UiCardTitle class="text-2xl">
          {{ $t('auth.welcome') }} <span class="text-gradient">{{ $t('app.name') }}</span>
        </UiCardTitle>
        <UiCardDescription>
          {{ $t('auth.signInTitle') }}
        </UiCardDescription>
      </UiCardHeader>
      
      <UiCardContent>
        <form @submit.prevent="handleLogin" class="space-y-4">
          <!-- Error message -->
          <div
            v-if="error"
            class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
          >
            {{ error }}
          </div>
          
          <!-- Email field -->
          <div class="space-y-2">
            <UiLabel for="email" :error="!isEmailValid">{{ $t('auth.email') }}</UiLabel>
            <UiInput
              id="email"
              v-model="email"
              type="email"
              placeholder="admin@readwater.io"
              :error="!isEmailValid"
              autocomplete="email"
            />
            <p v-if="!isEmailValid" class="text-xs text-destructive">
              {{ $t('auth.invalidEmail') }}
            </p>
          </div>
          
          <!-- Password field -->
          <div class="space-y-2">
            <UiLabel for="password">{{ $t('auth.password') }}</UiLabel>
            <div class="relative">
              <UiInput
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                :placeholder="$t('auth.password')"
                autocomplete="current-password"
                class="pr-10"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" class="h-4 w-4" />
                <Eye v-else class="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <!-- Remember me & forgot password -->
          <div class="flex items-center justify-between text-sm">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" class="rounded border-input" />
              <span class="text-muted-foreground">{{ $t('auth.rememberMe') }}</span>
            </label>
            <a href="#" class="text-primary hover:underline">
              {{ $t('auth.forgotPassword') }}
            </a>
          </div>
          
          <!-- Submit button -->
          <UiButton
            type="submit"
            class="w-full"
            :loading="isLoading"
            :disabled="!canSubmit"
          >
            {{ $t('auth.signIn') }}
          </UiButton>
        </form>
      </UiCardContent>
      
      <UiCardFooter class="flex-col gap-4 text-center text-sm text-muted-foreground">
        <p>
          {{ $t('auth.noAccount') }}
          <a href="#" class="text-primary hover:underline">{{ $t('auth.contactAdmin') }}</a>
        </p>
        
        <div class="flex items-center gap-2 text-xs">
          <span>{{ $t('app.tagline') }}</span>
          <span>•</span>
          <span>{{ $t('app.version') }}</span>
        </div>
      </UiCardFooter>
    </UiCard>
    
    <!-- Demo credentials hint -->
    <div class="mt-6 text-center text-sm text-muted-foreground">
      <p>{{ $t('auth.demoCredentials') }}:</p>
      <p class="font-mono text-xs mt-1">
        admin@readwater.io / Admin123!
      </p>
    </div>
  </div>
</template>
