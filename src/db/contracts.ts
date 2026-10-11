import { and, eq, inArray, isNull, notInArray, or } from "drizzle-orm";
import { db } from "./index.js";
import { orders, loans } from "./schema.js";
import { tryTransitionOrderStatus } from "./orders.js";
import { tryTransitionLoanStatus } from "./loans.js";
import type { OrderRecord, LoanRecord } from "../types.js";
import { getParties, getLoanParties } from "../utils/parties.js";
import { LoanStatus, OrderStatus, TERMINAL_LOAN_STATUSES, TERMINAL_ORDER_STATUSES } from "../shared/constants.js";

export type UnifiedContract<T = OrderRecord | LoanRecord> = {
  isLoan: boolean;
  data: T;

  buyerOrBorrowerId: number | null;
  sellerOrLenderId: number | null;
  amountSatsOrCollateral: number;
};

export async function getContract<T = OrderRecord | LoanRecord>(
  id: string,
): Promise<UnifiedContract<T> | null> {
  const orderList = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);
  if (orderList.length > 0) {
    const o = orderList[0]!;
    const { buyerId, sellerId } = getParties(o);

    return {
      isLoan: false,
      data: o as T,
      buyerOrBorrowerId: buyerId,
      sellerOrLenderId: sellerId,
      amountSatsOrCollateral: o.amountSats,
    };
  }

  const loanList = await db
    .select()
    .from(loans)
    .where(eq(loans.id, id))
    .limit(1);
  if (loanList.length > 0) {
    const l = loanList[0]!;
    const { borrowerId, lenderId } = getLoanParties(l);

    return {
      isLoan: true,
      data: l as T,
      //@ts-ignore
      buyerOrBorrowerId: borrowerId,
      //@ts-ignore
      sellerOrLenderId: lenderId,
      amountSatsOrCollateral: l.collateralSats,
    };
  }

  return null;
}

export async function tryTransitionContract(
  contract: UnifiedContract,
  fromStatuses: string[],
  toStatus: string,
  extraFields: any = {},
): Promise<boolean> {
  if (contract.isLoan) {
    return await tryTransitionLoanStatus(
      contract.data.id,
      fromStatuses,
      toStatus,
      extraFields,
    );
  } else {
    return await tryTransitionOrderStatus(
      contract.data.id,
      fromStatuses,
      toStatus,
      extraFields,
    );
  }
}

export async function tryAssignDisputeToContract(
  contract: UnifiedContract,
  adminId: number,
): Promise<boolean> {
  const table = contract.isLoan ? loans : orders;
  const [result] = await db
    .update(table)
    .set({ disputeAdminId: adminId, updatedAt: Date.now() })
    .where(
      and(
        eq(table.id, contract.data.id),
        eq(table.status, "DISPUTE"),
        isNull(table.disputeAdminId),
      ),
    );
  return result.affectedRows > 0;
}

export async function tryResolveDisputeContract(
  contract: UnifiedContract,
  adminId: number,
  toStatus: string,
  resolution: string,
): Promise<boolean> {
  const table = contract.isLoan ? loans : orders;
  const [result] = await db
    .update(table)
    .set({
      status: toStatus,
      disputeResolution: resolution,
      updatedAt: Date.now(),
    })
    .where(
      and(
        eq(table.id, contract.data.id),
        eq(table.status, "DISPUTE"),
        eq(table.disputeAdminId, adminId),
      ),
    );
  return result.affectedRows > 0;
}

// Helper para extraer contratos activos de un usuario (unifica orders y loans)
export async function getUnifiedUserContractsForAction(
  userId: number,
  actionType: "FIATSENT" | "CLAIM" | "REPAY" | "BACKUP",
): Promise<any[]> {
  let validOrders: OrderRecord[] = [];
  let validLoans: LoanRecord[] = [];

  if (actionType === "FIATSENT") {
    validOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, OrderStatus.Active),
          or(
            and(eq(orders.type, "SELL"), eq(orders.takerId, userId)),
            and(eq(orders.type, "BUY"), eq(orders.creatorId, userId)),
          ),
        ),
      );

    validLoans = await db
      .select()
      .from(loans)
      .where(
        and(
          eq(loans.status, LoanStatus.WaitingDisbursement),
          or(
            and(eq(loans.type, "LEND"), eq(loans.creatorId, userId)),
            and(eq(loans.type, "BORROW"), eq(loans.takerId, userId)),
          ),
        ),
      );
  } else if (actionType === "CLAIM") {
    validOrders = await db
      .select()
      .from(orders)
      .where(
        or(
          // El comprador reclama los fondos cuando el estado es Releasable
          and(
            eq(orders.status, OrderStatus.Releasable),
            or(
              and(eq(orders.type, "SELL"), eq(orders.takerId, userId)),
              and(eq(orders.type, "BUY"), eq(orders.creatorId, userId)),
            ),
          ),
          // El vendedor reclama (reembolso) cuando el estado es Refundable
          and(
            eq(orders.status, OrderStatus.Refundable),
            or(
              and(eq(orders.type, "SELL"), eq(orders.creatorId, userId)),
              and(eq(orders.type, "BUY"), eq(orders.takerId, userId)),
            ),
          ),
        ),
      );

    validLoans = await db
      .select()
      .from(loans)
      .where(
        or(
          // El prestatario (Borrower) recupera su colateral si el préstamo fue pagado (Releasable) o cancelado/reembolsable (Refundable)
          and(
            inArray(loans.status, [
              LoanStatus.Releasable,
              LoanStatus.Refundable,
              LoanStatus.Liquidatable,
              LoanStatus.PartiallyLiquidated,
              LoanStatus.Expired,
            ]),
            or(
              and(eq(loans.type, "LEND"), eq(loans.takerId, userId)),
              and(eq(loans.type, "BORROW"), eq(loans.creatorId, userId)),
            ),
          ),
          // El prestamista (Lender) reclama el colateral (Liquidación) si el prestatario no pagó (Liquidatable)
          and(
            eq(loans.status, LoanStatus.Liquidatable),
            or(
              and(eq(loans.type, "LEND"), eq(loans.creatorId, userId)),
              and(eq(loans.type, "BORROW"), eq(loans.takerId, userId)),
            ),
          ),
        ),
      );
  } else if (actionType === "REPAY") {
    validLoans = await db
      .select()
      .from(loans)
      .where(
        and(
          eq(loans.status, LoanStatus.Active),
          or(
            and(eq(loans.type, "LEND"), eq(loans.takerId, userId)),
            and(eq(loans.type, "BORROW"), eq(loans.creatorId, userId)),
          ),
        ),
      );
  } else if (actionType === "BACKUP") {
    validOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          notInArray(orders.status, TERMINAL_ORDER_STATUSES),
          or(eq(orders.creatorId, userId), eq(orders.takerId, userId)),
        ),
      );

    validLoans = await db
      .select()
      .from(loans)
      .where(
        and(
          notInArray(loans.status, TERMINAL_LOAN_STATUSES),
          or(eq(loans.creatorId, userId), eq(loans.takerId, userId)),
        ),
      );
  }

  const normalizedOrders = validOrders.map((o) => ({
    id: o.id,
    type: o.type,
    fiatAmountLocked: o.fiatAmountLocked,
    fiatCode: o.fiatCode,
  }));

  const normalizedLoans = validLoans.map((l) => ({
    id: l.id,
    type: l.type,
    fiatAmountLocked: l.fiatAmountLocked,
    fiatCode: l.fiatCode,
  }));

  return [...normalizedOrders, ...normalizedLoans];
}

export function getFiatPaymentParties(contract: UnifiedContract) {
  const isLoanDisbursement = contract.isLoan;

  return {
    senderId: isLoanDisbursement
      ? contract.sellerOrLenderId
      : contract.buyerOrBorrowerId,
    receiverId: isLoanDisbursement
      ? contract.buyerOrBorrowerId
      : contract.sellerOrLenderId,
  };
}

export function getAccruedInterest(loan: LoanRecord) {
  const baseAmount = loan.fiatAmountLocked!;
  const IR = loan.apr / 100 / 12;

  const billableMonths = loan.durationMonthsLocked!;

  return baseAmount * IR * billableMonths;
}
