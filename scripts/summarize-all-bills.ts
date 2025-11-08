#!/usr/bin/env tsx
/**
 * Script to generate summaries for all bills in the database
 * Usage: tsx scripts/summarize-all-bills.ts [--force] [--skip-existing]
 */

import { getAllBills, getBillSummary, insertBillSummary } from "@/lib/supabase";
import { generateBillSummaryOpenRouter } from "@/lib/ai/openrouter";

async function summarizeAllBills(options: { force?: boolean; skipExisting?: boolean } = {}) {
    const { force = false, skipExisting = true } = options;

    console.log("📋 Fetching all bills from database...\n");

    const bills = await getAllBills();

    if (bills.length === 0) {
        console.log("❌ No bills found in database.");
        return;
    }

    console.log(`Found ${bills.length} bills to process.\n`);

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < bills.length; i++) {
        const bill = bills[i];
        const progress = `[${i + 1}/${bills.length}]`;

        try {
            // Check if summary already exists
            if (skipExisting && !force) {
                const existingSummary = await getBillSummary(bill.id);
                if (existingSummary) {
                    console.log(`${progress} ⏭️  Skipping ${bill.id} - summary already exists`);
                    skipped++;
                    continue;
                }
            }

            console.log(`${progress} 🔄 Processing ${bill.id}: ${bill.title}`);

            // Generate summary
            const summaryResponse = await generateBillSummaryOpenRouter(bill.bill_text, bill.title);

            // Parse the JSON response (OpenRouter returns JSON according to the prompt)
            let summaryText: string;
            try {
                // Try to parse as JSON first
                const parsed = JSON.parse(summaryResponse);
                // Use the summary field if it exists, otherwise use the whole response
                summaryText = parsed.summary || summaryResponse;
            } catch {
                // If it's not JSON, use the response as-is
                summaryText = summaryResponse;
            }

            // Save to database
            const result = await insertBillSummary(bill.id, summaryText);

            if (result) {
                console.log(`${progress} ✅ Successfully summarized ${bill.id}\n`);
                processed++;
            } else {
                console.log(`${progress} ❌ Failed to save summary for ${bill.id}\n`);
                errors++;
            }

            // Add a small delay to avoid rate limiting (adjust as needed)
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
            console.error(`${progress} ❌ Error processing ${bill.id}:`, error);
            errors++;

            // If it's a rate limit error, wait longer before continuing
            if (error instanceof Error && error.message.includes("rate limit")) {
                console.log("⏳ Rate limit detected, waiting 10 seconds...");
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }
    }

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 Summary:");
    console.log(`   ✅ Processed: ${processed}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📋 Total: ${bills.length}`);
    console.log("=".repeat(50) + "\n");
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    force: args.includes("--force"),
    skipExisting: !args.includes("--skip-existing"),
};

// Run the script
summarizeAllBills(options).catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
