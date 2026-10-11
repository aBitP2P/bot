import en from './en.js';
import es from './es.js';
import pt from './pt.js';

const dictionaries = {
  es,
  en,
  pt
};

export const LocaleData = {
  "ES": {
    label: "Español",
    emoji: "🇪🇸"
  },
  "EN": {
    label: "English",
    emoji: "🇺🇸"
  },
  "PT": {
    label: "Português",
    emoji: "🇧🇷"
  }
}

export type Language = keyof typeof dictionaries;
export type TranslationKey = keyof typeof es;

export function t(lang: Language, key: TranslationKey): string {
  const dict = dictionaries[lang] || dictionaries.es;
  const value = dict[key] || dictionaries.es[key];
  
  if (typeof value === 'function') {
    return 'Error: Missing arguments for translation string.';
  }
  
  return value;
}

export function getUserDict(languageCode?: string | null) {
  return dictionaries[(languageCode as Language) || "es"];
}

export { dictionaries };