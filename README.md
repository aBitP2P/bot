# ⚡ aBitP2P — Non-Custodial Bitcoin P2P Telegram Bot

**aBitP2P** es un bot de Telegram diseñado para facilitar el intercambio peer-to-peer (P2P) de Bitcoin de forma **no custodial** mediante contratos multifirma On-Chain (2-de-3 P2WSH Escrow) y resolución descentralizada de disputas.

---

## 🚀 Características Principales

- **No Custodial / 2-de-3 Escrow (P2WSH):** Las transacciones se bloquean en un script multifirma (Comprador + Vendedor + Bot).
- **Billetera determinista por usuario (BIP39/BIP84):** Al configurar su contraseña, cada usuario recibe **12 palabras** de recuperación. Solo se almacena el mnemónico cifrado junto con el `xpub` y el fingerprint de la cuenta; la llave privada nunca se guarda en texto plano.
- **Derivación determinista del bot (BIP32):** La clave del bot para cada escrow se deriva de `BOT_MNEMONIC` usando un índice de derivación por par de usuarios, evitando la reutilización de direcciones de escrow.
- **Firma externa (PSBT):** El usuario puede firmar su retiro por su cuenta, sin que el bot descifre su mnemónico, importando sus 12 palabras y el descriptor del escrow en una billetera compatible con PSBT.
- **Respaldo de Escrow (`/backup`):** Exporta la dirección del escrow y su output descriptor `2-de-3` para poder importar la bóveda multifirma en una billetera externa (Sparrow, BlueWallet, etc.).
- **Canal Público de Órdenes:** Publicación interactiva de ofertas de compra/venta con botones en línea.
- **Monitor On-Chain en Tiempo Real:** Rastreo continuo de confirmaciones en Mempool (configurables con `REQUIRED_CONFIRMATIONS`) para liberar estados automáticamente.
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
                      [ Monitor detecta las confirmaciones requeridas ]
                                      │
                                      ▼
[ Comprador ] ── Pago Fiat ─> [ /fiatsent ]
                                      │
                                      ▼
[ Vendedor ] ── Confirma ───> [ /release ]
                                      │
                                      ▼
[ Comprador ] ── /claim ────> [ Elige cómo firmar el retiro ]
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
      [ Firma con contraseña ]              [ Firma externa (PSBT) ]
      El bot co-firma y transmite          El usuario firma en su
                                            billetera y transmite
                    │                                   │
                    └─────────────────┬─────────────────┘
                                      ▼
                    [ BTC acreditados en la billetera del usuario ]
```

---

## 🖋️ Firma Externa (Modelo No Custodial)

Además de firmar con su contraseña (el bot descifra el mnemónico en memoria únicamente para co-firmar), el usuario puede firmar el retiro **sin entregar su mnemónico al bot**:

1. Ejecutar `/claim <ID>` y elegir **“✍️ Firmar externamente”**.
2. El bot genera y envía un archivo `.psbt` que ya incluye su propia firma.
3. Importar las **12 palabras** (obtenidas al configurar `/setpass`) en una billetera compatible con PSBT, como **Sparrow Wallet** o **BlueWallet**.
4. Importar el descriptor del escrow obtenido con `/backup` (solo si la billetera lo solicita para reconocer los fondos).
5. Cargar el `.psbt`, firmarlo y transmitirlo a la red.
6. Presionar **“✅ Ya transmití la transacción”** para que el bot detecte el gasto del escrow en la red y actualice la orden (`EXTERNALLY_COMPLETED` / `EXTERNALLY_REFUNDED`).

> Con este flujo, el bot nunca recibe el PSBT firmado ni vuelve a descifrar el mnemónico del usuario.

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
# Mnemónico de 12 palabras del bot. De él se derivan las claves de firma
# de cada escrow, por lo que debe resguardarse de forma segura y nunca
# cambiarse mientras existan órdenes activas.
BOT_MNEMONIC="palabra1 palabra2 ... palabra12"
NETWORK="mainnet" # 'mainnet' o 'testnet4'

# Confirmaciones on-chain necesarias para dar por fondeado un escrow (recomendado: 2)
REQUIRED_CONFIRMATIONS=2

BOT_FEE_XPUB=xpubxxxx
# El xpub se usa para derivar direcciones para recibir la fee del bot
# De esta manera aquella billetera se mantiene fuera de línea.

# Base de datos
DATABASE_URL="mysql://user:pass@host:3306/dbname?ssl={\"rejectUnauthorized\":true}"
```

Para configurar la comisión del bot, se debe de modificar el archivo ubicado en `src/config/fees.ts` (el porcentaje se divide entre ambas contrapartes).

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

   > Si actualizas desde una versión basada en WIF, revisa los cambios de esquema:
   > `users` ahora usa `xpub`, `fingerprint` y `encrypted_mnemonic`;
   > `orders` usa `buyer_xpub`, `seller_xpub` y `escrow_index`;
   > y `counters.name` debe ser `VARCHAR(255)` para almacenar las claves de par de usuarios.
   > Las órdenes activas creadas con el esquema anterior deben cerrarse antes del despliegue.

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
| `/setpass` | Configura la contraseña que cifra el mnemónico local y genera las 12 palabras de recuperación. |
| `/setlang` | Cambia de idioma. |
| `/fees` | Revisa cómo están las comisiones para tus órdenes. |
| `/setfee` | Establece la comisión de red que se usará. |
| `/buy` | Inicia el asistente interactivo para crear una oferta de compra. |
| `/sell` | Inicia el asistente interactivo para crear una oferta de venta. |
| `/listorders` | Muestra un listado de las órdenes activas del usuario. |
| `/fiatsent <ID>` | Notifica que se ha enviado el pago en moneda FIAT. |
| `/release <ID>` | El vendedor autoriza la liberación del Escrow tras recibir el pago. |
| `/claim <ID>` | Retira los BTC del escrow firmando con la contraseña o externamente mediante PSBT. |
| `/backup` | Muestra el descriptor del escrow y el índice de derivación para respaldar/importar la bóveda multifirma. |
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

- **No almacena claves privadas en texto plano:** El mnemónico de 12 palabras de cada usuario se almacena cifrado en la base de datos usando `AES-256-GCM` derivado con `PBKDF2` (100.000 iteraciones + salt aleatorio). Solo se guardan además el `xpub` y el fingerprint públicos de la cuenta.
- **Firma sin exponer el mnemónico:** En la firma externa, el usuario firma el PSBT en su propia billetera; el bot nunca recibe el mnemónico ni el PSBT firmado, y solo detecta el gasto del escrow vía mempool.
- **Descriptor bajo demanda:** `/backup` solo muestra el descriptor a las partes de la orden, ya que contiene los `xpub` de ambos usuarios.
- **Protección contra Race Conditions:** Las transiciones de estado utilizan operaciones atómicas de comparación y cambio (Compare-And-Swap / CAS).
- **Protección Anti-Spoofing en Disputas:** El bot asigna un código de verificación único para cada parte que el administrador debe proporcionar antes de solicitar cualquier comprobante fuera de la plataforma.

---
