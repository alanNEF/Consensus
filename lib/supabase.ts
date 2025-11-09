import { createClient } from "@supabase/supabase-js";
import type { Bill, BillSummary, Endorsement, SavedBill, User } from "@/types";
import { CongressBill } from "./congress/clients";
import { config } from "dotenv";
import path from "path";

config({ path: path.join(process.cwd(), ".env") });
import { generateBillSummaryOpenRouter } from "./ai/openrouter";
import type { Database } from "./database.types";

// Placeholder for database types
// TODO: Generate this from Supabase: npx supabase gen types typescript --project-id <project-id> > lib/database.types.ts
export interface SupabaseDatabase {
  public: {
    Tables: {
      users: {
        Row: User;
        // residency is required (NOT NULL), so it should be in Insert
        Insert: Omit<User, "id" | "created_at" | "updated_at" | "topics" | "race" | "religion" | "gender" | "age_range" | "party" | "income" | "education"> & {
          residency: string; // Required field
        };
        Update: Partial<Omit<User, "id" | "created_at" | "updated_at">>;
      };
      bills: {
        Row: Bill;
        Insert: Omit<Bill, "created_at" | "updated_at" | "summary_key">;
        Update: Partial<Omit<Bill, "created_at" | "updated_at">>;
      };
      bill_summaries: {
        Row: BillSummary;
        Insert: {
          bill_id: string;
          summary_text: string;
          // id and created_at are auto-generated, so they're correctly omitted
        };
        Update: Partial<{
          id?: string;
          bill_id: string;
          summary_text: string;
          created_at?: string;
        }>;
      };
      saved_bills: {
        Row: SavedBill; // Add endorsed field
        Insert: Omit<SavedBill, "id" | "created_at">; // endorsed is optional due to default
        Update: Partial<Omit<SavedBill, "id" | "created_at">>;
      };
    };
  };
}

// Server-side Supabase client (uses service role key)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;


if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
}

// Create server client with service role key (bypasses RLS)
export const supabase = supabaseUrl && supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  : null;

// Client-side Supabase client (uses anon key)
// This should only be used in client components
export function createClientSupabase() {
  const clientSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!clientSupabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase client credentials not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient<Database>(clientSupabaseUrl, supabaseAnonKey);
}

// Type-safe query helpers
// Bills table
export async function getBills(
  page: number = 1,
  pageSize: number = 20
): Promise<{ data: Bill[]; total: number }> {
  if (!supabase) {
    throw new Error("Supabase client not configured");
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("bills")
    .select("*", { count: "exact" })
    .order("date", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching bills:", error);
    return { data: [], total: 0 };
  }

  return {
    data: (data || []) as Bill[],
    total: count || 0,
  };
}

export async function getBillsWithLimit(limit: number): Promise<Bill[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .order("date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching bills with limit:", error);
    return [];
  }

  return (data || []) as Bill[];
}

export async function getBillById(billId: string): Promise<Bill | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .eq("id", billId)
    .single();

  if (error) {
    console.error("Error fetching bill:", error);
    return null;
  }

  return data as Bill;
}

export async function getBillSummary(
  billId: string
): Promise<BillSummary | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("bill_summaries")
    .select("*")
    .eq("bill_id", billId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error("Error fetching bill summary:", error);
    return null;
  }

  return data as BillSummary;
}

export async function getUserSavedBills(userId: string): Promise<SavedBill[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("saved_bills")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching saved bills:", error);
    return [];
  }

  return (data || []) as SavedBill[];
}

export async function getUserById(userId: string): Promise<User | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user by ID:", error);
    return null;
  }

  return data as User;
}

export async function getBillsByCategory(category: string, count: number = 15): Promise<Bill[]> {
  if (!supabase) {
    return [];
  }

  // For array columns (TEXT[]), use .contains() to check if array contains the value
  // For single TEXT columns, use .eq() instead
  // The original code used .in("categories", [category]) which is incorrect for array columns
  // .in() checks if column value is IN the provided array (opposite of what we want)
  // .contains() checks if array column CONTAINS the provided values
  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .contains("categories", [category])
    .order("date", { ascending: false })
    .limit(count);

  if (error) {
    console.error("Error fetching bills by category:", error);
    return [];
  }
  return (data || []) as Bill[];
}

//Inserts the bill as endorse by the user, if they are opposing it it will change to endorsing
export async function userEndorseBill(userId: string, billId: string): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase client not configured");
  }

  const { error } = await supabase
    .from("saved_bills")
    .upsert({ user_id: userId, bill_id: billId, endorsed: true } as any, { onConflict: "user_id,bill_id" } as any);
}

//Inserts the bill as opposed by the user, if they are endorsing it it will change to opposed
export async function userOpposeBill(userId: string, billId: string): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase client not configured");
  }

  const { error } = await supabase
    .from("saved_bills")
    .upsert({ user_id: userId, bill_id: billId, endorsed: false } as any, { onConflict: "user_id,bill_id" } as any);
}

//Removes the user's support/opposition for the bill
export async function userRemoveBillOpinion(userId: string, billId: string): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase client not configured");
  }

  const { error } = await supabase
    .from("saved_bills")
    .delete().eq("user_id", userId).eq("bill_id", billId);
}

/**
 * Get demographics of all users who endorse a specific bill
 * Returns saved_bills records with joined user demographic data
 */
export async function getBillEndorsementDemographics(billId: string): Promise<Array<SavedBill & { user: Pick<User, "race" | "religion" | "gender" | "age_range" | "party" | "income" | "education" | "residency" | "topics"> }>> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("saved_bills")
    .select(`
      *,
      users (
        race,
        religion,
        gender,
        age_range,
        party,
        income,
        education,
        residency,
        topics
      )
    `)
    .eq("bill_id", billId)
    .eq("endorsed", true);

  if (error) {
    console.error("Error fetching bill endorsement demographics:", error);
    return [];
  }

  // Transform the data to match expected structure
  return (data || []).map((item: any) => ({
    id: item.id,
    user_id: item.user_id,
    bill_id: item.bill_id,
    endorsed: item.endorsed,
    created_at: item.created_at,
    user: item.users || {},
  })) as Array<SavedBill & { user: Pick<User, "race" | "religion" | "gender" | "age_range" | "party" | "income" | "education" | "residency" | "topics"> }>;
}

/**
 * Get count of each demographic category for users who endorse a bill
 * Returns an object with counts for each demographic field
 */
export async function getBillEndorsementDemographicsCount(billId: string): Promise<Record<string, Record<string, number>>> {
  const demographics = await getBillEndorsementDemographics(billId);

  // Initialize counts object for each demographic field
  const counts: Record<string, Record<string, number>> = {
    race: {},
    religion: {},
    gender: {},
    age_range: {},
    party: {},
    income: {},
    education: {},
    residency: {},
    topics: {},
  };

  // Count each demographic category
  demographics.forEach((item) => {
    const user = item.user;

    // Count single-value demographics
    const singleValueFields = [
      "race",
      "religion",
      "gender",
      "age_range",
      "party",
      "income",
      "education",
      "residency",
    ] as const;

    singleValueFields.forEach((field) => {
      const value = user[field];
      if (value && typeof value === "string") {
        counts[field][value] = (counts[field][value] || 0) + 1;
      }
    });

    // Count topics (array field)
    if (user.topics && Array.isArray(user.topics)) {
      user.topics.forEach((topic) => {
        if (topic) {
          counts.topics[topic] = (counts.topics[topic] || 0) + 1;
        }
      });
    }
  });

  return counts;
}

export async function getBillOppositionDemographics(billId: string): Promise<Array<SavedBill & { user: Pick<User, "race" | "religion" | "gender" | "age_range" | "party" | "income" | "education" | "residency" | "topics"> }>> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("saved_bills")
    .select(`
      *,
      users (
        race,
        religion,
        gender,
        age_range,
        party,
        income,
        education,
        residency,
        topics
      )
    `)
    .eq("bill_id", billId)
    .eq("endorsed", false);

  if (error) {
    console.error("Error fetching bill endorsement demographics:", error);
    return [];
  }

  // Transform the data to match expected structure
  return (data || []).map((item: any) => ({
    id: item.id,
    user_id: item.user_id,
    bill_id: item.bill_id,
    endorsed: item.endorsed,
    created_at: item.created_at,
    user: item.users || {},
  })) as Array<SavedBill & { user: Pick<User, "race" | "religion" | "gender" | "age_range" | "party" | "income" | "education" | "residency" | "topics"> }>;
}

/**
 * Get count of each demographic category for users who endorse a bill
 * Returns an object with counts for each demographic field
 */
export async function getBillOppositionDemographicsCount(billId: string): Promise<Record<string, Record<string, number>>> {
  const demographics = await getBillOppositionDemographics(billId);

  // Initialize counts object for each demographic field
  const counts: Record<string, Record<string, number>> = {
    race: {},
    religion: {},
    gender: {},
    age_range: {},
    party: {},
    income: {},
    education: {},
    residency: {},
    topics: {},
  };

  // Count each demographic category
  demographics.forEach((item) => {
    const user = item.user;

    // Count single-value demographics
    const singleValueFields = [
      "race",
      "religion",
      "gender",
      "age_range",
      "party",
      "income",
      "education",
      "residency",
    ] as const;

    singleValueFields.forEach((field) => {
      const value = user[field];
      if (value && typeof value === "string") {
        counts[field][value] = (counts[field][value] || 0) + 1;
      }
    });

    // Count topics (array field)
    if (user.topics && Array.isArray(user.topics)) {
      user.topics.forEach((topic) => {
        if (topic) {
          counts.topics[topic] = (counts.topics[topic] || 0) + 1;
        }
      });
    }
  });

  return counts;
}


export async function getBillSponsors(billId: string): Promise<string[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("bills")
    .select("sponsors")
    .eq("id", billId)
    .single();

  if (error) {
    console.error("Error fetching bill sponsors:", error);
    return [];
  }

  // Extract sponsors array from the result object
  // data will be { sponsors: string[] } or null
  const result = data as { sponsors: string[] } | null;
  return result?.sponsors || [];
}



export async function getAllBills(): Promise<Bill[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching all bills:", error);
    return [];
  }

  return (data || []) as Bill[];
}

export async function insertBillSummary(
  billId: string,
  summaryText: string,
  oneLiner: string
): Promise<BillSummary | null> {
  if (!supabase) {
    return null;
  }

  // Workaround: TypeScript has issues inferring the Insert type when supabase is conditionally typed
  // We know the correct type from our interface, so we use a type assertion
  // The Insert type for bill_summaries is: { bill_id: string; summary_text: string }
  const { data, error } = await supabase
    .from("bill_summaries")
    .insert({ bill_id: billId, summary_text: summaryText, one_liner: oneLiner } as any)
    .select()
    .single();
  if (error) {
    console.error("Error inserting bill summary:", error);
    return null;
  }
  if (!data) {
    console.error("No data returned from insert bill summary");
    return null;
  }
  await updateBillWithSummaryKey(billId, (data as BillSummary).id);
  return data as BillSummary;
}

/**
 * Assembles a Congress.gov URL from a bill object
 * Handles bill ID formats:
 * - Format 1: "{congress}_{type}_{number}" (e.g., "118_hr_1234")
 * - Format 2: "{type}{number}-{congress}" (e.g., "hr1234-118")
 * 
 * Falls back to bill.url if available, or returns a generic error URL if parsing fails
 */
export function assembleLink(bill: Bill): string {
  // If bill already has a URL, use it
  if (bill.url) {
    return bill.url;
  }

  // Validate required fields
  if (!bill.id) {
    console.error("assembleLink: bill.id is missing");
    return "https://www.congress.gov/";
  }

  if (!bill.origin) {
    console.error("assembleLink: bill.origin is missing for bill", bill.id);
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

    // Try format 2: "{type}{number}-{congress}" (e.g., "hr1234-118", "s5678-118")
    if (bill.id.includes("-")) {
      const parts = bill.id.split("-");
      if (parts.length >= 2) {
        const congress = parts[parts.length - 1]; // Last part is congress
        const prefix = parts[0]; // First part is type + number (e.g., "hr1234")

        // Extract bill number by removing type prefix (hr, s, hres, sres, etc.)
        const billNumberMatch = prefix.match(/\d+$/);
        if (billNumberMatch) {
          const billNumber = billNumberMatch[0];
          const origin = bill.origin.toLowerCase();
          return `https://www.congress.gov/bill/${congress}th-congress/${origin}-bill/${billNumber}`;
        }
      }
    }

    // If we can't parse the format, log error and return generic URL
    console.error(
      `assembleLink: Unable to parse bill ID format: "${bill.id}". Expected format: "{congress}_{type}_{number}" or "{type}{number}-{congress}"`
    );
    return "https://www.congress.gov/";
  } catch (error) {
    console.error("assembleLink: Error assembling link for bill", bill.id, error);
    return "https://www.congress.gov/";
  }
}

export async function updateBillWithSummaryKey(billId: string, summaryKey: string): Promise<Bill | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("bills")
    .update({ summary_key: summaryKey } as never)
    .eq("id", billId)
    .select()
    .single();

  if (error) {
    console.error("Error updating bill summary key:", error);
    return null;
  }

  return data as Bill;
}

