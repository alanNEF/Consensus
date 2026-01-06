/**
 * Consolidated Bill Processing Script
 * Scrapes bills from Congress.gov API, formats text, and inserts into Supabase.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface Bill {
  congress: number;
  type: string;
  number: string;
  title: string;
  originChamber?: string;
  originChamberCode?: string;
  url: string;
  updateDate?: string;
  latestAction?: {
    actionDate?: string;
    text?: string;
  };
  text?: string;
  sponsors?: string[];
}

interface Sponsor {
  fullName: string;
  party: string;
  isWithdrawn?: string;
}

interface BillProcessorConfig {
  congressApiKey?: string;
  supabaseUrl: string;
  supabaseKey: string;
  total?: number; // Maximum number of bills to process
}

interface BillRow {
  id: string;
  title: string;
  summary_key: string | null;
  date: string;
  status: string;
  origin: string;
  url: string;
  sponsors: string[];
  bill_text: string;
  updated_at?: string;
}

class BillProcessor {
  private BASE_URL = 'https://api.congress.gov/v3';
  private congressApiKey: string;
  private supabase: SupabaseClient;
  private total?: number;
  private billsProcessed = 0;

  constructor(config: BillProcessorConfig) {
    this.congressApiKey = config.congressApiKey || process.env.CONGRESS_GOV_API_KEY || '';
    if (!this.congressApiKey) {
      throw new Error('Congress API key required. Set CONGRESS_GOV_API_KEY environment variable.');
    }

    if (!config.supabaseUrl || !config.supabaseKey) {
      throw new Error('Supabase URL and key required.');
    }

    this.total = config.total;
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getCurrentCongressNumber(): number {
    const currentYear = new Date().getFullYear();
    return Math.floor((currentYear - 1789) / 2) + 1;
  }

  private async fetchWithRetry(url: string, retries = 3): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          headers: {
            'X-API-Key': this.congressApiKey,
          },
        });

        if (response.status === 429) {
          console.log('Rate limited. Waiting 60 seconds...');
          await this.sleep(60000);
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.sleep(1000 * (i + 1));
      }
    }
    throw new Error('Failed to fetch after retries');
  }

  private async getBills(congress: number, billType: string): Promise<Bill[]> {
    const allBills: Bill[] = [];
    let offset = 0;
    const limit = 250;
    let page = 1;

    while (true) {
      // Check if we've reached the total limit
      if (this.total && this.billsProcessed >= this.total) {
        console.log(`Reached total limit of ${this.total} bills. Stopping...`);
        break;
      }

      try {
        const url = billType === 'all'
          ? `${this.BASE_URL}/bill/${congress}?limit=${limit}&offset=${offset}&format=json`
          : `${this.BASE_URL}/bill/${congress}/${billType}?limit=${limit}&offset=${offset}&format=json`;

        console.log(`Fetching page ${page} (offset: ${offset})...`);
        const response = await this.fetchWithRetry(url);
        const data = await response.json();

        const bills: Bill[] = data.bills || [];
        if (bills.length === 0) break;

        // Only add bills up to the total limit
        if (this.total) {
          const remaining = this.total - this.billsProcessed;
          if (remaining <= 0) break;
          const billsToAdd = bills.slice(0, remaining);
          allBills.push(...billsToAdd);
          this.billsProcessed += billsToAdd.length;
        } else {
          allBills.push(...bills);
          this.billsProcessed += bills.length;
        }

        console.log(`Retrieved ${bills.length} bills (total: ${allBills.length})`);

        const pagination = data.pagination || {};
        const nextOffset = pagination.next;

        if (!nextOffset || nextOffset === offset) break;

        offset = nextOffset;
        page++;
        await this.sleep(500);
      } catch (error) {
        console.error(`Error fetching bills: ${error}`);
        break;
      }
    }

    console.log(`\nTotal bills retrieved: ${allBills.length}`);
    return allBills;
  }

  private async getBillText(congress: number, billType: string, billNumber: string): Promise<string | null> {
    try {
      const url = `${this.BASE_URL}/bill/${congress}/${billType.toLowerCase()}/${billNumber}/text?format=json`;
      const response = await this.fetchWithRetry(url);
      const data = await response.json();

      const textVersions = data.textVersions || [];
      let formattedTextUrl: string | null = null;

      // Look for "Formatted Text" format
      for (const version of textVersions) {
        const formats = version.formats || [];
        for (const fmt of formats) {
          if (fmt.type?.toLowerCase() === 'formatted text') {
            formattedTextUrl = fmt.url;
            if (formattedTextUrl) break;
          }
        }
        if (formattedTextUrl) break;
      }

      // If no formatted text, try any non-PDF/XML format
      if (!formattedTextUrl) {
        for (const version of textVersions) {
          const formats = version.formats || [];
          for (const fmt of formats) {
            const formatType = fmt.type?.toLowerCase() || '';
            if (!formatType.includes('pdf') && !formatType.includes('xml')) {
              formattedTextUrl = fmt.url;
              if (formattedTextUrl) break;
            }
          }
          if (formattedTextUrl) break;
        }
      }

      if (!formattedTextUrl) return null;

      const textResponse = await fetch(formattedTextUrl);
      if (!textResponse.ok) {
        throw new Error(`HTTP error! status: ${textResponse.status}`);
      }
      return await textResponse.text();
    } catch (error) {
      return null;
    }
  }

  private async getBillSponsors(congress: number, billType: string, billNumber: string): Promise<string[]> {
    const sponsorsList: string[] = [];

    try {
      // Get bill details for sponsors
      const url = `${this.BASE_URL}/bill/${congress}/${billType.toLowerCase()}/${billNumber}?format=json`;
      const response = await this.fetchWithRetry(url);
      const data = await response.json();
      const bill = data.bill || {};

      // Get sponsors
      const sponsors: Sponsor[] = bill.sponsors || [];
      for (const sponsor of sponsors) {
        let name = sponsor.fullName || '';
        const party = sponsor.party || '';

        if (name && party) {
          // Remove [R-OK-4] style suffix
          if (name.includes('[')) {
            name = name.split('[')[0].trim();
          }
          // Remove title prefix (Rep., Sen., etc.)
          if (name.includes('.') && name.includes(' ')) {
            name = name.split('.')[1].trim();
          }
          sponsorsList.push(`${name} (${party})`);
        } else if (name) {
          if (name.includes('[')) {
            name = name.split('[')[0].trim();
          }
          if (name.includes('.') && name.includes(' ')) {
            name = name.split('.')[1].trim();
          }
          sponsorsList.push(name);
        }
      }

      // Get cosponsors
      const cosponsorsUrl = `${this.BASE_URL}/bill/${congress}/${billType.toLowerCase()}/${billNumber}/cosponsors?format=json`;
      const cosponsorsResponse = await fetch(cosponsorsUrl, {
        headers: { 'X-API-Key': this.congressApiKey },
      });

      if (cosponsorsResponse.ok) {
        const cosponsorsData = await cosponsorsResponse.json();
        const cosponsors: Sponsor[] = cosponsorsData.cosponsors || [];

        for (const cosponsor of cosponsors) {
          if (cosponsor.isWithdrawn === 'Y') continue;

          let name = cosponsor.fullName || '';
          const party = cosponsor.party || '';

          if (name && party) {
            if (name.includes('[')) {
              name = name.split('[')[0].trim();
            }
            if (name.includes('.') && name.includes(' ')) {
              name = name.split('.')[1].trim();
            }
            sponsorsList.push(`${name} (${party})`);
          } else if (name) {
            if (name.includes('[')) {
              name = name.split('[')[0].trim();
            }
            if (name.includes('.') && name.includes(' ')) {
              name = name.split('.')[1].trim();
            }
            sponsorsList.push(name);
          }
        }
      }
    } catch (error) {
      // Silently fail for individual bills
    }

    return sponsorsList;
  }

  private async getAllBillTypes(congress?: number): Promise<Bill[]> {
    if (congress === undefined) {
      congress = this.getCurrentCongressNumber();
    }

    const billTypes = ['hr', 's', 'hjres', 'sjres', 'hconres', 'sconres', 'hres', 'sres'];
    const allBills: Bill[] = [];

    console.log(`Fetching all bill types for the ${congress}th Congress...\n`);

    for (const billType of billTypes) {
      // Check if we've reached the total limit before fetching more
      if (this.total && this.billsProcessed >= this.total) {
        console.log(`Reached total limit of ${this.total} bills. Stopping...`);
        break;
      }

      console.log(`\n--- Fetching ${billType.toUpperCase()} bills ---`);
      const bills = await this.getBills(congress, billType);
      allBills.push(...bills);
      await this.sleep(1000);
    }

    // Fetch text and sponsors for each bill
    if (allBills.length > 0) {
      console.log(`\n--- Fetching bill text and sponsors for ${allBills.length} bills ---`);
      for (let i = 0; i < allBills.length; i++) {
        const bill = allBills[i];
        const billType = bill.type?.toLowerCase() || '';
        const billNumber = bill.number || '';

        if (billType && billNumber) {
          if ((i + 1) % 10 === 0) {
            console.log(`Fetching data for bill ${i + 1}/${allBills.length}...`);
          }

          // Fetch text
          const billText = await this.getBillText(congress!, billType, billNumber);
          bill.text = billText || '';

          // Fetch sponsors
          const sponsors = await this.getBillSponsors(congress!, billType, billNumber);
          bill.sponsors = sponsors;

          await this.sleep(400);
        }
      }

      console.log('Completed fetching text and sponsors for all bills.');
    }

    return allBills;
  }

  private cleanHtmlText(htmlText: string): string {
    if (!htmlText || typeof htmlText !== 'string') {
      return '';
    }

    // Decode HTML entities (basic implementation)
    let text = htmlText
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, '');

    // Clean up whitespace
    text = text.replace(/\n{3,}/g, '\n\n');

    const lines = text.split('\n');
    const cleanedLines: string[] = [];
    for (const line of lines) {
      const cleanedLine = line.replace(/[ \t]+/g, ' ').trim();
      cleanedLines.push(cleanedLine);
    }

    text = cleanedLines.join('\n');
    text = text.replace(/\n{3,}/g, '\n\n');
    return text.trim();
  }

  private formatBills(bills: Bill[]): Bill[] {
    console.log(`\n--- Formatting text for ${bills.length} bills ---`);

    let processedCount = 0;
    for (const bill of bills) {
      const billText = bill.text;

      if (billText && typeof billText === 'string') {
        const isHtml = billText.toLowerCase().includes('<html>') || billText.toLowerCase().includes('<body>');
        if (isHtml) {
          const cleanedText = this.cleanHtmlText(billText);
          bill.text = cleanedText;
          processedCount++;
        }
      }
    }

    console.log(`✓ Formatted ${processedCount} bills`);
    return bills;
  }

  private getBillId(bill: Bill): string {
    const congress = bill.congress || '';
    const billType = bill.type || '';
    const billNumber = bill.number || '';
    return `${congress}_${billType}_${billNumber}`;
  }

  private getDate(bill: Bill): string {
    if (bill.updateDate) {
      return bill.updateDate;
    }

    if (bill.latestAction?.actionDate) {
      return bill.latestAction.actionDate;
    }

    return new Date().toISOString().split('T')[0];
  }

  private getStatus(bill: Bill): string {
    if (bill.latestAction?.text) {
      return bill.latestAction.text;
    }
    return 'Unknown';
  }

  private getOrigin(bill: Bill): string {
    if (bill.originChamber) {
      return bill.originChamber;
    }
    if (bill.originChamberCode) {
      return bill.originChamberCode;
    }

    const billType = (bill.type || '').toUpperCase();
    if (billType.startsWith('H')) {
      return 'House';
    } else if (billType.startsWith('S')) {
      return 'Senate';
    }
    return 'Unknown';
  }

  private async createTable(): Promise<void> {
    // Note: Supabase doesn't allow table creation via the client SDK
    // The table should be created manually in Supabase SQL Editor or via migrations
    // This method verifies the table exists by attempting a simple query
    
    const { error } = await this.supabase
      .from('bills')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist
        console.error('Error: bills table does not exist.');
        console.error('Please create the table in Supabase SQL Editor with:');
        console.log(`
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary_key TEXT,
  date DATE NOT NULL,
  status TEXT NOT NULL,
  origin TEXT NOT NULL,
  url TEXT NOT NULL,
  sponsors TEXT[] NOT NULL,
  bill_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
        `);
        throw new Error('Table does not exist. Please create it first.');
      } else {
        throw error;
      }
    } else {
      console.log('✓ Table verified');
    }
  }

  private async insertBills(bills: Bill[]): Promise<void> {
    console.log(`\n--- Inserting ${bills.length} bills into database ---`);

    let insertedCount = 0;
    let skippedCount = 0;
    let duplicateCount = 0;

    // Process bills in batches
    const batchSize = 100;
    for (let i = 0; i < bills.length; i += batchSize) {
      const batch = bills.slice(i, i + batchSize);
      // Use Map to deduplicate bills by ID within the batch
      // This prevents "ON CONFLICT DO UPDATE command cannot affect row a second time" error
      const billMap = new Map<string, BillRow>();

      for (const bill of batch) {
        try {
          const billId = this.getBillId(bill);
          const title = bill.title || 'Untitled';
          const summaryKey = null;
          const date = this.getDate(bill);
          const status = this.getStatus(bill);
          const origin = this.getOrigin(bill);
          const url = bill.url || '';
          const sponsors = bill.sponsors || [];
          const billText = bill.text || '';

          if (!billId || !title || !date || !status || !origin || !url) {
            skippedCount++;
            continue;
          }

          // Check if this bill ID already exists in the batch
          if (billMap.has(billId)) {
            duplicateCount++;
            console.log(`Duplicate bill ID in batch: ${billId}, keeping latest version`);
          }

          // Store/overwrite with latest version (in case of duplicates)
          billMap.set(billId, {
            id: billId,
            title,
            summary_key: summaryKey,
            date,
            status,
            origin,
            url,
            sponsors,
            bill_text: billText,
          });

          insertedCount++;
        } catch (error) {
          console.error(`Error processing bill ${bill.type || '?'} ${bill.number || '?'}: ${error}`);
          skippedCount++;
        }
      }

      // Convert Map values to array for upsert
      const values = Array.from(billMap.values());

      // Insert batch using Supabase upsert
      if (values.length > 0) {
        // Add updated_at timestamp
        const valuesWithTimestamp: BillRow[] = values.map(v => ({
          ...v,
          updated_at: new Date().toISOString(),
        }));

        const { error } = await this.supabase
          .from('bills')
          .upsert(valuesWithTimestamp, {
            onConflict: 'id',
            ignoreDuplicates: false,
          });

        if (error) {
          console.error(`Error inserting batch: ${error.message}`);
        } else {
          console.log(`Inserted batch ${Math.floor(i / batchSize) + 1} (${values.length} bills)`);
        }
      }
    }

    console.log(`✓ Inserted ${insertedCount} bills`);
    console.log(`✗ Skipped ${skippedCount} bills`);
    if (duplicateCount > 0) {
      console.log(`⚠ Removed ${duplicateCount} duplicate bills from batches`);
    }
  }

  async processAll(congress?: number): Promise<void> {
    try {
      // Step 1: Scrape bills
      console.log('='.repeat(60));
      console.log('STEP 1: Scraping bills from Congress.gov API');
      console.log('='.repeat(60));
      const bills = await this.getAllBillTypes(congress);

      // Step 2: Format text
      console.log('\n' + '='.repeat(60));
      console.log('STEP 2: Formatting bill text');
      console.log('='.repeat(60));
      const formattedBills = this.formatBills(bills);

      // Step 3: Insert into database
      console.log('\n' + '='.repeat(60));
      console.log('STEP 3: Inserting bills into Supabase');
      console.log('='.repeat(60));
      await this.createTable();
      await this.insertBills(formattedBills);

      console.log('\n' + '='.repeat(60));
      console.log('✓ All steps completed successfully!');
      console.log('='.repeat(60));
    } catch (error) {
      console.error(`\n✗ Error: ${error}`);
      throw error;
    }
  }
}

// Main function
async function createBillsTable(congress: number = 119, total: number = 999999) {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  // Use service role key which bypasses RLS - required for backend operations
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
  const congressApiKey = process.env.CONGRESS_GOV_API_KEY;

  if (!supabaseKey) {
    console.error('Error: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY environment variable not set');
    console.error('The service role key is required to bypass RLS policies for bill insertion.');
    process.exit(1);
  }

  const processor = new BillProcessor({
    congressApiKey,
    supabaseUrl,
    supabaseKey,
    total,
  });

  await processor.processAll(congress);
}


export { BillProcessor, createBillsTable };

