import { NextResponse } from "next/server";
import { getBillById, getBillSummary, insertBillSummary } from "@/lib/supabase";
import { generateBillSummaryOpenRouter } from "@/lib/ai/openrouter";

export async function POST(
  request: Request,
  { params }: { params: { billId: string } }
) {
  try {
    const billId = params.billId;

    // Check if summary already exists
    const existingSummary = await getBillSummary(billId);
    if (existingSummary) {
      return NextResponse.json({
        summary: existingSummary.summary_text,
        cached: true,
      });
    }

    // Fetch bill details
    const bill = await getBillById(billId);
    if (!bill) {
      return NextResponse.json(
        { error: "Bill not found" },
        { status: 404 }
      );
    }

    // Generate summary using OpenAI (preferred) or Anthropic
    const billText = bill.title + (bill.summary_key || "");
    const summary = await generateBillSummaryOpenRouter(billText, bill.title);

    // Save summary to database
    await insertBillSummary(billId, summary);

    return NextResponse.json({
      summary,
      cached: false,
    });
  } catch (error) {
    console.error("Error generating summary:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}

