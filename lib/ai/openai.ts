import OpenAI from "openai";

// Initialize OpenAI client (returns null if key is missing)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

if (!openai) {
  console.warn(
    "⚠️  OpenAI API key not configured. AI features will return mock responses."
  );
}

/**
 * Generate an AI summary for a bill
 * @param billText - The full text or description of the bill
 * @param billTitle - The title of the bill
 * @returns A human-friendly summary of the bill
 */
export async function generateBillSummary(
  billText: string,
  billTitle: string
): Promise<string> {
  if (!openai) {
    // Return mock summary if OpenAI is not configured
    return `[MOCK SUMMARY] This is a placeholder summary for "${billTitle}". 
    
To enable AI summaries, please set the OPENAI_API_KEY environment variable.
    
The actual summary would analyze the bill's key provisions, impact, and implications in plain language.`;
  }

  try {
    const model = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that explains U.S. congressional bills in plain, accessible language. Focus on what the bill does, who it affects, and why it matters.",
        },
        {
          role: "user",
          content: `Please provide a clear, concise summary of this bill:\n\nTitle: ${billTitle}\n\nText: ${billText}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || "Unable to generate summary";
  } catch (error) {
    console.error("Error generating OpenAI summary:", error);
    return `[ERROR] Failed to generate summary: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

/**
 * Generate embeddings for text using OpenAI
 * @param text - The text to generate embeddings for
 * @returns An array of embedding values
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!openai) {
    // Return mock embedding if OpenAI is not configured
    console.warn("OpenAI not configured, returning mock embedding");
    return new Array(1536).fill(0).map(() => Math.random());
  }

  try {
    const model = process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small";
    const response = await openai.embeddings.create({
      model,
      input: text,
    });

    return response.data[0]?.embedding || [];
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

