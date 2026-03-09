// app/api/students/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/couchbase";
import { Student } from "@/lib/types";

// GET /api/students/:id  — KV get (direct node routing, no N1QL)
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collection = await getCollection("students");
    const result = await collection.get(params.id);
    return NextResponse.json(result.content as Student);
  } catch (err: unknown) {
    const cbErr = err as { cause?: { name?: string } };
    if (cbErr?.cause?.name === "DocumentNotFoundError") {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    console.error("[GET /api/students/:id]", err);
    return NextResponse.json({ error: "Failed to fetch student" }, { status: 500 });
  }
}

// PUT /api/students/:id  — full upsert
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const doc: Student = { ...body, type: "student", id: params.id };
    const collection = await getCollection("students");
    await collection.upsert(params.id, doc);
    return NextResponse.json(doc);
  } catch (err) {
    console.error("[PUT /api/students/:id]", err);
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 });
  }
}

// DELETE /api/students/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collection = await getCollection("students");
    await collection.remove(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    const cbErr = err as { cause?: { name?: string } };
    if (cbErr?.cause?.name === "DocumentNotFoundError") {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    console.error("[DELETE /api/students/:id]", err);
    return NextResponse.json({ error: "Failed to delete student" }, { status: 500 });
  }
}
