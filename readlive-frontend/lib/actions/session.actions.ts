"use server"

import VoiceSession from "@/database/models/voiceSession.model"
import { connectToDatabase } from "@/database/mongose"
import { getCurrentPeriodStart } from "@/lib/subbscriptions-constants"
import { EndSessionResult, StartSessionResult } from "@/types"
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

    //TODO: check limits and billing plan allows to do this action, if not return an error message to the user

    const session = await VoiceSession.create({
      clerkId: userId,
      bookId,
      startedAt: new Date(),
      durationSeconds: 0,
      billingPeriodStart: getCurrentPeriodStart(),
    })

    return {
      success: true,
      sessionId: session._id.toString(),
      //     maxDUrationMinutes: 60, //TODO: get this value from the user's subscription plan
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
