// app/api/students/route.ts
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getCluster, getCollection } from "@/lib/couchbase";
import { Student } from "@/lib/types";

// GET /api/students?limit=20&offset=0
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const cluster = await getCluster();
    const result = await cluster.query(
      `SELECT s.* FROM \`university\`.\`academic\`.\`students\` s
       WHERE s.type = 'student'
       ORDER BY s.lastName, s.firstName
       LIMIT $limit OFFSET $offset`,
      { parameters: { limit, offset } }
    );

    return NextResponse.json({ data: result.rows, limit, offset });
  } catch (err) {
    console.error("[GET /api/students]", err);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}

// POST /api/students
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = uuidv4();
    const now = new Date().toISOString();

    const doc: Student = {
      type: "student",
      id,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      dateOfBirth: body.dateOfBirth,
      enrolledAt: body.enrolledAt ?? now,
      status: body.status ?? "active",
    };

    const collection = await getCollection("students");
    await collection.insert(id, doc);

    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    console.error("[POST /api/students]", err);
    return NextResponse.json({ error: "Failed to create student" }, { status: 500 });
  }
}
