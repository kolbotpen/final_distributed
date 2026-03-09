// app/enrollments/page.tsx
"use client";
import { useEffect, useState } from "react";
import EntityCard from "@/components/EntityCard";
import { Enrollment } from "@/lib/types";

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/enrollments?limit=${limit}&offset=${offset}`)
      .then((r) => r.json())
      .then((d) => setEnrollments(d.data ?? []))
      .finally(() => setLoading(false));
  }, [offset]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Enrollments</h1>
      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : enrollments.length === 0 ? (
        <p className="text-gray-400">No enrollments found. Run the seed script.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {enrollments.map((e) => (
            <EntityCard
              key={e.id}
              entity={e as unknown as Record<string, unknown>}
              basePath="/enrollments"
              titleField="id"
              subtitleFields={["studentId", "courseId", "status", "grade"]}
            />
          ))}
        </div>
      )}
      <div className="flex gap-3">
        <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} className="px-4 py-2 rounded-lg bg-indigo-100 text-indigo-700 disabled:opacity-40">← Prev</button>
        <button disabled={enrollments.length < limit} onClick={() => setOffset(offset + limit)} className="px-4 py-2 rounded-lg bg-indigo-100 text-indigo-700 disabled:opacity-40">Next →</button>
      </div>
    </div>
  );
}
