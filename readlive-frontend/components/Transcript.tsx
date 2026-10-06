"use client"

import { Messages } from "@/types"
import { Mic } from "lucide-react"
import { useEffect, useRef } from "react"

interface TranscriptProps {
  messages: Messages[]
  currentMessage: string
  currentUserMessage: string
  persona?: string
}

function Transcript({
  messages,
  currentMessage,
  currentUserMessage,
  persona,
}: TranscriptProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Keep the latest message in view as new or streaming text arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, currentMessage, currentUserMessage])

  const isEmpty =
    messages.length === 0 && !currentMessage && !currentUserMessage

  return (
    <section
      className="transcript-container"
      aria-label="Conversation transcript"
    >
      {isEmpty ? (
        <div className="transcript-empty">
          <Mic
            className="mb-8 size-16 rounded-full bg-[var(--bg-tertiary)] p-5 text-[var(--text-muted)]"
            aria-hidden="true"
          />
          <p className="transcript-empty-text">No conversation yet</p>
          <p className="transcript-empty-hint">
            Click the mic button above to start exploring the ideas in this text
            {persona ? ` with the AI ${persona}` : " with the AI"}.
          </p>
        </div>
      ) : (
        <div className="transcript-messages" aria-live="polite">
          {messages.map((message, index) => (
            <TranscriptBubble
              key={index}
              role={message.role}
              content={message.content}
            />
          ))}
          {currentUserMessage && (
            <TranscriptBubble
              role="user"
              content={currentUserMessage}
              streaming
            />
          )}
          {currentMessage && (
            <TranscriptBubble
              role="assistant"
              content={currentMessage}
              streaming
            />
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </section>
  )
}

function TranscriptBubble({
  role,
  content,
  streaming = false,
}: {
  role: string
  content: string
  streaming?: boolean
}) {
  const isUser = role === "user"

  return (
    <div
      className={`transcript-message ${
        isUser ? "transcript-message-user" : "transcript-message-assistant"
      }`}
    >
      <div
        className={`transcript-bubble ${
          isUser ? "transcript-bubble-user" : "transcript-bubble-assistant"
        }`}
      >
        {content}
        {streaming && <span className="transcript-cursor" aria-hidden="true" />}
      </div>
    </div>
  )
}

export default Transcript
