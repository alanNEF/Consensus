import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getUserById, getBillsByCategory } from "@/lib/supabase";
import FeedClient from "./FeedClient";
import type { Bill } from "@/types";

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
    "Health",
    "Environment",
    "Armed Services",
    "Economy",
    "Education",
    "Technology",
    "Immigration",
    "Agriculture and Food",
    "Government Operations",
    "Taxation",
    "Civil Rights",
    "Criminal Justice",
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

  return (
    <FeedClient
      preferredCategories={preferredCategories}
      remainingCategories={remainingCategories}
      billsByCategoryPreferred={billsByCategoryPreferred}
      billsByCategoryRemaining={billsByCategoryRemaining}
    />
  );
}
