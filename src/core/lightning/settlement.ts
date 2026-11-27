import {
  cancelHodlInvoice,
  decodePaymentRequest,
  getInvoice,
  getPayment,
  payViaPaymentRequest,
  settleHodlInvoice,
} from "lightning";
import { getOrder, tryTransitionOrderStatus } from "../../db/orders.js";
import { getBuyerNetSats } from "../../config/fees.js";
import { OrderStatus, SettlementMethodType } from "../../shared/constants.js";
import type { Dictionary, OrderRecord } from "../../types.js";
import { decryptData } from "../../utils/crypto.js";
import { lnd } from "./client.js";
import { resolvePayoutRequest } from "./invoices.js";

export type LightningSettlementReason =
  | "order-not-found"
  | "wrong-settlement-method"
  | "invalid-status"
  | "missing-payout-invoice"
  | "missing-hold-invoice"
  | "preimage-decrypt-failed"
  | "hold-invoice-not-held"
  | "hold-invoice-already-settled"
  | "invoice-expired"
  | "settle-failed"
  | "payment-failed"
  | "cancel-failed"
  | "in-progress"
  | "already-processed";

export type SettleOrderResult =
  | { ok: true; paymentHash: string; feeSats: number }
  | { ok: false; reason: LightningSettlementReason; cause?: unknown };

export type RefundOrderResult =
  | { ok: true }
  | { ok: false; reason: LightningSettlementReason; cause?: unknown };

type StepResult =
  | { ok: true }
  | { ok: false; reason: LightningSettlementReason; cause?: unknown };

type PaidInvoice = { paymentHash: string; feeSats: number };

/** Evita que dos invocaciones concurrentes muevan fondos dos veces. */
const inFlight = new Set<string>();

/**
 * Porcentaje máximo del monto a pagar que se acepta como comisión de routing.
 * `MAX_ROUTING_FEE=0.002` equivale a 0.2%.
 */
const MAX_ROUTING_FEE_RATIO = (() => {
  const value = Number(process.env.MAX_ROUTING_FEE);
  return Number.isFinite(value) && value > 0 ? value : 0.002;
})();

function maxRoutingFeeSats(amountSats: number): number {
  return Math.max(1, Math.ceil(amountSats * MAX_ROUTING_FEE_RATIO));
}

function failure(
  reason: LightningSettlementReason,
  cause?: unknown,
): { ok: false; reason: LightningSettlementReason; cause?: unknown } {
  return cause === undefined ? { ok: false, reason } : { ok: false, reason, cause };
}

/**
 * Garantiza que el hold invoice quede liquidado (revelando la preimagen).
 * Es idempotente: si ya estaba confirmado por un intento previo, no falla.
 */
async function settleHeldInvoice(
  hash: string,
  secret: string,
): Promise<StepResult> {
  let invoice;
  try {
    invoice = await getInvoice({ lnd, id: hash });
  } catch (cause) {
    return failure("hold-invoice-not-held", cause);
  }

  if (invoice.is_canceled) return failure("hold-invoice-not-held");
  if (invoice.is_confirmed) return { ok: true };

  const isHeld = Boolean(invoice.is_held) || invoice.held > 0;
  if (!isHeld) return failure("hold-invoice-not-held");

  try {
    await settleHodlInvoice({ lnd, secret });
    return { ok: true };
  } catch (cause) {
    // Pudo haberse liquidado entre la consulta y el settle.
    const after = await getInvoice({ lnd, id: hash }).catch(() => null);
    if (after?.is_confirmed) return { ok: true };
    return failure("settle-failed", cause);
  }
}

/**
 * Busca si un pago falló pero en realidad terminó confirmándose (p. ej. timeout
 * de red justo después de que LND lo envió). Evita pagar dos veces al reintentar.
 */
async function findConfirmedPayment(
  request: string,
): Promise<PaidInvoice | null> {
  try {
    const decoded = await decodePaymentRequest({ lnd, request });
    const payment = await getPayment({ lnd, id: decoded.id });
    if (!payment.is_confirmed) return null;
    return {
      paymentHash: decoded.id,
      feeSats: payment.payment?.fee ?? 0,
    };
  } catch {
    return null;
  }
}

async function payBuyer(
  order: OrderRecord,
  request: string,
): Promise<{ ok: true } & PaidInvoice | { ok: false; reason: LightningSettlementReason; cause?: unknown }> {
  const expectedSats = getBuyerNetSats(order.amountSats);

  try {
    const payment = await payViaPaymentRequest({
      lnd,
      request,
      max_fee: maxRoutingFeeSats(expectedSats),
    });

    return {
      ok: true,
      paymentHash: payment.id,
      feeSats: payment.safe_fee ?? payment.fee,
    };
  } catch (cause) {
    const recovered = await findConfirmedPayment(request);
    if (recovered) return { ok: true, ...recovered };
    return failure("payment-failed", cause);
  }
}

/**
 * Garantiza que el hold invoice quede cancelado, devolviendo los fondos al
 * vendedor. Es idempotente: si ya estaba cancelado, no falla.
 */
async function cancelHeldInvoice(hash: string): Promise<StepResult> {
  let invoice = null;
  try {
    invoice = await getInvoice({ lnd, id: hash });
  } catch {
    // Si no se puede consultar, igual intentamos cancelar abajo.
  }

  if (invoice?.is_confirmed) {
    return failure("hold-invoice-already-settled");
  }
  if (invoice?.is_canceled) return { ok: true };

  try {
    await cancelHodlInvoice({ lnd, id: hash });
    return { ok: true };
  } catch (cause) {
    const after = await getInvoice({ lnd, id: hash }).catch(() => null);
    if (after?.is_canceled) return { ok: true };
    return failure("cancel-failed", cause);
  }
}

/**
 * Liquida el hold invoice y paga la factura/dirección Lightning del comprador.
 * Pasa la orden de RELEASABLE a COMPLETED. No lanza por fallos de negocio:
 * devuelve un resultado discriminado para que el caller decida qué mostrar.
 */
export async function settleOrderToBuyer(
  orderId: string,
): Promise<SettleOrderResult> {
  if (inFlight.has(orderId)) return failure("in-progress");
  inFlight.add(orderId);

  try {
    const order = await getOrder(orderId);
    if (!order) return failure("order-not-found");
    if (order.settlementMethod !== SettlementMethodType.Lightning) {
      return failure("wrong-settlement-method");
    }
    if (
      order.status === OrderStatus.Completed ||
      order.status === OrderStatus.ExternallyCompleted
    ) {
      return failure("already-processed");
    }
    if (order.status !== OrderStatus.Releasable) {
      return failure("invalid-status");
    }

    const hash = order.holdInvoiceHash;
    const encryptedPreimage = order.holdInvoicePreimageEncrypted;
    if (!hash || !encryptedPreimage) {
      return failure("missing-hold-invoice");
    }
    if (!order.payoutInvoice) return failure("missing-payout-invoice");

    const preimageKey = process.env.PREIMAGE_KEY;
    if (!preimageKey) {
      return failure(
        "preimage-decrypt-failed",
        new Error("PREIMAGE_KEY no está configurada"),
      );
    }

    let secret: string;
    try {
      secret = decryptData(encryptedPreimage, preimageKey);
    } catch (cause) {
      return failure("preimage-decrypt-failed", cause);
    }

    const expectedSats = getBuyerNetSats(order.amountSats);
    if (expectedSats <= 0) return failure("missing-payout-invoice");

    const request = await resolvePayoutRequest(
      order.payoutInvoice,
      expectedSats,
    );
    if (!request) return failure("invoice-expired");

    const settled = await settleHeldInvoice(hash, secret);
    if (!settled.ok) return settled;

    const paid = await payBuyer(order, request);
    if (!paid.ok) return paid;

    const didTransition = await tryTransitionOrderStatus(
      order.id,
      [OrderStatus.Releasable],
      OrderStatus.Completed,
      { payoutTxid: paid.paymentHash },
    );

    if (!didTransition) {
      const current = await getOrder(order.id).catch(() => null);
      const alreadyCompleted =
        current?.status === OrderStatus.Completed ||
        current?.status === OrderStatus.ExternallyCompleted;
      if (!alreadyCompleted) {
        console.error(
          `[lightning] Pago ${paid.paymentHash} enviado pero la orden ${order.id} no pasó a COMPLETED (status actual: ${current?.status})`,
        );
      }
    }

    return {
      ok: true,
      paymentHash: paid.paymentHash,
      feeSats: paid.feeSats,
    };
  } finally {
    inFlight.delete(orderId);
  }
}

/**
 * Cancela el hold invoice de una orden. Es idempotente y NO altera el estado
 * de la orden: quien llama decide si después pasa a CANCELLED o a REFUNDED.
 * Devuelve `{ ok: true }` si no había factura que cancelar (la orden aún no
 * llegó a tener hold invoice).
 */
export async function cancelHoldInvoiceForOrder(
  orderId: string,
): Promise<RefundOrderResult> {
  if (inFlight.has(orderId)) return failure("in-progress");
  inFlight.add(orderId);

  try {
    const order = await getOrder(orderId);
    if (!order) return failure("order-not-found");
    if (order.settlementMethod !== SettlementMethodType.Lightning) {
      return failure("wrong-settlement-method");
    }

    const hash = order.holdInvoiceHash;
    if (!hash) return { ok: true };

    return await cancelHeldInvoice(hash);
  } finally {
    inFlight.delete(orderId);
  }
}

/**
 * Reembolso al vendedor de una orden REFUNDABLE: cancela el hold invoice y
 * pasa la orden a REFUNDED. No lanza por fallos de negocio.
 */
export async function refundOrderToSeller(
  orderId: string,
): Promise<RefundOrderResult> {
  const order = await getOrder(orderId);
  if (!order) return failure("order-not-found");
  if (order.settlementMethod !== SettlementMethodType.Lightning) {
    return failure("wrong-settlement-method");
  }
  if (
    order.status === OrderStatus.Refunded ||
    order.status === OrderStatus.ExternallyRefunded
  ) {
    return failure("already-processed");
  }
  if (order.status !== OrderStatus.Refundable) {
    return failure("invalid-status");
  }
  if (!order.holdInvoiceHash) return failure("missing-hold-invoice");

  const canceled = await cancelHoldInvoiceForOrder(orderId);
  if (!canceled.ok) return canceled;

  const didTransition = await tryTransitionOrderStatus(
    order.id,
    [OrderStatus.Refundable],
    OrderStatus.Refunded,
  );

  if (!didTransition) {
    const current = await getOrder(order.id).catch(() => null);
    const alreadyRefunded =
      current?.status === OrderStatus.Refunded ||
      current?.status === OrderStatus.ExternallyRefunded;
    if (!alreadyRefunded) {
      return failure(
        "invalid-status",
        new Error(
          `Hold invoice cancelado pero la orden ${order.id} no pasó a REFUNDED (status actual: ${current?.status})`,
        ),
      );
    }
  }

  return { ok: true };
}

export function mapLightningSettlementError(
  dict: Dictionary,
  reason: LightningSettlementReason,
): string {
  switch (reason) {
    case "in-progress":
      return dict.lightningInProgress;
    case "already-processed":
      return dict.lightningAlreadyProcessed;
    case "invoice-expired":
    case "missing-payout-invoice":
      return dict.lightningInvoiceExpired;
    case "invalid-status":
    case "order-not-found":
    case "wrong-settlement-method":
      return dict.invalidOrderStatus;
    default:
      return dict.lightningPaymentFailed;
  }
}
