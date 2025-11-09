#!/usr/bin/env tsx
/**
 * Environment variable sanity check script
 * Run this before starting the dev server to verify configuration
 */
import { config } from "dotenv";
import path from "path";
config({ path: path.join(process.cwd(), ".env") });

// Load .env file
import "dotenv/config";

const requiredEnvVars = {
  // Next.js
  NEXT_PUBLIC_SITE_URL: "Next.js public site URL",
  NEXTAUTH_URL: "NextAuth URL",
  NEXTAUTH_SECRET: "NextAuth secret (required for production)",
  // Supabase
  SUPABASE_URL: "Supabase project URL",
  SUPABASE_ANON_KEY: "Supabase anonymous key",
  SUPABASE_SERVICE_ROLE_KEY: "Supabase service role key (server-only)",
  DATABASE_URL: "PostgreSQL database URL",
  // AI Providers (optional but recommended)
  OPENAI_API_KEY: "OpenAI API key (optional, for AI summaries)",
  ANTHROPIC_API_KEY: "Anthropic API key (optional, alternative to OpenAI)",
  // Congress.gov (optional)
  CONGRESS_GOV_API_KEY: "Congress.gov API key (optional, for real bill data)",
};

const optionalEnvVars = {
  OPENAI_EMBED_MODEL: "OpenAI embedding model",
  OPENAI_CHAT_MODEL: "OpenAI chat model",
  CONGRESS_GOV_BASE: "Congress.gov API base URL",
  SMTP_HOST: "SMTP host for email (magic links)",
  SMTP_PORT: "SMTP port",
  SMTP_USER: "SMTP username",
  SMTP_PASSWORD: "SMTP password",
  SMTP_FROM: "SMTP from address",
};

function checkEnvVars() {
  console.log("🔍 Checking environment variables...\n");

  const missing: string[] = [];
  const present: string[] = [];
  const optionalPresent: string[] = [];

  // Check required vars
  for (const [key, description] of Object.entries(requiredEnvVars)) {
    const value = process.env[key];
    if (!value || value === "replace_me") {
      missing.push(`${key} (${description})`);
    } else {
      present.push(key);
    }
  }

  // Check optional vars
  for (const [key, description] of Object.entries(optionalEnvVars)) {
    const value = process.env[key];
    if (value && value !== "replace_me") {
      optionalPresent.push(`${key} (${description})`);
    }
  }

  // Report results
  if (present.length > 0) {
    console.log("✅ Configured variables:");
    present.forEach((key) => {
      console.log(`   - ${key}`);
    });
    console.log();
  }

  if (optionalPresent.length > 0) {
    console.log("⚙️  Optional variables configured:");
    optionalPresent.forEach((key) => {
      console.log(`   - ${key}`);
    });
    console.log();
  }

  if (missing.length > 0) {
    console.log("⚠️  Missing or placeholder variables:");
    missing.forEach((item) => {
      console.log(`   - ${item}`);
    });
    console.log();
  }

  // Feature availability
  console.log("📊 Feature availability:");
  console.log(
    `   Database: ${process.env.SUPABASE_URL && process.env.SUPABASE_URL !== "replace_me" ? "✅" : "❌ (not configured)"}`
  );
  console.log(
    `   AI Summaries (OpenAI): ${process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "replace_me" ? "✅" : "❌ (not configured)"}`
  );
  console.log(
    `   AI Summaries (Anthropic): ${process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== "replace_me" ? "✅" : "❌ (not configured)"}`
  );
  console.log(
    `   Congress.gov API: ${process.env.CONGRESS_GOV_API_KEY && process.env.CONGRESS_GOV_API_KEY !== "replace_me" ? "✅" : "❌ (not configured)"}`
  );
  console.log(
    `   Email Auth: ${process.env.SMTP_HOST && process.env.SMTP_HOST !== "replace_me" ? "✅" : "❌ (not configured)"}`
  );
  console.log();

  if (missing.length > 0) {
    console.log(
      "💡 Tip: Copy .env.example to .env and fill in your values."
    );
    console.log(
      "   Configure all required variables for full functionality.\n"
    );
  } else {
    console.log("🎉 All required environment variables are configured!\n");
  }
}

// Run check
checkEnvVars();

