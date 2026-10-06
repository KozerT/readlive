import { searchBookSegments } from "@/lib/actions/book.actions"
import { timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"

const SEARCH_TOOL_NAME = "searchbook"
const SEGMENTS_TO_FIND = 3
const NO_RESULTS_MESSAGE = "No information found about this topic in the book."
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i
const PLACEHOLDER_VALUES = ["null", "undefined"]

type VapiToolCall = {
  id: string
  name?: string
  arguments?: unknown
  function?: { name?: string; arguments?: unknown }
}

// Older single-call format: one call per request, answered with { result }
type VapiFunctionCall = { name?: string; parameters?: unknown }

type SearchOutcome = { result: string } | { error: string }

// "searchBook", "search_book" and "search book" are all the same tool
const isSearchBookCall = (name?: string) =>
  name?.replace(/[^a-z]/gi, "").toLowerCase() === SEARCH_TOOL_NAME

// Arguments arrive as an object or as a JSON string, depending on the model
const parseArguments = (raw: unknown): Record<string, unknown> => {
  let parsed = raw
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw)
    } catch {
      return {}
    }
  }
  return parsed && typeof parsed === "object"
    ? (parsed as Record<string, unknown>)
    : {}
}

const processBookSearch = async (
  bookId: unknown,
  query: unknown
): Promise<SearchOutcome> => {
  // Validate before converting: String() would turn null and undefined into
  // "null" and "undefined", and objects into "[object Object]"
  if (bookId == null || query == null) {
    return { error: "Missing bookId or query" }
  }
  if (
    (typeof bookId !== "string" && typeof bookId !== "number") ||
    typeof query !== "string"
  ) {
    return { error: "Invalid bookId or query" }
  }

  const bookIdString = String(bookId).trim()
  const queryString = query.trim()

  // Validate again after converting: the model can still send an empty value,
  // a literal "undefined", or an unresolved "{{bookId}}" template
  if (!OBJECT_ID_PATTERN.test(bookIdString)) {
    return { error: "Invalid bookId" }
  }
  if (
    !queryString ||
    PLACEHOLDER_VALUES.includes(queryString.toLowerCase())
  ) {
    return { error: "Missing query" }
  }

  const { success, data } = await searchBookSegments(
    bookIdString,
    queryString,
    SEGMENTS_TO_FIND
  )

  if (!success) {
    return { error: "Book search failed" }
  }

  const result = data.map((segment) => segment.content).join("\n\n")

  return { result: result || NO_RESULTS_MESSAGE }
}

// The request comes from Vapi's servers, so there is no Clerk session to check.
// Vapi sends the tool's secret in this header instead.
const isFromVapi = (request: Request) => {
  const expected = process.env.VAPI_WEBHOOK_SECRET
  const received = request.headers.get("x-vapi-secret")

  if (!expected || !received) return false

  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(received)

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  )
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isFromVapi(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const functionCall: VapiFunctionCall | undefined =
      body?.message?.functionCall
    const toolCallList: VapiToolCall[] | undefined =
      body?.message?.toolCallList ?? body?.message?.toolCalls

    // Single functionCall format
    if (functionCall) {
      if (!isSearchBookCall(functionCall.name)) {
        return NextResponse.json({ error: "Unknown function" })
      }

      const { bookId, query } = parseArguments(functionCall.parameters)

      return NextResponse.json(await processBookSearch(bookId, query))
    }

    // toolCallList format: an array of calls, one result per call
    if (Array.isArray(toolCallList)) {
      const results = await Promise.all(
        toolCallList
          .filter((toolCall) =>
            isSearchBookCall(toolCall?.function?.name ?? toolCall?.name)
          )
          .map(async (toolCall) => {
            const { bookId, query } = parseArguments(
              toolCall.function?.arguments ?? toolCall.arguments
            )

            return {
              toolCallId: toolCall.id,
              ...(await processBookSearch(bookId, query)),
            }
          })
      )

      return NextResponse.json({ results })
    }

    return NextResponse.json({ error: "No tool call found" }, { status: 400 })
  } catch (e) {
    console.error("Vapi search-book error", e)
    return NextResponse.json(
      { error: "Failed to process tool call" },
      { status: 500 }
    )
  }
}
