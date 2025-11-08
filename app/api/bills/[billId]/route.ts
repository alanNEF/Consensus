import { NextResponse } from "next/server";
import { getBillById } from "@/lib/supabase";
import { getMockBills } from "@/lib/mocks";

export async function GET(
  request: Request,
  { params }: { params: { billId: string } }
) {
  try {
    const billId = params.billId;

    // Try to fetch from database
    let bill = await getBillById(billId);

    // If not found in DB, try mock data
    if (!bill) {
      const mockBills = getMockBills();
      bill = mockBills.find((b) => b.id === billId) || null;
    }

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

