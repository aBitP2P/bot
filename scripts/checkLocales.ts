import "dotenv/config"
import es from '../src/locales/es.js'; 
import en from '../src/locales/en.js'; 

const locales = {
  en
};

const baseLang = 'es';
const baseKeys = Object.keys(es);
let hasErrors = false;

console.log(`🔍 Verificando diccionarios contra el idioma base: [${baseLang.toUpperCase()}]\n`);

for (const [lang, dict] of Object.entries(locales)) {
  const targetKeys = Object.keys(dict);

  const missingKeys = baseKeys.filter((key) => !targetKeys.includes(key));
  const extraKeys = targetKeys.filter((key) => !baseKeys.includes(key));

  if (missingKeys.length === 0 && extraKeys.length === 0) {
    console.log(`✅ [${lang.toUpperCase()}] está perfectamente sincronizado.`);
  } else {
    hasErrors = true;
    console.log(`❌ [${lang.toUpperCase()}] tiene discrepancias:`);
    
    if (missingKeys.length > 0) {
      console.log(`Faltan las siguientes variables (Añade en ${lang}.ts):`);
      missingKeys.forEach(k => console.log(`      - ${k}`));
    }
    
    if (extraKeys.length > 0) {
      console.log(`Variables sobrantes (No existen en ${baseLang}.ts, debería ser borrado):`);
      extraKeys.forEach(k => console.log(`      - ${k}`));
    }
    console.log("");
  }
}

if (hasErrors) {
  console.log("\n❌ Verificación ha fallado")
} else {
  console.log("\n🎉 Todos los idiomas tienen exactamente las mismas variables.");
}