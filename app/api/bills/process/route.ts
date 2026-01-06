import { NextResponse } from "next/server";
import { createBillsTable } from "@/lib/process_bills";

// Mark as dynamic to prevent static generation during build
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/bills/process
 * Manually trigger bill processing
 * 
 * Query parameters:
 *   - congress: Congress number (default: 119)
 *   - total: Maximum number of bills to process (default: 999999)
 * 
 * Body (optional):
 *   - congress: number
 *   - total: number
 */
export async function POST(request: Request) {
  try {
    // Check for authorization (optional - add your auth logic here)
    // For example, you might want to check for an API key or admin role
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.INTERNAL_API_KEY;
    
    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get parameters from query string or body
    const { searchParams } = new URL(request.url);
    let congress = 119;
    let total = 999999;

    // Try to get from query params first
    const congressParam = searchParams.get('congress');
    const totalParam = searchParams.get('total');

    if (congressParam) {
      congress = parseInt(congressParam, 10);
      if (isNaN(congress)) {
        return NextResponse.json(
          { error: "Invalid congress parameter. Must be a number." },
          { status: 400 }
        );
      }
    }

    if (totalParam) {
      total = parseInt(totalParam, 10);
      if (isNaN(total)) {
        return NextResponse.json(
          { error: "Invalid total parameter. Must be a number." },
          { status: 400 }
        );
      }
    }

    // Try to get from request body if available
    try {
      const body = await request.json().catch(() => ({}));
      if (body.congress) {
        congress = parseInt(String(body.congress), 10);
        if (isNaN(congress)) {
          return NextResponse.json(
            { error: "Invalid congress in body. Must be a number." },
            { status: 400 }
          );
        }
      }
      if (body.total) {
        total = parseInt(String(body.total), 10);
        if (isNaN(total)) {
          return NextResponse.json(
            { error: "Invalid total in body. Must be a number." },
            { status: 400 }
          );
        }
      }
    } catch {
      // Body parsing failed, use query params only
    }

    // Start processing in the background
    // Note: This will run synchronously, which might timeout for long operations
    // For production, consider using a job queue like Bull or similar
    console.log(`[${new Date().toISOString()}] Starting bill processing via API...`);
    console.log(`Congress: ${congress}, Total: ${total}`);

    // Run the processing
    await createBillsTable(congress, total);

    return NextResponse.json({
      success: true,
      message: "Bill processing completed successfully",
      congress,
      total,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error processing bills:", error);
    return NextResponse.json(
      { 
        error: "Failed to process bills",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bills/process
 * Get information about the bill processing endpoint
 */
export async function GET() {
  return NextResponse.json({
    message: "Bill processing endpoint",
    usage: {
      method: "POST",
      description: "Manually trigger bill processing",
      parameters: {
        congress: "Congress number (default: 119)",
        total: "Maximum number of bills to process (default: 999999)",
      },
      examples: {
        queryParams: "/api/bills/process?congress=119&total=1000",
        body: {
          congress: 119,
          total: 1000,
        },
      },
    },
  });
}

