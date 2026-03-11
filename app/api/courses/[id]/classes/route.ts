// POST /api/courses/:id/classes
// Creates a class section for this course.
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getCollection } from "@/lib/couchbase";
import { safeCollectionFetch } from "@/lib/safeFetch";
import { Course, Teacher, Class } from "@/lib/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;
  try {
    const body = await req.json();
    const { teacherId, semester, year, room, schedule } = body;
    if (!teacherId || !semester || !year || !room || !schedule) {
      return NextResponse.json(
        { error: "teacherId, semester, year, room, and schedule are required" },
        { status: 400 }
      );
    }

    const [coursesCol, teachersCol, classesCol] = await Promise.all([
      getCollection("courses"),
      getCollection("teachers"),
      getCollection("classes"),
    ]);

    const [courseResult, teacherResult] = await Promise.all([
      safeCollectionFetch<Course>("courses", courseId, async () => {
        const r = await coursesCol.get(courseId);
        return r.content as Course;
      }),
      safeCollectionFetch<Teacher>("teachers", teacherId, async () => {
        const r = await teachersCol.get(teacherId);
        return r.content as Teacher;
      }),
    ]);

    if (courseResult.status === "not_found") {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    if (teacherResult.status === "not_found") {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }
    if (courseResult.status !== "ok" || teacherResult.status !== "ok") {
      return NextResponse.json({ error: "Dependency unavailable" }, { status: 503 });
    }

    const id = uuidv4();
    const doc: Class = {
      type: "class",
      id,
      courseId,
      teacherId,
      studentIds: body.studentIds ?? [],
      semester,
      year: Number(year),
      room,
      schedule,
    };

    await classesCol.insert(id, doc);
    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    console.error("[POST /api/courses/:id/classes]", err);
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
  }
}
