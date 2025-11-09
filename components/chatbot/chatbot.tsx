"use client";

import { Thread } from "./thread";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/react-ai-sdk";

interface ChatPageProps {
  billId?: string;
}

export default function ChatPage({ billId }: ChatPageProps) {
  // Build API URL with billId query parameter if provided
  const apiUrl = billId ? `/api/chat?billId=${encodeURIComponent(billId)}` : "/api/chat";
  
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: apiUrl,
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-full">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}