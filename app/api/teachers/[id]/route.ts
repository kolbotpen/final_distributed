// app/api/teachers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/couchbase";
import { Teacher } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collection = await getCollection("teachers");
    const result = await collection.get(params.id);
    return NextResponse.json(result.content as Teacher);
  } catch (err: unknown) {
    const cbErr = err as { cause?: { name?: string } };
    if (cbErr?.cause?.name === "DocumentNotFoundError") {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }
    console.error("[GET /api/teachers/:id]", err);
    return NextResponse.json({ error: "Failed to fetch teacher" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const doc: Teacher = { ...body, type: "teacher", id: params.id };
    const collection = await getCollection("teachers");
    await collection.upsert(params.id, doc);
    return NextResponse.json(doc);
  } catch (err) {
    console.error("[PUT /api/teachers/:id]", err);
    return NextResponse.json({ error: "Failed to update teacher" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collection = await getCollection("teachers");
    await collection.remove(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    const cbErr = err as { cause?: { name?: string } };
    if (cbErr?.cause?.name === "DocumentNotFoundError") {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }
    console.error("[DELETE /api/teachers/:id]", err);
    return NextResponse.json({ error: "Failed to delete teacher" }, { status: 500 });
  }
}
