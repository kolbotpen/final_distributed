// POST /api/teachers/:id/classes
// Creates a class taught by this teacher.
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getSnCollection } from "@/lib/couchbase-sn";
import { safeCollectionFetch } from "@/lib/safeFetch";
import { Teacher, Course, Class } from "@/lib/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teacherId } = await params;
  try {
    const body = await req.json();
    const { courseId, semester, year, room, schedule } = body;
    if (!courseId || !semester || !year || !room || !schedule) {
      return NextResponse.json(
        { error: "courseId, semester, year, room, and schedule are required" },
        { status: 400 }
      );
    }

    const [teachersCol, coursesCol, classesCol] = await Promise.all([
      getSnCollection("teachers"),
      getSnCollection("courses"),
      getSnCollection("classes"),
    ]);

    const [teacherResult, courseResult] = await Promise.all([
      safeCollectionFetch<Teacher>("teachers", teacherId, async () => {
        const r = await teachersCol.get(teacherId);
        return r.content as Teacher;
      }),
      safeCollectionFetch<Course>("courses", courseId, async () => {
        const r = await coursesCol.get(courseId);
        return r.content as Course;
      }),
    ]);

    if (teacherResult.status === "not_found") {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }
    if (courseResult.status === "not_found") {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    if (teacherResult.status !== "ok" || courseResult.status !== "ok") {
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
    console.error("[POST /api/teachers/:id/classes]", err);
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
  }
}
