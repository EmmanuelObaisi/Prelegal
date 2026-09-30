import type { FieldValue, Party } from "@/lib/documents";
import { defaultNdaData, type NdaData } from "@/lib/nda";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** The Mutual NDA's own answers; its parties live on the draft, shared by every document. */
export type NdaTerms = Omit<NdaData, "parties">;

/** The chosen document and every answer so far. Mirrors `Draft` in backend/chat.py. */
export interface Draft {
  documentId: string | null;
  nda: NdaTerms;
  parties: [Party, Party];
  fields: FieldValue[];
}

export interface ChatReply {
  reply: string;
  draft: Draft;
}

const { parties, ...ndaTerms } = defaultNdaData;
export const emptyDraft: Draft = { documentId: null, nda: ndaTerms, parties, fields: [] };

export const GREETING =
  "Hi! I’ll help you draft a legal agreement, such as an NDA, a cloud service agreement or a pilot agreement. What do you need?";

/**
 * Sends the conversation and current draft to the backend, which returns the
 * assistant's reply and the updated draft. Same-origin, so it only works when
 * the app is served by FastAPI.
 */
export async function sendChat(messages: ChatMessage[], draft: Draft): Promise<ChatReply> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, draft }),
  });
  if (!response.ok) throw new Error(`Chat request failed with status ${response.status}`);
  return response.json();
}
