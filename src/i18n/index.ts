import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { Language } from '../storage/types'
import { de } from './de'
import { en } from './en'

/** Each language in its own name. */
export const LANGUAGES: Record<Language, string> = { en: 'English', de: 'Deutsch' }

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof en }
  }
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, de: { translation: de } },
  lng: 'en',
  fallbackLng: 'en',
  initAsync: false,
  interpolation: { escapeValue: false }, // React escapes already
})

export default i18n

/** 0.78 -> "78%" (en) or "78 %" (de). */
export function formatPercent(share: number): string {
  return i18n.t('format.percent', { value: Math.round(share * 100) })
}

/** Formats a local date "YYYY-MM-DD" in the UI language. */
export function formatDay(day: string, options: Intl.DateTimeFormatOptions): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Intl.DateTimeFormat(i18n.language, options).format(new Date(y, m - 1, d))
}

/** Short weekday names, Monday first. */
export function weekdayLabels(): string[] {
  return i18n.t('format.weekdays').split(' ')
}
