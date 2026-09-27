import { type LoanRecord, type OrderRecord } from "../types.js";

export function getParties(order: OrderRecord) {
  const isCreatorSelling = order.type === "SELL";
  return {
    buyerId: isCreatorSelling ? order.takerId : order.creatorId,
    sellerId: isCreatorSelling ? order.creatorId : order.takerId,
  };
}

export function getLoanParties(loan: LoanRecord) {
  const isCreatorLender = loan.type === "LEND";
  return {
    lenderId: isCreatorLender ? loan.creatorId : loan.takerId,
    borrowerId: isCreatorLender ? loan.takerId : loan.creatorId,
  };
}