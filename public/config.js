// Runtime configuration, loaded before the app bundle so Config.js can read it
// synchronously. This default is a safe no-op for local/dev builds.
//
// In the cluster this file is replaced by the `donetick-frontend-config`
// (SOPS-encrypted) secret mounted at /usr/share/nginx/html/config.js, which sets
// the shared family-kiosk credentials, e.g.:
//   window.__DONETICK_ENV__ = { FAMILY_USERNAME: '...', FAMILY_PASSWORD: '...' }
window.__DONETICK_ENV__ = window.__DONETICK_ENV__ || {}
