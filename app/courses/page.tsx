// app/courses/page.tsx
"use client";
import { useEffect, useState } from "react";
import EntityCard from "@/components/EntityCard";
import { Course } from "@/lib/types";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/courses?limit=${limit}&offset=${offset}`)
      .then((r) => r.json())
      .then((d) => setCourses(d.data ?? []))
      .finally(() => setLoading(false));
  }, [offset]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : courses.length === 0 ? (
        <p className="text-gray-400">No courses found. Run the seed script.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <EntityCard
              key={c.id}
              entity={c as unknown as Record<string, unknown>}
              basePath="/courses"
              titleField="title"
              subtitleFields={["code", "department", "creditHours"]}
            />
          ))}
        </div>
      )}
      <div className="flex gap-3">
        <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} className="px-4 py-2 rounded-lg bg-indigo-100 text-indigo-700 disabled:opacity-40">← Prev</button>
        <button disabled={courses.length < limit} onClick={() => setOffset(offset + limit)} className="px-4 py-2 rounded-lg bg-indigo-100 text-indigo-700 disabled:opacity-40">Next →</button>
      </div>
    </div>
  );
}
