"use client";

import type { Bill, BillSummary, Representative } from "@/types";
import BillCard from "@/components/bills/BillCard";
import "./test-contact.css";

// Sample bill data
const sampleBill: Bill = {
  id: "test-bill-1",
  title: "Healthcare Reform Act of 2024",
  summary_key: "healthcare-reform-2024",
  date: "2024-01-15",
  status: null,
  origin: "House",
  url: "https://www.congress.gov/bill/118th-congress/house-bill/1234",
  sponsors: ["John Smith", "Jane Doe", "Bob Johnson"],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  categories: ["Healthcare", "Economy"],
  bill_text: "Sample bill text...",
  sponsorDetails: [
    { name: "John Smith", party: "DEMOCRAT" },
    { name: "Jane Doe", party: "REPUBLICAN" },
    { name: "Bob Johnson", party: "DEMOCRAT" },
  ],
};

const sampleBillSummary: BillSummary = {
  id: "test-summary-1",
  bill_id: "test-bill-1",
  summary_text:
    "This bill aims to reform the healthcare system by expanding access to affordable care, reducing prescription drug costs, and improving mental health services. It includes provisions for expanding Medicaid coverage, implementing price controls on essential medications, and increasing funding for community health centers.",
  one_liner: "A comprehensive healthcare reform bill focusing on affordability and access.",
  created_at: new Date().toISOString(),
};

// Mock function to get representatives based on congressional district
// In production, this would fetch from an API based on the user's zip code
const getRepresentativesByDistrict = (zipCode: string): Representative[] => {
  // Mock representatives for a sample district (CA-12)
  // In production, this would query an API like the Census API or Congress API
  return [
    {
      name: "Nancy Pelosi",
      party: "DEMOCRAT",
      photo: null,
      address: "1236 Longworth House Office Building, Washington, DC 20515",
      phone: "(202) 225-4965",
      website: "https://pelosi.house.gov",
    },
    {
      name: "Dianne Feinstein",
      party: "DEMOCRAT",
      photo: null,
      address: "331 Hart Senate Office Building, Washington, DC 20510",
      phone: "(202) 224-3841",
      website: "https://www.feinstein.senate.gov",
    },
    {
      name: "Alex Padilla",
      party: "DEMOCRAT",
      photo: null,
      address: "112 Hart Senate Office Building, Washington, DC 20510",
      phone: "(202) 224-3553",
      website: "https://www.padilla.senate.gov",
    },
  ];
};

export default function TestContactPage() {
  // Mock user zip code - in production, this would come from the user's profile
  const mockUserZipCode = "94102"; // San Francisco, CA
  const representatives = getRepresentativesByDistrict(mockUserZipCode);
  return (
    <div className="testContactContainer">
      <div className="testContactHeader">
        <h1 className="testContactTitle">Contact Card Gallery Test</h1>
        <p className="testContactDescription">
          This page demonstrates the contact card gallery functionality. Click on
          the bill card below to see the modal with the "Contact Representatives" button.
        </p>
      </div>

      <div className="testContactContent">
        <div className="testContactSection">
          <h2 className="testSectionTitle">Bill Card Modal</h2>
          <p style={{ color: "#9f9f9f", marginBottom: "1rem", fontSize: "0.9rem" }}>
            Representatives are fetched based on user&apos;s congressional district (zip code: {mockUserZipCode})
          </p>
          <div className="testBillCardWrapper">
            <BillCard 
              bill={sampleBill} 
              billSummary={sampleBillSummary}
              representatives={representatives}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

