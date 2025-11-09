import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
// import { kv } from "@vercel/kv";
// import { Ratelimit } from "@upstash/ratelimit";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { getContext } from "@/lib/rag";

export const maxDuration = 30;

// Create OpenRouter client factory
function getOpenRouterClient() {
  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is required");
  }

  return createOpenRouter({
    apiKey,
    headers: {
      "HTTP-Referer": process.env["OPENROUTER_HTTP_REFERER"] || "http://localhost:3000",
      "X-Title": process.env["OPENROUTER_APP_NAME"] || "Consensus",
    },
  });
}

// Rate limiting disabled for development
// const ratelimit = new Ratelimit({
//   redis: kv,
//   limiter: Ratelimit.fixedWindow(5, "30s"),
// });

export async function POST(req: Request) {
  try {
    // Extract billId from URL query parameters
    const url = new URL(req.url);
    const billId = url.searchParams.get("billId") || null;
    
    const { messages, tools } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Invalid messages format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Convert messages
    const modelMessages = convertToModelMessages(messages);
    
    // Get the latest user message for RAG context retrieval
    const latestUserMessage = modelMessages
      .filter((msg: any) => msg.role === "user")
      .pop();

    // Extract text content from the latest user message for RAG
    let userMessageText = "";
    if (latestUserMessage) {
      if (typeof latestUserMessage.content === "string") {
        userMessageText = latestUserMessage.content;
      } else if (Array.isArray(latestUserMessage.content)) {
        userMessageText = latestUserMessage.content
          .filter((part: any) => part?.type === "text")
          .map((part: any) => part.text)
          .join(" ");
      }
    }

    // Retrieve relevant context from the specific bill using RAG
    // Use billId from query params, fallback to hardcoded value if not provided
    const billIdToUse = billId || "";
    let ragContext = "";
    if (userMessageText && billIdToUse) {
      try {
        console.log(`Retrieving RAG context for bill: ${billIdToUse}`);
        const timeoutPromise = new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error("RAG timeout after 5 seconds")), 5000)
        );
        ragContext = await Promise.race([
          getContext(billIdToUse, userMessageText),
          timeoutPromise,
        ]);
        console.log("RAG context retrieved, length:", ragContext.length);
      } catch (error) {
        console.error("Error retrieving RAG context:", error);
        ragContext = "";
      }
    }

    // Build system message with RAG context if available
    let systemMessage: string | undefined;
    if (ragContext) {
      systemMessage = `You are a helpful assistant that answers questions about U.S. congressional bills. Use the following context from relevant bills to answer the user's questions accurately:

${ragContext}

If the context doesn't contain relevant information, say so. Focus on providing clear, accessible explanations about what bills do, who they affect, and why they matter.`;
    } else {
      systemMessage = "You are a helpful assistant that answers questions about U.S. congressional bills. Provide clear, accessible explanations about what bills do, who they affect, and why they matter.";
    }

    const openrouter = getOpenRouterClient();

    const result = streamText({
      model: openrouter("google/gemini-2.5-flash"),
      messages: modelMessages,
      ...(systemMessage && { system: systemMessage }),
      maxOutputTokens: 1200,
      stopWhen: stepCountIs(10),
      tools: {
        ...frontendTools(tools),
      },
      onError: console.error,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error in POST handler:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
