import { createHodlInvoice, decodePaymentRequest } from "lightning";
import { lnd } from "./client.js";
import type { OrderRecord } from "../../types.js";
import { getOrder, setHodlInvoiceData } from "../../db/orders.js";
import { getSellerDepositSats } from "../../config/fees.js";
import { createHash, randomBytes } from "crypto";
import { encryptData } from "../../utils/crypto.js";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const createHodlInvoiceForOrder = async (
  orderQ: string | OrderRecord,
) => {
  let order;
  if (typeof orderQ === "string") {
    order = await getOrder(orderQ);
    if (!order) throw new Error("Orden no encontrada");
  } else order = orderQ;

  const sats = getSellerDepositSats(order.amountSats);
  const preimage = randomBytes(32);
  const id = createHash("sha256").update(preimage).digest("hex");

  const invoice = await createHodlInvoice({
    id,
    tokens: sats,
    description: `Funds held in escrow for order #${order.id}. Not transferred until payment is confirmed. Refunded if the order is canceled.`,
    lnd: lnd,
  });

  const wasSuccess = await setHodlInvoiceData(order.id, {
    holdInvoiceHash: id,
    holdInvoiceRequest: invoice.request,
    holdInvoicePreimageEncrypted: encryptData(preimage.toString("hex"), process.env.PREIMAGE_KEY!)
  });

  if (!wasSuccess) throw new Error("Hold invoice no establecida, el estado de la orden es inválida.")

  return invoice;
};

/**
 * Decodifica y valida una factura BOLT11 de cobro.
 * Devuelve `null` si el formato es inválido o si la factura ya expiró.
 */
export const decodeLightningInvoice = async (request: string) => {
  try {
    const invoice = await decodePaymentRequest({ lnd, request });
    const expiresAt = Date.parse(invoice.expires_at);

    if (Number.isFinite(expiresAt) && expiresAt < Date.now()) return null;

    return invoice;
  } catch {
    return null;
  }
};

export type LightningPayoutValidation =
  | { ok: true; value: string }
  | {
      ok: false;
      reason: "invalid" | "amount" | "address-amount";
      expectedSats?: number;
      receivedSats?: number;
    };

const LIGHTNING_ADDRESS_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LightningAddressInvoice =
  | { ok: true; request: string }
  | { ok: false; reason: "invalid" | "address-amount"; expectedSats?: number };

/**
 * Resuelve una dirección Lightning (LNURL-pay) a una factura BOLT11 fresca por
 * el monto exacto. Las facturas de una dirección expiran, por lo que hay que
 * volver a resolverlas en el momento de pagar.
 */
/**
 * Defensa SSRF para el fetch de LNURL/LNAddress: el dominio y el `callback`
 * los controla el usuario/servidor remoto, así que nunca se puede pedir
 * directamente una URL arbitraria. Se exige:
 * - dominio como hostname público (sin literales IP, sin `localhost`/`.local`),
 * - resolución DNS con **todas** las direcciones en rangos públicos
 *   (se rechazan loopback, privadas, link-local —p. ej. `169.254.169.254`—,
 *   CGNAT, multicast y reservadas),
 * - `callback` por **HTTPS** y en el **mismo host** que el dominio LNURL,
 * - sin redirecciones (un redirect podría saltar a un host interno).
 */
const PUBLIC_HOSTNAME_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

function isPublicIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 0) return false;

  if (version === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === undefined || b === undefined) return false;
    if (a === 0 || a === 10 || a === 127) return false; // "this host"/private/loopback
    if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
    if (a === 169 && b === 254) return false; // link-local (metadata cloud)
    if (a === 172 && b >= 16 && b <= 31) return false; // private
    if (a === 192 && (b === 0 || b === 168)) return false; // IETF/protocol + private
    if (a === 198 && (b === 18 || b === 19 || b === 51)) return false; // benchmarking / TEST-NET-2
    if (a === 203 && b === 0) return false; // TEST-NET-3
    if (a >= 224) return false; // multicast / reservadas
    return true;
  }

  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return false;
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return false; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return false; // unique local
  if (lower.startsWith("ff")) return false; // multicast
  if (lower.startsWith("2001:db8")) return false; // documentación
  if (lower.startsWith("::ffff:")) {
    // IPv4 mapeada: valida la IPv4 incrustada.
    return isPublicIp(lower.slice(7));
  }
  return true;
}

async function assertPublicHost(hostname: string): Promise<boolean> {
  if (!hostname || isIP(hostname) !== 0) return false;
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  if (normalized === "localhost" || normalized.endsWith(".localhost") || normalized.endsWith(".local")) return false;
  if (!PUBLIC_HOSTNAME_REGEX.test(normalized)) return false;

  try {
    const addresses = await lookup(normalized, { all: true, verbatim: true });
    if (addresses.length === 0) return false;
    return addresses.every(({ address }) => isPublicIp(address));
  } catch {
    return false;
  }
}

async function safeFetch(url: URL): Promise<Response> {
  if (url.protocol !== "https:") throw new Error("URL no HTTPS");
  if (url.username || url.password) throw new Error("URL con credenciales");
  if (!(await assertPublicHost(url.hostname))) throw new Error("Host no público");
  return fetch(url, { redirect: "error", signal: AbortSignal.timeout(10_000) });
}

async function fetchLightningAddressInvoice(
  address: string,
  expectedSats: number,
): Promise<LightningAddressInvoice> {
  const [username, domain] = address.split("@");

  if (!username || !domain) return { ok: false, reason: "invalid" };
  if (!(await assertPublicHost(domain))) return { ok: false, reason: "invalid" };

  try {
    const response = await safeFetch(
      new URL(`https://${domain}/.well-known/lnurlp/${encodeURIComponent(username)}`),
    );

    if (!response.ok) return { ok: false, reason: "invalid" };

    const data = (await response.json()) as {
      tag?: string;
      callback?: string;
      minSendable?: number;
      maxSendable?: number;
    };

    if (data.tag !== "payRequest" || typeof data.callback !== "string" || !data.callback) {
      return { ok: false, reason: "invalid" };
    }
    // El callback debe vivir en el mismo host público del dominio LNURL.
    let callbackUrl: URL;
    try {
      callbackUrl = new URL(data.callback);
    } catch {
      return { ok: false, reason: "invalid" };
    }
    if (
      callbackUrl.protocol !== "https:" ||
      callbackUrl.username ||
      callbackUrl.password ||
      callbackUrl.hostname.toLowerCase() !== domain.toLowerCase().replace(/\.$/, "")
    ) {
      return { ok: false, reason: "invalid" };
    }

    const amountMsats = expectedSats * 1000;
    if (
      (typeof data.minSendable === "number" && amountMsats < data.minSendable) ||
      (typeof data.maxSendable === "number" && amountMsats > data.maxSendable)
    ) {
      return { ok: false, reason: "address-amount", expectedSats };
    }

    callbackUrl.searchParams.set("amount", String(amountMsats));

    const callbackResponse = await safeFetch(callbackUrl);
    if (!callbackResponse.ok) {
      return { ok: false, reason: "address-amount", expectedSats };
    }

    const callbackData = (await callbackResponse.json()) as { pr?: string };
    if (!callbackData.pr) {
      return { ok: false, reason: "address-amount", expectedSats };
    }

    const invoice = await decodeLightningInvoice(callbackData.pr);
    if (!invoice || BigInt(invoice.mtokens || "0") !== BigInt(amountMsats)) {
      return { ok: false, reason: "address-amount", expectedSats };
    }

    return { ok: true, request: callbackData.pr };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

async function validateLightningAddress(
  address: string,
  expectedSats: number,
): Promise<LightningPayoutValidation> {
  const result = await fetchLightningAddressInvoice(address, expectedSats);
  if (!result.ok) return result;
  return { ok: true, value: address };
}

/**
 * Valida el destino de cobro Lightning: factura BOLT11 o dirección Lightning.
 * Para facturas exige que el monto sea exactamente `expectedSats`.
 */
export const validateLightningPayout = async (
  input: string,
  expectedSats: number,
): Promise<LightningPayoutValidation> => {
  const value = input.trim();

  if (LIGHTNING_ADDRESS_REGEX.test(value)) {
    return validateLightningAddress(value, expectedSats);
  }

  const invoice = await decodeLightningInvoice(value);
  if (!invoice) return { ok: false, reason: "invalid" };

  const mtokens = BigInt(invoice.mtokens || "0");
  const expectedMtokens = BigInt(expectedSats) * 1000n;

  if (mtokens !== expectedMtokens) {
    return {
      ok: false,
      reason: "amount",
      expectedSats,
      receivedSats: Number(mtokens / 1000n),
    };
  }

  return { ok: true, value };
};

/**
 * Devuelve una BOLT11 lista para pagar por exactamente `expectedSats`.
 * Si el destino es una dirección Lightning, pide una factura nueva al LNURL
 * (la validada al recibirla puede haber expirado).
 * Devuelve `null` si el destino no es válido o el monto no coincide.
 */
export const resolvePayoutRequest = async (
  input: string,
  expectedSats: number,
): Promise<string | null> => {
  const value = input.trim();

  if (LIGHTNING_ADDRESS_REGEX.test(value)) {
    const result = await fetchLightningAddressInvoice(value, expectedSats);
    return result.ok ? result.request : null;
  }

  const invoice = await decodeLightningInvoice(value);
  if (!invoice) return null;

  const mtokens = BigInt(invoice.mtokens || "0");
  const expectedMtokens = BigInt(expectedSats) * 1000n;
  if (mtokens !== expectedMtokens) return null;

  return value;
};
