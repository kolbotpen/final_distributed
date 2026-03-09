// app/students/[id]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Student } from "@/lib/types";

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Student>>({});

  useEffect(() => {
    fetch(`/api/students/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { setStudent(d); setForm(d); })
      .catch(() => setStudent(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    const res = await fetch(`/api/students/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setStudent(await res.json()); setEditing(false); }
  }

  async function handleDelete() {
    if (!confirm("Delete this student?")) return;
    await fetch(`/api/students/${id}`, { method: "DELETE" });
    router.push("/students");
  }

  if (loading) return <p className="text-gray-400">Loading…</p>;
  if (!student) return <p className="text-red-500">Student not found.</p>;

  return (
    <div className="max-w-xl space-y-6">
      <button onClick={() => router.back()} className="text-indigo-500 hover:underline text-sm">
        ← Back
      </button>
      <h1 className="text-2xl font-bold text-gray-900">
        {student.firstName} {student.lastName}
      </h1>
      {editing ? (
        <div className="space-y-3 bg-white border rounded-xl p-5">
          {(["firstName","lastName","email","department","status"] as const).map((f) =>
            f in student ? (
              <label key={f} className="block">
                <span className="text-xs font-medium text-gray-500 uppercase">{f}</span>
                <input
                  className="mt-1 block w-full border rounded-lg px-3 py-2 text-sm"
                  value={String(form[f as keyof Student] ?? "")}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                />
              </label>
            ) : null
          )}
          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Save</button>
            <button onClick={() => setEditing(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="bg-white border rounded-xl p-5 space-y-2 text-sm">
          {Object.entries(student).map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <span className="font-medium text-gray-500 w-32 shrink-0">{k}</span>
              <span className="text-gray-800 break-all">{JSON.stringify(v)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-3">
        {!editing && (
          <button onClick={() => setEditing(true)} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm">
            Edit
          </button>
        )}
        <button onClick={handleDelete} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm">
          Delete
        </button>
      </div>
    </div>
  );
}
