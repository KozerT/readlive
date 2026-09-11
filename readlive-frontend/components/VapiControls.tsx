"use client"

import useVapi from "@/hooks/useVapi"
import { IBook } from "@/types"
import { Clock3, Mic, MicOff, Radio } from "lucide-react"
import Image from "next/image"
import Transcript from "./Transcript"

function VapiControls({ book }: { book: IBook }) {
  const {
    status,
    isActive,
    messages,
    duration,
    currentMessage,
    curentUserMessage: currentUserMessage,
    toggle,
  } = useVapi(book)

  const isBusy = isActive && (status === "speaking" || status === "thinking")

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
              {isBusy && (
                <span className="vapi-pulse-ring" aria-hidden="true" />
              )}
              <button
                type="button"
                className={`vapi-mic-btn ${isActive ? "vapi-mic-btn-active" : "vapi-mic-btn-inactive"}`}
                aria-label={
                  isActive
                    ? "Stop voice conversation"
                    : "Start voice conversation"
                }
                aria-pressed={isActive}
                disabled={status === "connecting"}
                onClick={toggle}
              >
                {isActive ? (
                  <Mic
                    className="size-7 text-[var(--blue)]"
                    aria-hidden="true"
                  />
                ) : (
                  <MicOff
                    className="size-7 text-[var(--text-secondary)]"
                    aria-hidden="true"
                  />
                )}
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
      <div className="vapi-transcript-wrapper">
        <Transcript
          messages={messages}
          currentMessage={currentMessage}
          currentUserMessage={currentUserMessage}
          persona={AiPersona}
        />
      </div>
    </>
  )
}

export default VapiControls
