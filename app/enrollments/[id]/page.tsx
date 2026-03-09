// app/enrollments/[id]/page.tsx
// Cross-collection detail: enrollment + resolved student + resolved course
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CollectionStatusBadge, { isSentinel } from "@/components/CollectionStatusBadge";

interface EnrollmentDetail {
  id: string;
  studentId: string;
  courseId: string;
  enrolledAt: string;
  grade: string | null;
  status: string;
  student: Record<string, unknown> | { id: string; _collectionStatus: "unavailable" | "not_found" };
  course: Record<string, unknown> | { id: string; _collectionStatus: "unavailable" | "not_found" };
}

export default function EnrollmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<EnrollmentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/enrollments/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!confirm("Delete this enrollment?")) return;
    await fetch(`/api/enrollments/${id}`, { method: "DELETE" });
    router.push("/enrollments");
  }

  if (loading) return <p className="text-gray-400">Loading…</p>;
  if (!data) return <p className="text-red-500">Enrollment not found.</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <button onClick={() => router.back()} className="text-indigo-500 hover:underline text-sm">← Back</button>
      <h1 className="text-2xl font-bold text-gray-900">Enrollment</h1>
      <p className="text-sm font-mono text-gray-500">{data.id}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Student panel */}
        <div className="bg-white border rounded-xl p-4">
          <h2 className="text-sm font-bold text-gray-700 mb-2">Student</h2>
          {isSentinel(data.student) ? (
            <CollectionStatusBadge
              collectionName="students"
              status={data.student._collectionStatus}
              id={data.student.id}
            />
          ) : (
            <div className="text-sm space-y-1">
              {Object.entries(data.student).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-gray-500 w-24 shrink-0">{k}</span>
                  <span className="text-gray-800 break-all">{JSON.stringify(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Course panel */}
        <div className="bg-white border rounded-xl p-4">
          <h2 className="text-sm font-bold text-gray-700 mb-2">Course</h2>
          {isSentinel(data.course) ? (
            <CollectionStatusBadge
              collectionName="courses"
              status={data.course._collectionStatus}
              id={data.course.id}
            />
          ) : (
            <div className="text-sm space-y-1">
              {Object.entries(data.course).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-gray-500 w-24 shrink-0">{k}</span>
                  <span className="text-gray-800 break-all">{JSON.stringify(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Enrollment fields */}
      <div className="bg-white border rounded-xl p-4 text-sm space-y-2">
        <h2 className="font-bold text-gray-700 mb-2">Enrollment Details</h2>
        {(["status","grade","enrolledAt"] as const).map((f) => (
          <div key={f} className="flex gap-2">
            <span className="text-gray-500 w-24 shrink-0">{f}</span>
            <span className="text-gray-800">{JSON.stringify(data[f])}</span>
          </div>
        ))}
      </div>

      <button onClick={handleDelete} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm">Delete</button>
    </div>
  );
}
