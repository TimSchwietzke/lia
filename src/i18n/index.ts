import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { Language } from '../storage/types'
import { de } from './de'
import { en } from './en'

export const LANGUAGES: Record<Language, string> = { en: 'EN', de: 'DE' }

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
