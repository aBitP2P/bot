import { subscribeToInvoice } from "lightning";
import { lnd } from "./client.js";
import type { OrderRecord } from "../../types.js";

const activeWatches = new Map<string, ReturnType<typeof subscribeToInvoice>>();

export function watchHoldInvoice(
  order: OrderRecord,
  hash: string,
  onHeld: (order: OrderRecord) => void | Promise<void>,
  onCanceled: (order: OrderRecord) => void | Promise<void>,
) {
  const existing = activeWatches.get(hash);
  if (existing) return existing;

  const sub = subscribeToInvoice({ id: hash, lnd });
  activeWatches.set(hash, sub);

  let notifiedHeld = false;

  const stop = () => {
    sub.removeAllListeners();
    activeWatches.delete(hash);
  };

  sub.on("invoice_updated", async (invoice) => {
    if (invoice.is_canceled) {
      stop();
      return onCanceled(order);
    }

    if (invoice.is_confirmed) {
      stop();
      return;
    }

    if (!notifiedHeld && invoice.is_held && invoice.held > 0) {
      notifiedHeld = true;
      await onHeld(order);
    }
  });

  sub.on("error", (err) => {
    console.error("No se pudo suscribir a los estados del hold invoice", hash, err);
    stop();
    setTimeout(() => {
      watchHoldInvoice(order, hash, onHeld, onCanceled);
    }, 5_000);
  });

  return sub;
}
