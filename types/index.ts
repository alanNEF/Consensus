// Core types for the application

export interface User {
    id: string;
    email: string;
    name: string | null;
    created_at: string;
    updated_at: string;
    topics?: string[] | null;
    race?: string | null;
    residency?: string | null;
    religion?: string | null;
    gender?: string | null;
    age_range?: string | null;
    party?: string | null;
    income?: string | null;
    education?: string | null;
}

export interface Sponsor {
    name: string;
    party: "REPUBLICAN" | "DEMOCRAT" | "THIRD_PARTY";
}

export interface Bill {
    id: string;
    title: string;
    summary_key: string | null;
    date: string | null;
    status: string | null;
    origin: string | null;
    url: string | null;
    sponsors: string[] | null;
    created_at: string;
    updated_at: string;
    // Extended fields for UI
    category?: string;
    description?: string; // One-line description
    summary?: string; // 5-7 sentence summary
    affectedGroups?: string[];
    sponsorDetails?: Sponsor[];
}

export interface BillSummary {
    id: string;
    bill_id: string;
    summary_text: string;
    created_at: string;
}

export interface Endorsement {
    id: string;
    user_id: string;
    bill_id: string;
    created_at: string;
}

export interface SavedBill {
    id: string;
    user_id: string;
    bill_id: string;
    created_at: string;
}

export interface BillWithSummary extends Bill {
    summary?: BillSummary;
}

export interface PaginatedResponse<T> {
    data: T[];
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
}

