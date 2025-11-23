import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

// Replace the execAsync approach with HTTP call to persistent service
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim() === "") {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    // Call persistent Python service
    const serviceUrl = process.env.EMBEDDING_SERVICE_URL || 'http://localhost:5001';  // Changed from 5000 to 5001
    const response = await fetch(`${serviceUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        top_k: 12,
        metric: 'COSINE'
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding service error: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json({ results: data.results });
  } catch (error) {
    console.error("Error in search API:", error);
    return NextResponse.json(
      { error: "Failed to perform search", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

