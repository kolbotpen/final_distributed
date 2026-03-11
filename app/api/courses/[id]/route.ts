// app/api/courses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/couchbase";
import { Course } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const collection = await getCollection("courses");
    const result = await collection.get(id);
    return NextResponse.json(result.content as Course);
  } catch (err: unknown) {
    const cbErr = err as { cause?: { name?: string } };
    if (cbErr?.cause?.name === "DocumentNotFoundError") {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    console.error("[GET /api/courses/:id]", err);
    return NextResponse.json({ error: "Failed to fetch course" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const doc: Course = { ...body, type: "course", id };
    const collection = await getCollection("courses");
    await collection.upsert(id, doc);
    return NextResponse.json(doc);
  } catch (err) {
    console.error("[PUT /api/courses/:id]", err);
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const collection = await getCollection("courses");
    await collection.remove(id);
    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    const cbErr = err as { cause?: { name?: string } };
    if (cbErr?.cause?.name === "DocumentNotFoundError") {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    console.error("[DELETE /api/courses/:id]", err);
    return NextResponse.json({ error: "Failed to delete course" }, { status: 500 });
  }
}
