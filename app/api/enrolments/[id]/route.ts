// app/api/enrolments/[id]/route.ts
// Cross-collection: enrolment + student + course fetched in parallel
import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/couchbase";
import { safeCollectionFetch, resolveOrSentinel } from "@/lib/safeFetch";
import { Enrolment, Student, Course } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const enrolmentsCol = await getCollection("enrolments");
    const enrollResult = await safeCollectionFetch<Enrolment>(
      "enrolments",
      id,
      async () => {
        const r = await enrolmentsCol.get(id);
        return r.content as Enrolment;
      }
    );

    if (enrollResult.status !== "ok") {
      const status = enrollResult.status === "not_found" ? 404 : 503;
      return NextResponse.json({ error: enrollResult.status }, { status });
    }

    const enrolment = enrollResult.data;

    const [studentsCol, coursesCol] = await Promise.all([
      getCollection("students"),
      getCollection("courses"),
    ]);

    const [studentResult, courseResult] = await Promise.all([
      safeCollectionFetch<Student>("students", enrolment.studentId, async () => {
        const r = await studentsCol.get(enrolment.studentId);
        return r.content as Student;
      }),
      safeCollectionFetch<Course>("courses", enrolment.courseId, async () => {
        const r = await coursesCol.get(enrolment.courseId);
        return r.content as Course;
      }),
    ]);

    return NextResponse.json({
      ...enrolment,
      student: resolveOrSentinel(studentResult),
      course: resolveOrSentinel(courseResult),
    });
  } catch (err) {
    console.error("[GET /api/enrolments/:id]", err);
    return NextResponse.json({ error: "Failed to fetch enrolment" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const doc: Enrolment = { ...body, type: "enrolment", id };
    const collection = await getCollection("enrolments");
    await collection.upsert(id, doc);
    return NextResponse.json(doc);
  } catch (err) {
    console.error("[PUT /api/enrolments/:id]", err);
    return NextResponse.json({ error: "Failed to update enrolment" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const collection = await getCollection("enrolments");
    await collection.remove(id);
    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    const cbErr = err as { cause?: { name?: string } };
    if (cbErr?.cause?.name === "DocumentNotFoundError") {
      return NextResponse.json({ error: "Enrolment not found" }, { status: 404 });
    }
    console.error("[DELETE /api/enrolments/:id]", err);
    return NextResponse.json({ error: "Failed to delete enrolment" }, { status: 500 });
  }
}
