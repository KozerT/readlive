// hook where we can use the vapi to get the data from the api and return it to the component
import { useSubscription } from "@/hooks/useSubscription";
import {
  endVoiceSession,
  startVoiceSession,
} from "@/lib/actions/session.actions";
import {
  ASSISTANT_ID,
  DEFAULT_VOICE,
  SILENCE_TIMEOUT_SECONDS,
  VOICE_SETTINGS,
} from "@/lib/constants";
import { getVoice } from "@/lib/utils";
import { IBook, Messages } from "@/types";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Vapi from "@vapi-ai/web";
import { useEffect, useRef, useState } from "react";

export type CallStatus =
  | "idle"
  | "connecting"
  | "starting"
  | "listening"
  | "speaking"
  | "thinking";

const VAPI_API_KEY = process.env.NEXT_PUBLIC_VAPI_KEY;
const TIMER_INTERVAL_MS = 1000;
const SECONDS_PER_MINUTE = 60;

type VapiErrorEvent = {
  type?: string;
  message?: unknown;
  error?: { errorMsg?: string; error?: { type?: string; msg?: string } };
};

// Vapi closes the Daily room when the call ends on its side (silence timeout,
// assistant hang-up, max duration...). Daily reports that to the browser as an
// "ejected" error even though it is a regular end of call.
const isServerEndedCall = (error: VapiErrorEvent) =>
  error?.error?.error?.type === "ejected" ||
  error?.error?.errorMsg === "Meeting has ended";

// Map Vapi's endedReason to a message for the user (null = nothing to show)
const getEndedMessage = (reason: string | null) => {
  if (!reason) return "Session ended. Click the mic to start again.";
  if (reason === "silence-timed-out") {
    return "Session ended due to inactivity. Click the mic to start again.";
  }
  if (reason === "exceeded-max-duration") {
    return "Session reached the maximum call length. Click the mic to start again.";
  }
  if (reason.includes("error") || reason.includes("failed")) {
    return `Voice service error (${reason}). Please try again.`;
  }
  return null;
};

let vapi: InstanceType<typeof Vapi>;

function getVapi() {
  if (!vapi) {
    if (!VAPI_API_KEY) {
      throw new Error(
        "VAPI_API_KEY is not found. Please set the environment variable."
      );
    }
    vapi = new Vapi(VAPI_API_KEY);
  }
  return vapi;
}

export const useVapi = (book: IBook, initialSessionsUsed = 0) => {
  const { userId } = useAuth();
  const { limits, isLoaded: isPlanLoaded } = useSubscription();
  const router = useRouter();
  const routerRef = useRef(router);

  //TODO: implement limits, so that user can speak only a certain amount of words per month, and if they reach the limit, they will have to upgrade their plan

  const [status, setStatus] = useState<CallStatus>("idle");
  const [messages, setMessages] = useState<Messages[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [curentUserMessage, setCurrentUserMessage] = useState<string>("");
  const [duration, setDuration] = useState(0);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [sessionsUsed, setSessionsUsed] = useState(initialSessionsUsed);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const isStoppingRef = useRef<boolean>(false);
  const endedReasonRef = useRef<string | null>(null);
  // The server's value (from startVoiceSession) wins over the client's plan guess
  const [serverMaxSeconds, setServerMaxSeconds] = useState<number | null>(null);
  const maxDurationSeconds =
    serverMaxSeconds ??
    (limits?.maxDurationPerSession
      ? limits.maxDurationPerSession * SECONDS_PER_MINUTE
      : 15 * SECONDS_PER_MINUTE);

  // Latest values for the event handlers registered once on mount
  const maxDurationRef = useRef(maxDurationSeconds);
  const durationRef = useRef(duration);
  // Set by the effect below so stop() can tear down without waiting for SDK events
  const finishCallRef = useRef<((context: string) => void) | null>(null);
  useEffect(() => {
    maxDurationRef.current = maxDurationSeconds;
    durationRef.current = duration;
    routerRef.current = router;
  }, [maxDurationSeconds, duration, router]);
  const voice = book.persona || DEFAULT_VOICE;

  const isActive =
    status === "listening" ||
    status === "thinking" ||
    status === "speaking" ||
    status === "starting";

  // Limits functionality is not implemented yet, so we will not use it for now
  //const maxDurationSeconds = maxDurationRef.current / 1000
  // const remainningSeconds = maxDurationSeconds - durationRef.current / 1000 // To know where to display the ending;

  //const showTimeWarning = remainningSeconds <= 30 && remainningSeconds > 0

  // TODO: replace local status updates with the Vapi SDK call lifecycle
  // (vapi.start / vapi.stop + "call-start", "speech-start", "speech-end", "call-end" events)

  useEffect(() => {
    // Shared teardown for every way a call can end
    const finishCall = (context: string) => {
      setStatus("idle");
      setCurrentMessage("");
      setCurrentUserMessage("");

      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // End session tracking
      if (sessionIdRef.current) {
        endVoiceSession(sessionIdRef.current, durationRef.current).catch(
          (err) => console.error(`Failed to end voice session ${context}:`, err)
        );
        sessionIdRef.current = null;
      }

      startTimeRef.current = null;
    };

    finishCallRef.current = finishCall;

    const handlers = {
      "call-start": () => {
        isStoppingRef.current = false;
        endedReasonRef.current = null;
        setStatus("starting"); // AI speaks first, wait for it
        setCurrentMessage("");
        setCurrentUserMessage("");

        // Start duration timer
        startTimeRef.current = Date.now();
        setDuration(0);
        timerRef.current = setInterval(() => {
          if (startTimeRef.current) {
            const newDuration = Math.floor(
              (Date.now() - startTimeRef.current) / TIMER_INTERVAL_MS
            );
            setDuration(newDuration);

            // Check duration limit
            if (newDuration >= maxDurationRef.current) {
              isStoppingRef.current = true;
              finishCall("on time limit");
              getVapi().stop();
              // Plan time limit reached: send the user back to the homepage
              routerRef.current.push("/");
            }
          }
        }, TIMER_INTERVAL_MS);
      },

      "call-end": () => {
        // Don't reset isStoppingRef here - delayed events may still fire
        finishCall("on call end");
      },

      "speech-start": () => {
        if (!isStoppingRef.current) {
          setStatus("speaking");
        }
      },
      "speech-end": () => {
        if (!isStoppingRef.current) {
          // After AI finishes speaking, user can talk
          setStatus("listening");
        }
      },

      message: (message: {
        type: string;
        role: string;
        transcriptType: string;
        transcript: string;
        status?: string;
        endedReason?: string;
      }) => {
        // Vapi sends the reason right before it closes the call
        if (message.type === "status-update" && message.status === "ended") {
          endedReasonRef.current = message.endedReason || null;
          return;
        }

        if (message.type !== "transcript") return;

        // User finished speaking → AI is thinking
        if (message.role === "user" && message.transcriptType === "final") {
          if (!isStoppingRef.current) {
            setStatus("thinking");
          }
          setCurrentUserMessage("");
        }

        // Partial user transcript → show real-time typing
        if (message.role === "user" && message.transcriptType === "partial") {
          setCurrentUserMessage(message.transcript);
          return;
        }

        // Partial AI transcript → show word-by-word
        if (
          message.role === "assistant" &&
          message.transcriptType === "partial"
        ) {
          setCurrentMessage(message.transcript);
          return;
        }

        // Final transcript → add to messages
        if (message.transcriptType === "final") {
          if (message.role === "assistant") setCurrentMessage("");
          if (message.role === "user") setCurrentUserMessage("");

          setMessages((prev) => {
            const isDupe = prev.some(
              (m) => m.role === message.role && m.content === message.transcript
            );
            return isDupe
              ? prev
              : [...prev, { role: message.role, content: message.transcript }];
          });
        }
      },

      error: (error: VapiErrorEvent) => {
        if (isServerEndedCall(error)) {
          const reason = endedReasonRef.current;
          // warn (not info) so Next.js forwards it to the dev terminal
          console.warn(
            "Vapi call ended by server:",
            reason ?? "unknown reason"
          );
          finishCall("on server end");
          if (!isStoppingRef.current) setLimitError(getEndedMessage(reason));
          return;
        }

        console.error("Vapi error:", error);
        // Don't reset isStoppingRef here - delayed events may still fire
        finishCall("on error");

        // Show user-friendly error message
        const rawMessage = error?.error?.errorMsg ?? error?.message;
        const errorMessage =
          typeof rawMessage === "string" ? rawMessage.toLowerCase() : "";
        if (
          errorMessage.includes("timeout") ||
          errorMessage.includes("silence")
        ) {
          setLimitError(
            "Session ended due to inactivity. Click the mic to start again."
          );
        } else if (
          errorMessage.includes("network") ||
          errorMessage.includes("connection")
        ) {
          setLimitError(
            "Connection lost. Please check your internet and try again."
          );
        } else {
          setLimitError(
            "Session ended unexpectedly. Click the mic to start again."
          );
        }
      },
    };

    // Register all handlers
    Object.entries(handlers).forEach(([event, handler]) => {
      getVapi().on(event as keyof typeof handlers, handler as () => void);
    });

    return () => {
      // End active session on unmount
      if (sessionIdRef.current) {
        getVapi().stop();
        endVoiceSession(sessionIdRef.current, durationRef.current).catch(
          (err) => console.error("Failed to end voice session on unmount:", err)
        );
        sessionIdRef.current = null;
      }
      // Cleanup handlers
      Object.entries(handlers).forEach(([event, handler]) => {
        getVapi().off(event as keyof typeof handlers, handler as () => void);
      });
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const start = async () => {
    if (!userId)
      return setLimitError("You must be logged in to use this feature.");

    setLimitError(null);
    setStatus("connecting");
    try {
      const result = await startVoiceSession(book._id);
      if (!result.success) {
        setLimitError(
          result.error || "Session limit reached. Please upgrade your plan."
        );
        setStatus("idle");
        return;
      }

      const callMaxSeconds = result.maxDurationMinutes
        ? result.maxDurationMinutes * SECONDS_PER_MINUTE
        : maxDurationSeconds;
      maxDurationRef.current = callMaxSeconds;
      setServerMaxSeconds(callMaxSeconds);

      sessionIdRef.current = result.sessionId || null;
      setSessionsUsed((used) => used + 1);
      const firstMessage = `Hello! Nice to meet you!You are now in a voice conversation with ${book.persona}. Have you actually read the book "${book.title}"? Or shall we dive into the story?`;
      const resolvedVoice = getVoice(voice);
      const startOverrides = {
        firstMessage,
        silenceTimeoutSeconds: SILENCE_TIMEOUT_SECONDS,
        // Enforce the plan limit on Vapi's side too
        maxDurationSeconds: callMaxSeconds,
        variableValues: {
          title: book.title,
          author: book.author,
          bookId: book._id,
        },
        voice: {
          provider: "11labs" as const,
          voiceId: resolvedVoice.id,
          model: "eleven_turbo_v2" as const,
          stability: VOICE_SETTINGS.stability,
          similarityBoost: VOICE_SETTINGS.similarityBoost,
          style: VOICE_SETTINGS.style,
          useSpeakerBoost: VOICE_SETTINGS.useSpeakerBoost,
        },
      };

      await getVapi().start(ASSISTANT_ID, startOverrides);
    } catch (error) {
      console.error("Error starting Vapi:", error);
      // Close the session created before the call failed to start
      if (sessionIdRef.current) {
        endVoiceSession(sessionIdRef.current, 0).catch((err) =>
          console.error("Failed to end voice session after failed start:", err)
        );
        sessionIdRef.current = null;
      }
      setStatus("idle");
      setLimitError("Failed to start voice conversation. Please try again.");
    }
  };

  const stop = async () => {
    isStoppingRef.current = true;
    try {
      await getVapi().stop();
    } catch (error) {
      console.error("Error stopping Vapi:", error);
    }
    // "call-end" is not guaranteed after stop(), so reset the UI ourselves
    // (safe to run twice: finishCall clears the timer and session ref)
    finishCallRef.current?.("on stop");
  };

  const toggle = () => (isActive ? stop() : start());

  const clearErrors = async () => {
    setLimitError(null);
  };

  return {
    status,
    isActive,
    messages,
    duration,
    maxDurationSeconds,
    isPlanLoaded,
    currentMessage,
    curentUserMessage,
    limitError,
    sessionsUsed,
    start,
    stop,
    toggle,
    clearErrors,
  };
};

export default useVapi;
