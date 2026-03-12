// app/classes/[id]/page.tsx
// Cross-collection detail: class + course + teacher + all students
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CollectionStatusBadge, { isSentinel } from "@/components/CollectionStatusBadge";
import { Student } from "@/lib/types";

type MaybeEntity =
  | Record<string, unknown>
  | { id: string; _collectionStatus: "unavailable" | "not_found" };

interface ClassDetail {
  id: string;
  semester: string;
  year: number;
  room: string;
  schedule: string;
  courseId: string;
  teacherId: string;
  studentIds: string[];
  course: MaybeEntity;
  teacher: MaybeEntity;
  students: MaybeEntity[];
}

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [eligibleStudents, setEligibleStudents] = useState<Student[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addingStudent, setAddingStudent] = useState(false);
  const [addError, setAddError] = useState("");

  async function loadClass(): Promise<ClassDetail | null> {
    try {
      const r = await fetch(`/api/classes/${id}`);
      if (!r.ok) { setData(null); return null; }
      const d: ClassDetail = await r.json();
      setData(d);
      return d;
    } catch { setData(null); return null; }
  }

  async function loadEligibleStudents(courseId: string) {
    const [enrRes, stuRes] = await Promise.all([
      fetch(`/api/enrolments?courseId=${encodeURIComponent(courseId)}&limit=200`).then((r) => r.json()),
      fetch("/api/students?limit=200").then((r) => r.json()),
    ]);
    const enrolledIds = new Set<string>(
      (enrRes.data ?? []).map((e: { studentId: string }) => e.studentId)
    );
    setEligibleStudents(
      (stuRes.data ?? []).filter((s: Student) => enrolledIds.has(s.id))
    );
  }

  useEffect(() => {
    loadClass()
      .then((classData) => {
        if (classData?.courseId) return loadEligibleStudents(classData.courseId);
      })
      .finally(() => setLoading(false));
  }, [id]);

  function toggleStudent(studentId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId); else next.add(studentId);
      return next;
    });
  }

  async function handleAddStudents() {
    if (selectedIds.size === 0) return;
    setAddingStudent(true);
    setAddError("");
    try {
      await Promise.all(
        [...selectedIds].map((studentId) =>
          fetch(`/api/classes/${id}/students`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId }),
          }).then(async (res) => {
            if (!res.ok) {
              const d = await res.json();
              if (d.error !== "Student already in class") throw new Error(d.error ?? "Failed");
            }
          })
        )
      );
      setSelectedIds(new Set());
      const updated = await loadClass();
      if (updated?.courseId) await loadEligibleStudents(updated.courseId);
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Failed to add students");
    } finally {
      setAddingStudent(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this class?")) return;
    await fetch(`/api/classes/${id}`, { method: "DELETE" });
    router.push("/classes");
  }

  if (loading) return <p className="text-gray-400">Loading…</p>;
  if (!data) return <p className="text-red-500">Class not found.</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <button onClick={() => router.back()} className="text-indigo-500 hover:underline text-sm">← Back</button>
      <h1 className="text-2xl font-bold text-gray-900">
        {data.semester} {data.year} — Room {data.room}
      </h1>
      <p className="text-sm text-gray-500 font-mono">{data.id}</p>
      <p className="text-sm text-gray-600">{data.schedule}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Course */}
        <div className="bg-white border rounded-xl p-4">
          <h2 className="text-sm font-bold text-gray-700 mb-2">Course</h2>
          {isSentinel(data.course) ? (
            <CollectionStatusBadge collectionName="courses" status={data.course._collectionStatus} id={data.course.id} />
          ) : (
            <FieldList obj={data.course} />
          )}
        </div>

        {/* Teacher */}
        <div className="bg-white border rounded-xl p-4">
          <h2 className="text-sm font-bold text-gray-700 mb-2">Teacher</h2>
          {isSentinel(data.teacher) ? (
            <CollectionStatusBadge collectionName="teachers" status={data.teacher._collectionStatus} id={data.teacher.id} />
          ) : (
            <FieldList obj={data.teacher} />
          )}
        </div>
      </div>

      {/* Students */}
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700">
            Students ({data.students.length})
          </h2>
        </div>

        {/* Add enrolled students */}
        {(() => {
          const available = eligibleStudents.filter((s) => !data.studentIds.includes(s.id));
          if (available.length === 0) return (
            <p className="text-xs text-gray-400">All enrolled students are already in this class.</p>
          );
          return (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium">Add enrolled students:</p>
              <div className="max-h-40 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                {available.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-indigo-600"
                      checked={selectedIds.has(s.id)}
                      onChange={() => toggleStudent(s.id)}
                    />
                    <span className="text-sm text-gray-800">{s.firstName} {s.lastName}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button
                  disabled={selectedIds.size === 0 || addingStudent}
                  onClick={handleAddStudents}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40"
                >
                  {addingStudent ? "Adding…" : `Add ${selectedIds.size > 0 ? `(${selectedIds.size})` : ""}`}
                </button>
                {selectedIds.size > 0 && (
                  <button onClick={() => setSelectedIds(new Set())} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
                )}
              </div>
              {addError && <p className="text-red-600 text-xs">{addError}</p>}
            </div>
          );
        })()}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.students.map((s, i) =>
            isSentinel(s) ? (
              <CollectionStatusBadge
                key={s.id + i}
                collectionName="students"
                status={s._collectionStatus}
                id={s.id}
              />
            ) : (
              <div key={String(s.id ?? i)} className="border rounded-lg p-3 text-xs space-y-0.5">
                <p className="font-semibold text-gray-800">
                  {String(s.firstName ?? "")} {String(s.lastName ?? "")}
                </p>
                <p className="text-gray-400 font-mono truncate">{String(s.email ?? s.id)}</p>
              </div>
            )
          )}
        </div>
      </div>

      <button onClick={handleDelete} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm">Delete</button>
    </div>
  );
}

function FieldList({ obj }: { obj: Record<string, unknown> }) {
  return (
    <div className="text-sm space-y-1">
      {Object.entries(obj).map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <span className="text-gray-500 w-24 shrink-0">{k}</span>
          <span className="text-gray-800 break-all">{JSON.stringify(v)}</span>
        </div>
      ))}
    </div>
  );
}
