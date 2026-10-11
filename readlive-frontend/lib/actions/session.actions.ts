"use server"

import VoiceSession from "@/database/models/voiceSession.model"
import { connectToDatabase } from "@/database/mongose"
import { getUserSubscription } from "@/lib/subscription.server"
import { getCurrentPeriodStart } from "@/lib/subbscriptions-constants"
import { EndSessionResult, SessionUsage, StartSessionResult } from "@/types"
import { auth } from "@clerk/nextjs/server"

export const startVoiceSession = async (
  bookId: string
): Promise<StartSessionResult> => {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        success: false,
        error: "You must be logged in to start a voice session.",
      }
    }

    await connectToDatabase()

    const { limits } = await getUserSubscription()
    const billingPeriodStart = getCurrentPeriodStart()

    const sessionCount = await VoiceSession.countDocuments({
      clerkId: userId,
      billingPeriodStart,
    })

    if (sessionCount >= limits.maxSessionsPerMonth) {
      return {
        success: false,
        error: `You've used all ${limits.maxSessionsPerMonth} voice sessions for this month. Upgrade your plan to continue.`,
        isBillingError: true,
      }
    }

    const session = await VoiceSession.create({
      clerkId: userId,
      bookId,
      startedAt: new Date(),
      durationSeconds: 0,
      billingPeriodStart,
    })

    return {
      success: true,
      sessionId: session._id.toString(),
      maxDurationMinutes: limits.maxDurationPerSession,
    }
  } catch (error) {
    console.error("Error creating session:", error)
    return {
      success: false,
      error: "Failed to start voice session. Please try again.",
    }
  }
}

export const endVoiceSession = async (
  sessionId: string,
  durationSeconds: number
): Promise<EndSessionResult> => {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        success: false,
        error: "You must be logged in to end a voice session.",
      }
    }

    await connectToDatabase()

    const result = await VoiceSession.findOneAndUpdate(
      { _id: sessionId, clerkId: userId },
      {
        endedAt: new Date(),
        durationSeconds: Math.max(0, durationSeconds || 0),
      }
    )

    if (!result) {
      return {
        success: false,
        error: "Session not found.",
      }
    }
    return {
      success: true,
    }
  } catch (error) {
    console.error("Error ending session:", error)
    return {
      success: false,
      error: "Failed to end voice session. Please try again.",
    }
  }
}

export const getSessionUsage = async (): Promise<SessionUsage | null> => {
  try {
    const { userId, plan, limits } = await getUserSubscription()
    if (!userId) return null

    await connectToDatabase()

    const used = await VoiceSession.countDocuments({
      clerkId: userId,
      billingPeriodStart: getCurrentPeriodStart(),
    })

    return {
      plan,
      used,
      max: Number.isFinite(limits.maxSessionsPerMonth)
        ? limits.maxSessionsPerMonth
        : null,
    }
  } catch (error) {
    console.error("Error fetching session usage:", error)
    return null
  }
}
