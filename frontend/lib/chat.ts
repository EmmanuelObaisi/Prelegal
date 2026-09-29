import type { NdaData } from "@/lib/nda";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatReply {
  reply: string;
  data: NdaData;
}

export const GREETING =
  "Hi! I’ll help you draft a Mutual NDA. Who are the two parties, and what will you be sharing confidential information for?";

/**
 * Sends the conversation and current fields to the backend, which returns the
 * assistant's reply and the updated fields. Same-origin, so it only works when
 * the app is served by FastAPI.
 */
export async function sendChat(messages: ChatMessage[], data: NdaData): Promise<ChatReply> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, data }),
  });
  if (!response.ok) throw new Error(`Chat request failed with status ${response.status}`);
  return response.json();
}
