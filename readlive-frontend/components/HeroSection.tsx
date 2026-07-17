import { Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import BookAndLampHero from "../public/images/book-and-lamp-hero.svg";

const steps = [
  {
    id: 1,
    title: "Upload PDF",
    description: "Add your book file",
    active: false,
  },
  {
    id: 2,
    title: "AI Processing",
    description: "We analyze the content",
    active: true,
  },
  {
    id: 3,
    title: "Voice Chat",
    description: "Discuss with AI",
    active: false,
  },
] as const;

const books = [
  {
    id: 1,
    title: "Book 1",
    description: "Description 1",
  },
  {
    id: 2,
    title: "Book 2",
    description: "Description 2",
  },
  {
    id: 3,
    title: "Book 3",
    description: "Description 3",
  },
  {
    id: 4,
    title: "Book 4",
    description: "Description 4",
  },
  {
    id: 5,
    title: "Book 5",
    description: "Description 5",
  },
] as const;

export default function HeroSection() {
  return (
    <section className="library-hero-card mb-10 md:mb-16">
      <div className="library-hero-content">
        <div className="library-hero-text">
          <h1 className="library-hero-title">Your Library</h1>
          <p className="library-hero-description">
            Convert your books into interactive AI conversations. Listen, learn,
            and discuss your favorite reads.
          </p>
          <Link
            href="/books/new"
            className="btn-primary font-sans"
            type="button"
          >
            <Plus className="size-5" strokeWidth={2.5} aria-hidden />
            Add new book
          </Link>
        </div>

        <div className="library-hero-illustration">
          <div className="library-hero-image">
            <BookAndLampHero
              className="full h-full"
              aria-label="An open book on a desk under the warm light of a reading lamp"
            />
          </div>
        </div>

        <ol className="library-steps-card">
          {steps.map((step) => (
            <li key={step.id} className="library-step-item">
              {step.active ? (
                <span className="library-step-number-active" aria-hidden>
                  <Sparkles className="size-[18px]" strokeWidth={2} />
                </span>
              ) : (
                <span className="library-step-number-solid" aria-hidden>
                  {step.id}
                </span>
              )}
              <div>
                <p
                  className={
                    step.active
                      ? "library-step-title-active"
                      : "library-step-title"
                  }
                >
                  {step.title}
                </p>
                <p className="library-step-description">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
