import { createHodlInvoice, decodePaymentRequest } from "lightning";
import { lnd } from "./client.js";
import type { OrderRecord } from "../../types.js";
import { getOrder, setHodlInvoiceData } from "../../db/orders.js";
import { getSellerDepositSats } from "../../config/fees.js";
import { createHash, randomBytes } from "crypto";
import { encryptData } from "../../utils/crypto.js";

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
async function fetchLightningAddressInvoice(
  address: string,
  expectedSats: number,
): Promise<LightningAddressInvoice> {
  const [username, domain] = address.split("@");

  if (!username || !domain) return { ok: false, reason: "invalid" };

  try {
    const response = await fetch(
      `https://${domain}/.well-known/lnurlp/${encodeURIComponent(username)}`,
      { signal: AbortSignal.timeout(10_000) },
    );

    if (!response.ok) return { ok: false, reason: "invalid" };

    const data = (await response.json()) as {
      tag?: string;
      callback?: string;
      minSendable?: number;
      maxSendable?: number;
    };

    if (data.tag !== "payRequest" || !data.callback) {
      return { ok: false, reason: "invalid" };
    }

    const amountMsats = expectedSats * 1000;
    if (
      (typeof data.minSendable === "number" && amountMsats < data.minSendable) ||
      (typeof data.maxSendable === "number" && amountMsats > data.maxSendable)
    ) {
      return { ok: false, reason: "address-amount", expectedSats };
    }

    const callbackUrl = new URL(data.callback);
    callbackUrl.searchParams.set("amount", String(amountMsats));

    const callbackResponse = await fetch(callbackUrl, {
      signal: AbortSignal.timeout(10_000),
    });
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
