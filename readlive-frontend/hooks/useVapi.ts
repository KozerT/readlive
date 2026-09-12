// hook where we can use the vapi to get the data from the api and return it to the component
import { startVoiceSession } from "@/lib/actions/session.actions"
import { ASSISTANT_ID, DEFAULT_VOICE } from "@/lib/constants"
import { IBook, Messages } from "@/types"
import { useAuth } from "@clerk/nextjs"
import Vapi from "@vapi-ai/web"
import { useEffect, useRef, useState } from "react"

export type CallStatus =
  | "idle"
  | "connecting"
  | "starting"
  | "listening"
  | "speaking"
  | "thinking"

const useLatestRef = <T>(value: T) => {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref
}

const VAPI_API_KEY = process.env.NEXT_PUBLIC_VAPI_KEY

let vapi: InstanceType<typeof Vapi>

function getVapi() {
  if (!vapi) {
    if (!VAPI_API_KEY) {
      throw new Error(
        "VAPI_API_KEY is not found. Please set the environment variable."
      )
    }
    vapi = new Vapi(VAPI_API_KEY)
  }
  return vapi
}

export const useVapi = (book: IBook) => {
  const { userId } = useAuth()

  //TODO: implement limits, so that user can speak only a certain amount of words per month, and if they reach the limit, they will have to upgrade their plan

  const [status, setStatus] = useState<CallStatus>("idle")
  const [messages, setMessages] = useState<Messages[]>([])
  const [currentMessage, setCurrentMessage] = useState<string>("")
  const [curentUserMessage, setCurrentUserMessage] = useState<string>("")
  const [duration, setDuration] = useState(0)
  const [limitError, setLimitError] = useState<string | null>(null)

  const timeRef = useRef<NodeJS.Timeout | null>(null)
  const startTimerRef = useRef<NodeJS.Timeout | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const isStoppingRef = useRef<boolean>(false)

  // const maxDurationSeconds = limits?.maxDurationPerSession
  //   ? limits.maxDurationPerSession * 60
  //   : 15 * 60
  // const maxDurationRef = useLatestRef(maxDurationSeconds)

  const durationRef = useLatestRef(duration)
  const voice = book.persona || DEFAULT_VOICE

  const isActive =
    status === "listening" ||
    status === "thinking" ||
    status === "speaking" ||
    status === "starting"

  // Limits functionality is not implemented yet, so we will not use it for now
  //const maxDurationSeconds = maxDurationRef.current / 1000
  // const remainningSeconds = maxDurationSeconds - durationRef.current / 1000 // To know where to display the ending;

  //const showTimeWarning = remainningSeconds <= 30 && remainningSeconds > 0

  // TODO: replace local status updates with the Vapi SDK call lifecycle
  // (vapi.start / vapi.stop + "call-start", "speech-start", "speech-end", "call-end" events)
  const start = async () => {
    if (!userId)
      return setLimitError("You must be logged in to use this feature.")

    setLimitError(null)
    setStatus("connecting")
    try {
      const result = await startVoiceSession(book._id, userId)
      if (!result.success) {
        setLimitError(
          result.error || "Session limit reached. Please upgrade your plan."
        )
        setStatus("idle")
        return
      }

      sessionIdRef.current = result.sessionId || null
      const firstMessage = `Hello! Nice to meet you!You are now in a voice conversation with ${book.persona}. Have you actually read the book "${book.title}"? Or shall we dive into the story?`

      await getVapi().start(ASSISTANT_ID, {
        firstMessage,
        variableValues: {
          title: book.title,
          author: book.author,
          bookId: book._id,
        },
        // voice: {
        //   provider: "11labs" as const,
        //   voiceId: getVoice(voice).id,
        //   model: "eleven_turbo_v2" as const,
        //   similarityBoost: VOICE_SETTINGS.similarityBoost,
        //   style: VOICE_SETTINGS.style,
        //   useSpeakerBoost: VOICE_SETTINGS.useSpeakerBoost,
        // },
      })
    } catch (error) {
      console.error("Error starting Vapi:", error)
      setStatus("idle")
      setLimitError("Failed to start voice conversation. Please try again.")
    }
  }

  const stop = async () => {
    isStoppingRef.current = true
    await getVapi().stop()
  }

  const toggle = () => (isActive ? stop() : start())

  const clearErrors = async () => {
    setLimitError(null)
  }

  return {
    status,
    isActive,
    messages,
    duration,
    currentMessage,
    curentUserMessage,
    start,
    stop,
    toggle,
    clearErrors,
  }
}

export default useVapi
