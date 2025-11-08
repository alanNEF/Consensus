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

const parties: ("REPUBLICAN" | "DEMOCRAT" | "THIRD_PARTY")[] = [
  "REPUBLICAN",
  "DEMOCRAT",
  "THIRD_PARTY",
];

function generateBillsForCategory(category: string, startId: number, count: number = 10): Bill[] {
  const bills: Bill[] = [];
  for (let i = 0; i < count; i++) {
    const billId = startId + i;
    // Use deterministic assignment based on index instead of random
    const sponsorParty = parties[i % parties.length];
    const sponsorName = `Sen. ${category} Sponsor ${i + 1}`;
    
    bills.push({
      id: `bill-${category.toLowerCase().replace(/\s+/g, "-")}-${billId}`,
      title: `${category} Bill ${i + 1}`,
      summary_key: `${category.toLowerCase()}-${billId}`,
      date: new Date().toISOString().split("T")[0],
      status: null,
      origin: i % 2 === 0 ? "House" : "Senate",
      url: `https://www.congress.gov/bill/118th-congress/house-bill/${billId}`,
      sponsors: [sponsorName],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category: category,
      description: `A bill about ${category.toLowerCase()} issues.`,
      summary: `This bill addresses important ${category.toLowerCase()} matters. It provides comprehensive solutions to current challenges. The legislation aims to improve conditions for all Americans. It includes detailed provisions and funding mechanisms. The bill has received bipartisan support. It represents a significant step forward in policy. Implementation will begin upon passage.`,
      affectedGroups: [`${category} professionals`, "General public"],
      sponsorDetails: [
        {
          name: sponsorName,
          party: sponsorParty,
        },
      ],
    });
  }
  return bills;
}

/**
 * Mock bills for development when database is not configured
 */
export function getMockBills(): Bill[] {
  const allBills: Bill[] = [];
  let billIdCounter = 1;

  categories.forEach((category) => {
    // Health category gets 15 bills, others get 10
    const billCount = category === "Health" ? 16 : 10;
    const categoryBills = generateBillsForCategory(category, billIdCounter, billCount);
    allBills.push(...categoryBills);
    billIdCounter += billCount;
  });

  return allBills;
}

export function getBillsByCategory(): Record<string, Bill[]> {
  const bills = getMockBills();
  const byCategory: Record<string, Bill[]> = {};

  categories.forEach((category) => {
    byCategory[category] = bills.filter((bill) => bill.category === category);
  });

  return byCategory;
}

