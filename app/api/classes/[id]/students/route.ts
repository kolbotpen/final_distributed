// POST /api/classes/:id/students
// Adds a student to an existing class (appends to class.studentIds).
import { NextRequest, NextResponse } from "next/server";
import { getSnCollection } from "@/lib/couchbase-sn";
import { safeCollectionFetch } from "@/lib/safeFetch";
import { Class, Student } from "@/lib/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classId } = await params;
  try {
    const body = await req.json();
    const { studentId } = body;
    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const [classesCol, studentsCol] = await Promise.all([
      getSnCollection("classes"),
      getSnCollection("students"),
    ]);

    const [classResult, studentResult] = await Promise.all([
      safeCollectionFetch<Class>("classes", classId, async () => {
        const r = await classesCol.get(classId);
        return r.content as Class;
      }),
      safeCollectionFetch<Student>("students", studentId, async () => {
        const r = await studentsCol.get(studentId);
        return r.content as Student;
      }),
    ]);

    if (classResult.status === "not_found") {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }
    if (studentResult.status === "not_found") {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    if (classResult.status !== "ok" || studentResult.status !== "ok") {
      return NextResponse.json({ error: "Dependency unavailable" }, { status: 503 });
    }

    const classDoc = classResult.data;
    if (classDoc.studentIds.includes(studentId)) {
      return NextResponse.json({ error: "Student already in class" }, { status: 409 });
    }

    const updated: Class = {
      ...classDoc,
      studentIds: [...classDoc.studentIds, studentId],
    };
    await classesCol.upsert(classId, updated);

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[POST /api/classes/:id/students]", err);
    return NextResponse.json({ error: "Failed to add student to class" }, { status: 500 });
  }
}
