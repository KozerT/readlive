import UploadForm from "@/components/UploadForm";

export default function Page() {
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
        <UploadForm />
      </div>
    </main>
  );
}
