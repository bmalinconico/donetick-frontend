import { FAMILY_PASSWORD, FAMILY_USERNAME } from '../Config'
import { apiClient } from './ApiClient'
import { saveTokens } from './TokenStorage'

// True when the build was configured with a shared family account, i.e. the app
// should run as a no-login kiosk and auto-authenticate on boot / after 401s.
export const isFamilyKioskConfigured = () =>
  Boolean(FAMILY_USERNAME && FAMILY_PASSWORD)

// Escape hatch. "Exiting" the kiosk is deliberately not persisted: only the home
// route (/) and the auth routes act as a kiosk, so leaving simply means navigating
// into the normal app (which is fully usable). Any reload or relaunch loads the
// kiosk home again and auto-returns to the Family view — so an accidental exit
// self-heals with no stuck state to clear.
export const exitKiosk = () => {
  window.location.href = '/chores'
}

// Explicitly return to the Family view.
export const enterKiosk = () => {
  window.location.href = '/'
}

// Prevent overlapping auto-login attempts (e.g. several 401s at once).
let inFlight = null

// Silently log in with the configured shared family account and persist the
// resulting tokens. Returns true on success, false otherwise. Never throws.
export const familyAutoLogin = async () => {
  if (!isFamilyKioskConfigured()) return false
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      await apiClient.init()
      const baseURL = apiClient.getApiURL()

      const isNative =
        typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()

      const config = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: FAMILY_USERNAME,
          password: FAMILY_PASSWORD,
        }),
      }
      // Web relies on the httpOnly refresh cookie; native uses stored tokens.
      if (!isNative) config.credentials = 'include'

      const response = await fetch(`${baseURL}/auth/login`, config)
      if (!response.ok) return false

      const data = await response.json()
      const accessToken = data.token || data.access_token
      if (!accessToken) return false

      await saveTokens({
        accessToken,
        accessTokenExpiry: data.expire || data.access_token_expiry,
        refreshToken: data.refresh_token,
        refreshTokenExpiry: data.refresh_token_expiry,
      })
      return true
    } catch (error) {
      console.error('Family auto-login failed:', error)
      return false
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}
