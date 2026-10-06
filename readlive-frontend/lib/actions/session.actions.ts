"use server"

import Book from "@/database/models/book.model"
import VoiceSession from "@/database/models/voiceSession.model"
import { connectToDatabase } from "@/database/mongose"
import { DEFAULT_VOICE } from "@/lib/constants"
import { getCurrentPeriodStart } from "@/lib/subbscriptions-constants"
import { getVoice } from "@/lib/utils"
import { EndSessionResult, StartSessionResult } from "@/types"
import { appendFileSync } from "fs"

export const startVoiceSession = async (
  bookId: string,
  clerkId: string
): Promise<StartSessionResult> => {
  try {
    await connectToDatabase()

    //TODO: check limits and billing plan allows to do this action, if not return an error message to the user

    const book = await Book.findById(bookId).lean()
    const persona = book && "persona" in book ? book.persona : null
    const resolved = getVoice(typeof persona === "string" ? persona : undefined)
    // #region agent log
    const logPayload = {sessionId:'fb5164',hypothesisId:'C',location:'lib/actions/session.actions.ts:startVoiceSession',message:'server session start persona resolution',data:{bookId,persona:persona??null,defaultVoice:DEFAULT_VOICE,resolvedName:resolved.name,resolvedId:resolved.id},timestamp:Date.now()}
    fetch('http://127.0.0.1:7380/ingest/b0ae8923-d343-4818-9548-0ed3497fb6db',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fb5164'},body:JSON.stringify(logPayload)}).catch(()=>{});
    try { appendFileSync('/Users/tanita/code_playground/readlive/.cursor/debug-fb5164.log', JSON.stringify(logPayload) + '\n') } catch {}
    // #endregion

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

export const endVoiceSession = async (
  sessionId: string,
  durationSeconds: number
): Promise<EndSessionResult> => {
  try {
    await connectToDatabase()

    const result = await VoiceSession.findByIdAndUpdate(sessionId, {
      endedAt: new Date(),
      durationSeconds,
    })

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
