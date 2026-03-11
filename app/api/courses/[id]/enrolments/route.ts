// POST /api/courses/:id/enrolments
// Enrols a student in this course, creating an Enrolment document.
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getCollection } from "@/lib/couchbase";
import { safeCollectionFetch } from "@/lib/safeFetch";
import { Course, Student, Enrolment } from "@/lib/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;
  try {
    const body = await req.json();
    const { studentId } = body;
    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const [coursesCol, studentsCol, enrolmentsCol] = await Promise.all([
      getCollection("courses"),
      getCollection("students"),
      getCollection("enrolments"),
    ]);

    const [courseResult, studentResult] = await Promise.all([
      safeCollectionFetch<Course>("courses", courseId, async () => {
        const r = await coursesCol.get(courseId);
        return r.content as Course;
      }),
      safeCollectionFetch<Student>("students", studentId, async () => {
        const r = await studentsCol.get(studentId);
        return r.content as Student;
      }),
    ]);

    if (courseResult.status === "not_found") {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    if (studentResult.status === "not_found") {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    if (courseResult.status !== "ok" || studentResult.status !== "ok") {
      return NextResponse.json({ error: "Dependency unavailable" }, { status: 503 });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const doc: Enrolment = {
      type: "enrolment",
      id,
      studentId,
      courseId,
      enrolledAt: body.enrolledAt ?? now,
      grade: body.grade ?? null,
      status: body.status ?? "active",
    };

    await enrolmentsCol.insert(id, doc);
    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    console.error("[POST /api/courses/:id/enrolments]", err);
    return NextResponse.json({ error: "Failed to create enrolment" }, { status: 500 });
  }
}
