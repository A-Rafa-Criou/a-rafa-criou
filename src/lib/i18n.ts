'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Ensure the react-i18next plugin is attached synchronously
i18n.use(initReactI18next);

// Initialize synchronously with minimal config so useTranslation doesn't throw errors
if (!i18n.isInitialized) {
  i18n.init({
    lng: 'pt',
    fallbackLng: 'pt',
    resources: {},
    ns: ['common'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    react: {
      useSuspense: false, // Prevent suspense errors
    },
  });
}

// Cache for loaded translations
const loadedResources: Record<string, boolean> = {};

export async function initI18n(locale = 'pt') {
  try {
    // Only fetch if not already loaded
    if (!loadedResources[locale]) {
      const res = await fetch(`/locales/${locale}/common.json`);
      if (!res.ok) throw new Error(`Failed to load locale: ${locale}`);

      const common = await res.json();

      // Remove old resource if exists and add new one
      if (i18n.hasResourceBundle(locale, 'common')) {
        i18n.removeResourceBundle(locale, 'common');
      }

      i18n.addResourceBundle(locale, 'common', common, true, true);
      loadedResources[locale] = true;
    }

    // Change language
    await i18n.changeLanguage(locale);
  } catch (error) {
    console.error('[i18n] Initialization failed:', error);
  }

  return i18n;
}

// Function to change language quickly (used by LanguageSelector)
export async function changeLanguage(locale: string) {
  await initI18n(locale);
  return i18n;
}

export default i18n;
