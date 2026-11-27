/**
 * Valida al arrancar que las variables de entorno requeridas estén definidas.
 * Sin esto, un `.env` incompleto causaba errores crípticos en tiempo de
 * ejecución (cliente gRPC de LND con credenciales `undefined`, pool de MySQL
 * sin URL, contraseña ausente al cifrar preimágenes, token vacío en Telegraf).
 */
const REQUIRED_ENV_VARS = [
  "BOT_TOKEN",
  "DATABASE_URL",
  "LND_CERT",
  "LND_MACAROON",
  "LND_SOCKET",
  "PREIMAGE_KEY",
] as const;

export function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    console.error(
      `❌ Variables de entorno requeridas no configuradas: ${missing.join(
        ", ",
      )}.\nRevisa tu .env (ver .env.example).`,
    );
    process.exit(1);
  }
}
