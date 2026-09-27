import { and, eq, inArray, ne, notInArray, or } from "drizzle-orm";
import { db } from "./index.js";
import { loans } from "./schema.js";
import type { ResultSetHeader } from "mysql2";
import { LoanStatus, TERMINAL_STATUSES } from "../shared/constants.js";

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
        notInArray(loans.status, TERMINAL_STATUSES),
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
          LoanStatus.Liquidatable
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
