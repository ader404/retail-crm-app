import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { getApiUrl } from './runtime-config'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  // Morocco uses Moroccan Dirham (MAD), displayed as "DH"
  // Format: 1234.56 DH (space before DH, French locale number formatting)
  return `${amount.toLocaleString('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} DH`
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function generateInvoiceNumber(): string {
  const prefix = 'INV'
  const timestamp = Date.now().toString().slice(-8)
  return `${prefix}-${timestamp}`
}

export function truncate(str: string, length: number): string {
  return str.length > length ? `${str.slice(0, length)}...` : str
}

export function resolveImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  if (/^https?:\/\//i.test(url)) return url
  const apiUrl = getApiUrl()
  const origin = apiUrl.replace(/\/api\/?$/, '')
  return `${origin}${url}`
}
