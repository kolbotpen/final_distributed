// app/api/enrollments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getCluster, getCollection } from "@/lib/couchbase";
import { Enrollment } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);
    const studentId = searchParams.get("studentId");
    const courseId = searchParams.get("courseId");

    let query = `SELECT e.* FROM \`university\`.\`academic\`.\`enrollments\` e
                 WHERE e.type = 'enrollment'`;
    const params: Record<string, unknown> = { limit, offset };

    if (studentId) {
      query += " AND e.studentId = $studentId";
      params.studentId = studentId;
    }
    if (courseId) {
      query += " AND e.courseId = $courseId";
      params.courseId = courseId;
    }
    query += " ORDER BY e.enrolledAt DESC LIMIT $limit OFFSET $offset";

    const cluster = await getCluster();
    const result = await cluster.query(query, { parameters: params });

    return NextResponse.json({ data: result.rows, limit, offset });
  } catch (err) {
    console.error("[GET /api/enrollments]", err);
    return NextResponse.json({ error: "Failed to fetch enrollments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = uuidv4();
    const now = new Date().toISOString();

    const doc: Enrollment = {
      type: "enrollment",
      id,
      studentId: body.studentId,
      courseId: body.courseId,
      enrolledAt: body.enrolledAt ?? now,
      grade: body.grade ?? null,
      status: body.status ?? "active",
    };

    const collection = await getCollection("enrollments");
    await collection.insert(id, doc);

    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    console.error("[POST /api/enrollments]", err);
    return NextResponse.json({ error: "Failed to create enrollment" }, { status: 500 });
  }
}
