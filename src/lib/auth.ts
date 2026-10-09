import { computed, ref } from 'vue'
import type { AuthUser } from './api'
import { authLogin, authLogout, authMe } from './api'

const currentUser = ref<AuthUser | null>(null)
const initialized = ref(false)
const busy = ref(false)

export function useAuth() {
  const isAuthenticated = computed(() => currentUser.value !== null)

  async function refreshSession() {
    const response = await authMe()
    currentUser.value = response.success && response.data ? response.data.user : null
    initialized.value = true
    return currentUser.value
  }

  async function login(username: string, password: string) {
    busy.value = true
    try {
      const response = await authLogin(username, password)
      if (!response.success || !response.data?.user) {
        throw new Error(response.error?.message || response.message || 'Login gagal.')
      }
      currentUser.value = response.data.user
      initialized.value = true
      return currentUser.value
    } finally {
      busy.value = false
    }
  }

  async function logout() {
    try {
      await authLogout()
    } finally {
      currentUser.value = null
      initialized.value = true
    }
  }

  return {
    user: currentUser,
    initialized,
    busy,
    isAuthenticated,
    refreshSession,
    login,
    logout,
  }
}
