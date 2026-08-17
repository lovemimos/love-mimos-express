import { Suspense } from "react";
import Header from "@/components/layout/Header";
import SearchPageContent from "@/features/product/components/SearchPageContent";

/**
 * `useSearchParams()` (used inside `SearchPageContent` to make the URL
 * the source of truth for q/categoria/ordem — see
 * docs/features/home-and-search.md) requires a Suspense boundary around
 * any component that calls it, per Next.js's own guidance. This file
 * stays a Server Component and only renders the static header instantly
 * while the interactive, search-params-driven content streams in —
 * this is the "recommended Next.js primitive" for this exact situation,
 * rather than making the whole route eagerly client-rendered with no
 * fallback.
 */
export default function SearchPage() {
  return (
    <div>
      <Header />
      <Suspense fallback={null}>
        <SearchPageContent />
      </Suspense>
    </div>
  );
}
