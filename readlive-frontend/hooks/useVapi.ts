// hook where we can use the vapi to get the data from the api and return it to the component
import { useSubscription } from "@/hooks/useSubscription"
import {
  endVoiceSession,
  startVoiceSession,
} from "@/lib/actions/session.actions"
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
const TIMER_INTERVAL_MS = 1000
const SECONDS_PER_MINUTE = 60
const TIME_WARNING_THRESHOLD = 60 // Show warning when this many seconds remain

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
  const { limits } = useSubscription()

  //TODO: implement limits, so that user can speak only a certain amount of words per month, and if they reach the limit, they will have to upgrade their plan

  const [status, setStatus] = useState<CallStatus>("idle")
  const [messages, setMessages] = useState<Messages[]>([])
  const [currentMessage, setCurrentMessage] = useState<string>("")
  const [curentUserMessage, setCurrentUserMessage] = useState<string>("")
  const [duration, setDuration] = useState(0)
  const [limitError, setLimitError] = useState<string | null>(null)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const isStoppingRef = useRef<boolean>(false)
  const maxDurationSeconds = limits?.maxDurationPerSession
    ? limits.maxDurationPerSession * 60
    : 15 * 60

  const maxDurationRef = useLatestRef(maxDurationSeconds)

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

  useEffect(() => {
    const handlers = {
      "call-start": () => {
        isStoppingRef.current = false
        setStatus("starting") // AI speaks first, wait for it
        setCurrentMessage("")
        setCurrentUserMessage("")

        // Start duration timer
        startTimeRef.current = Date.now()
        setDuration(0)
        timerRef.current = setInterval(() => {
          if (startTimeRef.current) {
            const newDuration = Math.floor(
              (Date.now() - startTimeRef.current) / TIMER_INTERVAL_MS
            )
            setDuration(newDuration)

            // Check duration limit
            if (newDuration >= maxDurationRef.current) {
              getVapi().stop()
              setLimitError(
                `Session time limit (${Math.floor(
                  maxDurationRef.current / SECONDS_PER_MINUTE
                )} minutes) reached. Upgrade your plan for longer sessions.`
              )
            }
          }
        }, TIMER_INTERVAL_MS)
      },

      "call-end": () => {
        // Don't reset isStoppingRef here - delayed events may still fire
        setStatus("idle")
        setCurrentMessage("")
        setCurrentUserMessage("")

        // Stop timer
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }

        // End session tracking
        if (sessionIdRef.current) {
          endVoiceSession(sessionIdRef.current, durationRef.current).catch(
            (err) => console.error("Failed to end voice session:", err)
          )
          sessionIdRef.current = null
        }

        startTimeRef.current = null
      },

      "speech-start": () => {
        if (!isStoppingRef.current) {
          setStatus("speaking")
        }
      },
      "speech-end": () => {
        if (!isStoppingRef.current) {
          // After AI finishes speaking, user can talk
          setStatus("listening")
        }
      },

      message: (message: {
        type: string
        role: string
        transcriptType: string
        transcript: string
      }) => {
        if (message.type !== "transcript") return

        // User finished speaking → AI is thinking
        if (message.role === "user" && message.transcriptType === "final") {
          if (!isStoppingRef.current) {
            setStatus("thinking")
          }
          setCurrentUserMessage("")
        }

        // Partial user transcript → show real-time typing
        if (message.role === "user" && message.transcriptType === "partial") {
          setCurrentUserMessage(message.transcript)
          return
        }

        // Partial AI transcript → show word-by-word
        if (
          message.role === "assistant" &&
          message.transcriptType === "partial"
        ) {
          setCurrentMessage(message.transcript)
          return
        }

        // Final transcript → add to messages
        if (message.transcriptType === "final") {
          if (message.role === "assistant") setCurrentMessage("")
          if (message.role === "user") setCurrentUserMessage("")

          setMessages((prev) => {
            const isDupe = prev.some(
              (m) => m.role === message.role && m.content === message.transcript
            )
            return isDupe
              ? prev
              : [...prev, { role: message.role, content: message.transcript }]
          })
        }
      },

      error: (error: Error) => {
        console.error("Vapi error:", error)
        // Don't reset isStoppingRef here - delayed events may still fire
        setStatus("idle")
        setCurrentMessage("")
        setCurrentUserMessage("")

        // Stop timer on error
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }

        // End session tracking on error
        if (sessionIdRef.current) {
          endVoiceSession(sessionIdRef.current, durationRef.current).catch(
            (err) => console.error("Failed to end voice session on error:", err)
          )
          sessionIdRef.current = null
        }

        // Show user-friendly error message
        const errorMessage = error.message?.toLowerCase() || ""
        if (
          errorMessage.includes("timeout") ||
          errorMessage.includes("silence")
        ) {
          setLimitError(
            "Session ended due to inactivity. Click the mic to start again."
          )
        } else if (
          errorMessage.includes("network") ||
          errorMessage.includes("connection")
        ) {
          setLimitError(
            "Connection lost. Please check your internet and try again."
          )
        } else {
          setLimitError(
            "Session ended unexpectedly. Click the mic to start again."
          )
        }

        startTimeRef.current = null
      },
    }

    // Register all handlers
    Object.entries(handlers).forEach(([event, handler]) => {
      getVapi().on(event as keyof typeof handlers, handler as () => void)
    })

    return () => {
      // End active session on unmount
      if (sessionIdRef.current) {
        getVapi().stop()
        endVoiceSession(sessionIdRef.current, durationRef.current).catch(
          (err) => console.error("Failed to end voice session on unmount:", err)
        )
        sessionIdRef.current = null
      }
      // Cleanup handlers
      Object.entries(handlers).forEach(([event, handler]) => {
        getVapi().off(event as keyof typeof handlers, handler as () => void)
      })
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

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
