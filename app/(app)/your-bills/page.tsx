"use client";

import { useEffect, useState } from "react";
import BillCard from "@/components/bills/BillCard";
import "./your-bills.css";
import type { Bill, BillSummary } from "@/types";

export default function YourBillsPage() {
  const [endorsedBills, setEndorsedBills] = useState<Bill[]>([]);
  const [unendorsedBills, setUnendorsedBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [summaries, setSummaries] = useState<Map<string, BillSummary>>(new Map());
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const [loadingUrls, setLoadingUrls] = useState(false);

  // Fetch bills
  useEffect(() => {
    const fetchBills = async () => {
      try {
        const response = await fetch("/api/yourBills", {
          method: "GET", // Change to GET if you add GET handler, or use POST
        });
        if (!response.ok) {
          throw new Error("Failed to fetch bills");
        }
        const data = await response.json();
        setEndorsedBills(data.endorsedBills as Bill[]);
        setUnendorsedBills(data.unendorsedBills as Bill[]);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching bills:", error);
        setLoading(false);
      }
    };
    fetchBills();
  }, []);

  // Fetch summaries for all bills (fixed to combine both arrays)
  useEffect(() => {
    if (endorsedBills.length === 0 && unendorsedBills.length === 0) return;

    const fetchSummaries = async () => {
      setLoadingSummaries(true);
      const summariesMap = new Map<string, BillSummary>();

      // Combine both arrays to avoid duplication
      const allBills = [...endorsedBills, ...unendorsedBills];

      try {
        await Promise.all(
          allBills.map(async (bill) => {
            if (!summariesMap.has(bill.id)) {
              try {
                const response = await fetch(`/api/bills/${bill.id}/summary`);
                if (response.ok) {
                  const summary = await response.json();
                  summariesMap.set(bill.id, summary as BillSummary);
                }
              } catch (error) {
                console.error(`Error fetching summary for bill ${bill.id}:`, error);
              }
            }
          })
        );
        setSummaries(summariesMap);
      } catch (error) {
        console.error("Error fetching summaries:", error);
      } finally {
        setLoadingSummaries(false);
      }
    };

    fetchSummaries();
  }, [endorsedBills, unendorsedBills]);

  // Fetch URLs for all bills (fixed to combine both arrays)
  useEffect(() => {
    if (endorsedBills.length === 0 && unendorsedBills.length === 0) return;

    const fetchUrls = async () => {
      setLoadingUrls(true);
      const urlsMap = new Map<string, string>();

      // Combine both arrays to avoid duplication
      const allBills = [...endorsedBills, ...unendorsedBills];

      try {
        await Promise.all(
          allBills.map(async (bill) => {
            try {
              const response = await fetch(`/api/get-link`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ billId: bill.id }),
              });
              if (response.ok) {
                const data = await response.json();
                if (data.url) {
                  urlsMap.set(bill.id, data.url);
                }
              }
            } catch (error) {
              console.error(`Error fetching URL for bill ${bill.id}:`, error);
            }
          })
        );
        setUrls(urlsMap);
      } catch (error) {
        console.error("Error fetching URLs:", error);
      } finally {
        setLoadingUrls(false);
      }
    };

    fetchUrls();
  }, [endorsedBills, unendorsedBills]);

  // Filter bills based on search query
  if (loading) {
    return (
      <div className="yourBillsContainer">
        <div className="yourBillsContent">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

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
        {(loadingSummaries || loadingUrls) && (
          <p>Loading bill details...</p>
        )}
        <h2 className="billsGridTitle">Unendorsed Bills</h2>
        <div className="billsGrid">
          {unendorsedBills
            .filter((bill) =>
              bill.title?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((bill) => {
              const summary = summaries.get(bill.id);
              const url = urls.get(bill.id);

              // Only render if we have the summary, or show a placeholder
              if (!summary) {
                return (
                  <div key={bill.id} className="billCard">
                    <h3 className="billTitle">{bill.title}</h3>
                    <p>Loading summary...</p>
                  </div>
                );
              }

              return (
                <BillCard
                  key={bill.id}
                  bill={bill}
                  billSummary={summary}
                  billUrl={url}
                />
              );
            })}
        </div>
        <h2 className="billsGridTitle">Endorsed Bills</h2>
        <div className="billsGrid">
          {endorsedBills
            .filter((bill) =>
              bill.title?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((bill) => {
              const summary = summaries.get(bill.id);
              const url = urls.get(bill.id);

              // Only render if we have the summary, or show a placeholder
              if (!summary) {
                return (
                  <div key={bill.id} className="billCard">
                    <h3 className="billTitle">{bill.title}</h3>
                    <p>Loading summary...</p>
                  </div>
                );
              }

              return (
                <BillCard
                  key={bill.id}
                  bill={bill}
                  billSummary={summary}
                  billUrl={url}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
}
