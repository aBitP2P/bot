import { and, eq, inArray, ne, notInArray, or, type SQL } from "drizzle-orm";
import { db } from "./index.js";
import { orders } from "./schema.js";
import type { ResultSetHeader } from "mysql2";
import { TERMINAL_STATUSES } from "../shared/constants.js";

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

export async function getUserOrders(userId: number) {
  return await db
    .select()
    .from(orders)
    .where(
      and(
        or(eq(orders.creatorId, userId), eq(orders.takerId, userId)),
        notInArray(orders.status, ["COMPLETED", "CANCELLED", "REFUNDED"]),
        or(ne(orders.status, "PENDING"), eq(orders.creatorId, userId)),
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
    .set({ status: toStatus, ...extraFields })
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
    .set(fields)
    .where(and(eq(orders.id, orderId), condition))) as unknown as [
    ResultSetHeader,
  ];

  return result.affectedRows > 0;
}
