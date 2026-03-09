// app/api/courses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getClusterForDomain, getCollection } from "@/lib/couchbase";
import { Course } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const cluster = await getClusterForDomain("courses");
    const result = await cluster.query(
      `SELECT c.* FROM \`university\`.\`academic\`.\`courses\` c
       WHERE c.type = 'course'
       ORDER BY c.department, c.code
       LIMIT $limit OFFSET $offset`,
      { parameters: { limit, offset } }
    );

    return NextResponse.json({ data: result.rows, limit, offset });
  } catch (err) {
    console.error("[GET /api/courses]", err);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = uuidv4();

    const doc: Course = {
      type: "course",
      id,
      code: body.code,
      title: body.title,
      description: body.description ?? "",
      creditHours: body.creditHours,
      department: body.department,
    };

    const collection = await getCollection("courses");
    await collection.insert(id, doc);

    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    console.error("[POST /api/courses]", err);
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
  }
}
