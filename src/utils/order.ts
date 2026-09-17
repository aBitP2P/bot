import { type OrderRecord } from "../types.js";

export function getParties(order: OrderRecord) {
  const isCreatorSelling = order.type === "SELL";
  return {
    buyerId: isCreatorSelling ? order.takerId : order.creatorId,
    sellerId: isCreatorSelling ? order.creatorId : order.takerId,
  };
}