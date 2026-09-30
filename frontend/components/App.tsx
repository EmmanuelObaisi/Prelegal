"use client";

import { useCallback, useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import AuthScreen from "@/components/AuthScreen";
import DocumentBuilder, { type DocumentWithTerms } from "@/components/DocumentBuilder";
import DocumentsList from "@/components/DocumentsList";
import { fetchCurrentUser, signOut, type User } from "@/lib/auth";
import type { SavedDocument } from "@/lib/savedDocuments";

interface AppProps {
  documents: DocumentWithTerms[];
  ndaCoverPage: string;
}

/**
 * The whole client app: the sign-in screen while signed out, then the header
 * over either "My documents" or the document builder. Each new or reopened
 * document gets a fresh builder (a new `builderKey`).
 */
export default function App({ documents, ndaCoverPage }: AppProps) {
  const [user, setUser] = useState<User | null | "loading">("loading");
  const [view, setView] = useState<"builder" | "documents">("documents");
  const [saved, setSaved] = useState<SavedDocument>();
  const [builderKey, setBuilderKey] = useState(0);

  useEffect(() => {
    fetchCurrentUser().then(setUser, () => setUser(null));
  }, []);

  const handleSignedOut = useCallback(() => {
    setUser(null);
    setView("documents");
  }, []);

  function openBuilder(document?: SavedDocument) {
    setSaved(document);
    setBuilderKey((key) => key + 1);
    setView("builder");
  }

  async function handleSignOut() {
    await signOut();
    handleSignedOut();
  }

  if (user === "loading") return <main aria-busy className="min-h-dvh bg-paper" />;
  if (user === null) return <AuthScreen onSignedIn={setUser} />;

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <AppHeader
        email={user.email}
        section={view === "builder" && !saved ? "new" : "documents"}
        onNewDocument={() => openBuilder()}
        onShowDocuments={() => setView("documents")}
        onSignOut={handleSignOut}
      />
      {view === "documents" ? (
        <DocumentsList onOpen={openBuilder} onNewDocument={() => openBuilder()} onSignedOut={handleSignedOut} />
      ) : (
        <DocumentBuilder
          key={builderKey}
          documents={documents}
          ndaCoverPage={ndaCoverPage}
          saved={saved}
          onSignedOut={handleSignedOut}
        />
      )}
    </div>
  );
}
