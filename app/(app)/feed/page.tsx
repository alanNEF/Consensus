import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getUserById, getBillsByCategory, getBillSummary, assembleLink } from "@/lib/supabase";
import FeedClient from "./FeedClient";
import { Bill, BillSummary } from "@/types";

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

  // Fetch bills for preferred categories
  const billsByCategoryPreferred = new Map<string, Bill[]>();
  for (const category of preferredCategories) {
    const bills = await getBillsByCategory(category);
    billsByCategoryPreferred.set(category, bills);
  }

  // Fetch bills for remaining categories
  const billsByCategoryRemaining = new Map<string, Bill[]>();
  for (const category of remainingCategories) {
    const bills = await getBillsByCategory(category);
    billsByCategoryRemaining.set(category, bills);
  }

  const billSummaries = new Map<string, BillSummary>();
  const billUrls = new Map<string, string>();
  for (const [, bills] of billsByCategoryPreferred.entries()) {
    for (const bill of bills) {
      const sum = await getBillSummary(bill.id || "");
      const url = await assembleLink(bill);
      if (sum) {
        billSummaries.set(bill.id, sum as BillSummary);
      }
      if (url) {
        billUrls.set(bill.id, url);
      }
    }
  }

  for (const [, bills] of billsByCategoryRemaining.entries()) {
    for (const bill of bills) {
      const sum = await getBillSummary(bill.id || "");
      const url = await assembleLink(bill);
      if (sum) {
        billSummaries.set(bill.id, sum as BillSummary);
      }
      if (url) {
        billUrls.set(bill.id, url);
      }
    }
  }

  return (
    <FeedClient
      preferredCategories={preferredCategories}
      remainingCategories={remainingCategories}
      billsByCategoryPreferred={billsByCategoryPreferred}
      billsByCategoryRemaining={billsByCategoryRemaining}
      billSummaries={billSummaries}
      billUrls={billUrls}
    />
  );
}
