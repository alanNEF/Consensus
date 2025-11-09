"use client";

import { useState } from "react";
import { getMockBills } from "@/lib/mocks";
import BillCard from "@/components/bills/BillCard";
import "./your-bills.css";

export default function YourBillsPage() {
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="yourBillsContainer">
      <div className="yourBillsContent">
        <div className="yourBillsHeader">
          <h1 className="yourBillsTitle">Your Bills</h1>
          <p className="yourBillsSubtitle">Bills you've endorsed and saved</p>
        </div>
        <div className="searchBarContainer">
          <input
            type="text"
            placeholder="Search bills..."
            className="searchBar"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="billsGrid">
          {allBills.map((bill) => (
            <BillCard key={bill.id} bill={bill} />
          ))}
        </div>
      </div>
    </div>
  );
}
