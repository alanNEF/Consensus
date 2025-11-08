/**
 * Congress.gov API client stub
 * TODO: Implement actual Congress.gov API integration
 * API docs: https://api.congress.gov/
 */

const CONGRESS_GOV_API_KEY = process.env.CONGRESS_GOV_API_KEY;
const CONGRESS_GOV_BASE =
  process.env.CONGRESS_GOV_BASE || "https://api.congress.gov/v3";

if (!CONGRESS_GOV_API_KEY) {
  console.warn(
    "⚠️  Congress.gov API key not configured. API calls will return mock data."
  );
}

export interface CongressBill {
  number: string;
  title: string;
  type: string;
  congress: number;
  url: string;
  updateDate: string;
  latestAction?: {
    text: string;
    actionDate: string;
  };
  originChamber?: string;
  sponsors?: Array<{
    bioguideId: string;
    fullName: string;
    party: string;
    state: string;
  }>;
}

/**
 * Fetch bills from Congress.gov API
 * @param congress - The congress number (e.g., 118)
 * @param chamber - The chamber (house, senate, or both)
 * @param limit - Maximum number of results
 * @returns Array of bills
 */
export async function fetchBillsFromCongress(
  congress: number = 118,
  chamber: "house" | "senate" | "both" = "both",
  limit: number = 20
): Promise<CongressBill[]> {
  if (!CONGRESS_GOV_API_KEY) {
    // Return mock data if API key is not configured
    return getMockBills();
  }

  try {
    // TODO: Implement actual API call
    // Example endpoint: ${CONGRESS_GOV_BASE}/bill/${congress}/${chamber}
    const response = await fetch(
      `${CONGRESS_GOV_BASE}/bill/${congress}?api_key=${CONGRESS_GOV_API_KEY}&limit=${limit}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Congress.gov API error: ${response.statusText}`);
    }

    const data = await response.json();
    // TODO: Parse and return actual bill data
    return data.bills || [];
  } catch (error) {
    console.error("Error fetching bills from Congress.gov:", error);
    // Fallback to mock data on error
    return getMockBills();
  }
}

/**
 * Fetch a specific bill by ID from Congress.gov
 * @param congress - The congress number
 * @param billType - The bill type (hr, s, etc.)
 * @param billNumber - The bill number
 * @returns Bill details
 */
export async function fetchBillFromCongress(
  congress: number,
  billType: string,
  billNumber: string
): Promise<CongressBill | null> {
  if (!CONGRESS_GOV_API_KEY) {
    // Return mock bill if API key is not configured
    return getMockBills()[0] || null;
  }

  try {
    // TODO: Implement actual API call
    const response = await fetch(
      `${CONGRESS_GOV_BASE}/bill/${congress}/${billType}/${billNumber}?api_key=${CONGRESS_GOV_API_KEY}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Congress.gov API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.bill || null;
  } catch (error) {
    console.error("Error fetching bill from Congress.gov:", error);
    return null;
  }
}

/**
 * Mock bills for development/testing
 */
function getMockBills(): CongressBill[] {
  return [
    {
      number: "1234",
      title: "Infrastructure Investment and Jobs Act",
      type: "hr",
      congress: 118,
      url: "https://www.congress.gov/bill/118th-congress/house-bill/1234",
      updateDate: "2024-01-15",
      latestAction: {
        text: "Passed House",
        actionDate: "2024-01-15",
      },
      originChamber: "House",
      sponsors: [
        {
          bioguideId: "S000123",
          fullName: "Jane Smith",
          party: "D",
          state: "CA",
        },
      ],
    },
    {
      number: "5678",
      title: "Climate Action and Clean Energy Bill",
      type: "s",
      congress: 118,
      url: "https://www.congress.gov/bill/118th-congress/senate-bill/5678",
      updateDate: "2024-02-20",
      latestAction: {
        text: "In Committee",
        actionDate: "2024-02-20",
      },
      originChamber: "Senate",
      sponsors: [
        {
          bioguideId: "J000456",
          fullName: "Alice Johnson",
          party: "D",
          state: "NY",
        },
      ],
    },
  ];
}

