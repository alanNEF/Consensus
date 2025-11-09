import { NextResponse } from "next/server";
import { getBillEndorsementDemographics } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: { billId: string } }
) {
  try {
    const billId = params.billId;

    // Fetch demographics
    const demographics = await getBillEndorsementDemographics(billId);

    // Count demographics
    const counts: Record<string, Record<string, number>> = {
      race: {},
      religion: {},
      gender: {},
      age_range: {},
      party: {},
      income: {},
      education: {},
      residency: {},
    };

    demographics.forEach((item) => {
      const user = item.user;

      // Count single-value demographics
      const singleValueFields = [
        "race",
        "religion",
        "gender",
        "age_range",
        "party",
        "income",
        "education",
        "residency",
      ] as const;

      singleValueFields.forEach((field) => {
        const value = user[field];
        if (value && typeof value === "string") {
          counts[field][value] = (counts[field][value] || 0) + 1;
        }
      });
    });

    return NextResponse.json({ counts, total: demographics.length });
  } catch (error) {
    console.error("Error fetching bill demographics:", error);
    return NextResponse.json(
      { error: "Failed to fetch bill demographics" },
      { status: 500 }
    );
  }
}

