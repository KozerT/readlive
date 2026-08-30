"use client"

import FileUploader from "@/components/FileUploader"
import LoadingOverlay from "@/components/LoadingOverlay"
import { Form } from "@/components/ui/form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  checkBookExists,
  createBook,
  saveBookSegments,
} from "@/lib/actions/book.actions"
import { voiceCategories, voiceOptions } from "@/lib/constants"
import { cn, parsePDFFile } from "@/lib/utils"
import { UploadSchema } from "@/lib/zod"
import { BookUploadFormValues } from "@/types"
import { useAuth } from "@clerk/nextjs"
import { zodResolver } from "@hookform/resolvers/zod"
import { upload } from "@vercel/blob/client"
import { FileText, ImagePlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

type VoiceKey = keyof typeof voiceOptions

const UploadForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const { userId } = useAuth()
  const router = useRouter()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const form = useForm<BookUploadFormValues>({
    resolver: zodResolver(UploadSchema),
    defaultValues: {
      title: "",
      author: "",
      voice: "",
      pdfFile: undefined,
      coverImage: undefined,
    },
  })

  const selectedVoice = form.watch("voice")

  const onSubmit = async (data: BookUploadFormValues) => {
    if (!userId) {
      return toast.error("Please login to upload books")
    }
    setIsSubmitting(true)
    // TODO: POST to the book upload endpoint once available.
    try {
      const existsCheck = await checkBookExists(data.title)

      if (existsCheck.exists) {
        toast.info("Book with the same title already exists.")
        form.reset()
        router.push(`/books/${existsCheck.book.slug}`)
        return
      }

      const fileTitle = data.title.replace(/\s+/g, "-").toLocaleLowerCase()
      const pdfFile = data.pdfFile

      const parsePDF = await parsePDFFile(pdfFile)

      if (parsePDF.content.length === 0) {
        return toast.error(
          "Failed to parse PDF content. Please check the file and try again."
        )
      }

      const uploadedPdfBlob = await upload(fileTitle, pdfFile, {
        access: "public",
        handleUploadUrl: "/api/upload",
        contentType: "application/pdf",
      })

      let coverUrl: string

      if (data.coverImage) {
        const coverFile = data.coverImage
        const uploadedCoverBlob = await upload(
          `${fileTitle}_cover.png`,
          coverFile,
          {
            access: "public",
            handleUploadUrl: "/api/upload",
            contentType: coverFile.type,
          }
        )
        coverUrl = uploadedCoverBlob.url
      } else {
        const response = await fetch(parsePDF.cover)
        const blob = await response.blob()

        const uploadedCoverBlob = await upload(`${fileTitle}_cover.png`, blob, {
          access: "public",
          handleUploadUrl: "/api/upload",
          contentType: "image/png",
        })
        coverUrl = uploadedCoverBlob.url
      }
      const book = await createBook({
        clerkId: userId,
        title: data.title,
        author: data.author,
        persona: data.voice,
        fileURL: uploadedPdfBlob.url,
        fileBlobKey: uploadedPdfBlob.pathname,
        coverURL: coverUrl,
        fileSize: pdfFile.size,
      })

      if (!book.success) {
        toast.error((book.error as string) || "Failed to create a book.")
        if (book.isBillingError) {
          router.push("/subscriptions")
        }
        return
      }

      if (book.alreadyExist && book.data) {
        toast.info("Book with the same title already exists.")
        form.reset()
        router.push(`/books/${book.data.slug}`)
        return
      }

      const segments = await saveBookSegments(
        book.data._id,
        userId,
        parsePDF.content
      )

      if (!segments?.success) {
        toast.error("Failed to save book segments.")
        throw new Error("Failed to save book segments")
      }

      form.reset()
      router.push("/")
    } catch (error) {
      console.error(error)
      toast.error("Failed to upload a book. Please try again later")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isMounted) return null

  return (
    <div className="new-book-wrapper">
      <Form {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8"
        >
          <FileUploader
            control={form.control}
            name="pdfFile"
            label="PDF File"
            acceptTypes="application/pdf"
            icon={FileText}
            placeholder="Click to Upload"
            hint="PDF file (max 50 MB)"
          />

          <FileUploader
            control={form.control}
            name="coverImage"
            label="Cover Image"
            acceptTypes="image/jpeg,image/jpg,image/png,image/webp"
            icon={ImagePlus}
            placeholder="Click to upload cover image"
            hint="Leave empty to autogenerate"
            className="h-[120px]"
            iconClassName="mb-1.5 size-8"
          />

          <div>
            <label htmlFor="title" className="form-label">
              Title
            </label>
            <input
              id="title"
              type="text"
              placeholder="ex: Rich Dad Poor Dad"
              className="form-input"
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="mt-1.5 text-sm text-[var(--destructive)]">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="author" className="form-label">
              Author Name
            </label>
            <input
              id="author"
              type="text"
              placeholder="ex: Robert Kiyosaki"
              className="form-input"
              {...form.register("author")}
            />
            {form.formState.errors.author && (
              <p className="mt-1.5 text-sm text-[var(--destructive)]">
                {form.formState.errors.author.message}
              </p>
            )}
          </div>

          <div>
            <span className="form-label">Choose assistance voice</span>
            <RadioGroup
              value={selectedVoice}
              onValueChange={(value) =>
                form.setValue("voice", value as VoiceKey, {
                  shouldValidate: true,
                })
              }
              className="contents"
            >
              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Male voices
                </p>
                <div className="voice-selector-options">
                  {voiceCategories.male.map((key) => {
                    const voice = voiceOptions[key as VoiceKey]
                    return (
                      <label
                        key={key}
                        htmlFor={`voice-${key}`}
                        className={cn(
                          "voice-selector-option",
                          selectedVoice === key &&
                            "voice-selector-option-selected"
                        )}
                      >
                        <RadioGroupItem value={key} id={`voice-${key}`} />
                        <span className="flex flex-col text-left">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {voice.name}
                          </span>
                          <span className="text-sm text-[var(--text-muted)]">
                            {voice.description}
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <p className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Female voices
                </p>
                <div className="voice-selector-options">
                  {voiceCategories.female.map((key) => {
                    const voice = voiceOptions[key as VoiceKey]
                    return (
                      <label
                        key={key}
                        htmlFor={`voice-${key}`}
                        className={cn(
                          "voice-selector-option",
                          selectedVoice === key &&
                            "voice-selector-option-selected"
                        )}
                      >
                        <RadioGroupItem value={key} id={`voice-${key}`} />
                        <span className="flex flex-col text-left">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {voice.name}
                          </span>
                          <span className="text-sm text-[var(--text-muted)]">
                            {voice.description}
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </RadioGroup>
            {form.formState.errors.voice && (
              <p className="mt-1.5 text-sm text-[var(--destructive)]">
                {form.formState.errors.voice.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="form-btn"
          >
            Bring Text to Life
          </button>
        </form>
      </Form>

      {form.formState.isSubmitting && <LoadingOverlay />}
    </div>
  )
}

export default UploadForm
