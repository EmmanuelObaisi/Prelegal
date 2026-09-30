import { api } from "@/lib/api";
import type { ChatMessage, Draft } from "@/lib/chat";

/** One entry in "My documents". Mirrors `SavedDocumentSummary` in backend/saved_documents.py. */
export interface SavedDocumentSummary {
  id: number;
  documentId: string;
  documentName: string;
  companies: string[];
  /** UTC, as SQLite writes it: "YYYY-MM-DD HH:MM:SS". */
  updatedAt: string;
}

/** A saved draft and its conversation, enough to carry on where the user left off. */
export interface SavedDocument {
  id: number;
  draft: Draft;
  messages: ChatMessage[];
}

export const listSavedDocuments = () => api<SavedDocumentSummary[]>("/api/documents");
export const loadSavedDocument = (id: number) => api<SavedDocument>(`/api/documents/${id}`);

/** A SQLite UTC timestamp as a short local date and time. */
export function formatUpdatedAt(updatedAt: string): string {
  return new Date(`${updatedAt.replace(" ", "T")}Z`).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
