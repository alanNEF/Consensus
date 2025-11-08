import { createClient } from "@supabase/supabase-js";
import type { Bill, BillSummary, Endorsement, SavedBill, User } from "@/types";
import type { Database } from "./database.types";

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

export async function getUserEndorsements(
  userId: string
): Promise<Endorsement[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("endorsements")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching user endorsements:", error);
    return [];
  }

  return (data || []) as Endorsement[];
}

export async function createEndorsement(
  userId: string,
  billId: string
): Promise<Endorsement | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("endorsements")
    .insert({ user_id: userId, bill_id: billId })
    .select()
    .single();

  if (error) {
    console.error("Error creating endorsement:", error);
    return null;
  }

  return data as Endorsement;
}

export async function deleteEndorsement(
  userId: string,
  billId: string
): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  const { error } = await supabase
    .from("endorsements")
    .delete()
    .eq("user_id", userId)
    .eq("bill_id", billId);

  if (error) {
    console.error("Error deleting endorsement:", error);
    return false;
  }

  return true;
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

// Placeholder for database types
// TODO: Generate this from Supabase: npx supabase gen types typescript --project-id <project-id> > lib/database.types.ts
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<User, "id" | "created_at" | "updated_at">>;
      };
      bills: {
        Row: Bill;
        Insert: Omit<Bill, "created_at" | "updated_at">;
        Update: Partial<Omit<Bill, "created_at" | "updated_at">>;
      };
      bill_summaries: {
        Row: BillSummary;
        Insert: Omit<BillSummary, "id" | "created_at">;
        Update: Partial<Omit<BillSummary, "id" | "created_at">>;
      };
      endorsements: {
        Row: Endorsement;
        Insert: Omit<Endorsement, "id" | "created_at">;
        Update: Partial<Endorsement>;
      };
      saved_bills: {
        Row: SavedBill;
        Insert: Omit<SavedBill, "id" | "created_at">;
        Update: Partial<SavedBill>;
      };
    };
  };
}

