export const getCurrentPeriodStart = (): Date => {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)) // Start of the current month (UTC)
}

export const PLANS = {
  FREE: "free",
  STANDARD: "standard",
  PRO: "pro",
} as const

export type PlanType = (typeof PLANS)[keyof typeof PLANS]

export interface PlanLimits {
  maxBooks: number
  maxSessionsPerMonth: number
  maxDurationPerSession: number // in minutes
  hasSessionHistory: boolean
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  [PLANS.FREE]: {
    maxBooks: 1,
    maxSessionsPerMonth: 5,
    maxDurationPerSession: 5,
    hasSessionHistory: false,
  },
  [PLANS.STANDARD]: {
    maxBooks: 10,
    maxSessionsPerMonth: 100,
    maxDurationPerSession: 15,
    hasSessionHistory: true,
  },
  [PLANS.PRO]: {
    maxBooks: 100,
    maxSessionsPerMonth: Infinity,
    maxDurationPerSession: 60,
    hasSessionHistory: true,
  },
}

// Clerk plan slugs that map to each tier (the slug is set in the Clerk dashboard)
const PLAN_SLUGS: Record<Exclude<PlanType, "free">, string[]> = {
  [PLANS.PRO]: ["pro", "premium"],
  [PLANS.STANDARD]: ["standard", "standart"],
}

// Single source of truth for plan detection (client hook and server helper)
export const resolvePlan = (
  has?: (params: { plan: string }) => boolean
): PlanType => {
  for (const tier of [PLANS.PRO, PLANS.STANDARD] as const) {
    if (PLAN_SLUGS[tier].some((slug) => has?.({ plan: slug }))) return tier
  }
  return PLANS.FREE
}
