"use client"

import {
  PLAN_LIMITS,
  PLANS,
  resolvePlan,
} from "@/lib/subbscriptions-constants"
import { useAuth, useSession } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export const useSubscription = () => {
  const { has, isLoaded } = useAuth()
  const { session } = useSession()
  const router = useRouter()

  // The plan lives in the session token, which Clerk caches for up to a minute.
  // Force a fresh token on mount and whenever the tab regains focus (e.g. after
  // switching plans elsewhere), then refresh server components that read it.
  useEffect(() => {
    if (!isLoaded || !session) return

    let cancelled = false
    const refreshToken = async () => {
      try {
        await session.getToken({ skipCache: true })
        if (!cancelled) router.refresh()
      } catch (err) {
        console.error("Failed to refresh session token:", err)
      }
    }

    refreshToken()
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshToken()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", onVisible)
    }
    // session.id, not the object: its identity can change on every token update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, session?.id, router])

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
