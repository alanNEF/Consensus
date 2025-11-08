import { NextResponse } from "next/server";
import { getBills } from "@/lib/supabase";
import { paginationSchema } from "@/lib/validators";
import { getMockBills } from "@/lib/mocks";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = paginationSchema.parse({
      page: searchParams.get("page") || "1",
      pageSize: searchParams.get("pageSize") || "20",
    });

    // Try to fetch from database
    const result = await getBills(params.page, params.pageSize);

    // If no data in DB, return mock data
    if (result.data.length === 0) {
      const mockBills = getMockBills();
      return NextResponse.json({
        data: mockBills,
        page: params.page,
        pageSize: params.pageSize,
        total: mockBills.length,
        hasMore: false,
      });
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

