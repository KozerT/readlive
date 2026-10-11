import { MAX_FILE_SIZE } from "@/lib/constants"
import {
  getBookLimitError,
  getUserSubscription,
} from "@/lib/subscription.server"
import { handleUpload, HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const { userId, limits } = await getUserSubscription()

        if (!userId) {
          throw new Error("Unauthorized: User not authenticated")
        }

        const limitError = await getBookLimitError(userId, limits)
        if (limitError) {
          throw new Error(`BillingLimit: ${limitError}`)
        }

        return {
          allowedContentTypes: [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp",
          ],
          addRandomSuffix: true,
          maximumSizeInBytes: MAX_FILE_SIZE,
          tokenPayload: JSON.stringify({ userId }),
        }
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("File uploaded to blob: ", blob.url)

        // TODO: PostHog
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (e) {
    const message = e instanceof Error ? e.message : "An unknown error occurred"
    const isBillingLimit = message.startsWith("BillingLimit: ")
    const status = message.includes("Unauthorized")
      ? 401
      : isBillingLimit
        ? 403
        : 500
    if (isBillingLimit) console.warn("Upload blocked by plan limit")
    else console.error("Upload error", e)
    const clientMessage =
      status === 401
        ? "Unauthorized"
        : isBillingLimit
          ? message.replace("BillingLimit: ", "")
          : "Upload failed"
    return NextResponse.json(
      { error: clientMessage, isBillingError: isBillingLimit },
      { status }
    )
  }
}
