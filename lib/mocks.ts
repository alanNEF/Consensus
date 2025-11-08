import type { Bill } from "@/types";

/**
 * Mock bills for development when database is not configured
 */
export function getMockBills(): Bill[] {
  return [
    {
      id: "hr1234-118",
      title: "Infrastructure Investment and Jobs Act",
      summary_key: "infrastructure-jobs-2024",
      date: "2024-01-15",
      status: "Passed House",
      origin: "House",
      url: "https://www.congress.gov/bill/118th-congress/house-bill/1234",
      sponsors: ["Rep. Jane Smith", "Rep. John Doe"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "s5678-118",
      title: "Climate Action and Clean Energy Bill",
      summary_key: "climate-action-2024",
      date: "2024-02-20",
      status: "In Committee",
      origin: "Senate",
      url: "https://www.congress.gov/bill/118th-congress/senate-bill/5678",
      sponsors: ["Sen. Alice Johnson", "Sen. Bob Williams"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "hr9012-118",
      title: "Healthcare Access and Affordability Act",
      summary_key: "healthcare-access-2024",
      date: "2024-03-10",
      status: "Passed Senate",
      origin: "House",
      url: "https://www.congress.gov/bill/118th-congress/house-bill/9012",
      sponsors: ["Rep. Carol Brown", "Rep. David Lee"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}

