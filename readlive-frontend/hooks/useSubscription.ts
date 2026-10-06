"use client"

import { PLAN_LIMITS, PLANS, PlanType } from "@/lib/subbscriptions-constants"
import { useAuth, useUser } from "@clerk/nextjs"

export const useSubscription = () => {
  const { has, isLoaded: isAuthLoaded } = useAuth()
  const { user, isLoaded: isUserLoaded } = useUser()
  const isLoaded = isAuthLoaded && isUserLoaded

  if (!isLoaded) {
    return {
      plan: PLANS.FREE,
      limits: PLAN_LIMITS[PLANS.FREE],
      isLoaded: false,
    }
  }

  let plan: PlanType = PLANS.FREE

  if (has?.({ permission: "pro" }) || has?.({ plan: "pro" })) {
    plan = PLANS.PRO
  } else if (has?.({ permission: "standard" }) || has?.({ plan: "standard" })) {
    plan = PLANS.STANDARD
  } else {
    const metadataPlan = (
      user?.publicMetadata?.plan || user?.publicMetadata?.billingPlan
    )
      ?.toString()
      .toLowerCase()

    if (metadataPlan === "pro") {
      plan = PLANS.PRO
    } else if (metadataPlan === "standard") {
      plan = PLANS.STANDARD
    }
  }
  return {
    plan,
    limits: PLAN_LIMITS[plan],
    isLoaded: true,
  }
}
