import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { getOrder } from "../db/orders.js";
import { orderRatings, users } from "../db/schema.js";
import type { CallbackContext } from "../types.js";
import crypto from "node:crypto";

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
  const order = await getOrder(orderId);
  if (!order)
    return ctx.answerCbQuery(ctx.dict.orderNotFound, { show_alert: true });

  const isCreator = order.creatorId === raterId;
  const isTaker = order.takerId === raterId;

  if (!isCreator && !isTaker)
    return ctx.answerCbQuery(ctx.dict.unauthorizedAccess, {
      show_alert: true,
    });

  const rateeId = isCreator ? order.takerId : order.creatorId;

  try {
    await db.insert(orderRatings).values({
      id: crypto.randomBytes(8).toString("hex"),
      orderId,
      raterId,
      rateeId: rateeId!,
      stars,
    });

    const [ratee] = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, rateeId!));

    const newCount = ratee!.ratingCount + 1;
    const newSum = ratee!.ratingSum + stars;

    const BASE_REVIEWS = 3;
    const BASE_SCORE = 9;
    const bayesianRating = (BASE_SCORE + newSum) / (BASE_REVIEWS + newCount);

    await db
      .update(users)
      .set({
        ratingCount: newCount,
        ratingSum: newSum,
        rating: parseFloat(bayesianRating.toFixed(2)),
      })
      .where(eq(users.telegramId, rateeId!));

    await ctx.editMessageText(ctx.dict.ratingDone(stars));
    return ctx.answerCbQuery();
  } catch (error: any) {
    return ctx.answerCbQuery("Error al guardar la calificación.", {
      show_alert: true,
    });
  }
}
