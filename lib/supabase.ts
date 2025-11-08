import { createClient } from "@supabase/supabase-js";
import type { Bill, BillSummary, SavedBill, User } from "@/types";
import { CongressBill } from "./congress/clients";
import { config } from "dotenv";
import path from "path";

config({ path: path.join(process.cwd(), ".env") });

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
  ? createClient<SupabaseDatabase>(supabaseUrl, supabaseServiceKey, {
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
  return createClient<SupabaseDatabase>(clientSupabaseUrl, supabaseAnonKey);
}

// Type-safe query helpers

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

//TODO: THIS SHIT!!!!!
export async function getBillOpinions(billId: string): Promise<SavedBill[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("saved_bills")
    .select("*").eq("bill_id", billId);

  if (error) {
    console.error("Error fetching bill endorsements:", error);
    return [];
  }

  return (data || []) as SavedBill[];
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

//TODO: DOESN'T WORK
export async function getBillsByCategory(): Promise<Record<string, Bill[]>> {
  if (!supabase) {
    return {};
  }

  // TODO: Add category field to bills table or filter by category if it exists
  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching bills by category:", error);
    return {};
  }

  const bills = (data || []) as Bill[];
  const byCategory: Record<string, Bill[]> = {};

  bills.forEach((bill) => {
    const category = bill.category || "Uncategorized";
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(bill);
  });

  return byCategory;
}

export async function insertBillSummary(
  billId: string,
  summaryText: string
): Promise<BillSummary | null> {
  if (!supabase) {
    return null;
  }

  // Workaround: TypeScript has issues inferring the Insert type when supabase is conditionally typed
  // We know the correct type from our interface, so we use a type assertion
  // The Insert type for bill_summaries is: { bill_id: string; summary_text: string }
  const { data, error } = await supabase
    .from("bill_summaries")
    .insert({ bill_id: billId, summary_text: summaryText } as any)
    .select()
    .single();

  if (error) {
    console.error("Error inserting bill summary:", error);
    return null;
  }

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

