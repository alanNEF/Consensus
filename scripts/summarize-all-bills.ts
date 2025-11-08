#!/usr/bin/env tsx
/**
 * Script to generate summaries for bills in the database
 * Usage: 
 *   npm run summarize:bill -- --bill-id <billId>  # Summarize a single bill
 *   npm run summarize:bill --                     # Summarize all bills (default)
 *   npm run summarize:bill -- --force             # Force re-summarize all bills even if summary exists
 */

// Load environment variables from .env file
import { config } from "dotenv";
import { resolve } from "path";

// Load .env file from the project root
config({ path: resolve(process.cwd(), ".env") });

import { getAllBills, getBillById, getBillSummary, insertBillSummary } from "@/lib/supabase";
import { generateBillSummaryOpenRouter } from "@/lib/ai/openrouter";

async function summarizeBillById(billId: string) {
    console.log(`📋 Processing bill: ${billId}\n`);

    const bill = await getBillById(billId);
    if (!bill) {
        console.error(`❌ Bill not found: ${billId}`);
        return null;
    }

    console.log(`📄 Bill: ${bill.title}\n`);
    console.log("🔄 Generating summary...\n");

    try {
        const summaryResponse = await generateBillSummaryOpenRouter(bill.bill_text, bill.title);

        // Parse the JSON response
        const summaryData = JSON.parse(summaryResponse) as {
            summary: string;
            one_liner: string;
            bill_title: string
        };

        console.log("✅ Summary generated:");
        console.log(`   One-liner: ${summaryData.one_liner}\n`);

        // Save to database
        const result = await insertBillSummary(
            bill.id,
            summaryData.summary,
            summaryData.one_liner
        );

        if (result) {
            console.log(`✅ Successfully saved summary for bill ${billId}`);
            console.log(`   Summary ID: ${result.id}\n`);
            return result;
        } else {
            console.error(`❌ Failed to save summary for bill ${billId}\n`);
            return null;
        }
    } catch (error) {
        console.error(`❌ Error processing bill ${billId}:`, error);
        if (error instanceof Error) {
            console.error(`   Message: ${error.message}\n`);
        }
        return null;
    }
}

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

            console.log(`${progress} 🔄 Processing ${bill.id}: ${bill.title.substring(0, 60)}...`);

            ``// Generate summary
            const summaryResponse = await generateBillSummaryOpenRouter(bill.bill_text, bill.title);

            // Parse the JSON response
            const summaryData = JSON.parse(summaryResponse) as {
                summary: string;
                one_liner: string;
                bill_title: string;
            };

            // Save to database
            const result = await insertBillSummary(
                bill.id,
                summaryData.summary,
                summaryData.one_liner
            );

            if (result) {
                console.log(`${progress} ✅ Successfully summarized ${bill.id}\n`);
                processed++;
            } else {
                console.log(`${progress} ❌ Failed to save summary for ${bill.id}\n`);
                errors++;
            }

            // Add a delay to avoid rate limiting (1 second between requests)
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
    console.log("\n" + "=".repeat(60));
    console.log("📊 Summary:");
    console.log(`   ✅ Processed: ${processed}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📋 Total: ${bills.length}`);
    console.log("=".repeat(60) + "\n");
}

// Parse command line arguments
const args = process.argv.slice(2);
const billIdIndex = args.indexOf("--bill-id");
const billId = billIdIndex !== -1 && args[billIdIndex + 1]
    ? args[billIdIndex + 1]
    : null;

if (billId) {
    // Run for a single bill
    summarizeBillById(billId).catch((error) => {
        console.error("Fatal error:", error);
        process.exit(1);
    });
} else {
    // Run for all bills (default behavior)
    const options = {
        force: args.includes("--force"),
        skipExisting: !args.includes("--skip-existing"),
    };

    console.log("🚀 Starting to process all bills...\n");
    summarizeAllBills(options).catch((error) => {
        console.error("Fatal error:", error);
        process.exit(1);
    });
}
