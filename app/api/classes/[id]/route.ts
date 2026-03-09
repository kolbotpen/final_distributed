// app/api/classes/[id]/route.ts
// Cross-collection composition: class + course + teacher + all students
import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/couchbase";
import { safeCollectionFetch, resolveOrSentinel } from "@/lib/safeFetch";
import { Class, Course, Teacher, Student } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const classesCol = await getCollection("classes");
    const classResult = await safeCollectionFetch<Class>(
      "classes",
      params.id,
      async () => {
        const r = await classesCol.get(params.id);
        return r.content as Class;
      }
    );

    if (classResult.status !== "ok") {
      const status = classResult.status === "not_found" ? 404 : 503;
      return NextResponse.json({ error: classResult.status }, { status });
    }

    const classDoc = classResult.data;

    const [coursesCol, teachersCol, studentsCol] = await Promise.all([
      getCollection("courses"),
      getCollection("teachers"),
      getCollection("students"),
    ]);

    // Fetch course and teacher in parallel
    const [courseResult, teacherResult] = await Promise.all([
      safeCollectionFetch<Course>("courses", classDoc.courseId, async () => {
        const r = await coursesCol.get(classDoc.courseId);
        return r.content as Course;
      }),
      safeCollectionFetch<Teacher>("teachers", classDoc.teacherId, async () => {
        const r = await teachersCol.get(classDoc.teacherId);
        return r.content as Teacher;
      }),
    ]);

    // Fetch all students in parallel — Promise.allSettled so one missing
    // student doesn't abort the entire response
    const studentResults = await Promise.allSettled(
      classDoc.studentIds.map((sid) =>
        safeCollectionFetch<Student>("students", sid, async () => {
          const r = await studentsCol.get(sid);
          return r.content as Student;
        })
      )
    );

    const students = studentResults.map((r) => {
      if (r.status === "fulfilled") return resolveOrSentinel(r.value);
      // Promise itself rejected (shouldn't happen with safeCollectionFetch, but
      // guard anyway)
      return { id: "unknown", _collectionStatus: "unavailable" as const };
    });

    return NextResponse.json({
      ...classDoc,
      course: resolveOrSentinel(courseResult),
      teacher: resolveOrSentinel(teacherResult),
      students,
    });
  } catch (err) {
    console.error("[GET /api/classes/:id]", err);
    return NextResponse.json({ error: "Failed to fetch class" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const doc: Class = { ...body, type: "class", id: params.id };
    const collection = await getCollection("classes");
    await collection.upsert(params.id, doc);
    return NextResponse.json(doc);
  } catch (err) {
    console.error("[PUT /api/classes/:id]", err);
    return NextResponse.json({ error: "Failed to update class" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collection = await getCollection("classes");
    await collection.remove(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    const cbErr = err as { cause?: { name?: string } };
    if (cbErr?.cause?.name === "DocumentNotFoundError") {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }
    console.error("[DELETE /api/classes/:id]", err);
    return NextResponse.json({ error: "Failed to delete class" }, { status: 500 });
  }
}
