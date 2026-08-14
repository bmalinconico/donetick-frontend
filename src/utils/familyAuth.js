import { FAMILY_PASSWORD, FAMILY_USERNAME } from '../Config'
import { apiClient } from './ApiClient'
import { saveTokens } from './TokenStorage'

// True when the build was configured with a shared family account, i.e. the app
// should run as a no-login kiosk and auto-authenticate on boot / after 401s.
export const isFamilyKioskConfigured = () =>
  Boolean(FAMILY_USERNAME && FAMILY_PASSWORD)

// Per-device escape hatch. When a kiosk device has "exited", we keep the shared
// session (so no re-login is needed) but stop forcing the Family view and the
// auth-route redirects, revealing the full app for admin tasks. Persisted so it
// survives reloads until kiosk is explicitly re-entered from Settings.
const KIOSK_EXIT_KEY = 'kioskExited'

export const isKioskExited = () => {
  try {
    return localStorage.getItem(KIOSK_EXIT_KEY) === 'true'
  } catch {
    return false
  }
}

// True when the app should actually behave as a kiosk right now: configured and
// not temporarily exited on this device.
export const isKioskActive = () => isFamilyKioskConfigured() && !isKioskExited()

// Leave kiosk mode on this device and land in the normal app. Full reload so the
// router re-evaluates its kiosk-dependent routes.
export const exitKiosk = () => {
  try {
    localStorage.setItem(KIOSK_EXIT_KEY, 'true')
  } catch {
    // ignore storage failures — worst case the exit doesn't persist
  }
  window.location.href = '/chores'
}

// Re-arm kiosk mode on this device and return to the Family view.
export const enterKiosk = () => {
  try {
    localStorage.removeItem(KIOSK_EXIT_KEY)
  } catch {
    // ignore
  }
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
