// apps/web/src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, differenceInDays, format } from 'date-fns'
import { ca } from 'date-fns/locale'

export function cn(...i: ClassValue[]) { return twMerge(clsx(i)) }

export const fmt = {
  date:     (d: any, f = 'dd/MM/yyyy') => d ? format(new Date(d), f, { locale: ca }) : '—',
  relative: (d: any) => d ? formatDistanceToNow(new Date(d), { addSuffix: true, locale: ca }) : '—',
  currency: (v: number | null | undefined, dec = 0) =>
    v == null ? '—' : new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v),
  pct: (v: number | null | undefined) => v == null ? '—' : `${Math.round(v)}%`,
}

export function daysUntil(d: any) {
  if (!d) return null
  return differenceInDays(new Date(d), new Date())
}

export function expiryLabel(d: any) {
  const days = daysUntil(d)
  if (days === null) return '—'
  if (days <  0) return `Vençut fa ${Math.abs(days)}d`
  if (days === 0) return 'Avui'
  return `${days} dies`
}

export function expiryClass(d: any) {
  const days = daysUntil(d)
  if (days === null) return 'text-gray-400'
  if (days <= 15)  return 'text-red-600 font-semibold'
  if (days <= 30)  return 'text-amber-600 font-medium'
  if (days <= 60)  return 'text-amber-500'
  return 'text-gray-500'
}

export function initials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

export const STAGE_LABEL: Record<string, string> = {
  new_lead: 'Lead nou', contacted: 'Contactat', comparison: 'Comparativa',
  presented: 'Presentat', negotiation: 'Negociació', won: 'Guanyat', lost: 'Perdut',
}
export const STAGE_COLOR: Record<string, string> = {
  new_lead: 'badge-gray', contacted: 'badge-blue', comparison: 'badge-blue',
  presented: 'badge-amber', negotiation: 'badge-amber', won: 'badge-green', lost: 'badge-red',
}
export const SERVICE_ICON: Record<string, string> = {
  electric: '⚡', gas: '🔥', fiber: '📡', mobile: '📱', insurance: '🛡️', alarm: '🔒',
}
export const CONTACT_LABEL: Record<string, string> = {
  not_contacted: 'No contactat', contacted: 'Contactat',
  in_conversation: 'En conversa', closed_won: 'Guanyat', closed_lost: 'Perdut',
}
