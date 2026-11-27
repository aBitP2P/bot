import {
  and,
  eq,
  inArray,
  isNotNull,
  isNull,
  ne,
  notInArray,
  or,
  type SQL,
} from "drizzle-orm";
import { db } from "./index.js";
import { orders } from "./schema.js";
import type { ResultSetHeader } from "mysql2";
import {
  OrderStatus,
  SettlementMethodType,
  TERMINAL_STATUSES,
} from "../shared/constants.js";

export async function createOrder(orderData: typeof orders.$inferInsert) {
  return await db.insert(orders).values(orderData);
}

export async function getOrder(orderId: string) {
  const result = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  return result[0];
}

export async function getUserOrders(
  userId: number,
  options?: { forBackup?: boolean },
) {
  return await db
    .select()
    .from(orders)
    .where(
      and(
        or(eq(orders.creatorId, userId), eq(orders.takerId, userId)),
        notInArray(orders.status, [
          OrderStatus.Completed,
          OrderStatus.Cancelled,
          OrderStatus.Refunded,
          OrderStatus.ExternallyCompleted,
          OrderStatus.ExternallyRefunded,
        ]),
        !options?.forBackup
          ? or(
              ne(orders.status, OrderStatus.Pending),
              eq(orders.creatorId, userId),
            )
          : undefined,
        options?.forBackup ? isNotNull(orders.escrowAddress) : undefined,
      ),
    );
}

export async function getClaimableOrders(userId: number) {
  return await db
    .select()
    .from(orders)
    .where(
      or(
        and(
          eq(orders.status, OrderStatus.Releasable),
          or(
            and(eq(orders.type, "SELL"), eq(orders.takerId, userId)),
            and(eq(orders.type, "BUY"), eq(orders.creatorId, userId)),
          ),
        ),
        and(
          eq(orders.status, OrderStatus.Refundable),
          or(
            and(eq(orders.type, "SELL"), eq(orders.creatorId, userId)),
            and(eq(orders.type, "BUY"), eq(orders.takerId, userId)),
          ),
        ),
      ),
    );
}

// Diferente a getUserOrders, ya que solo retornará aquellas creadas por el usuario.
export async function getOrdersCreatedBy(userId: number) {
  return await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.creatorId, userId),
        notInArray(orders.status, TERMINAL_STATUSES),
      ),
    );
}

/**
 * Transición atómica de estado (compare-and-swap).
 * Solo aplica el UPDATE si la orden sigue en alguno de los `fromStatuses` en el
 * momento exacto de escribir (no en una lectura previa), evitando que dos
 * actualizaciones concurrentes se pisen entre sí (ver /cancel, /dispute,
 * /takedispute, /settle y handleTakeOrder).
 *
 * Devuelve `true` solo si la fila realmente cambió.
 */
export async function tryTransitionOrderStatus(
  orderId: string,
  fromStatuses: string[],
  toStatus: string,
  extraFields: Partial<typeof orders.$inferInsert> = {},
): Promise<boolean> {
  const [result] = (await db
    .update(orders)
    .set({ status: toStatus, updatedAt: Date.now(), ...extraFields })
    .where(
      and(eq(orders.id, orderId), inArray(orders.status, fromStatuses)),
    )) as unknown as [ResultSetHeader];

  return result.affectedRows > 0;
}

/**
 * Variante para asignaciones que no dependen del status sino de otra columna
 * (ej. asignar un admin solo si `disputeAdminId` sigue siendo NULL).
 */
export async function tryConditionalUpdate(
  orderId: string,
  condition: SQL | undefined,
  fields: Partial<typeof orders.$inferInsert>,
): Promise<boolean> {
  const [result] = (await db
    .update(orders)
    .set({ updatedAt: Date.now(), ...fields })
    .where(and(eq(orders.id, orderId), condition))) as unknown as [
    ResultSetHeader,
  ];

  return result.affectedRows > 0;
}

export async function setFiatAmountLocked(orderId: string, amount: number) {
  await db
    .update(orders)
    .set({ fiatAmountLocked: amount })
    .where(eq(orders.id, orderId));
}

export async function setTakerAndAmount(
  orderId: string,
  takerId: number,
  amountSats: number,
) {
  await db
    .update(orders)
    .set({ takerId, amountSats })
    .where(eq(orders.id, orderId));
}

export async function setChannelMessageId(orderId: string, messageId: number) {
  await db
    .update(orders)
    .set({ channelMessageId: messageId })
    .where(eq(orders.id, orderId));
}

export async function setBuyerAddress(orderId: string, address: string) {
  await db
    .update(orders)
    .set({ buyerAddress: address, externalPsbt: null })
    .where(eq(orders.id, orderId));
}

export async function setPayoutInvoice(orderId: string, invoice: string) {
  await db
    .update(orders)
    .set({ payoutInvoice: invoice })
    .where(eq(orders.id, orderId));
}

export async function setRefundAddress(orderId: string, address: string) {
  await db
    .update(orders)
    .set({ refundAddress: address })
    .where(eq(orders.id, orderId));
}

export async function setExternalPsbt(orderId: string, psbt: string | null) {
  await db
    .update(orders)
    .set({ externalPsbt: psbt })
    .where(eq(orders.id, orderId));
}

export async function setEscrowData(
  orderId: string,
  data: Pick<
    typeof orders.$inferInsert,
    | "buyerXpub"
    | "sellerXpub"
    | "escrowIndex"
    | "escrowAddress"
    | "witnessScript"
  >,
) {
  await db.update(orders).set(data).where(eq(orders.id, orderId));
}

export async function setHodlInvoiceData(
  orderId: string,
  data: Pick<
    typeof orders.$inferSelect,
    "holdInvoiceHash" | "holdInvoiceRequest" | "holdInvoicePreimageEncrypted"
  >,
) {
  const didUpdate = await tryConditionalUpdate(
    orderId,
    and(
      eq(orders.settlementMethod, SettlementMethodType.Lightning),
      isNull(orders.holdInvoicePreimageEncrypted),
    ),
    data,
  ); // Se asegura de que no se vaya a cambiar la factura hold de una orden que ya tenga una establecida.
  return didUpdate;
}

/** Invalida el PSBT externo de las órdenes liberables/reembolsables del usuario (tras cambiar la comisión). */
export async function clearExternalPsbtsForUser(userId: number) {
  await db
    .update(orders)
    .set({ externalPsbt: null })
    .where(
      and(
        inArray(orders.status, [
          OrderStatus.Releasable,
          OrderStatus.Refundable,
        ]),
        or(eq(orders.creatorId, userId), eq(orders.takerId, userId)),
      ),
    );
}
