import { OpenRouter } from "@openrouter/sdk";

// Initialize Anthropic client (returns null if key is missing)
const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

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
  if (!openrouter) {
    throw new Error("Anthropic API key not configured");
  }

  try {
    const message = await openrouter.chat.send({
      model: "anthropic/claude-sonnet-4.5",
      messages: [
        {
          role: "system",
          content: `You are a careful, neutral legislative editor. Write in plain English
            at a U.S. 10th-grade reading level. Be concise, accurate, and avoid legal jargon.
            Do not invent details. If something isn't stated, write \"Not specified.\"`
        },
        {
          role: "user",
          content: `Summarize the U.S. Congress bill below in no more than 200 words.
                      Keep only the most important concepts: the bill's purpose, what it changes or requires, who is affected,
                      which agencies are involved, funding/costs, key timelines, and any penalties or reporting rules. Mention 
                      the bill number and title if present. Use short sentences and active voice. Stay neutral.

                      Output format:
                      Return ONLY a valid JSON object with this exact structure:
                      {
                        "bill_title": "string (official title if present, or 'Not specified')",
                        "one_liner": "string (one sentence describing the bill's main purpose, max 25 words)",
                        "summary": "string (single paragraph summary, ≤200 words, covering: purpose, what it changes/requires, 
                        who is affected, agencies involved, funding/costs, timelines, penalties/reporting rules)"
                      }

                      Do not include any text outside the JSON object. Do not use markdown code blocks or backticks.
                      Do not include any other text or commentary.
                      Bill title: ${billTitle}
                      Bill text:
                      ${billText}`
        }
      ],
    });

    return message.choices[0].message.content as string;
  } catch (error) {
    console.error("Error generating Anthropic summary:", error);
    throw error;
  }
}
