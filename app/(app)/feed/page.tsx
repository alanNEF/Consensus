import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getUserById, getBillsByCategory, getBillSummary, assembleLink } from "@/lib/supabase";
import FeedClient from "./FeedClient";
import { Bill, BillSummary } from "@/types";
import { config } from "dotenv";
import path from "path";
config({ path: path.join(process.cwd(), ".env") });

export default async function FeedPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await getUserById(session.user.id);
  if (!user) {
    redirect("/login");
  }

  const preferredCategories = user.topics || [];
  const allCategoriesList = [
    "Healthcare",
    "Environmentalism",
    "Armed Services",
    "Economy",
    "Education",
    "Technology",
    "Immigration",
    "Agriculture + Food",
    "Government Operations",
    "Taxation",
    "Civil Rights",
    "Criminal Justice",
    "Foreign Policy",
  ];

  // Filter out preferred categories from remaining
  const remainingCategories = allCategoriesList.filter(
    (category) => !preferredCategories.includes(category)
  );

  if (!process.env.GEOCODIO_API_KEY) {
    console.error("GEOCOD_API_KEY is not set in environment variables");
  } else {
    console.log("API Key exists:", process.env.GEOCODIO_API_KEY ? "Yes" : "No");
  }

  // Fetch all categories in parallel
  const [preferredBillsResults, remainingBillsResults, representativesResult] = await Promise.all([
    Promise.all(
      preferredCategories.map(async (category) => ({
        category,
        bills: await getBillsByCategory(category),
      }))
    ),
    // Fetch remaining categories in parallel
    Promise.all(
      remainingCategories.map(async (category) => ({
        category,
        bills: await getBillsByCategory(category),
      }))
    ),
    // Fetch representatives in parallel with bill fetching
    (async () => {
      if (!user.residency) return [];
      try {
        const geocodResponse = await fetch(
          `https://api.geocod.io/v1.9/geocode?q=${encodeURIComponent(user.residency)}&country=USA&fields=cd&api_key=${process.env.GEOCODIO_API_KEY}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );
        if (geocodResponse.ok) {
          const geocodData = await geocodResponse.json();
          return geocodData.results?.[0]?.fields?.congressional_districts?.[0]?.current_legislators || [];
        }
        console.error("Error fetching legislators:", geocodResponse.statusText);
        return [];
      } catch (error) {
        console.error("Error fetching legislators:", error);
        return [];
      }
    })(),
  ]);

  // Build maps from results
  const billsByCategoryPreferred = new Map<string, Bill[]>();
  for (const { category, bills } of preferredBillsResults) {
    billsByCategoryPreferred.set(category, bills);
  }

  const billsByCategoryRemaining = new Map<string, Bill[]>();
  for (const { category, bills } of remainingBillsResults) {
    billsByCategoryRemaining.set(category, bills);
  }

  // Collect all unique bills
  const allBills: Bill[] = [];
  const seenBillIds = new Set<string>();
  
  for (const bills of billsByCategoryPreferred.values()) {
    for (const bill of bills) {
      if (!seenBillIds.has(bill.id)) {
        seenBillIds.add(bill.id);
        allBills.push(bill);
      }
    }
  }
  for (const bills of billsByCategoryRemaining.values()) {
    for (const bill of bills) {
      if (!seenBillIds.has(bill.id)) {
        seenBillIds.add(bill.id);
        allBills.push(bill);
      }
    }
  }

  // Fetch all summaries and URLs in parallel
  const summaryAndUrlResults = await Promise.all(
    allBills.map(async (bill) => {
      const [sum, url] = await Promise.all([
        getBillSummary(bill.id || ""),
        assembleLink(bill),
      ]);
      return { billId: bill.id, sum, url };
    })
  );

  // Build summary and URL maps
  const billSummaries = new Map<string, BillSummary>();
  const billUrls = new Map<string, string>();
  
  for (const { billId, sum, url } of summaryAndUrlResults) {
    if (sum) {
      billSummaries.set(billId, sum as BillSummary);
    }
    if (url) {
      billUrls.set(billId, url);
    }
  }

  const representatives = representativesResult;

  return (
    <FeedClient
      preferredCategories={preferredCategories}
      remainingCategories={remainingCategories}
      billsByCategoryPreferred={billsByCategoryPreferred}
      billsByCategoryRemaining={billsByCategoryRemaining}
      billSummaries={billSummaries}
      representatives={representatives}
      billUrls={billUrls}
    />
  );
}
