import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { orderRatings, users } from "../db/schema.js";
import type { CallbackContext } from "../types.js";
import crypto from "node:crypto";
import { getContract } from "../db/contracts.js";

export async function handleRating(
  ctx: CallbackContext,
  {
    orderId,
    stars,
    raterId,
  }: {
    orderId: string;
    stars: number;
    raterId: number;
  },
) {
  const contract = await getContract(orderId);
  if (!contract)
    return ctx.answerCbQuery(ctx.dict.orderNotFound, { show_alert: true });

  const isBuyerOrBorrower = contract.buyerOrBorrowerId === raterId;
  const isSellerOrLender = contract.sellerOrLenderId === raterId;

  if (!isBuyerOrBorrower && !isSellerOrLender)
    return ctx.answerCbQuery(ctx.dict.unauthorizedAccess, {
      show_alert: true,
    });

  const rateeId = isBuyerOrBorrower ? contract.sellerOrLenderId : contract.buyerOrBorrowerId;

  try {
    await db.transaction(async (tx) => {
      await tx.insert(orderRatings).values({
        id: crypto.randomBytes(8).toString("hex"),
        orderId,
        raterId,
        rateeId: rateeId!,
        stars,
      });

      const [ratee] = await tx
        .select()
        .from(users)
        .where(eq(users.telegramId, rateeId!))
        .for("update");

      const newCount = ratee!.ratingCount + 1;
      const newSum = ratee!.ratingSum + stars;
      const BASE_REVIEWS = 3;
      const BASE_SCORE = 9;
      const bayesianRating = (BASE_SCORE + newSum) / (BASE_REVIEWS + newCount);

      await tx
        .update(users)
        .set({
          ratingCount: newCount,
          ratingSum: newSum,
          rating: parseFloat(bayesianRating.toFixed(2)),
        })
        .where(eq(users.telegramId, rateeId!));
    });

    await ctx.editMessageText(ctx.dict.ratingDone(stars));
    return ctx.answerCbQuery();
  } catch (error: any) {
    return ctx.answerCbQuery(ctx.dict.orderAlreadyRated, {
      show_alert: true,
    });
  }
}
