// app/classes/page.tsx
"use client";
import { useEffect, useState } from "react";
import EntityCard from "@/components/EntityCard";
import { Class } from "@/lib/types";

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/classes?limit=${limit}&offset=${offset}`)
      .then((r) => r.json())
      .then((d) => setClasses(d.data ?? []))
      .finally(() => setLoading(false));
  }, [offset]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : classes.length === 0 ? (
        <p className="text-gray-400">No classes found. Run the seed script.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((c) => (
            <EntityCard
              key={c.id}
              entity={c as unknown as Record<string, unknown>}
              basePath="/classes"
              titleField="id"
              subtitleFields={["semester", "year", "room", "schedule"]}
            />
          ))}
        </div>
      )}
      <div className="flex gap-3">
        <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} className="px-4 py-2 rounded-lg bg-indigo-100 text-indigo-700 disabled:opacity-40">← Prev</button>
        <button disabled={classes.length < limit} onClick={() => setOffset(offset + limit)} className="px-4 py-2 rounded-lg bg-indigo-100 text-indigo-700 disabled:opacity-40">Next →</button>
      </div>
    </div>
  );
}
