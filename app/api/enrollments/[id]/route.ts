// app/api/enrollments/[id]/route.ts
// Cross-collection: enrollment + student + course fetched in parallel
import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/couchbase";
import { safeCollectionFetch, resolveOrSentinel } from "@/lib/safeFetch";
import { Enrollment, Student, Course } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const enrollmentsCol = await getCollection("enrollments");
    const enrollResult = await safeCollectionFetch<Enrollment>(
      "enrollments",
      params.id,
      async () => {
        const r = await enrollmentsCol.get(params.id);
        return r.content as Enrollment;
      }
    );

    if (enrollResult.status !== "ok") {
      const status = enrollResult.status === "not_found" ? 404 : 503;
      return NextResponse.json({ error: enrollResult.status }, { status });
    }

    const enrollment = enrollResult.data;

    const [studentsCol, coursesCol] = await Promise.all([
      getCollection("students"),
      getCollection("courses"),
    ]);

    const [studentResult, courseResult] = await Promise.all([
      safeCollectionFetch<Student>("students", enrollment.studentId, async () => {
        const r = await studentsCol.get(enrollment.studentId);
        return r.content as Student;
      }),
      safeCollectionFetch<Course>("courses", enrollment.courseId, async () => {
        const r = await coursesCol.get(enrollment.courseId);
        return r.content as Course;
      }),
    ]);

    return NextResponse.json({
      ...enrollment,
      student: resolveOrSentinel(studentResult),
      course: resolveOrSentinel(courseResult),
    });
  } catch (err) {
    console.error("[GET /api/enrollments/:id]", err);
    return NextResponse.json({ error: "Failed to fetch enrollment" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const doc: Enrollment = { ...body, type: "enrollment", id: params.id };
    const collection = await getCollection("enrollments");
    await collection.upsert(params.id, doc);
    return NextResponse.json(doc);
  } catch (err) {
    console.error("[PUT /api/enrollments/:id]", err);
    return NextResponse.json({ error: "Failed to update enrollment" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collection = await getCollection("enrollments");
    await collection.remove(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    const cbErr = err as { cause?: { name?: string } };
    if (cbErr?.cause?.name === "DocumentNotFoundError") {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
    }
    console.error("[DELETE /api/enrollments/:id]", err);
    return NextResponse.json({ error: "Failed to delete enrollment" }, { status: 500 });
  }
}
