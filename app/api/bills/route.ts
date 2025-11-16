import { NextResponse } from "next/server";
import { getBills } from "@/lib/supabase";
import { paginationSchema } from "@/lib/validators";

// Mark as dynamic to prevent static generation during build
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = paginationSchema.parse({
      page: searchParams.get("page") || "1",
      pageSize: searchParams.get("pageSize") || "20",
    });

    // Fetch from database
    const result = await getBills(params.page, params.pageSize);

    // If no data in DB, return error
    if (result.data.length === 0) {
      return NextResponse.json(
        { error: "No bills found", data: [], total: 0 },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: result.data,
      page: params.page,
      pageSize: params.pageSize,
      total: result.total,
      hasMore: params.page * params.pageSize < result.total,
    });
  } catch (error) {
    console.error("Error fetching bills:", error);
    return NextResponse.json(
      { error: "Failed to fetch bills" },
      { status: 500 }
    );
  }
}

