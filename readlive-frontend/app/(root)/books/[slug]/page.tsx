import VapiControls from "@/components/VapiControls"
import { getBookBySlug } from "@/lib/actions/book.actions"
import { auth } from "@clerk/nextjs/server"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

type BookPageProps = {
  params: Promise<{ slug: string }>
}

export default async function BookPage({ params }: BookPageProps) {
  const { userId } = await auth()

  if (!userId) {
    redirect("/")
  }

  const { slug } = await params
  const result = await getBookBySlug(slug)

  if (!result.success || !result.data) {
    redirect("/")
  }

  const book = result.data

  return (
    <main className="book-page-container">
      <Link href="/" className="back-btn-floating" aria-label="Back to library">
        <ArrowLeft className="size-5" aria-hidden="true" />
      </Link>
      <div className="vapi-main-container gap-8 sm:gap-12">
        <VapiControls book={book} />
      </div>
    </main>
  )
}
