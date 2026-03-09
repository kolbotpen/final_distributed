// lib/safeFetch.ts
// Fault-tolerant wrapper for cross-collection document lookups.
//
// Collections live in the same cluster but their vBuckets can temporarily
// become unavailable during a rebalance or node failure.  This wrapper
// surfaces a typed result instead of throwing so that callers can compose
// partial responses (e.g. a class with an unavailable teacher) without
// failing the whole request.

export type CollectionResult<T> =
  | { status: "ok"; data: T }
  | { status: "unavailable"; collection: string; id: string }
  | { status: "not_found"; collection: string; id: string };

export async function safeCollectionFetch<T>(
  collection: string,
  id: string,
  fetcher: () => Promise<T>
): Promise<CollectionResult<T>> {
  try {
    const data = await fetcher();
    return { status: "ok", data };
  } catch (err: unknown) {
    // Couchbase SDK wraps errors; DocumentNotFoundError means the key simply
    // doesn't exist — not a cluster health issue.
    const cbErr = err as { cause?: { name?: string }; name?: string };
    const errorName = cbErr?.cause?.name ?? cbErr?.name ?? "";
    if (errorName === "DocumentNotFoundError") {
      return { status: "not_found", collection, id };
    }
    // Any other error (timeout, rebalance, KV not available on node) →
    // treat as temporarily unavailable so callers can degrade gracefully.
    return { status: "unavailable", collection, id };
  }
}

/**
 * When building a composed response (e.g. a class object), call this to
 * convert a CollectionResult into either the resolved data or a sentinel
 * object with `_collectionStatus` that the frontend can render as a warning.
 */
export function resolveOrSentinel<T>(
  result: CollectionResult<T>
): T | { id: string; _collectionStatus: "unavailable" | "not_found" } {
  if (result.status === "ok") return result.data;
  return { id: result.id, _collectionStatus: result.status };
}
