"use client";
// components/CollectionStatusBadge.tsx
// Renders a warning banner when a cross-collection fetch returns unavailable
// or not_found for a nested entity.

interface SentinelObject {
  id: string;
  _collectionStatus: "unavailable" | "not_found";
}

export function isSentinel(obj: unknown): obj is SentinelObject {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "_collectionStatus" in obj
  );
}

export default function CollectionStatusBadge({
  collectionName,
  status,
  id,
}: {
  collectionName: string;
  status: "unavailable" | "not_found";
  id: string;
}) {
  const isUnavailable = status === "unavailable";
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${
        isUnavailable
          ? "bg-yellow-50 border-yellow-300 text-yellow-800"
          : "bg-gray-50 border-gray-200 text-gray-500"
      }`}
    >
      <span className="font-semibold">
        {isUnavailable ? "⚠ Collection temporarily unavailable" : "Not found"}
      </span>
      <span className="ml-2 font-mono text-xs">
        {collectionName} / {id}
      </span>
    </div>
  );
}
