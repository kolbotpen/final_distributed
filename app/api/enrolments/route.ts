// app/api/enrolments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getClusterForDomain, getCollection } from "@/lib/couchbase";
import { Enrolment } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);
    const studentId = searchParams.get("studentId");
    const courseId = searchParams.get("courseId");

    let query = `SELECT e.* FROM \`university\`.\`academic\`.\`enrolments\` e
                 WHERE e.type = 'enrolment'`;
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

    const cluster = await getClusterForDomain("enrolments");
    const result = await cluster.query(query, { parameters: params });

    return NextResponse.json({ data: result.rows, limit, offset });
  } catch (err) {
    console.error("[GET /api/enrolments]", err);
    return NextResponse.json({ error: "Failed to fetch enrolments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = uuidv4();
    const now = new Date().toISOString();

    const doc: Enrolment = {
      type: "enrolment",
      id,
      studentId: body.studentId,
      courseId: body.courseId,
      enrolledAt: body.enrolledAt ?? now,
      grade: body.grade ?? null,
      status: body.status ?? "active",
    };

    const collection = await getCollection("enrolments");
    await collection.insert(id, doc);

    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    console.error("[POST /api/enrolments]", err);
    return NextResponse.json({ error: "Failed to create enrolment" }, { status: 500 });
  }
}
