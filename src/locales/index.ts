import es from './es.js';

const dictionaries = {
  es,
};

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

export { dictionaries };