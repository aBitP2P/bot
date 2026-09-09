import en from './en.js';
import es from './es.js';

const dictionaries = {
  es,
  en
};

export const localeData = {
  "ES": {
    label: "Español",
    emoji: "🇪🇸"
  },
  "EN": {
    label: "English",
    emoji: "🇺🇸"
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

export function getLocalesList() {
  let str = "";
  for (const locale of Object.keys(localeData)) {
    let data = localeData[locale as keyof typeof localeData];
    str += `${data.emoji} \`${locale}\` - ${data.label}\n`
  }
  return str;
}

export { dictionaries };