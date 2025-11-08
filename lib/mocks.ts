import type { Bill } from "@/types";

const categories = [
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


export function getBillsByCategory(): Record<string, Bill[]> {
  const bills = getMockBills();
  const byCategory: Record<string, Bill[]> = {};

  categories.forEach((category) => {
    byCategory[category] = bills.filter((bill) => bill.category === category);
  });

  return byCategory;
}

export function getMockBills(): Bill[] {
  // TODO: This function should return mock Bill objects
  // For now, return empty array as placeholder
  return [];
}

