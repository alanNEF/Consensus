import Anthropic from "@anthropic-ai/sdk";

// Initialize Anthropic client (returns null if key is missing)
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  : null;

if (!anthropic) {
  console.warn(
    "⚠️  Anthropic API key not configured. AI features will return mock responses."
  );
}

/**
 * Generate an AI summary for a bill using Anthropic Claude
 * @param billText - The full text or description of the bill
 * @param billTitle - The title of the bill
 * @returns A human-friendly summary of the bill
 */
export async function generateBillSummaryAnthropic(
  billText: string,
  billTitle: string
): Promise<string> {
  if (!anthropic) {
    // Return mock summary if Anthropic is not configured
    return `[MOCK SUMMARY] This is a placeholder summary for "${billTitle}" using Anthropic Claude.
    
To enable AI summaries, please set the ANTHROPIC_API_KEY environment variable.
    
The actual summary would analyze the bill's key provisions, impact, and implications in plain language.`;
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 500,
      system:
        "You are a helpful assistant that explains U.S. congressional bills in plain, accessible language. Focus on what the bill does, who it affects, and why it matters.",
      messages: [
        {
          role: "user",
          content: `Please provide a clear, concise summary of this bill:\n\nTitle: ${billTitle}\n\nText: ${billText}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === "text") {
      return content.text;
    }

    return "Unable to generate summary";
  } catch (error) {
    console.error("Error generating Anthropic summary:", error);
    return `[ERROR] Failed to generate summary: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

