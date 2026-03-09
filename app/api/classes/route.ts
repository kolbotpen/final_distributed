// app/api/classes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getClusterForDomain, getCollection } from "@/lib/couchbase";
import { Class } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const cluster = await getClusterForDomain("classes");
    const result = await cluster.query(
      `SELECT cl.* FROM \`university\`.\`academic\`.\`classes\` cl
       WHERE cl.type = 'class'
       ORDER BY cl.year DESC, cl.semester
       LIMIT $limit OFFSET $offset`,
      { parameters: { limit, offset } }
    );

    return NextResponse.json({ data: result.rows, limit, offset });
  } catch (err) {
    console.error("[GET /api/classes]", err);
    return NextResponse.json({ error: "Failed to fetch classes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = uuidv4();

    const doc: Class = {
      type: "class",
      id,
      courseId: body.courseId,
      teacherId: body.teacherId,
      studentIds: body.studentIds ?? [],
      semester: body.semester,
      year: body.year,
      room: body.room,
      schedule: body.schedule,
    };

    const collection = await getCollection("classes");
    await collection.insert(id, doc);

    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    console.error("[POST /api/classes]", err);
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
  }
}
