// hook where we can use the vapi to get the data from the api and return it to the component
import { IBook, Messages } from "@/types"
import { useAuth } from "@clerk/nextjs"
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
  const bookRef = useLatestRef(book)
  //const maxDurationRef = useLatestRef(limits.maxSessionMinutes * 60 * 1000) // convert minutes to milliseconds
  const durationRef = useLatestRef(duration)

  const isActive =
    status === "listening" ||
    status === "thinking" ||
    status === "speaking" ||
    status === "starting"

  // Limits functionality is not implemented yet, so we will not use it for now
  //const maxDurationSeconds = maxDurationRef.current / 1000
  // const remainningSeconds = maxDurationSeconds - durationRef.current / 1000 // To know where to display the ending;

  //const showTimeWarning = remainningSeconds <= 30 && remainningSeconds > 0

  const start = async () => {}
  const stop = async () => {}
  const clearErrors = async () => {}

  return {
    status,
    isActive,
    messages,
    duration,
    curentUserMessage,
    start,
    stop,
    clearErrors,
  }
}

export default useVapi
