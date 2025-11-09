import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { getBillSummary, getBillById } from "@/lib/supabase";
import type { Bill } from "@/types";

// Use only OpenRouter API key for embeddings
const openRouterApiKey = process.env["OPENROUTER_API_KEY"];

// Only initialize embeddings if we have an API key (lazy initialization)
let embeddings: OpenAIEmbeddings | null = null;
if (openRouterApiKey) {
  try {
    embeddings = new OpenAIEmbeddings({
      openAIApiKey: openRouterApiKey,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
      },
    });
  } catch (error) {
    console.warn("Failed to initialize embeddings:", error);
    embeddings = null;
  }
}

// Cache vector stores per bill ID
const vectorStoreCache = new Map<string, MemoryVectorStore>();

// Cache document chunks for simple text search fallback
const documentChunksCache = new Map<string, string[]>();

async function getBillTextForSearch(bill: Bill): Promise<string> {
  // Try to get summary first, then fall back to bill_text or title + summary_key
  const summary = await getBillSummary(bill.id);
  if (summary?.summary_text) {
    return `${bill.title}\n${summary.summary_text}`;
  }
  
  if (bill.bill_text) {
    return `${bill.title}\n${bill.bill_text}`;
  }
  
  return `${bill.title} ${bill.summary_key || ""}`;
}

async function getVectorStore(billId: string): Promise<MemoryVectorStore> {
  // Return cached vector store if it exists
  if (vectorStoreCache.has(billId)) {
    console.log(`Using cached vector store for bill ${billId}`);
    return vectorStoreCache.get(billId)!;
  }

  if (!embeddings) {
    throw new Error("Embeddings not available - OPENROUTER_API_KEY not configured");
  }

  try {
    console.log(`Creating new vector store for bill ${billId}...`);
    
    // Get bill from database
    const bill = await getBillById(billId);
    if (!bill) {
      throw new Error(`Bill ${billId} not found`);
    }

    // Get bill text
    const text = await getBillTextForSearch(bill);
    console.log(`Bill text retrieved, length: ${text.length}`);

    // Create document
    const docs = [new Document({ pageContent: text })];

    // Split into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    console.log("Splitting documents...");
    const splitDocs = await splitter.splitDocuments(docs);
    console.log(`Split into ${splitDocs.length} chunks`);

    // Create vector store
    console.log("Creating embeddings (this may take a moment)...");
    const vectorStore = await MemoryVectorStore.fromDocuments(
      splitDocs,
      embeddings
    );
    console.log("Vector store created successfully");

    // Cache the vector store
    vectorStoreCache.set(billId, vectorStore);
    return vectorStore;
  } catch (error) {
    console.error("Error creating vector store:", error);
    throw error;
  }
}

// Simple keyword-based search fallback (works without embeddings)
async function getContextSimpleSearch(billId: string, message: string): Promise<string> {
  try {
    // Get bill from database
    const bill = await getBillById(billId);
    if (!bill) {
      return "";
    }

    // Load and split document if not cached
    let documentChunks = documentChunksCache.get(billId);
    if (!documentChunks) {
      const text = await getBillTextForSearch(bill);
      
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      
      const docs = [new Document({ pageContent: text })];
      const splitDocs = await splitter.splitDocuments(docs);
      documentChunks = splitDocs.map((doc) => doc.pageContent);
      documentChunksCache.set(billId, documentChunks);
    }

    // Extract keywords from message (simple approach)
    const stopWords = new Set(["what", "about", "tell", "explain", "describe", "the", "this", "that", "bill", "document"]);
    const keywords = message
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 2) // Filter out very short words
      .filter((word) => !stopWords.has(word))
      .filter((word) => /^[a-z]+$/.test(word)); // Only alphabetic words

    // If no keywords found, use first few chunks as fallback
    if (keywords.length === 0) {
      console.log("No keywords found, returning first 3 chunks");
      return documentChunks.slice(0, 3).join("\n\n");
    }

    // Score chunks by keyword matches
    const scoredChunks = documentChunks.map((chunk, index) => {
      const lowerChunk = chunk.toLowerCase();
      const score = keywords.reduce((sum, keyword) => {
        const matches = (lowerChunk.match(new RegExp(`\\b${keyword}\\b`, "gi")) || []).length;
        return sum + matches * 2; // Boost exact word matches
      }, 0);
      return { chunk, score, index };
    });

    // Get top 3 chunks, or at least top scoring ones
    const topChunks = scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.chunk);

    // If no matches found, return first chunks
    const topScore = scoredChunks.length > 0 ? scoredChunks[0]?.score : 0;
    if (topChunks.length === 0 || topScore === 0) {
      console.log("No keyword matches found, returning first 3 chunks");
      return documentChunks.slice(0, 3).join("\n\n");
    }

    return topChunks.join("\n\n");
  } catch (error) {
    console.error("Error in simple search:", error);
    throw error;
  }
}

/**
 * Get relevant context from a specific bill using RAG
 * @param billId - The ID of the bill to retrieve context from
 * @param message - The user's message to search for relevant sections
 * @returns Context string with relevant bill information
 */
export async function getContext(billId: string, message: string): Promise<string> {
  try {
    console.log(`Retrieving RAG context for bill ${billId} with message: ${message.substring(0, 50)}`);
    
    // Try to use vector store if embeddings are available
    if (embeddings && openRouterApiKey) {
      try {
        console.log("Getting vector store...");
        const vectorStore = await getVectorStore(billId);
        console.log("Vector store retrieved, creating retriever...");
        const retriever = vectorStore.asRetriever({ k: 3 }); // Limit to top 3 results
        console.log("Retrieving relevant documents...");
        const context = await retriever.getRelevantDocuments(message);
        console.log(`Retrieved ${context.length} documents`);

        return context.map((doc) => doc.pageContent).join("\n");
      } catch (vectorError) {
        console.warn("Vector store failed, falling back to simple search:", vectorError);
        // Fall through to simple search
      }
    }

    // Use simple keyword-based search (works without embeddings/OpenRouter API key)
    console.log("Using simple keyword search...");
    const result = await getContextSimpleSearch(billId, message);
    console.log("Simple search found context, length:", result.length);
    return result;
  } catch (error) {
    console.error("Error in getContext:", error);
    throw error;
  }
}
