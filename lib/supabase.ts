import { createClient } from "@supabase/supabase-js";
import type { Bill, BillSummary, Demographics, Endorsement, SavedBill, User } from "@/types";
import { generateBillSummaryOpenRouter } from "./ai/openrouter";
import type { Database } from "./database.types";

// Placeholder for database types
// TODO: Generate this from Supabase: npx supabase gen types typescript --project-id <project-id> > lib/database.types.ts
export interface SupabaseDatabase {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, "id" | "created_at" | "updated_at" | "topics" | "race" | "religion" | "gender" | "age_range" | "party" | "income" | "education">;
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
        };
        Update: Partial<{
          bill_id: string;
          summary_text: string;
        }>;
      };
      saved_bills: {
        Row: SavedBill;
        Insert: Omit<SavedBill, "id" | "created_at">;
        Update: Partial<Omit<SavedBill, "id" | "created_at">>;
      };
    };
  };
}

// Server-side Supabase client (uses service role key)
// TODO: Replace with your Supabase URL and service role key
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    "⚠️  Supabase credentials not configured. Database operations will be mocked."
  );
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
  const clientSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
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
    // Return mock data if Supabase is not configured
    return {
      data: [],
      total: 0,
    };
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

  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .eq("category", category)
    .order("date", { ascending: false })
    .limit(count);

  if (error) {
    console.error("Error fetching bills by category:", error);
    return [];
  }
  return (data || []) as Bill[];
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

// export async function updateUserDemographics(userId: string, demographics: Demographics): Promise<void> {
//   if (!supabase) {
//     return;
//   }
//   const updatePayload:Demographics = {
//     residency: demographics.residency,
//     topics: demographics.topics,
//     race: demographics.race,
//     religion: demographics.religion,
//     gender: demographics.gender,
//     age_range: demographics.age_range,
//     party: demographics.party,
//     income: demographics.income,
//     education: demographics.education,
//   };

  

//   const { data, error } = await supabase
//     .from("users")
//     .update(updatePayload as never)
//     .eq("id", userId)

//   if (error) {
//     console.error("Error updating user demographics:", error);
//     return;
//   }

//   return;
// }

// export async function updateUserRace(userId: string, race: string): Promise<void> {
//   if (!supabase) {
//     return "error";
//   }
//   const { data, error } = await supabase
//     .from("users")
//     .update({ race: race } as never)
//     .eq("id", userId)
// }


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

