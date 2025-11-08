import { NextResponse } from "next/server";
import { getBillById, getBillSummary } from "@/lib/supabase";
import { generateBillSummary } from "@/lib/ai/openai";
import { generateBillSummaryAnthropic } from "@/lib/ai/anthropic";

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
    let summary: string;

    if (process.env.OPENAI_API_KEY) {
      summary = await generateBillSummary(billText, bill.title);
    } else if (process.env.ANTHROPIC_API_KEY) {
      summary = await generateBillSummaryAnthropic(billText, bill.title);
    } else {
      // Return placeholder if no AI keys are configured
      summary = `[PLACEHOLDER SUMMARY] This is a placeholder AI summary for "${bill.title}". 

To enable AI summaries, please configure either OPENAI_API_KEY or ANTHROPIC_API_KEY in your environment variables.

The actual summary would provide a clear, accessible explanation of what this bill does, who it affects, and why it matters.`;
    }

    // TODO: Save summary to database
    // await saveBillSummary(billId, summary);

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

