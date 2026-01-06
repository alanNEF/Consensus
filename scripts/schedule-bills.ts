/**
 * Scheduled task runner for createBillsTable
 * Runs createBillsTable at a specified time every day
 * 
 * Usage:
 *   tsx --env-file=.env scripts/schedule-bills.ts
 * 
 * Environment variables:
 *   SCHEDULE_TIME - Time to run daily (format: "HH:MM", e.g., "02:00" for 2 AM)
 *                   Default: "02:00"
 *   CONGRESS - Congress number (default: 119)
 *   TOTAL_BILLS - Maximum number of bills to process (default: 999999)
 */

import cron from 'node-cron';
import { createBillsTable } from '../lib/process_bills';

// Get schedule time from environment variable or use default (2 AM)
const scheduleTime = process.env.SCHEDULE_TIME || '21:30';
const [hour, minute] = scheduleTime.split(':').map(Number);

// Validate time format
if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
  console.error(`Invalid SCHEDULE_TIME format: ${scheduleTime}. Use format "HH:MM" (e.g., "02:00")`);
  process.exit(1);
}

// Get congress number and total bills from environment or use defaults
const congress = process.env.CONGRESS ? parseInt(process.env.CONGRESS, 10) : 119;
const totalBills = process.env.TOTAL_BILLS ? parseInt(process.env.TOTAL_BILLS, 10) : 9999;

// Create cron expression: "minute hour * * *" (runs daily at specified time)
const cronExpression = `${minute} ${hour} * * *`;

console.log('='.repeat(60));
console.log('Bill Processing Scheduler');
console.log('='.repeat(60));
console.log(`Schedule: Daily at ${scheduleTime} (${hour}:${minute})`);
console.log(`Cron expression: ${cronExpression}`);
console.log(`Congress: ${congress}`);
console.log(`Max bills: ${totalBills}`);
console.log('='.repeat(60));
console.log('Scheduler started. Waiting for scheduled time...\n');

// Function to run the bill processing
async function runBillProcessing() {
  const startTime = new Date();
  console.log(`\n[${startTime.toISOString()}] Starting scheduled bill processing...`);
  
  try {
    await createBillsTable(congress, totalBills);
    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
    console.log(`\n[${endTime.toISOString()}] Bill processing completed successfully in ${duration} seconds`);
  } catch (error) {
    const endTime = new Date();
    console.error(`\n[${endTime.toISOString()}] Error during bill processing:`, error);
  }
}

// Schedule the task
cron.schedule(cronExpression, async () => {
  await runBillProcessing();
}, {
  scheduled: true,
  timezone: process.env.TZ || 'America/New_York', // Default to Eastern Time
});

// Optionally run immediately on startup (useful for testing)
if (process.env.RUN_ON_STARTUP === 'true') {
  console.log('RUN_ON_STARTUP is set to true. Running immediately...\n');
  runBillProcessing();
}

// Keep the process alive
console.log('Scheduler is running. Press Ctrl+C to stop.\n');
process.on('SIGINT', () => {
  console.log('\n\nShutting down scheduler...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nShutting down scheduler...');
  process.exit(0);
});

