import { NextResponse } from "next/server";
import { getBillById } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: { billId: string } }
) {
  try {
    const billId = params.billId;

    // Fetch from database
    const bill = await getBillById(billId);

    if (!bill) {
      return NextResponse.json(
        { error: "Bill not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(bill);
  } catch (error) {
    console.error("Error fetching bill:", error);
    return NextResponse.json(
      { error: "Failed to fetch bill" },
      { status: 500 }
    );
  }
}

