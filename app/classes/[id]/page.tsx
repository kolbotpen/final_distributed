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
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);
  const [addError, setAddError] = useState("");

  function loadClass() {
    return fetch(`/api/classes/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch(() => setData(null));
  }

  useEffect(() => {
    Promise.all([
      loadClass(),
      fetch("/api/students?limit=200").then((r) => r.json()).then((d) => setAllStudents(d.data ?? [])),
    ]).finally(() => setLoading(false));
  }, [id]);

  async function handleAddStudent() {
    if (!selectedStudentId) return;
    setAddingStudent(true);
    setAddError("");
    try {
      const res = await fetch(`/api/classes/${id}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: selectedStudentId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
      setSelectedStudentId("");
      await loadClass();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Failed to add student");
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

        {/* Add student row */}
        <div className="flex gap-2 items-center">
          <label htmlFor="addStudentSelect" className="sr-only">Add a student</label>
          <select
            id="addStudentSelect"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
          >
            <option value="">Add a student…</option>
            {allStudents
              .filter((s) => !data.studentIds.includes(s.id))
              .map((s) => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
              ))}
          </select>
          <button
            disabled={!selectedStudentId || addingStudent}
            onClick={handleAddStudent}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40"
          >
            {addingStudent ? "Adding…" : "Add"}
          </button>
        </div>
        {addError && <p className="text-red-600 text-xs">{addError}</p>}

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
