"use client"

import useVapi from "@/hooks/useVapi"
import { IBook } from "@/types"
import { Clock3, Mic, Radio } from "lucide-react"
import Image from "next/image"

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
    <>
      {/* Header section with book cover, title, author, and status indicators */}
      <section className="vapi-header-card w-full sm:p-8 lg:p-10">
        <div className="vapi-card-layout">
          <div className="vapi-cover-wrapper">
            <div className="vapi-cover-glow" aria-hidden="true" />
            {book.coverURL ? (
              <Image
                src={book.coverURL}
                alt={`Cover of ${book.title}`}
                width={162}
                height={240}
                className="vapi-cover-image"
                priority
              />
            ) : (
              <div
                className="vapi-cover-image flex items-center justify-center bg-[var(--bg-tertiary)] p-4 text-center font-serif text-sm font-semibold text-[var(--text-secondary)]"
                role="img"
                aria-label={`Cover of ${book.title}`}
              >
                {book.title}
              </div>
            )}
            <div className="vapi-mic-wrapper">
              <button
                type="button"
                className="vapi-mic-btn vapi-mic-btn-inactive"
                aria-label="Start voice conversation"
              >
                <Mic className="size-7 text-[var(--blue)]" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-4 text-center sm:text-left">
            <div>
              <h1 className="page-title-xl break-words">{book.title}</h1>
              <p className="subtitle mt-3">by {book.author}</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <div className="vapi-status-indicator">
                <span
                  className="vapi-status-dot vapi-status-dot-ready"
                  aria-hidden="true"
                />
                <span className="vapi-status-text">Ready</span>
              </div>
              <div className="vapi-status-indicator">
                <Radio
                  className="size-4 text-[var(--blue)]"
                  aria-hidden="true"
                />
                <span className="vapi-status-text">Voice: {book.persona}</span>
              </div>
              <div className="vapi-status-indicator">
                <Clock3
                  className="size-4 text-[var(--text-secondary)]"
                  aria-hidden="true"
                />
                <span className="vapi-status-text">0:00 / 15:00</span>
              </div>
            </div>
          </div>
        </div>
      </section>
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
    </>
  )
}

export default VapiControls
