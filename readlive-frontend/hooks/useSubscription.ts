"use client"

import {
  PLAN_LIMITS,
  PLANS,
  resolvePlan,
} from "@/lib/subbscriptions-constants"
import { useAuth, useSession } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

export const useSubscription = () => {
  const { has, isLoaded } = useAuth()
  const { session } = useSession()
  const router = useRouter()
  const refreshedRef = useRef(false)

  // The plan lives in the session token, which can be up to a minute old after
  // an upgrade. Reload it once on mount so a new plan applies immediately.
  useEffect(() => {
    if (!isLoaded || !session || refreshedRef.current) return
    refreshedRef.current = true
    session
      .reload()
      .then(() => router.refresh())
      .catch((err) => console.error("Failed to refresh session:", err))
  }, [isLoaded, session, router])

  if (!isLoaded) {
    return {
      plan: PLANS.FREE,
      limits: PLAN_LIMITS[PLANS.FREE],
      isLoaded: false,
    }
  }

  const plan = resolvePlan(has)

  return {
    plan,
    limits: PLAN_LIMITS[plan],
    isLoaded: true,
  }
}
