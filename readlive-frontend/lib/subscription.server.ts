import Book from "@/database/models/book.model"
import { connectToDatabase } from "@/database/mongose"
import {
  PLAN_LIMITS,
  PLANS,
  PlanLimits,
  PlanType,
  resolvePlan,
} from "@/lib/subbscriptions-constants"
import { auth } from "@clerk/nextjs/server"

export type UserSubscription = {
  userId: string | null
  plan: PlanType
  limits: PlanLimits
}

// Resolves the signed-in user's plan from Clerk Billing; no subscription = free tier
export const getUserSubscription = async (): Promise<UserSubscription> => {
  const { userId, has, sessionClaims } = await auth()

  const plan: PlanType = userId ? resolvePlan(has) : PLANS.FREE

  if (process.env.NODE_ENV !== "production") {
    // Clerk puts the active plan slugs in the "pla" claim (e.g. "u:standard")
    console.warn("[subscription]", { plan, pla: sessionClaims?.pla })
  }

  return { userId, plan, limits: PLAN_LIMITS[plan] }
}

// Returns an error message when the user can't add another book, otherwise null
export const getBookLimitError = async (
  userId: string,
  limits: PlanLimits
): Promise<string | null> => {
  await connectToDatabase()
  const bookCount = await Book.countDocuments({ clerkId: userId })

  if (bookCount < limits.maxBooks) return null

  return `You've reached your plan's limit of ${limits.maxBooks} book${limits.maxBooks === 1 ? "" : "s"}. Upgrade to add more.`
}
