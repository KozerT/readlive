import UploadForm from "@/components/UploadForm";
import { getBookLimitError, getUserSubscription } from "@/lib/subscription.server";
import Link from "next/link";

export default async function Page() {
  const { userId, plan, limits } = await getUserSubscription();
  const limitError = userId ? await getBookLimitError(userId, limits) : null;

  return (
    <main className="container wrapper">
      <div className="mx-auto max-w-180 space-y-10">
        <section className="flex flex-col gap-5">
          <h1 className="page-title-xl">Add a new book</h1>
          <p className="subtitle">
            Upload a PDF to instantly analyze, summarize, and voice-chat with
            your document.
          </p>
        </section>
        {limitError ? (
          <section className="auth-shadow flex flex-col items-center gap-4 p-8 text-center">
            <h2 className="text-2xl font-semibold">
              You&apos;ve reached your book limit
            </h2>
            <p className="subtitle">
              Your {plan} plan includes {limits.maxBooks} book
              {limits.maxBooks === 1 ? "" : "s"}. Upgrade to add more.
            </p>
            <Link href="/subscriptions" className="btn-primary">
              View plans
            </Link>
          </section>
        ) : (
          <UploadForm />
        )}
      </div>
    </main>
  );
}
