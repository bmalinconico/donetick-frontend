import { CircularProgress } from '@mui/joy'
import { createContext, useContext, useEffect, useState } from 'react'
import { apiClient } from '../utils/ApiClient'
import { familyAutoLogin, isFamilyKioskConfigured } from '../utils/familyAuth'
import { clearAllTokens, saveTokens } from '../utils/TokenStorage'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  // In kiosk mode we hold rendering until the boot-time auto-login resolves, so
  // data-fetching pages don't fire requests before a token exists.
  const [isBootstrapping, setIsBootstrapping] = useState(() =>
    isFamilyKioskConfigured(),
  )
  const baseURL = apiClient.getApiURL()
  const isAuthenticated = !!token

  const isTokenExpired = () => {
    const expiry = localStorage.getItem('token_expiry')
    if (!expiry) return false
    return new Date() >= new Date(expiry)
  }

  const clearAuth = async () => {
    setToken(null)
    setUser(null)
    await clearAllTokens()
  }

  const login = async credentials => {
    setIsLoading(true)
    try {
      // Ensure apiClient is initialized with the correct URL
      await apiClient.init()
      const currentBaseURL = apiClient.getApiURL()
      
      const isNative =
        typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()

      const config = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      }

      // Only use credentials for web, not for native apps
      if (!isNative) {
        config.credentials = 'include'
      }

      const response = await fetch(`${currentBaseURL}/auth/login`, config)

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.message || 'Login failed' }
      }

      const data = await response.json()
      const userToken = data.token || data.access_token

      if (userToken) {
        setToken(userToken)

        // Use centralized token storage
        await saveTokens({
          accessToken: userToken,
          accessTokenExpiry: data.expire || data.access_token_expiry,
          refreshToken: data.refresh_token,
          refreshTokenExpiry: data.refresh_token_expiry,
        })
      }

      setIsLoading(false)
      return { success: true, data }
    } catch (error) {
      setIsLoading(false)
      return { success: false, error: 'Network error' }
    }
  }

  const fetchUser = async () => {
    if (!token) return null

    try {
      const response = await apiClient.get('/users/profile')

      if (!response.ok) {
        return null
      }

      const userData = await response.json()
      setUser(userData)
      return userData
    } catch (error) {
      console.error('Fetch user error:', error)
      return null
    }
  }

  // Family kiosk bootstrap: if there's no usable token, silently authenticate
  // with the shared family account so the login screen is never shown. Runs once
  // on mount. Does nothing when kiosk mode isn't configured.
  useEffect(() => {
    if (!isFamilyKioskConfigured()) return

    let cancelled = false
    const bootstrap = async () => {
      const existing = localStorage.getItem('token')
      if (!existing || isTokenExpired()) {
        // If we have an expired-but-present token, start clean so the fresh
        // login result isn't mistaken for a still-valid session.
        await familyAutoLogin()
        if (!cancelled) setToken(localStorage.getItem('token'))
      }
      if (!cancelled) setIsBootstrapping(false)
    }
    bootstrap()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = {
    token,
    user,
    isLoading,
    isBootstrapping,
    isAuthenticated,
    login,
    fetchUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {isBootstrapping ? <KioskBootstrapLoader /> : children}
    </AuthContext.Provider>
  )
}

// Full-screen loader shown while the kiosk auto-login resolves on boot.
const KioskBootstrapLoader = () => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <CircularProgress size='lg' />
  </div>
)
