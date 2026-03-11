// app/enrolments/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import EntityCard from "@/components/EntityCard";
import { Enrolment } from "@/lib/types";

function CreateEnrolmentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ studentId: "", courseId: "", status: "active", grade: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { ...form, grade: form.grade || null };
      const res = await fetch("/api/enrolments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create enrolment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">New Enrolment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Student ID</label>
            <input
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="uuid"
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Course ID</label>
            <input
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="uuid"
              value={form.courseId}
              onChange={(e) => setForm({ ...form, courseId: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="active">active</option>
              <option value="completed">completed</option>
              <option value="dropped">dropped</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Grade (optional)</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="e.g. A, B+, 85"
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Saving…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EnrolmentsPage() {
  const [enrolments, setEnrolments] = useState<Enrolment[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const limit = 20;
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowCreate(true);
      router.replace("/enrolments");
    }
  }, [searchParams, router]);

  function load() {
    setLoading(true);
    fetch(`/api/enrolments?limit=${limit}&offset=${offset}`)
      .then((r) => r.json())
      .then((d) => setEnrolments(d.data ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [offset]);

  return (
    <div className="space-y-6">
      {showCreate && (
        <CreateEnrolmentModal onClose={() => setShowCreate(false)} onCreated={load} />
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Enrolments</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + New Enrolment
        </button>
      </div>
      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : enrolments.length === 0 ? (
        <p className="text-gray-400">No enrolments found. Run the seed script.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {enrolments.map((e) => (
            <EntityCard
              key={e.id}
              entity={e as unknown as Record<string, unknown>}
              basePath="/enrolments"
              titleField="id"
              subtitleFields={["studentId", "courseId", "status", "grade"]}
            />
          ))}
        </div>
      )}
      <div className="flex gap-3">
        <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} className="px-4 py-2 rounded-lg bg-indigo-100 text-indigo-700 disabled:opacity-40">← Prev</button>
        <button disabled={enrolments.length < limit} onClick={() => setOffset(offset + limit)} className="px-4 py-2 rounded-lg bg-indigo-100 text-indigo-700 disabled:opacity-40">Next →</button>
      </div>
    </div>
  );
}
