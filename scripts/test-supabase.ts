#!/usr/bin/env tsx
/**
 * Test script for supabase.ts
 * Run with: npx tsx scripts/test-supabase.ts
 */

import { config } from "dotenv";
import path from "path";
import { getBillById, assembleLink, userEndorseBill, userOpposeBill, removeUserSupport } from "@/lib/supabase";
import { Bill } from "@/types";

// Load environment variables
config({ path: path.join(process.cwd(), ".env") });

async function testSupabase() {
  console.log("🧪 Testing Supabase connection...\n");

  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("📋 Environment check:");
  console.log(`SUPABASE_URL: ${supabaseUrl ? "✅ Set" : "❌ Missing"}`);
  console.log(
    `   SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? "✅ Set" : "❌ Missing"}`
  );
  console.log();

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing required environment variables!");
    console.error("   Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file");
    process.exit(1);
  }

  try {
    // Dynamic import to handle the module structure
    const { supabase, getBills, getAllBills, getBillsByCategory: getBillsByCategoryFn } = await import("../lib/supabase");

    if (!supabase) {
      console.error("❌ Failed to create Supabase client");
      process.exit(1);
    }

    console.log("✅ Supabase client created successfully\n");

    // Test 1: Simple connection test
    console.log("🔍 Test 1: Testing connection...");
    const { data: testData, error: testError } = await supabase
      .from("bills")
      .select("id")
      .limit(1);

    if (testError) {
      console.error(`   ❌ Connection error: ${testError.message}`);
    } else {
      console.log("   ✅ Connection successful!");
      console.log(`   📊 Found ${testData?.length || 0} bills in database`);
    }
    console.log();

    // Test 2: Test getBills function
    console.log("🔍 Test 2: Testing getBills()...");
    try {
      const billsResult = await getBills(1, 10);
      console.log(`   ✅ getBills() successful!`);
      console.log(`   📊 Total bills: ${billsResult.total}`);
      console.log(`   📄 Bills returned: ${billsResult.data.length}`);
      if (billsResult.data.length > 0) {
        console.log(`   📝 First bill: ${billsResult.data[0].title}`);
      }
    } catch (error: any) {
      console.error(`   ❌ getBills() error: ${error.message}`);
    }
    console.log();

    // Test 3: Test getAllBills function
    console.log("🔍 Test 3: Testing getAllBills()...");
    try {
      const allBills = await getAllBills();
      console.log(`   ✅ getAllBills() successful!`);
      console.log(`   📊 Total bills: ${allBills.length}`);
    } catch (error: any) {
      console.error(`   ❌ getAllBills() error: ${error.message}`);
    }
    console.log();

    // Test 4: Test bill_summaries table
    console.log("🔍 Test 4: Testing bill_summaries table...");
    const { data: summaries, error: summariesError } = await supabase
      .from("bill_summaries")
      .select("*")
      .limit(1);

    if (summariesError) {
      console.error(`   ❌ Error: ${summariesError.message}`);
    } else {
      console.log(`   ✅ bill_summaries table accessible`);
      console.log(`   📊 Found ${summaries?.length || 0} summaries`);
    }
    console.log();

    // Test 5: Test saved_bills table
    console.log("🔍 Test 5: Testing saved_bills table...");
    const { data: savedBills, error: savedBillsError } = await supabase
      .from("saved_bills")
      .select("*")
      .limit(1);

    if (savedBillsError) {
      console.error(`   ❌ Error: ${savedBillsError.message}`);
    } else {
      console.log(`   ✅ saved_bills table accessible`);
      console.log(`   📊 Found ${savedBills?.length || 0} saved bills`);
    }
    console.log();

    const bill:Bill | null = await getBillById("hr1234-118");
    console.log(`   ✅ bill: ${bill?.title || "No bill found"}`);
    console.log();

    const billLink:string = bill ? assembleLink(bill) : "No bill found";
    console.log(`   ✅ bill link: ${billLink}`);
    console.log();

    // Test 6: Test getBillsByCategory function
    // console.log("🔍 Test 6: Testing getBillsByCategory()...");
    // try {
    //   const billsByCategory = await getBillsByCategoryFn();
    //   console.log(`   ✅ getBillsByCategory() successful!`);
      
    //   const categoryCount = Object.keys(billsByCategory).length;
    //   console.log(`   📊 Categories found: ${categoryCount}`);
      
    //   if (categoryCount > 0) {
    //     // Show summary of each category
    //     Object.entries(billsByCategory).forEach(([category, bills]) => {
    //       console.log(`   📁 ${category}: ${bills.length} bill(s)`);
    //     });
        
    //     // Show first bill from first category as example
    //     const firstCategory = Object.keys(billsByCategory)[0];
    //     const firstBills = billsByCategory[firstCategory];
    //     if (firstBills && firstBills.length > 0) {
    //       console.log(`   📝 Example bill from "${firstCategory}": ${firstBills[0].title}`);
    //     }
    //   } else {
    //     console.log(`   ⚠️  No bills found in database`);
    //   }
    // } catch (error: any) {
    //   console.error(`   ❌ getBillsByCategory() error: ${error.message}`);
    // }
    // console.log();

    const endorsing = await userEndorseBill("e4a0ee73-3b8b-4248-bafd-9a03df94a8fb", "hr1234-118");
    console.log(`   ✅ endorsing: ${endorsing}`);
    const removing = await removeUserSupport("e4a0ee73-3b8b-4248-bafd-9a03df94a8fb", "hr1234-118");
    console.log(`   ✅ removing: ${removing}`);
    
    // const opposing = await userOpposeBill("e4a0ee73-3b8b-4248-bafd-9a03df94a8fb", "hr1234-118");
    // console.log(`   ✅ opposing: ${opposing}`);

    console.log("🎉 All tests completed!\n");
  } catch (error: any) {
    console.error("❌ Fatal error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testSupabase().catch(console.error);