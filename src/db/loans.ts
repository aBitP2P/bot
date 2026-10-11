import { and, eq, inArray, ne, notInArray, or } from "drizzle-orm";
import { db } from "./index.js";
import { loanPayments, loans } from "./schema.js";
import type { ResultSetHeader } from "mysql2";
import {
  LoanPaymentStatus,
  LoanStatus,
  TERMINAL_LOAN_STATUSES,
} from "../shared/constants.js";
import type { UnifiedContract } from "./contracts.js";
import type { LoanRecord } from "../types.js";
import { generateOrderId } from "../utils/crypto.js";

export async function createLoan(loanData: typeof loans.$inferInsert) {
  return await db.insert(loans).values(loanData);
}

export async function getLoan(loanId: string) {
  const result = await db
    .select()
    .from(loans)
    .where(eq(loans.id, loanId))
    .limit(1);
  return result[0];
}

export async function getLoansCreatedBy(userId: number) {
  return await db
    .select()
    .from(loans)
    .where(
      and(
        eq(loans.creatorId, userId),
        notInArray(loans.status, TERMINAL_LOAN_STATUSES),
      ),
    );
}

export async function getUserLoans(userId: number) {
  return await db
    .select()
    .from(loans)
    .where(
      and(
        or(eq(loans.creatorId, userId), eq(loans.takerId, userId)),
        notInArray(loans.status, [
          LoanStatus.Completed,
          LoanStatus.Cancelled,
          LoanStatus.Refunded,
          LoanStatus.Liquidated,
          LoanStatus.Liquidatable,
        ]),
        or(ne(loans.status, LoanStatus.Pending), eq(loans.creatorId, userId)),
      ),
    );
}

export async function tryTransitionLoanStatus(
  loanId: string,
  fromStatuses: string[],
  toStatus: string,
  extraFields: Partial<typeof loans.$inferInsert> = {},
): Promise<boolean> {
  const [result] = (await db
    .update(loans)
    .set({ status: toStatus, updatedAt: Date.now(), ...extraFields })
    .where(
      and(eq(loans.id, loanId), inArray(loans.status, fromStatuses)),
    )) as unknown as [ResultSetHeader];

  return result.affectedRows > 0;
}

export async function createLoanPaymentRequest(
  contract: UnifiedContract<LoanRecord>,
  amount: number,
) {
  const paymentId = generateOrderId();

  await db.insert(loanPayments).values({
    id: paymentId,
    loanId: contract.data.id,
    amount: amount,
    status: LoanPaymentStatus.Pending,
  });

  return paymentId;
}

export async function confirmLoanPayment(paymentId: string) {
  return await db.transaction(async (tx) => {
    const paymentRecord = await tx
      .select()
      .from(loanPayments)
      .where(eq(loanPayments.id, paymentId))
      .limit(1);

    const payment = paymentRecord[0];
    if (!payment) throw new Error("Pago no encontrado");
    if (payment.status !== "PENDING")
      throw new Error("El pago ya fue procesado");

    await tx
      .update(loanPayments)
      .set({
        status: LoanPaymentStatus.Confirmed,
        updatedAt: Date.now(),
      })
      .where(eq(loanPayments.id, paymentId));

    const loanRecord = await tx
      .select()
      .from(loans)
      .where(eq(loans.id, payment.loanId))
      .limit(1);

    const loan = loanRecord[0];
    if (!loan) throw new Error("Préstamo no encontrado");

    const newAmountRepaid = loan.amountRepaid + payment.amount;

    await tx
      .update(loans)
      .set({ amountRepaid: newAmountRepaid })
      .where(eq(loans.id, loan.id));

    return {
      loanId: loan.id,
      amountPaid: payment.amount,
      totalRepaidNow: newAmountRepaid,
      fiatAmountLocked: loan.fiatAmountLocked,
    };
  });
}

export async function rejectLoanPayment(paymentId: string) {
  return await db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(loanPayments)
      .where(
        and(
          eq(loanPayments.id, paymentId),
          eq(loanPayments.status, LoanPaymentStatus.Pending),
        ),
      )
      .for("update");

    if (!payment) {
      throw new Error("El pago no existe o ya ha sido procesado.");
    }

    await tx
      .update(loanPayments)
      .set({ status: LoanPaymentStatus.Rejected })
      .where(eq(loanPayments.id, paymentId));

    return {
      ...payment,
      status: LoanPaymentStatus.Rejected,
    };
  });
}

export async function hasPendingLoanPayment(loanId: string) {
  return (
    (
      await db
        .select()
        .from(loanPayments)
        .where(
          and(
            eq(loanPayments.status, LoanPaymentStatus.Pending),
            eq(loanPayments.loanId, loanId),
          ),
        )
    ).length > 0
  );
}
