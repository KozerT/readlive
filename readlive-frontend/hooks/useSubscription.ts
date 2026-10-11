"use client"

import { PLAN_LIMITS, PLANS, PlanType } from "@/lib/subbscriptions-constants"
import { useAuth } from "@clerk/nextjs"

export const useSubscription = () => {
  const { has, isLoaded } = useAuth()

  if (!isLoaded) {
    return {
      plan: PLANS.FREE,
      limits: PLAN_LIMITS[PLANS.FREE],
      isLoaded: false,
    }
  }

  let plan: PlanType = PLANS.FREE

  if (has?.({ plan: PLANS.PRO })) {
    plan = PLANS.PRO
  } else if (has?.({ plan: PLANS.STANDARD })) {
    plan = PLANS.STANDARD
  }

  return {
    plan,
    limits: PLAN_LIMITS[plan],
    isLoaded: true,
  }
}
