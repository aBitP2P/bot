# ⚡ aBitP2P — Non-Custodial Bitcoin P2P Telegram Bot

**aBitP2P** es un bot de Telegram diseñado para facilitar el intercambio peer-to-peer (P2P) de Bitcoin de forma **no custodial** mediante contratos multifirma On-Chain (2-de-3 P2WSH Escrow) y resolución descentralizada de disputas.

---

## 🚀 Características Principales

- **No Custodial / 2-de-3 Escrow (P2WSH):** Las transacciones se bloquean en un script multifirma (Comprador + Vendedor + Bot).
- **Criptografía del lado del cliente / Derivación determinista:** Las claves de usuario se generan y cifran con contraseñas locales (AES-256-GCM + PBKDF2). La clave del bot se deriva deterministamente por cada orden mediante HMAC-SHA256 para evitar reutilización de direcciones de escrow.
- **Canal Público de Órdenes:** Publicación interactiva de ofertas de compra/venta con botones en línea.
- **Monitor On-Chain en Tiempo Real:** Rastreo continuo de confirmaciones en Mempool para liberar estados automáticamente.
- **Sistema de Disputas con Verificación:** Mediación mediante administradores asignados y códigos de verificación efímeros anti-impersonación.
- **Soporte Multidivisa y Margen Flexible:** Consulta de precios en tiempo real (vía Yadio API) con márgenes configurables.

---

## 🛠️ Stack Tecnológico

- **Runtime:** Node.js / TypeScript / ESM
- **Framework de Bot:** Telegraf
- **Bitcoin Libs:** `bitcoinjs-lib`, `tiny-secp256k1`, `ecpair`, `bip32`, `bip39`
- **ORM & DB:** Drizzle ORM (Compatible con MySQL)
- **Mempool Explorer & API:** `mempool.space` (Soporte para Mainnet y Testnet4)

---

## 📋 Flujo de Intercambio

```
[ Maker ] -- /buy o /sell --> [ Publicación en Canal ]
                                      │
                                      ▼
[ Taker ] ──────────────> [ Toma y Confirma la Orden ]
                                      │
                                      ▼
                      [ Generación de Escrow 2-de-3 P2WSH ]
                                      │
                                      ▼
[ Vendedor ] ────────────> [ Envía BTC al Escrow ]
                                      │
                                      ▼
                      [ Monitor detecta 1 confirmación ]
                                      │
                                      ▼
[ Comprador ] ── Pago Fiat ─> [ /fiatsent ]
                                      │
                                      ▼
[ Vendedor ] ── Confirma ───> [ /release ]
                                      │
                                      ▼
[ Comprador ] ── /claim ────> [ Firma PSBT y Retira BTC a su Wallet ]
```

---

## ⚙️ Configuración y Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto tomando como referencia las siguientes variables:

```env
# Configuración del Bot de Telegram
BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
PUBLIC_CHANNEL_ID="-1001234567890"
ADMIN_GROUP_ID="-1009876543210"
ADMIN_IDS="12345678,87654321"

# Configuración de Bitcoin & Escrow
# Se recomienda usar un WIF exclusivo para el bot, ya que solo es para firmar transacciones, no guardar fondos.
BOT_WIF="KXXXXX... (Llave WIF privada del bot)" 
NETWORK="bitcoin" # 'testnet' o 'bitcoin'
BOT_FEE="1" # Porcentaje total de comisión (ej. 1%) (dividido entre ambas contrapartes)

BOT_FEE_XPUB=xpubxxxx
# El xpub se usa para derivar direcciones para recibir la fee del bot
# De esta manera aquella billetera se mantiene fuera de línea.

# Base de datos
DATABASE_URL="mysql://user:pass@host:3306/dbname?ssl={\"rejectUnauthorized\":true}"
```

---

## 📦 Instalación y Despliegue

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/aBitP2P/bot
   cd bot
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Sincronizar base de datos con Drizzle:**
   ```bash
   npx drizzle-kit push
   ```

4. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

5. **Construir y ejecutar en producción:**
   ```bash
   npm run build
   npm run start
   ```

---

## 🤖 Comandos Disponibles

### 👤 Usuarios
| Comando | Descripción |
|---|---|
| `/start` | Mensaje de bienvenida e información inicial. |
| `/setpass` | Configura la contraseña segura para cifrar la clave privada local. |
| `/buy` | Inicia el asistente interactivo para crear una oferta de compra. |
| `/sell` | Inicia el asistente interactivo para crear una oferta de venta. |
| `/listorders` | Muestra un listado de las órdenes activas del usuario. |
| `/fiatsent <ID>` | Notifica que se ha enviado el pago en moneda FIAT. |
| `/release <ID>` | El vendedor autoriza la liberación del Escrow tras recibir el pago. |
| `/claim <ID>` | Firma la transacción PSBT con la contraseña y retira los BTC a la wallet. |
| `/cancel <ID>` | Cancela o solicita la cancelación mutua de una orden. |
| `/dispute <ID>` | Abre una disputa formal para que un administrador intervenga. |
| `/exit` | Cancela el asistente de creación de orden o cualquier proceso de escritura (como ingresar contraseña). |

### 🛡️ Administradores
| Comando | Descripción |
|---|---|
| `/takedispute <ID>` | Asigna una orden en disputa al administrador que ejecuta el comando. |
| `/settle <ID>` | Despliega los botones de mediación para resolver la disputa (Comprador / Vendedor / Reembolso). |

---

## 🔒 Consideraciones de Seguridad

- **No almacena claves privadas en texto plano:** Las claves (`WIF`) de los usuarios se almacenan cifradas en la base de datos usando `AES-256-GCM` derivado con `PBKDF2` (100.000 iteraciones + salt aleatorio).
- **Protección contra Race Conditions:** Las transiciones de estado utilizan operaciones atómicas de comparación y cambio (Compare-And-Swap / CAS).
- **Protección Anti-Spoofing en Disputas:** El bot asigna un código de verificación único para cada parte que el administrador debe proporcionar antes de solicitar cualquier comprobante fuera de la plataforma.

---