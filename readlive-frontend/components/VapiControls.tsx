"use client"

import useVapi from "@/hooks/useVapi"
import { IBook } from "@/types"
import { Mic } from "lucide-react"

function VapiControls({ book }: { book: IBook }) {
  const {
    status,
    isActive,
    messages,
    duration,
    curentUserMessage,
    start,
    stop,
  } = useVapi(book)

  const AiPersona = book.persona
    ? `${book.persona[0].toUpperCase()}${book.persona.slice(1)}`
    : " "

  return (
    <section
      className="transcript-container"
      aria-label="Conversation transcript"
    >
      <div className="transcript-empty">
        <Mic
          className="mb-8 size-16 rounded-full bg-[var(--bg-tertiary)] p-5 text-[var(--text-muted)]"
          aria-hidden="true"
        />
        <p className="transcript-empty-text">No conversation yet</p>
        <p className="transcript-empty-hint">
          Click the mic button above to start exploring the ideas in this text
          with the AI {AiPersona}.
        </p>
      </div>
    </section>
  )
}

export default VapiControls
