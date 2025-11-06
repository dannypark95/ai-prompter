import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import enTranslations from './locales/en.json'
import koTranslations from './locales/ko.json'

// Fix for Vite/ES modules compatibility
const detector = LanguageDetector.default || LanguageDetector

i18n
  .use(detector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      ko: { translation: koTranslations },
    },
    fallbackLng: 'en',
    detection: {
      order: ['navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n

