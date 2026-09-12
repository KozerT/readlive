"use server"

import VoiceSession from "@/database/models/voiceSession.model"
import { connectToDatabase } from "@/database/mongose"
import { getCurrentPeriodStart } from "@/lib/subbscriptions-constants"
import { StartSessionResult } from "@/types"

export const startVoiceSession = async (
  bookId: string,
  clerkId: string
): Promise<StartSessionResult> => {
  try {
    await connectToDatabase()

    //TODO: check limits and billing plan allows to do this action, if not return an error message to the user

    const session = await VoiceSession.create({
      clerkId,
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
