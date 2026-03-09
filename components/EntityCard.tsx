"use client";
// components/EntityCard.tsx
// Generic card for displaying a single document's key/value pairs.

import Link from "next/link";

interface Props {
  entity: Record<string, unknown>;
  basePath: string;  // e.g. "/students"
  titleField?: string;
  subtitleFields?: string[];
}

export default function EntityCard({
  entity,
  basePath,
  titleField = "id",
  subtitleFields = [],
}: Props) {
  const title = String(entity[titleField] ?? entity.id ?? "—");
  const id = String(entity.id ?? "");

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link
          href={`${basePath}/${id}`}
          className="font-semibold text-indigo-600 hover:underline truncate"
        >
          {title}
        </Link>
        {entity.status && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium ${
              entity.status === "active"
                ? "bg-green-100 text-green-700"
                : entity.status === "inactive"
                ? "bg-gray-100 text-gray-600"
                : "bg-red-100 text-red-600"
            }`}
          >
            {String(entity.status)}
          </span>
        )}
      </div>
      {subtitleFields.map((field) =>
        entity[field] != null ? (
          <p key={field} className="text-sm text-gray-500 truncate">
            <span className="font-medium text-gray-700">{field}:</span>{" "}
            {String(entity[field])}
          </p>
        ) : null
      )}
      <p className="text-xs text-gray-300 mt-2 font-mono truncate">{id}</p>
    </div>
  );
}
