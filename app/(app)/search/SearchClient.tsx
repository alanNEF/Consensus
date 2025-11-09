"use client";

import { useState, useEffect } from "react";
import BillCard from "@/components/bills/BillCard";
import type { Bill, BillSummary } from "@/types";
import "./search.css";

interface SearchClientProps {
  query: string;
}

// Helper function to assemble Congress.gov URL
function assembleLink(bill: Bill): string {
  if (!bill.id || !bill.origin) {
    return "https://www.congress.gov/";
  }

  try {
    // Try format 1: "{congress}_{type}_{number}"
    if (bill.id.includes("_")) {
      const parts = bill.id.split("_");
      if (parts.length >= 3) {
        const congress = parts[0];
        const billNumber = parts[2];
        const origin = bill.origin.toLowerCase();
        return `https://www.congress.gov/bill/${congress}th-congress/${origin}-bill/${billNumber}`;
      }
    }

    // Try format 2: "{type}{number}-{congress}"
    if (bill.id.includes("-")) {
      const parts = bill.id.split("-");
      if (parts.length >= 2) {
        const congress = parts[parts.length - 1];
        const prefix = parts[0];
        const billNumberMatch = prefix.match(/\d+$/);
        if (billNumberMatch) {
          const billNumber = billNumberMatch[0];
          const origin = bill.origin.toLowerCase();
          return `https://www.congress.gov/bill/${congress}th-congress/${origin}-bill/${billNumber}`;
        }
      }
    }

    return "https://www.congress.gov/";
  } catch (error: unknown) {
    console.error("Error assembling link:", error);
    return "https://www.congress.gov/";
  }
}

export default function SearchClient({ query }: SearchClientProps) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [billSummaries, setBillSummaries] = useState<Map<string, BillSummary>>(
    new Map()
  );
  const [billUrls, setBillUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim()) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Call the search API
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);

        if (!response.ok) {
          throw new Error("Failed to perform search");
        }

        const data = await response.json();
        const searchResults = data.results || [];

        // Fetch full bill details for each result
        const billPromises = searchResults.map(async (result: { id: string }) => {
          try {
            const billResponse = await fetch(`/api/bills/${result.id}`);
            if (!billResponse.ok) {
              return null;
            }
            const bill = await billResponse.json();
            return bill;
          } catch (err: unknown) {
            console.error(`Error fetching bill ${result.id}:`, err);
            return null;
          }
        });

        const fetchedBills = (await Promise.all(billPromises)).filter(
          (bill): bill is Bill => bill !== null
        );

        setBills(fetchedBills);

        // Fetch summaries and URLs for all bills
        const summaryMap = new Map<string, BillSummary>();
        const urlMap = new Map<string, string>();

        for (const bill of fetchedBills) {
          // Fetch summary (GET to retrieve existing, or generate if needed)
          try {
            const summaryResponse = await fetch(`/api/bills/${bill.id}/summary`);
            if (summaryResponse.ok) {
              const summary = await summaryResponse.json();
              if (summary && summary.summary_text) {
                summaryMap.set(bill.id, summary);
              }
            }
          } catch (error: unknown) {
            console.error(`Error fetching summary for bill ${bill.id}:`, error);
            // If GET fails, try POST to generate
            try {
              const summaryResponse = await fetch(`/api/bills/${bill.id}/summary`, {
                method: "POST",
              });
              if (summaryResponse.ok) {
                const summaryData = await summaryResponse.json();
                if (summaryData.summary) {
                  summaryMap.set(bill.id, {
                    id: "",
                    bill_id: bill.id,
                    summary_text: summaryData.summary,
                    one_liner: summaryData.summary.split(".")[0] + ".",
                    created_at: "",
                  });
                }
              }
            } catch (error: unknown) {
              console.error(`Error fetching summary for bill ${bill.id}:`, error);
              // Summary fetch failed, continue without it
            }
          }

          // Assemble URL
          const url = assembleLink(bill);
          if (url) {
            urlMap.set(bill.id, url);
          }
        }

        setBillSummaries(summaryMap);
        setBillUrls(urlMap);
      } catch (error: unknown) {
        console.error("Search error:", error);
        setError(error instanceof Error ? error.message : "An error occurred while searching");
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [query]);

  if (loading) {
    return (
      <div className="searchContainer">
        <div className="searchContent">
          <div className="searchHeader">
            <h1 className="searchTitle">Search Results</h1>
            <p className="searchSubtitle">Searching for: &quot;{query}&quot;</p>
          </div>
          <div className="loadingState">
            <p>Loading search results...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="searchContainer">
        <div className="searchContent">
          <div className="searchHeader">
            <h1 className="searchTitle">Search Results</h1>
            <p className="searchSubtitle">Searching for: &quot;{query}&quot;</p>
          </div>
          <div className="errorState">
            <p>Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="searchContainer">
      <div className="searchContent">
        <div className="searchHeader">
          <h1 className="searchTitle">Search Results</h1>
          <p className="searchSubtitle">
            {bills.length > 0
              ? `Found ${bills.length} result${bills.length !== 1 ? "s" : ""} for: "${query}"`
              : `No results found for: "${query}"`}
          </p>
        </div>

        {bills.length > 0 ? (
          <div className="searchResults">
            {bills.map((bill) => (
              <BillCard
                key={bill.id}
                bill={bill}
                billSummary={
                  billSummaries.get(bill.id) || {
                    id: "",
                    bill_id: bill.id,
                    summary_text: "",
                    one_liner: "",
                    created_at: "",
                  }
                }
                billUrl={billUrls.get(bill.id) || ""}
              />
            ))}
          </div>
        ) : (
          <div className="noResults">
            <p>No bills found matching your search query.</p>
            <p>Try different keywords or check your spelling.</p>
          </div>
        )}
      </div>
    </div>
  );
}

