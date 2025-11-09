import { getBillEndorsementDemographics, getBillById } from "@/lib/supabase";
import DemographicsCharts from "../DemographicsCharts";
import "../bill-demographics.css";
import { notFound } from "next/navigation";

interface BillDemographicsPageProps {
  params: {
    billId: string;
  };
}

export default async function BillDemographicsPage({
  params,
}: BillDemographicsPageProps) {
  const billId = params.billId;

  // Fetch bill info and demographics
  const [bill, demographics] = await Promise.all([
    getBillById(billId),
    getBillEndorsementDemographics(billId),
  ]);

  // If bill doesn't exist, show 404
  if (!bill) {
    notFound();
  }

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

  return (
    <div className="billDemographicsContainer">
      <div className="billDemographicsContent">
        <div className="billDemographicsHeader">
          <h1 className="billDemographicsTitle">
            Bill Demographics: {bill.title}
          </h1>
          <p className="billDemographicsSubtitle">
            Demographic breakdown of users who support this bill
          </p>
          <p className="billDemographicsTotal">
            Total endorsements: {demographics.length}
          </p>
        </div>

        {demographics.length === 0 ? (
          <div className="noDataMessage">
            <p>No endorsement data available for this bill.</p>
          </div>
        ) : (
          <DemographicsCharts counts={counts} />
        )}
      </div>
    </div>
  );
}

