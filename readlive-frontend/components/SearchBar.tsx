"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 300;

export default function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const urlQuery = useSearchParams().get("query") ?? "";
  const [value, setValue] = useState(urlQuery);
  // Last query this component put in (or read from) the URL, so we can tell
  // our own debounced updates apart from external ones (back/forward, links).
  const syncedQuery = useRef(urlQuery);

  useEffect(() => {
    if (urlQuery === syncedQuery.current) return;
    syncedQuery.current = urlQuery;
    setValue(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const trimmed = value.trim();

      if ((params.get("query") ?? "") === trimmed) return;

      if (trimmed) params.set("query", trimmed);
      else params.delete("query");

      syncedQuery.current = trimmed;
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
