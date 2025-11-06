import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import enTranslations from './locales/en.json'
import koTranslations from './locales/ko.json'

i18n
  .use(LanguageDetector) // Detects user's language from browser/headers
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      ko: { translation: koTranslations },
    },
    fallbackLng: 'en',
    detection: {
      // Check browser language, then country code from headers
      order: ['navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false, // React already escapes
    },
  })

export default i18n

