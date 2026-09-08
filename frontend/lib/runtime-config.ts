const DEFAULT_API_URL = 'http://127.0.0.1:3001/api'
const STORAGE_KEY = 'retail_crm_api_url'

export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    const apiUrl = params.get('apiUrl')

    if (apiUrl) {
      window.sessionStorage.setItem(STORAGE_KEY, apiUrl)
      return apiUrl
    }

    const stored = window.sessionStorage.getItem(STORAGE_KEY)
    if (stored) return stored
  }

  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL
}

