import { NextResponse } from "next/server";

// Mark as dynamic to prevent static generation during build
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || "http://localhost:5001";

/**
 * POST /api/bills/sync-embeddings
 * 
 * Trigger embedding generation for new bills.
 * 
 * Request body (optional):
 * {
 *   "limit": 100,  // Maximum number of bills to process
 *   "bill_ids": ["hr1234-118"]  // Specific bill IDs to process
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { limit, bill_ids } = body;

    // Call the Python embedding service
    const response = await fetch(`${EMBEDDING_SERVICE_URL}/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        limit,
        bill_ids,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Embedding service error: ${error}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error syncing embeddings:", error);
    return NextResponse.json(
      { error: "Failed to sync embeddings" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bills/sync-embeddings
 * 
 * Get status of bills needing embeddings.
 */
export async function GET() {
  try {
    const response = await fetch(`${EMBEDDING_SERVICE_URL}/sync/status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Embedding service error: ${error}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error getting sync status:", error);
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 }
    );
  }
}
