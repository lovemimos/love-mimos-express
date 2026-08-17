import "server-only";

/**
 * Thrown for any Tiny API failure (auth, timeout, HTTP error, network).
 * TinyProductRepository/TinyCategoryRepository catch this and fall back
 * to the mock repository — see docs/API_TINY.md §7 and §9. Lives in its
 * own file so both tiny-client.ts and retry.ts can import it without a
 * circular dependency between them.
 */
export class TinyApiError extends Error {
  constructor(
    message: string,
    public readonly kind: "auth" | "timeout" | "http" | "network",
    public readonly status?: number
  ) {
    super(message);
    this.name = "TinyApiError";
  }
}
