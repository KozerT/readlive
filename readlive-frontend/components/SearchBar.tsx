"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const DEBOUNCE_MS = 300;

export default function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(useSearchParams().get("query") ?? "");

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const trimmed = value.trim();

      if ((params.get("query") ?? "") === trimmed) return;

      if (trimmed) params.set("query", trimmed);
      else params.delete("query");

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [value, pathname, router]);

  return (
    <form action="/" method="GET" role="search" className="library-search-wrapper">
      <input
        type="search"
        name="query"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by title or author"
        aria-label="Search books by title or author"
        className="library-search-input"
      />
      <button type="submit" aria-label="Search" className="px-4">
        <Search className="size-5 text-[var(--text-muted)]" />
      </button>
    </form>
  );
}
