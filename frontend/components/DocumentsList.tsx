"use client";

import { useEffect, useState } from "react";
import { isSignedOut } from "@/lib/auth";
import {
  formatUpdatedAt,
  listSavedDocuments,
  loadSavedDocument,
  type SavedDocument,
  type SavedDocumentSummary,
} from "@/lib/savedDocuments";

interface DocumentsListProps {
  onOpen: (saved: SavedDocument) => void;
  onNewDocument: () => void;
  onSignedOut: () => void;
}

type ListState = { status: "loading" } | { status: "failed" } | { status: "ready"; documents: SavedDocumentSummary[] };

/** "My documents": the signed-in user's saved drafts, each of which reopens in the builder. */
export default function DocumentsList({ onOpen, onNewDocument, onSignedOut }: DocumentsListProps) {
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [openError, setOpenError] = useState(false);

  useEffect(() => {
    listSavedDocuments()
      .then((documents) => setList({ status: "ready", documents }))
      .catch((error) => (isSignedOut(error) ? onSignedOut() : setList({ status: "failed" })));
  }, [onSignedOut]);

  async function open(id: number) {
    setOpenError(false);
    try {
      onOpen(await loadSavedDocument(id));
    } catch (error) {
      if (isSignedOut(error)) return onSignedOut();
      setOpenError(true);
    }
  }

  return (
    <main className="flex-1 lg:overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy">My documents</h1>
            <p className="mt-1 text-sm text-gray-text">Drafts are saved as you chat. Open one to keep editing or download it.</p>
          </div>
          <NewDocumentButton onClick={onNewDocument} />
        </div>

        <p role="status" className="text-sm text-muted">
          {list.status === "loading" && "Loading your documents…"}
          {list.status === "failed" && "Your documents couldn’t be loaded. Reload the page to try again."}
          {openError && "That document couldn’t be opened. Try again."}
        </p>

        {list.status === "ready" &&
          (list.documents.length === 0 ? (
            <EmptyState onNewDocument={onNewDocument} />
          ) : (
            <ul className="mt-2 divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-paper shadow-sm">
              {list.documents.map((doc) => (
                <li key={doc.id}>
                  <button
                    type="button"
                    onClick={() => open(doc.id)}
                    className="group flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-desk/30"
                  >
                    <span aria-hidden className="h-10 w-1 shrink-0 rounded-full bg-accent" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-navy group-hover:text-brand-blue">{doc.documentName}</span>
                      <span className="block truncate text-sm text-gray-text">
                        {doc.companies.length ? doc.companies.join(" and ") : "No parties named yet"}
                      </span>
                    </span>
                    <span className="hidden shrink-0 text-sm text-gray-text sm:block">
                      Updated {formatUpdatedAt(doc.updatedAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ))}
      </div>
    </main>
  );
}

function EmptyState({ onNewDocument }: { onNewDocument: () => void }) {
  return (
    <div className="mt-2 rounded-lg border border-dashed border-rule bg-paper px-6 py-16 text-center">
      <p className="font-serif text-xl font-semibold text-navy">No documents yet</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-gray-text">
        Start a new document and the assistant will help you choose an agreement and fill it in.
      </p>
      <div className="mt-6">
        <NewDocumentButton onClick={onNewDocument} />
      </div>
    </div>
  );
}

function NewDocumentButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md bg-brand-purple px-4 py-2 text-sm font-semibold text-paper shadow-sm hover:bg-brand-purple/90"
    >
      New document
    </button>
  );
}
