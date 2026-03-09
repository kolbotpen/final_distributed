// app/teachers/page.tsx
"use client";
import { useEffect, useState } from "react";
import EntityCard from "@/components/EntityCard";
import { Teacher } from "@/lib/types";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/teachers?limit=${limit}&offset=${offset}`)
      .then((r) => r.json())
      .then((d) => setTeachers(d.data ?? []))
      .finally(() => setLoading(false));
  }, [offset]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : teachers.length === 0 ? (
        <p className="text-gray-400">No teachers found. Run the seed script.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teachers.map((t) => (
            <EntityCard
              key={t.id}
              entity={t as unknown as Record<string, unknown>}
              basePath="/teachers"
              titleField="firstName"
              subtitleFields={["lastName", "email", "department"]}
            />
          ))}
        </div>
      )}
      <div className="flex gap-3">
        <button
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - limit))}
          className="px-4 py-2 rounded-lg bg-indigo-100 text-indigo-700 disabled:opacity-40"
        >
          ← Prev
        </button>
        <button
          disabled={teachers.length < limit}
          onClick={() => setOffset(offset + limit)}
          className="px-4 py-2 rounded-lg bg-indigo-100 text-indigo-700 disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
