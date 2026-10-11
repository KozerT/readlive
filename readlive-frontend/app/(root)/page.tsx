export const dynamic = "force-dynamic";

import BookCard from "@/components/BookCard";
import HeroSection from "@/components/HeroSection";
import { searchBooks } from "@/lib/actions/book.actions";
import SearchBar from "@/components/SearchBar";
import { Suspense } from "react";

export default async function BookDetailsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string | string[] }>;
}) {
  const { query: rawQuery } = await searchParams;
  const query = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery) ?? "";

  const bookResults = await searchBooks(query);
  const books = bookResults.success ? (bookResults.data ?? []) : [];

  return (
    <main className="container wrapper">
      <HeroSection />
      <div className="library-filter-bar">
        <h2 className="section-title">Recent Books</h2>
        <Suspense>
          <SearchBar />
        </Suspense>
      </div>
      {books.length === 0 ? (
        <p className="text-[var(--text-muted)]">
          {query.trim() ? `No books match "${query.trim()}".` : "No books yet."}
        </p>
      ) : (
        <div className="library-books-grid">
          {books.map((book) => (
            <BookCard
              key={book._id}
              title={book.title}
              author={book.author}
              coverURL={book.coverURL}
              slug={book.slug}
            />
          ))}
        </div>
      )}
    </main>
  );
}
