// app/api/teachers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getCluster, getCollection } from "@/lib/couchbase";
import { Teacher } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const cluster = await getCluster();
    const result = await cluster.query(
      `SELECT t.* FROM \`university\`.\`academic\`.\`teachers\` t
       WHERE t.type = 'teacher'
       ORDER BY t.lastName, t.firstName
       LIMIT $limit OFFSET $offset`,
      { parameters: { limit, offset } }
    );

    return NextResponse.json({ data: result.rows, limit, offset });
  } catch (err) {
    console.error("[GET /api/teachers]", err);
    return NextResponse.json({ error: "Failed to fetch teachers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = uuidv4();
    const now = new Date().toISOString();

    const doc: Teacher = {
      type: "teacher",
      id,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      department: body.department,
      hiredAt: body.hiredAt ?? now,
      status: body.status ?? "active",
    };

    const collection = await getCollection("teachers");
    await collection.insert(id, doc);

    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    console.error("[POST /api/teachers]", err);
    return NextResponse.json({ error: "Failed to create teacher" }, { status: 500 });
  }
}
