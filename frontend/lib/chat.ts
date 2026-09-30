import { post } from "@/lib/api";
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
  /** The id the draft is saved under, once a document has been chosen. */
  savedId: number | null;
}

const { parties, ...ndaTerms } = defaultNdaData;
export const emptyDraft: Draft = { documentId: null, nda: ndaTerms, parties, fields: [] };

export const GREETING =
  "Hi! I’ll help you draft a legal agreement, such as an NDA, a cloud service agreement or a pilot agreement. What do you need?";

export const greeting = (): ChatMessage[] => [{ role: "assistant", content: GREETING }];

/**
 * Sends the conversation and current draft to the backend, which returns the
 * assistant's reply and the updated draft, and autosaves it under `savedId`.
 */
export function sendChat(messages: ChatMessage[], draft: Draft, savedId: number | null): Promise<ChatReply> {
  return post<ChatReply>("/api/chat", { messages, draft, savedId });
}
