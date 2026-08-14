/* eslint-env node */
export const API_URL =
  import.meta.env.VITE_APP_API_URL === 'AUTO'
    ? `${window.location.hostname}/api`
    : import.meta.env.VITE_APP_API_URL
export const REDIRECT_URL = import.meta.env.VITE_APP_REDIRECT_URL //|| 'http://localhost:3000'
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_APP_GOOGLE_CLIENT_ID
export const ENVIROMENT = import.meta.env.VITE_APP_ENVIROMENT

// Family kiosk mode: when both are set, the app silently authenticates with this
// shared account on boot so the login screen is never shown. Intended for a
// LAN-only, family-only self-hosted instance (e.g. a wall tablet). Leaving both
// blank disables kiosk auto-login and restores the normal login flow.
//
// Values are read at runtime from window.__DONETICK_ENV__ (injected by the
// mounted /config.js secret in k8s), falling back to build-time env for local
// dev. Runtime injection keeps the shared password out of the built bundle and
// out of git (delivered via a SOPS-encrypted secret instead).
const runtimeEnv =
  (typeof window !== 'undefined' && window.__DONETICK_ENV__) || {}

export const FAMILY_USERNAME =
  runtimeEnv.FAMILY_USERNAME || import.meta.env.VITE_APP_FAMILY_USERNAME || ''
export const FAMILY_PASSWORD =
  runtimeEnv.FAMILY_PASSWORD || import.meta.env.VITE_APP_FAMILY_PASSWORD || ''
